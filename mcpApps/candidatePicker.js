/**
 * Ranked-candidate picker for MCP Apps widgets (ABT #663).
 *
 * One component for the one interaction every recommender in the ecosystem has: a ranked
 * list the user must choose from. It replaces the four tables that grew independently
 * (Kelvin picker.js, Kirchhoff picker.js, Hertz picker.js, Heaviside results.js) and had
 * already diverged in what they read and how they reported a choice.
 *
 * Framework-free on purpose: plain DOM + one stylesheet, no Vue, no import of the MCP Apps
 * SDK. A server bundles it into its single-file ui:// resource (vite-plugin-singlefile) and
 * wires `onSelect` to the host bridge itself, so the logic here can be exercised without a
 * host and the bridge version stays the consuming server's decision.
 *
 * Payload: a result under the Moebius pipeline contract (contracts/pipeline_result.json),
 * exactly as the contract names it — `mode: "design"` with `designs[]`, or
 * `mode: "search" | "recommend" | "crossref"` with `candidates[]`. No aliases: the contract
 * is closed so that a drifted payload is an error at the boundary instead of a table that
 * silently shows less. See README.md for the data contract.
 *
 * Absence is not a value. A field a row does not state renders as an em dash titled
 * "not stated", sorts last in both directions, and never matches a numeric filter.
 */

export class PickerDataError extends Error {
  constructor(message) {
    super(message);
    this.name = "PickerDataError";
  }
}

const RANKED_MODES = new Set(["search", "recommend", "crossref"]);

/** Candidate fields that describe or judge a part rather than being one of its specs. */
const CANDIDATE_META = new Set([
  "mpn", "manufacturer", "specs", "params", "params_full", "notes", "status", "grade",
  "penalty", "direction", "footprint", "margins", "sortKey", "evidence", "row", "record",
]);

/** Package fields: shown, but behind the electrical ones so a column cap cannot evict those. */
const PACKAGING_KEYS = new Set([
  "case_code", "caseCode", "mount", "is_production", "qualification",
  "length_m", "width_m", "height_m", "lengthM", "widthM", "heightM",
  "temp_min_c", "temp_max_c", "temp_min_C", "temp_max_C",
]);

/** The contract's closed verdict set for a candidate's per-parameter checks. */
const PARAM_VERDICTS = new Set(["pass", "warn", "fail", "unverified"]);

const STATUS_LABEL = {
  recommended: "recommended",
  partial: "partial",
  no_substitute: "not a substitute",
};

export const DEFAULT_MAX_COLUMNS = 10;

/** Theme tokens the stylesheet reads. The host page must define every one (README). */
export const THEME_TOKENS = [
  "--cp-bg", "--cp-fg", "--cp-muted", "--cp-line", "--cp-hover", "--cp-accent",
  "--cp-accent-fg", "--cp-chosen", "--cp-pass", "--cp-warn", "--cp-fail",
];

// --- reading a payload ---------------------------------------------------------------------

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isScalar = (v) => typeof v === "string" || typeof v === "number" || typeof v === "boolean";
const isScalarArray = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => x === null || isScalar(x));

/**
 * Columns-eligible fields of an object: scalars and lists of scalars, never `_`-prefixed
 * (pipeline-internal by contract), never null (null is "not stated", which has no column).
 */
function displayFields(obj, skip) {
  const out = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (k.startsWith("_") || (skip && skip.has(k))) continue;
    if (v === null || v === undefined) continue;
    if (isScalar(v) || isScalarArray(v)) out[k] = v;
  }
  return out;
}

/** Structured fields that cannot be a column but are still the row's own data (detail only). */
function structuredFields(obj, skip) {
  const out = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (k.startsWith("_") || (skip && skip.has(k))) continue;
    if (v === null || v === undefined || isScalar(v) || isScalarArray(v)) continue;
    out[k] = v;
  }
  return out;
}

/** A candidate's specs: the projected `specs` first, else its flat scalars, else a nested `row`. */
function candidateSpecs(c) {
  if (c.specs !== undefined) {
    if (!isObject(c.specs)) throw new PickerDataError(`candidate ${c.mpn}: specs must be an object`);
    return displayFields(c.specs, new Set(["mpn"]));
  }
  const flat = displayFields(c, CANDIDATE_META);
  if (Object.keys(flat).length) return flat;
  if (isObject(c.row)) return displayFields(c.row, CANDIDATE_META);
  return {};
}

