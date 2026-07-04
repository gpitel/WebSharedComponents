/**
 * Generate a TikZ transformer schematic from a MAS `coil`.
 *
 * Faithful port of magneticdesigner `calc/schematic.py`. The single entry point
 * `coilToTikz(coil)` takes a MAS `magnetic.coil` object and returns a standalone
 * `tikzpicture` string (plain TikZ + decorations.pathmorphing) that compiles
 * through the OpenMagnetics `/process_latex` endpoint -- no circuitikz needed.
 *
 * Contract: windings are grouped by `isolationSide` (primary left of the core,
 * other sides stacked on the right); every node shared within a group becomes its
 * own parallel vertical rail brought out to a common baseline label; ties/leads
 * hop nearer rails; each coil carries a solid polarity dot on its outer side at the
 * winding START (connections[0]); degree-1 ends become labelled terminals. A node
 * shared ACROSS groups can't be one rail, so it shows as matching labels + a NOTE.
 *
 * Electrostatic shields (designRequirements.shielding) draw as a dashed line
 * parallel to the core on the side of betweenWindings[0], spanning the winding
 * stack. A solid lead extends from its bottom: to the side's terminal column
 * labelled with the connection pin, or — when connection.type is `chassis` —
 * straight down to a chassis-ground symbol (all chassis shields share one).
 *
 * Lives in WebSharedComponents so both the WebFrontend and MagneticBuilderApp can
 * import it via the /WebSharedComponents/assets/js/ alias.
 */

const ISOLATION_SIDES = [
    'primary', 'secondary', 'tertiary', 'quaternary', 'quinary', 'senary',
    'septenary', 'octonary', 'nonary', 'denary', 'undenary', 'duodenary',
];

// Layout constants, in TikZ units.
const COIL_H = 1.3;     // height of one coil (spring + a lead stub at each end)
const ROW_GAP = 0.5;    // vertical gap between stacked coils
const TOP = 3.0;        // y of the first coil's top
const COIL_DX = 0.6;    // coil axis distance from the core
const RAIL_DX = 2.1;    // first rail's distance from the core
const RAIL_STEP = 0.5;  // spacing between parallel rails
const RAIL_DROP = 0.7;  // how far a rail extends below the lowest coil to its label
const TERM_GAP = 1.3;   // terminal column clearance beyond the outermost rail
const TERM_DX = 3.4;    // terminal column distance when a group has no rails
const CORE_GAP = 0.12;  // half-spacing of the two core lines
const HOP_R = 0.12;     // radius of a lead's hop over a rail
const STUB = 0.30;      // straight lead stub above and below each coil's spring
const DOT_DX = 0.16;    // polarity-dot offset to the coil's outer side
const DOT_DY = 0.15;    // polarity-dot drop below the start terminal
const SHIELD_DX = 0.26;     // shield dash distance from the core (inside the coil bumps at ~0.39)
const SHIELD_STEP = 0.06;   // inward step for each additional shield on the same side
const SHIELD_OVER = 0.05;   // dash overshoot above/below the winding stack
const SHIELD_DROP = 0.5;    // pin lead's run below the lowest coil
const SHIELD_ROW = 0.4;     // extra drop per additional pin lead on a side
const CHASSIS_DY = 0.4;     // chassis bar distance below the core bottom
const CHASSIS_JOIN = 0.35;  // U-join depth below the core (2+ chassis shields)
const CHASSIS_W = 0.25;     // chassis bar half-width
const CHASSIS_HATCH = 0.16; // chassis hatch stroke run (45 degrees, down-left)

// Two-decimal coordinate formatter (matches Python's f"{x:.2f}", avoiding "-0.00").
const f = (x) => (Object.is(x, -0) ? 0 : x).toFixed(2);

function sideIndex(side) {
    const i = ISOLATION_SIDES.indexOf((side || '').toLowerCase());
    return i === -1 ? ISOLATION_SIDES.length : i;
}

function ends(winding) {
    const out = [];
    for (const conn of winding.connections || []) {
        const pin = conn.pinName;
        out.push(pin === undefined || pin === null || String(pin) === '' ? '?' : String(pin));
    }
    return out;
}

function nodeUsage(windings) {
    const usage = {};
    for (const wind of windings) {
        for (const node of ends(wind)) {
            usage[node] = (usage[node] || 0) + 1;
        }
    }
    return usage;
}

