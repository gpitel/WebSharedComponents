# mcpApps — shared pieces for MCP Apps widgets

Framework-free (plain JS + CSS, no Vue) so any MCP server can bundle them into its single-file
`ui://` resource with `vite-plugin-singlefile`, whatever its own stack.

## candidatePicker — ranked-candidate picker (ABT #663)

One component for choosing from a ranked list: sortable spec table, a column filter, a
per-candidate detail panel, a "why ranked" line, and a "use this" action. It does not import
the MCP Apps SDK: the host page wires `onSelect` to the bridge, so the component runs (and is
tested) without a host, and each server keeps its own `@modelcontextprotocol/ext-apps` version.

```js
import { App, applyDocumentTheme, applyHostStyleVariables } from "@modelcontextprotocol/ext-apps";
import { createCandidatePicker } from "<path>/WebSharedComponents/mcpApps/candidatePicker.js";
import "<path>/WebSharedComponents/mcpApps/candidatePicker.css";

const app = new App({ name: "my picker", version: "0.1.0" });
const picker = createCandidatePicker(document.getElementById("app"), {
  selectionNote: "[next] what the agent should do with the pick",   // optional
  onSelect: (sel) => app.updateModelContext({                       // required
    content: [{ type: "text", text: sel.text }],
    structuredContent: sel.structuredContent,
  }),
});
app.ontoolresult = (r) => r.structuredContent
  ? picker.setPayload(r.structuredContent)
  : picker.setError("The tool returned no structured content for this widget.");
await app.connect();
```

Reference consumer: `WebFrontend/mcp/src/picker.js` (`ui://openmagnetics/picker.html`).

### Data contract

The payload is a result under the Moebius pipeline contract (`pipeline_result.json`), read
**exactly as the contract names it** — no aliases (`ranked`, `rows`, `poolSize`, a bare-string
`original` are refused, not guessed at). Anything the picker cannot render truthfully is shown
as a specific error naming the field, never as a default.

**Designs** — things an engine produced, which nobody can order (`designResult`):

| field | required | used for |
|---|---|---|
| `mode: "design"`, `kind` | yes | title ("magnetic designs") and the selection message |
| `designs[].rank` (integer >= 1) | yes | `#` column, default sort |
| `designs[].label` | no | identity column (absent: "design #N") |
| `designs[].score` (number) | no | score column and the why-ranked line (delta vs #1) |
| `designs[].properties` | no | spec columns; scalar / list-of-scalar fields become columns with their keys shown verbatim, objects go to the detail panel |
| `designs[].notes[]` | no | detail panel (e.g. per-filter scores) |
| `designs[].ref` | no | the handle the selection carries; a design with neither `ref` nor `document` cannot be chosen, and its button says why |
| `tiebreaker`, `caveat`, `topology` | no | header, why-ranked line; the caveat is repeated in the selection message |

**Ranked parts** — `mode: "search" | "recommend" | "crossref"` with `family` and
`candidates[]` (`rankedResult`). Each candidate needs `mpn`; identity is `_key` when present,
else manufacturer + mpn (two vendors ship the same MPN). Columns come from `specs`, else the
row's flat scalars minus metadata, else a nested `row`; then the `sortKey.metric` (when all rows
agree on one), up to four `margins` (shown as ×N), `status` (verdict) and `penalty`.
`params[]` verdicts render as pills: `unverified` is dashed and neutral, never the fail colour —
absence of data is not a defect. `crossref` shows `original` + `originalSpecs` above the table.

Everywhere: fields starting with `_` are pipeline-internal and never rendered; a null or absent
value renders as an em dash titled "not stated", sorts last in either direction, and never
satisfies a numeric filter.

### Filter

Pick a column (or "any column") and type: plain text is a case-insensitive substring;
`>0.5`, `<=12`, `=3` compare numerically (any element of a list value may match). A comparison
with no number after it is shown as an error, not ignored.

### Selection

`onSelect(selection)` receives `{ text, structuredContent }`:

- `text` restates what was chosen and from what (`updateModelContext` OVERWRITES the widget's
  context, so a bare id would arrive with no decision attached), the row's properties, the
  why-ranked line, the payload's caveat and the host's `selectionNote`.
- `structuredContent = { selected, context }`. For a design `selected` is
  `{rank, label, ref, score, properties}`; for a part `{mpn, manufacturer, rank, specs, status,
  grade, penalty}`. `context` carries `mode, kind, ranked, tiebreaker, original, source`.
  Full documents never travel back — the handle is the reference.

The returned promise must settle when the host has accepted the update; a rejection is shown
to the user ("Your choice did not reach the assistant: …"). Only then is the row marked selected.

### Theming

`candidatePicker.css` holds no colour literals. The host page must define these tokens (the
component refuses to mount, naming the missing ones, rather than drawing in browser defaults):

`--cp-bg --cp-fg --cp-muted --cp-line --cp-hover --cp-accent --cp-accent-fg --cp-chosen
--cp-pass --cp-warn --cp-fail` (optional: `--cp-font`, `--cp-mono`).

Map them onto the MCP Apps host variables (`--color-text-primary`, `--color-border-tertiary`,
…, applied with `applyHostStyleVariables`) with your own palette behind them; see
`WebFrontend/mcp/picker.html`.

### API

`createCandidatePicker(root, options)` → `{ setPayload, setError, setSource, model }`.
Pure helpers, exported for tests and for servers that want the same wording elsewhere:
`normalisePayload`, `columnsFor`, `valueOf`, `formatValue`, `sortRows`, `parseQuery`,
`filterRows`, `whyRanked`, `buildSelection`, `unselectableReason`, `PickerDataError`.

### Consuming it from another repository

Today this folder is reached by path from inside WebFrontend. Kirchhoff, Kelvin, Hertz and
Heaviside do not reference WebSharedComponents, so adopting it there needs a packaging decision
(submodule, vendored copy, or a published package) — see ABT #663.