function requireNumber(value, what) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PickerDataError(`${what} must be a finite number, got ${JSON.stringify(value)}`);
  }
  return value;
}

function readNotes(row, what) {
  if (row.notes === undefined) return [];
  if (!Array.isArray(row.notes) || !row.notes.every((n) => typeof n === "string")) {
    throw new PickerDataError(`${what}: notes must be a list of strings`);
  }
  return row.notes;
}

function readDesign(d, i, seen) {
  const what = `designs[${i}]`;
  if (!isObject(d)) throw new PickerDataError(`${what} is not an object`);
  if (!Number.isInteger(d.rank) || d.rank < 1) {
    throw new PickerDataError(`${what}: rank must be an integer >= 1, got ${JSON.stringify(d.rank)}`);
  }
  if (d.label !== undefined && typeof d.label !== "string") {
    throw new PickerDataError(`${what}: label must be a string`);
  }
  if (d.properties !== undefined && !isObject(d.properties)) {
    throw new PickerDataError(`${what}: properties must be an object`);
  }
  if (d.ref !== undefined && (typeof d.ref !== "string" || !d.ref)) {
    throw new PickerDataError(`${what}: ref must be a non-empty string`);
  }
  const score = d.score === undefined ? null : requireNumber(d.score, `${what}.score`);
  const key = d.ref ?? `rank:${d.rank}`;
  if (seen.has(key)) throw new PickerDataError(`${what}: duplicate identity ${key}`);
  seen.add(key);
  return {
    key,
    rank: d.rank,
    label: d.label ?? `design #${d.rank}`,
    maker: null,
    score,
    specs: displayFields(d.properties),
    structured: structuredFields(d.properties),
    notes: readNotes(d, what),
    params: [],
    margins: {},
    status: null,
    sortKey: null,
    ref: d.ref ?? null,
    hasDocument: isObject(d.document),
    raw: d,
  };
}

function readCandidate(c, i, seen) {
  const what = `candidates[${i}]`;
  if (!isObject(c)) throw new PickerDataError(`${what} is not an object`);
  if (typeof c.mpn !== "string" || !c.mpn) {
    throw new PickerDataError(`${what}: mpn is required (a candidate is a part someone can order)`);
  }
  if (c.manufacturer !== undefined && c.manufacturer !== null && typeof c.manufacturer !== "string") {
    throw new PickerDataError(`${what}: manufacturer must be a string`);
  }
  if (c.status !== undefined && !(c.status in STATUS_LABEL)) {
    throw new PickerDataError(`${what}: status ${JSON.stringify(c.status)} is not one of `
      + Object.keys(STATUS_LABEL).join(", "));
  }
  const params = c.params ?? [];
  if (!Array.isArray(params)) throw new PickerDataError(`${what}: params must be a list`);
  for (const p of params) {
    if (!isObject(p) || typeof p.name !== "string" || !PARAM_VERDICTS.has(p.verdict)) {
      throw new PickerDataError(`${what}: each param needs a name and a verdict in `
        + `${[...PARAM_VERDICTS].join("/")}, got ${JSON.stringify(p)}`);
    }
  }
  if (c.margins !== undefined && !isObject(c.margins)) {
    throw new PickerDataError(`${what}: margins must be an object`);
  }
  let sortKey = null;
  if (c.sortKey !== undefined) {
    if (!isObject(c.sortKey) || typeof c.sortKey.metric !== "string") {
      throw new PickerDataError(`${what}: sortKey must be {metric, value}`);
    }
    sortKey = { metric: c.sortKey.metric, value: requireNumber(c.sortKey.value, `${what}.sortKey.value`) };
  }
  // Two vendors ship the same MPN string, so identity is manufacturer + mpn unless the
  // pipeline supplied its own collision-proof key.
  const key = typeof c._key === "string" && c._key ? c._key : `${c.manufacturer ?? ""}␟${c.mpn}`;
  if (seen.has(key)) throw new PickerDataError(`${what}: duplicate identity ${c.manufacturer ?? ""} ${c.mpn}`);
  seen.add(key);
  const margins = {};
  for (const [k, v] of Object.entries(c.margins ?? {})) {
    if (v === null || v === undefined) continue;          // a null margin is not stated
    margins[k] = requireNumber(v, `${what}.margins.${k}`);
  }
  return {
    key,
    rank: i + 1,
    label: c.mpn,
    maker: c.manufacturer ?? null,
    score: c.penalty === undefined ? null : requireNumber(c.penalty, `${what}.penalty`),
    specs: candidateSpecs(c),
    structured: {},
    notes: readNotes(c, what),
    params,
    margins,
    status: c.status ?? null,
    grade: c.grade ?? null,
    sortKey,
    ref: null,
    hasDocument: false,
    raw: c,
  };
}