const between = (a, b, x) => Math.min(a, b) < x && x < Math.max(a, b);
const inSpan = (y, top, base) => base - 1e-6 <= y && y <= top + 1e-6;

function coil(coilX, yTop) {
    const springTop = yTop - STUB;
    const springBot = yTop - COIL_H + STUB;
    return `  \\draw[thick] (${f(coilX)},${f(yTop)}) -- (${f(coilX)},${f(springTop)});\n`
        + `  \\draw[thick, coil] (${f(coilX)},${f(springTop)}) -- (${f(coilX)},${f(springBot)});\n`
        + `  \\draw[thick] (${f(coilX)},${f(springBot)}) -- (${f(coilX)},${f(yTop - COIL_H)});`;
}

function hline(x0, x1, yPos, crosses, label, place) {
    const direction = x1 >= x0 ? 1.0 : -1.0;
    const arc = direction > 0 ? '180:0' : '0:180';   // semicircle bulging upward
    let seg = `  \\draw[thick] (${f(x0)},${f(yPos)})`;
    const ordered = crosses.slice().sort((u, v) => direction * u - direction * v);
    for (const xCross of ordered) {
        seg += ` -- (${f(xCross - direction * HOP_R)},${f(yPos)}) arc (${arc}:${f(HOP_R)})`;
    }
    seg += ` -- (${f(x1)},${f(yPos)})`;
    if (label !== null && label !== undefined) {
        seg += ` node[${place}]{${label}}`;
    }
    return seg + ';';
}

function classifyEnds(winding, shared) {
    const [top, bot] = ends(winding).concat(['?', '?']).slice(0, 2);
    return [[top, 'top'], [bot, 'bot']].map(
        ([node, pos]) => [shared.includes(node) ? 'rail' : 'term', node, pos]);
}

function placeCoils(windings, shared, yTop) {
    const placed = [];
    let yPos = yTop;
    for (const wind of windings) {
        placed.push({
            name: wind.name !== undefined ? wind.name : '?',
            top: yPos, bot: yPos - COIL_H, ends: classifyEnds(wind, shared),
        });
        yPos -= COIL_H + ROW_GAP;
    }
    return placed;
}

function railTops(placed) {
    const tops = {};
    for (const p of placed) {
        for (const [kind, node, pos] of p.ends) {
            if (kind === 'rail') {
                const y = pos === 'top' ? p.top : p.bot;
                tops[node] = node in tops ? Math.max(tops[node], y) : y;
            }
        }
    }
    return tops;
}

function windingLines(p, coilX, side, termX, rails) {
    const place = side < 0 ? 'left' : 'right';
    const { x: railX, top: railTop, shared, base } = rails;
    const lines = [
        `  % winding ${p.name}`,
        coil(coilX, p.top),
        // polarity dot at the winding START (connections[0], drawn at the top terminal)
        `  \\fill (${f(coilX + side * DOT_DX)},${f(p.top - DOT_DY)}) circle (2.4pt);`,
    ];
    for (const [kind, value, pos] of p.ends) {
        const y = pos === 'top' ? p.top : p.bot;
        if (kind === 'rail') {
            const target = railX[value];
            const crosses = shared.filter(
                (m) => m !== value && between(coilX, target, railX[m]) && inSpan(y, railTop[m], base),
            ).map((m) => railX[m]);
            lines.push(hline(coilX, target, y, crosses, null, place));
            if (Math.abs(y - railTop[value]) > 1e-6) {   // interior tie -> junction dot
                lines.push(`  \\fill (${f(target)},${f(y)}) circle (2.4pt);`);
            }
        } else {
            const crosses = shared.filter(
                (m) => between(coilX, termX, railX[m]) && inSpan(y, railTop[m], base),
            ).map((m) => railX[m]);
            lines.push(hline(coilX, termX, y, crosses, value, place));
        }
    }
    return lines;
}