/**
 * A pipeline-contract payload as the picker's model. Throws PickerDataError naming the exact
 * field when the payload is not one the picker can render truthfully.
 */
export function normalisePayload(payload) {
  if (!isObject(payload)) {
    throw new PickerDataError("The tool result carried no structured content to pick from.");
  }
  const seen = new Set();
  if (payload.mode === "design") {
    if (typeof payload.kind !== "string" || !payload.kind) {
      throw new PickerDataError("design result: kind is required (what was designed)");
    }
    if (!Array.isArray(payload.designs)) throw new PickerDataError("design result: designs must be a list");
    const rows = payload.designs.map((d, i) => readDesign(d, i, seen));
    return {
      mode: "design",
      kind: payload.kind,
      subjectNoun: `${payload.kind} design`,
      rows,
      tiebreaker: typeof payload.tiebreaker === "string" ? payload.tiebreaker : null,
      scoreLabel: "score",
      caveat: typeof payload.caveat === "string" ? payload.caveat : null,
      topology: typeof payload.topology === "string" ? payload.topology : null,
      original: null,
      total: null,
    };
  }
  if (RANKED_MODES.has(payload.mode)) {
    if (payload.family === undefined || payload.family === null || payload.family === "") {
      throw new PickerDataError(`${payload.mode} result: family is required`);
    }
    if (!Array.isArray(payload.candidates)) {
      throw new PickerDataError(`${payload.mode} result: candidates must be a list`);
    }
    const rows = payload.candidates.map((c, i) => readCandidate(c, i, seen));
    let original = null;
    if (payload.mode === "crossref" && payload.original !== undefined) {
      if (!isObject(payload.original) || typeof payload.original.mpn !== "string") {
        throw new PickerDataError("crossref result: original must be an object with an mpn");
      }
      original = {
        mpn: payload.original.mpn,
        specs: isObject(payload.originalSpecs) ? displayFields(payload.originalSpecs, new Set(["mpn"])) : {},
      };
    }
    const family = typeof payload.family === "string" ? payload.family
      : (isObject(payload.family) && typeof payload.family.name === "string" ? payload.family.name : null);
    if (!family) throw new PickerDataError(`${payload.mode} result: family has no name`);
    return {
      mode: payload.mode,
      kind: family,
      subjectNoun: payload.mode === "crossref" ? `substitute for ${original?.mpn ?? "the original"}` : family,
      rows,
      tiebreaker: typeof payload.tiebreaker === "string" ? payload.tiebreaker : null,
      scoreLabel: "penalty",
      caveat: typeof payload.caveat === "string" ? payload.caveat : null,
      topology: null,
      original,
      total: Number.isInteger(payload.total) ? payload.total : null,
    };
  }
  throw new PickerDataError(
    `This picker renders ranked results (mode design, search, recommend or crossref); `
    + `the tool returned mode ${JSON.stringify(payload.mode ?? null)}.`);
}

// --- columns ---------------------------------------------------------------------------------

/**
 * Every column the table draws, as {key, label, kind}, plus the spec fields the cap held back
 * (they stay reachable in each row's detail panel, and the table says how many).
 *
 * Field names are shown VERBATIM: they are the keys a caller types back into a tool argument,
 * and "Core Losses W" is not a spelling any tool accepts.
 */
export function columnsFor(model, maxColumns = DEFAULT_MAX_COLUMNS) {
  const seen = [];
  for (const r of model.rows) for (const k of Object.keys(r.specs)) if (!seen.includes(k)) seen.push(k);
  const ordered = [...seen.filter((k) => !PACKAGING_KEYS.has(k)), ...seen.filter((k) => PACKAGING_KEYS.has(k))];
  const shown = ordered.slice(0, maxColumns);
  const cols = [{ key: "__rank", label: "#", kind: "rank" },
                { key: "__label", label: model.mode === "design" ? "design" : "part", kind: "identity" }];
  if (model.rows.some((r) => r.status)) cols.push({ key: "__status", label: "verdict", kind: "status" });
  for (const k of shown) cols.push({ key: k, label: k, kind: "spec" });
  const metrics = new Set(model.rows.map((r) => r.sortKey?.metric).filter(Boolean));
  if (metrics.size === 1) cols.push({ key: "__metric", label: [...metrics][0], kind: "metric" });
  const margins = [];
  for (const r of model.rows) for (const k of Object.keys(r.margins)) if (!margins.includes(k)) margins.push(k);
  for (const k of margins.slice(0, 4)) cols.push({ key: k, label: k, kind: "margin" });
  if (model.rows.some((r) => r.score !== null)) cols.push({ key: "__score", label: model.scoreLabel, kind: "score" });
  return { columns: cols, hidden: ordered.slice(maxColumns) };
}

/** The raw value one column reads out of one row; undefined means "not stated". */
export function valueOf(row, col) {
  switch (col.kind) {
    case "rank": return row.rank;
    case "identity": return row.label;
    case "status": return row.status ?? undefined;
    case "spec": return row.specs[col.key];
    case "metric": return row.sortKey?.value;
    case "margin": return row.margins[col.key];
    case "score": return row.score ?? undefined;
    default: throw new Error(`unknown column kind ${col.kind}`);
  }
}

// Six significant figures: enough to show a digest value as the server sent it (519.924 mm2)
// while still trimming a raw double (0.49543026322442507) to something readable.
const sig = (x, p = 6) => String(Number(Number(x).toPrecision(p)));

/** Display text for a value. Magnitudes keep 6 significant figures; counts stay exact. */
export function formatValue(v, kind = "spec") {
  if (v === undefined || v === null || v === "") return "—";
  if (Array.isArray(v)) return v.map((x) => formatValue(x)).join(" + ");
  if (typeof v === "number") {
    if (kind === "rank" || Number.isInteger(v)) return v.toLocaleString("en-US");
    if (kind === "margin") return `×${sig(v, 3)}`;
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e6 || a < 1e-3)) return v.toExponential(3);
    return sig(v);
  }
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (kind === "status") return STATUS_LABEL[v] ?? String(v);
  return String(v);
}

/** Sort key: numbers numerically, arrays by their first element, text by natural order. */
function sortable(v) {
  if (Array.isArray(v)) return sortable(v.find((x) => x !== null && x !== undefined));
  return v;
}

/**
 * Rows sorted on one column. Absent values sort LAST in both directions: flipping the order
 * must not float the rows that state nothing to the top, where they would read as the best.
 */
export function sortRows(rows, col, direction) {
  if (direction !== "asc" && direction !== "desc") throw new Error(`direction must be asc or desc, got ${direction}`);
  const sign = direction === "asc" ? 1 : -1;
  return rows.map((r, i) => [r, i]).sort(([a, ia], [b, ib]) => {
    const va = sortable(valueOf(a, col));
    const vb = sortable(valueOf(b, col));
    const na = va === undefined || va === null;
    const nb = vb === undefined || vb === null;
    if (na || nb) return na === nb ? ia - ib : (na ? 1 : -1);
    let c;
    if (typeof va === "number" && typeof vb === "number") c = va - vb;
    else c = String(va).localeCompare(String(vb), "en", { numeric: true, sensitivity: "base" });
    return c === 0 ? ia - ib : sign * c;
  }).map(([r]) => r);
}

/**
 * Parse a filter query. `>0.5`, `<=12`, `=3` compare numerically; anything else is a
 * case-insensitive substring of the displayed text. Throws on a comparison whose operand is
 * not a number, so a typo cannot silently filter nothing.
 */