function renderGroup(windings, side, yTop) {
    const coilX = side * COIL_DX;
    const usage = nodeUsage(windings);
    const shared = Object.keys(usage).filter((n) => usage[n] >= 2).sort();
    const placed = placeCoils(windings, shared, yTop);
    const railTop = railTops(placed);
    // Innermost rail = the one whose highest tie is lowest, so each outer rail's ties
    // pass above the inner rails' spans and stay hop-free (clean parallel rails).
    const order = shared.slice().sort((a, b) => railTop[a] - railTop[b]);
    const railX = {};
    order.forEach((n, i) => { railX[n] = side * (RAIL_DX + i * RAIL_STEP); });
    const termX = side * (shared.length
        ? RAIL_DX + (shared.length - 1) * RAIL_STEP + TERM_GAP : TERM_DX);
    const coilBot = Math.min(...placed.map((p) => p.bot));
    const base = coilBot - RAIL_DROP;
    const rails = { x: railX, top: railTop, shared, base };

    const lines = order.map(
        (n) => `  \\draw[thick] (${f(railX[n])},${f(railTop[n])}) -- (${f(railX[n])},${f(base)}) node[below]{${n}};`,
    );
    for (const p of placed) {
        lines.push(...windingLines(p, coilX, side, termX, rails));
    }
    return [lines, coilBot, shared.length ? base : coilBot, { railX, railTop, shared, base, termX }];
}

function chassisSymbol(x, yBar) {
    const lines = [`  \\draw[thick] (${f(x - CHASSIS_W)},${f(yBar)}) -- (${f(x + CHASSIS_W)},${f(yBar)});`];
    for (const xs of [x - CHASSIS_W, x, x + CHASSIS_W]) {
        lines.push(`  \\draw[thick] (${f(xs)},${f(yBar)}) -- (${f(xs - CHASSIS_HATCH)},${f(yBar - CHASSIS_HATCH * 1.25)});`);
    }
    return lines;
}

function shieldLines(shields, sideOf, sideMeta, coilLow, coreBot) {
    const lines = [];
    const slots = { '-1': 0, 1: 0 };     // dash slots used per side (outermost first)
    const pinRows = { '-1': 0, 1: 0 };   // pin leads already routed per side
    const chassisX = [];
    const dashTop = TOP + SHIELD_OVER;
    const dashBot = coilLow - SHIELD_OVER;
    const isChassis = (sh) => ((sh.connection || {}).type || '').toLowerCase() === 'chassis';
    // Pin-terminated shields take the outer slots so their horizontal leads
    // start outside every chassis stem and cross nothing.
    const ordered = shields.slice().sort((a, b) => isChassis(a) - isChassis(b));
    for (const sh of ordered) {
        const side = sideOf[(sh.betweenWindings || [])[0]] || -1;
        const x = side * (SHIELD_DX - slots[side] * SHIELD_STEP);
        slots[side] += 1;
        lines.push(`  % shield ${sh.name !== undefined ? sh.name : '?'}`);
        lines.push(`  \\draw[thick, dashed] (${f(x)},${f(dashTop)}) -- (${f(x)},${f(dashBot)});`);
        if (isChassis(sh)) {
            chassisX.push(x);
        } else {
            const pin = (sh.connection || {}).pinName;
            const label = pin === undefined || pin === null || String(pin) === '' ? '?' : String(pin);
            const y = coilLow - SHIELD_DROP - pinRows[side] * SHIELD_ROW;
            pinRows[side] += 1;
            const metas = sideMeta[side];
            const termX = metas.length
                ? side * Math.max(...metas.map((m) => Math.abs(m.termX))) : side * TERM_DX;
            const crosses = [];
            for (const m of metas) {
                for (const n of m.shared) {
                    if (between(x, termX, m.railX[n]) && inSpan(y, m.railTop[n], m.base)) {
                        crosses.push(m.railX[n]);
                    }
                }
            }
            lines.push(`  \\draw[thick] (${f(x)},${f(dashBot)}) -- (${f(x)},${f(y)});`);
            lines.push(hline(x, termX, y, crosses, label, side < 0 ? 'left' : 'right'));
        }
    }
    if (chassisX.length === 1) {
        const yBar = coreBot - CHASSIS_DY;
        lines.push(`  \\draw[thick] (${f(chassisX[0])},${f(dashBot)}) -- (${f(chassisX[0])},${f(yBar)});`);
        lines.push(...chassisSymbol(chassisX[0], yBar));
    } else if (chassisX.length > 1) {
        // Join all chassis-terminated shields to a single chassis-ground symbol.
        const joinY = coreBot - CHASSIS_JOIN;
        const xMid = (Math.min(...chassisX) + Math.max(...chassisX)) / 2;
        for (const x of chassisX) {
            lines.push(`  \\draw[thick] (${f(x)},${f(dashBot)}) -- (${f(x)},${f(joinY)});`);
        }
        lines.push(`  \\draw[thick] (${f(Math.min(...chassisX))},${f(joinY)}) -- (${f(Math.max(...chassisX))},${f(joinY)});`);
        lines.push(`  \\draw[thick] (${f(xMid)},${f(joinY)}) -- (${f(xMid)},${f(joinY - 0.2)});`);
        lines.push(...chassisSymbol(xMid, joinY - 0.2));
    }
    return lines;
}