export function parseQuery(text) {
  const q = String(text ?? "").trim();
  if (!q) return null;
  const m = q.match(/^(>=|<=|>|<|=)\s*(.*)$/);
  if (!m) return { op: "contains", needle: q.toLowerCase() };
  const n = Number(m[2]);
  if (m[2] === "" || !Number.isFinite(n)) {
    throw new PickerDataError(`"${q}": ${m[1]} needs a number after it`);
  }
  return { op: m[1], value: n };
}

function matches(row, col, query) {
  const v = valueOf(row, col);
  if (query.op === "contains") {
    if (v === undefined || v === null) return false;
    return formatValue(v, col.kind).toLowerCase().includes(query.needle)
      || String(v).toLowerCase().includes(query.needle);
  }
  const values = (Array.isArray(v) ? v : [v]).filter((x) => typeof x === "number");
  if (!values.length) return false;                   // not stated never satisfies a bound
  return values.some((x) => ({ ">": x > query.value, "<": x < query.value, ">=": x >= query.value,
                               "<=": x <= query.value, "=": x === query.value })[query.op]);
}

/** Rows passing a filter on one column key, or on any column when `columnKey` is "*". */
export function filterRows(rows, columns, columnKey, queryText) {
  const query = parseQuery(queryText);
  if (!query) return rows;
  const targets = columnKey === "*" ? columns : columns.filter((c) => c.key === columnKey);
  if (!targets.length) throw new PickerDataError(`no column ${columnKey} to filter on`);
  return rows.filter((r) => targets.some((c) => matches(r, c, query)));
}

// --- explaining and choosing ---------------------------------------------------------------

/** One line saying why a row sits where it does, from what the payload actually states. */
export function whyRanked(model, row) {
  const parts = [`#${row.rank} of ${model.rows.length}`];
  if (row.score !== null) {
    let s = `${model.scoreLabel} ${formatValue(row.score)}`;
    const best = model.rows.find((r) => r.rank === 1);
    if (best && best !== row && best.score !== null) {
      const d = row.score - best.score;
      s += ` (${d >= 0 ? "+" : "−"}${formatValue(Math.abs(d))} vs #1)`;
    }
    parts.push(s);
  }
  if (row.sortKey) parts.push(`${row.sortKey.metric} ${formatValue(row.sortKey.value)}`);
  if (row.status) parts.push(formatValue(row.status, "status") + (row.grade ? ` (${row.grade})` : ""));
  if (model.tiebreaker) parts.push(`ranked by ${model.tiebreaker}`);
  else if (row.score === null && !row.sortKey) parts.push("order as returned by the engine; it reported no score");
  return parts.join(" · ");
}

/** Why a row cannot be chosen, or null when it can. */
export function unselectableReason(model, row) {
  if (model.mode === "design" && !row.ref && !row.hasDocument) {
    return "this design carries neither a handle nor its document, so choosing it would hand the assistant nothing it can use";
  }
  return null;
}

/**
 * The message that reports a choice to the model.
 *
 * MCP Apps' updateModelContext OVERWRITES the widget's context rather than appending, so the
 * message restates what was being chosen and from what, not only the identity of the pick.
 * The full document is never sent back: for a design the handle IS the reference to it.
 */
export function buildSelection(model, row, { note, source } = {}) {
  const reason = unselectableReason(model, row);
  if (reason) throw new PickerDataError(reason);
  const lines = [];
  const of = `${model.rows.length} ranked`;
  if (model.mode === "design") {
    lines.push(`[user selected] ${model.kind} design #${row.rank} of ${of}${source ? ` from ${source}` : ""}: `
      + `${row.label}${row.ref ? ` — handle ${row.ref}` : ""}.`);
  } else {
    lines.push(`[user selected] ${row.label}${row.maker ? ` (${row.maker})` : ""} as the `
      + `${model.subjectNoun}, #${row.rank} of ${of}${source ? ` from ${source}` : ""}.`);
  }
  const specs = Object.entries(row.specs).map(([k, v]) => `${k} ${formatValue(v)}`).join(", ");
  if (specs) lines.push(`[${model.mode === "design" ? "properties" : "specs"}] ${specs}`);
  lines.push(`[ranking] ${whyRanked(model, row)}`);
  // The caveat travels with the choice: the context update replaces the tool result's prose
  // in the model's view, and a caveat such as "fast designs: the coil is not described"
  // changes what the next call may do with the pick.
  if (model.caveat) lines.push(`[caveat] ${model.caveat}`);
  if (note) lines.push(note);
  const selected = model.mode === "design"
    ? { rank: row.rank, label: row.label, ref: row.ref, score: row.score,
        properties: row.raw.properties ?? null }
    : { mpn: row.label, manufacturer: row.maker, rank: row.rank, specs: row.raw.specs ?? row.specs,
        status: row.status, grade: row.grade ?? null, penalty: row.score };
  return {
    text: lines.join("\n"),
    structuredContent: JSON.parse(JSON.stringify({
      selected,
      context: { mode: model.mode, kind: model.kind, ranked: model.rows.length,
                 tiebreaker: model.tiebreaker, original: model.original?.mpn ?? null,
                 source: source ?? null },
    })),
  };
}