function groupWindings(coil_) {
    const buckets = {};
    for (const wind of coil_.functionalDescription || []) {
        const key = (wind.isolationSide || 'primary').toLowerCase();
        if (!(key in buckets)) buckets[key] = [];
        buckets[key].push(wind);
    }
    return buckets;
}

function crossGroupShared(groups) {
    const usage = {};
    for (const [, windings] of groups) {
        const nodes = new Set();
        for (const wind of windings) for (const n of ends(wind)) nodes.add(n);
        for (const node of nodes) usage[node] = (usage[node] || 0) + 1;
    }
    return Object.keys(usage).filter((n) => usage[n] >= 2).sort();
}

/**
 * Build a standalone TikZ schematic for a MAS `coil` (`mas.magnetic.coil`).
 * @param {object} coil_ object carrying `functionalDescription[]` with per-winding
 *   `name`, `isolationSide` and `connections[].pinName`.
 * @param {Array} [shielding] `designRequirements.shielding` entries (`betweenWindings`,
 *   `connection.type`/`pinName`, `name`). Defaults to a `shielding` key embedded in
 *   `coil_` so playground JSON can carry shields without a second input.
 * @returns {string} a complete `\begin{tikzpicture}...\end{tikzpicture}`.
 */
export function coilToTikz(coil_, shielding = coil_.shielding) {
    const groups = Object.entries(groupWindings(coil_))
        .sort((a, b) => sideIndex(a[0]) - sideIndex(b[0]));
    const body = [];
    let coilLow = TOP;
    let rightY = TOP;            // cursor for stacking the right-hand groups
    const sideOf = {};           // winding name -> -1 (left of core) / +1 (right)
    const sideMeta = { '-1': [], 1: [] };  // per-side group rails + terminal columns
    for (const [sideName, windings] of groups) {
        const side = sideName === 'primary' ? -1 : +1;
        let lines; let low; let meta;
        if (side < 0) {
            [lines, low, , meta] = renderGroup(windings, -1, TOP);
        } else {
            let lowPoint;
            [lines, low, lowPoint, meta] = renderGroup(windings, +1, rightY);
            rightY = lowPoint - ROW_GAP;
        }
        for (const wind of windings) {
            if (wind.name !== undefined) sideOf[wind.name] = side;
        }
        sideMeta[side].push(meta);
        body.push(...lines);
        coilLow = Math.min(coilLow, low);
    }

    const cross = crossGroupShared(groups);
    if (cross.length) {
        const repr = `[${cross.map((s) => `'${s}'`).join(', ')}]`;
        body.push(`  % NOTE: cross-group shared node(s) ${repr} not drawn as wires (v1)`);
    }

    const coreTop = TOP + 0.4;
    const coreBot = coilLow - 0.3;
    if ((shielding || []).length) {
        body.push(...shieldLines(shielding, sideOf, sideMeta, coilLow, coreBot));
    }
    const core = [
        `  \\draw[line width=1.4pt] (${f(-CORE_GAP)},${f(coreTop)}) -- (${f(-CORE_GAP)},${f(coreBot)});`,
        `  \\draw[line width=1.4pt] (${f(CORE_GAP)},${f(coreTop)}) -- (${f(CORE_GAP)},${f(coreBot)});`,
    ];
    const head = [
        '\\usetikzlibrary{decorations.pathmorphing}',
        '\\begin{tikzpicture}[coil/.style={decorate, decoration='
        + '{coil, aspect=0.5, segment length=4pt, amplitude=6pt}}]',
    ];
    return head.concat(core, body, ['\\end{tikzpicture}']).join('\n') + '\n';
}