// --- the DOM -------------------------------------------------------------------------------

function h(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    n.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return n;
}

function cell(value, col) {
  const absent = value === undefined || value === null || value === "";
  // Numbers align on the right so magnitudes compare by eye; text stays left-aligned.
  const numeric = typeof value === "number"
    || (Array.isArray(value) && value.length > 0 && value.every((x) => typeof x === "number"));
  return h("td", { class: `cp-${col.kind}${absent ? " cp-absent" : ""}${numeric ? " cp-num" : ""}`,
                   title: absent ? "not stated" : null },
    col.kind === "status" && !absent
      ? h("span", { class: `cp-status cp-status-${value}` }, formatValue(value, "status"))
      : formatValue(value, col.kind));
}

/** Refuse to render unthemed: a missing token would silently draw in the UA defaults. */
function assertTheme(root) {
  const style = getComputedStyle(root);
  const missing = THEME_TOKENS.filter((t) => !style.getPropertyValue(t).trim());
  if (missing.length) {
    throw new Error(`candidatePicker: the host page defines no ${missing.join(", ")}. `
      + "Define every --cp-* token (see WebSharedComponents/mcpApps/README.md).");
  }
}

/**
 * Mount a picker in `root`.
 *
 * options.onSelect(selection) — REQUIRED. Receives buildSelection()'s {text, structuredContent}
 *   and must return a promise that settles when the host has accepted it; a rejection is shown
 *   to the user, never swallowed.
 * options.title, options.selectionNote, options.source (e.g. the tool name),
 * options.maxColumns, options.renderDetailExtra(row, container, model).
 */
export function createCandidatePicker(root, options = {}) {
  if (!(root instanceof Element)) throw new Error("createCandidatePicker: root must be a DOM element");
  if (typeof options.onSelect !== "function") throw new Error("createCandidatePicker: options.onSelect is required");
  assertTheme(root);

  const state = {
    model: null, error: "", sortKey: "__rank", sortDir: "asc", filterCol: "*", filterText: "",
    filterError: "", expanded: new Set(), selectedKey: null, pendingKey: null, sendError: "",
    source: options.source ?? null,
  };

  function header(model) {
    const sub = [];
    if (model.topology) sub.push(model.topology);
    sub.push(`${model.rows.length} ranked`);
    if (model.total !== null) sub.push(`${model.total.toLocaleString("en-US")} matched`);
    if (model.tiebreaker) sub.push(`ranked by ${model.tiebreaker}`);
    return h("div", { class: "cp-head" },
      h("h1", { class: "cp-title" }, options.title ?? (model.mode === "design" ? `${model.kind} designs` : model.kind)),
      h("div", { class: "cp-sub" }, sub.join(" · ")));
  }

  function filterBar(columns) {
    const select = h("select", { class: "cp-filter-col", "aria-label": "filter column",
      onchange: (e) => { state.filterCol = e.target.value; render(); } },
      h("option", { value: "*" }, "any column"),
      columns.filter((c) => c.kind !== "rank").map((c) => h("option", { value: c.key }, c.label)));
    select.value = state.filterCol;
    const input = h("input", { class: "cp-filter-text", type: "search", placeholder: "filter: text, or >0.5, <=12",
      "aria-label": "filter value", value: state.filterText,
      oninput: (e) => { state.filterText = e.target.value; render(true); } });
    return h("div", { class: "cp-filter" }, select, input,
      state.filterError ? h("span", { class: "cp-filter-error", role: "alert" }, state.filterError) : null);
  }

  function detailPanel(model, row, hidden) {
    const box = h("div", { class: "cp-detail-body" });
    box.append(h("div", { class: "cp-why" }, whyRanked(model, row)));
    const fields = Object.entries(row.specs);
    if (fields.length) {
      box.append(h("dl", { class: "cp-fields" }, fields.map(([k, v]) => [
        h("dt", { class: hidden.includes(k) ? "cp-hiddencol" : null }, k), h("dd", {}, formatValue(v))])));
    }
    for (const [k, v] of Object.entries(row.structured)) {
      box.append(h("details", { class: "cp-structured" }, h("summary", {}, k),
        h("pre", {}, JSON.stringify(v, null, 2))));
    }
    if (row.params.length) {
      box.append(h("div", { class: "cp-pills" }, row.params.map((p) =>
        h("span", { class: `cp-pill cp-pill-${p.verdict}`, title: p.verdict === "unverified"
          ? "no data to check against — not a failure" : null }, `${p.name}: ${p.verdict}`))));
    }
    const margins = Object.entries(row.margins);
    if (margins.length) {
      box.append(h("div", { class: "cp-chips" }, margins.map(([k, v]) =>
        h("span", { class: "cp-chip" }, `${k} ${formatValue(v, "margin")}`))));
    }
    if (row.notes.length) box.append(h("ul", { class: "cp-notes" }, row.notes.map((n) => h("li", {}, n))));
    if (row.ref) box.append(h("div", { class: "cp-ref" }, "handle ", h("code", {}, row.ref)));
    if (options.renderDetailExtra) options.renderDetailExtra(row.raw, box, model);
    return box;
  }

  async function choose(row) {
    const model = state.model;
    let selection;
    try {
      selection = buildSelection(model, row, { note: options.selectionNote, source: state.source });
    } catch (err) {
      state.sendError = err.message;
      render();
      return;
    }
    state.pendingKey = row.key;
    state.sendError = "";
    render();
    try {
      await options.onSelect(selection);
      state.selectedKey = row.key;
    } catch (err) {
      state.sendError = `Your choice did not reach the assistant: ${err?.message ?? err}`;
    } finally {
      state.pendingKey = null;
      render();
    }
  }

  /** The rows passing the current filter; a malformed query is recorded, not ignored. */
  function visibleRows(model, columns) {
    state.filterError = "";
    try {
      return filterRows(model.rows, columns, state.filterCol, state.filterText);
    } catch (err) {
      if (!(err instanceof PickerDataError)) throw err;
      state.filterError = err.message;
      return model.rows;
    }
  }

  function table(model, columns, hidden, filtered) {
    let rows = filtered;
    const sortCol = columns.find((c) => c.key === state.sortKey);
    if (!sortCol) throw new Error(`sort column ${state.sortKey} is not in the table`);
    rows = sortRows(rows, sortCol, state.sortDir);

    const head = h("tr", {}, columns.map((c) => {
      const active = c.key === state.sortKey;
      return h("th", { class: `cp-${c.kind}`, scope: "col",
        "aria-sort": active ? (state.sortDir === "asc" ? "ascending" : "descending") : "none" },
        h("button", { class: "cp-sort", type: "button", "data-col": c.key,
          onclick: () => {
            if (state.sortKey === c.key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
            else { state.sortKey = c.key; state.sortDir = "asc"; }
            render();
          } }, c.label, active ? (state.sortDir === "asc" ? " ▴" : " ▾") : ""));
    }), h("th", { class: "cp-act" }, ""));

    const body = [];
    for (const row of rows) {
      const open = state.expanded.has(row.key);
      const chosen = state.selectedKey === row.key;
      const pending = state.pendingKey === row.key;
      const reason = unselectableReason(model, row);
      body.push(h("tr", { class: `cp-row${chosen ? " cp-chosen" : ""}`, "data-key": row.key,
        "aria-expanded": open ? "true" : "false",
        onclick: () => { if (open) state.expanded.delete(row.key); else state.expanded.add(row.key); render(); } },
        columns.map((c) => {
          if (c.kind !== "identity") return cell(valueOf(row, c), c);
          return h("td", { class: "cp-identity" },
            h("div", { class: "cp-label" }, row.label),
            row.maker ? h("div", { class: "cp-maker" }, row.maker) : null);
        }),
        h("td", { class: "cp-act" },
          h("button", { class: `cp-use${chosen ? " cp-use-chosen" : ""}`, type: "button",
            disabled: reason !== null || pending || state.pendingKey !== null, title: reason,
            onclick: (e) => { e.stopPropagation(); choose(row); } },
            pending ? "sending…" : chosen ? "selected" : "use this"))));
      if (open) {
        body.push(h("tr", { class: "cp-detail" },
          h("td", { colspan: String(columns.length + 1) }, detailPanel(model, row, hidden))));
      }
    }
    if (!rows.length) {
      body.push(h("tr", {}, h("td", { class: "cp-empty", colspan: String(columns.length + 1) },
        "No row matches this filter.")));
    }
    return h("div", { class: "cp-scroll" }, h("table", { class: "cp-table" },
      h("thead", {}, head), h("tbody", {}, body)));
  }

  function render(keepFocus = false) {
    const focusedFilter = keepFocus && document.activeElement?.classList?.contains("cp-filter-text");
    const caret = focusedFilter ? document.activeElement.selectionStart : null;
    root.textContent = "";
    root.classList.add("cp-root");
    if (state.error) {
      root.append(h("div", { class: "cp-error", role: "alert" }, state.error));
      return;
    }
    const model = state.model;
    if (!model) {
      root.append(h("div", { class: "cp-waiting" }, "Waiting for the tool result…"));
      return;
    }
    root.append(header(model));
    if (model.original) {
      root.append(h("div", { class: "cp-original" }, h("span", { class: "cp-original-label" }, "original"),
        h("span", { class: "cp-label" }, model.original.mpn),
        Object.entries(model.original.specs).map(([k, v]) => h("span", { class: "cp-chip" }, `${k} ${formatValue(v)}`))));
    }
    if (!model.rows.length) {
      root.append(h("div", { class: "cp-error", role: "alert" },
        "The tool returned an empty ranking: there is nothing to choose from."));
      if (model.caveat) root.append(h("div", { class: "cp-caveat" }, model.caveat));
      return;
    }
    const { columns, hidden } = columnsFor(model, options.maxColumns ?? DEFAULT_MAX_COLUMNS);
    const filtered = visibleRows(model, columns);
    root.append(filterBar(columns));
    root.append(table(model, columns, hidden, filtered));
    if (hidden.length) {
      root.append(h("div", { class: "cp-hint" },
        `${hidden.length} more field${hidden.length === 1 ? "" : "s"} in each row's detail: ${hidden.join(", ")}`));
    }
    if (model.caveat) root.append(h("div", { class: "cp-caveat" }, model.caveat));
    if (state.sendError) root.append(h("div", { class: "cp-error", role: "alert" }, state.sendError));
    root.append(h("div", { class: "cp-hint" },
      "Click a row for its detail. “Use this” tells the assistant your choice."));
    if (focusedFilter) {
      const input = root.querySelector(".cp-filter-text");
      input.focus();
      input.setSelectionRange(caret, caret);
    }
  }

  render();
  return {
    /** Render a tool's structuredContent. A malformed payload is shown as its specific error. */
    setPayload(payload) {
      try {
        state.model = normalisePayload(payload);
        state.error = "";
      } catch (err) {
        if (!(err instanceof PickerDataError)) throw err;
        state.model = null;
        state.error = err.message;
      }
      state.expanded = new Set();
      state.selectedKey = null;
      state.sendError = "";
      state.sortKey = "__rank";
      state.sortDir = "asc";
      state.filterText = "";
      state.filterCol = "*";
      render();
    },
    /** Show an error the host found (e.g. a tool result with no structured content). */
    setError(message) {
      state.model = null;
      state.error = String(message);
      render();
    },
    /** Name the tool that produced the result, once the host says which one it was. */
    setSource(source) {
      state.source = source ?? null;
    },
    get model() { return state.model; },
  };
}
