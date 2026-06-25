
import * as Comlink from 'comlink';

let _mvbpp = null;
let _initPromise = null;

// mvbpp.js is compiled with MODULARIZE=1 (UMD) without EXPORT_ES6.
// In a module worker there is no importScripts(), so we fetch the script
// text and wrap it in new Function() to capture the createMvbpp factory.
//
// Paths are anchored on Vite's BASE_URL (always ends with "/") so they
// resolve against the deployed sub-path (e.g. "/el-choker/") instead of
// the server root. Without this, dev returns the 404 page "The server is
// configured with a public base URL of …" which then crashes
// new Function() with "Unexpected identifier 'server'".
const BASE = import.meta.env.BASE_URL;
async function init() {
    if (_initPromise) return _initPromise;
    _initPromise = (async () => {
        try {
            const code = await (await fetch(`${BASE}wasm/mvbpp.js`)).text();
            const createMvbpp = new Function(code + '\nreturn createMvbpp;')();
            _mvbpp = await createMvbpp({ locateFile: (f) => `${BASE}wasm/${f}` });
        } catch (e) {
            _initPromise = null;
            console.error('[MVB Worker] init failed:', e);
            throw e;
        }
    })();
    return _initPromise;
}

function toBuffer(u8) {
    if (!u8 || !u8.length) return null;
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}

function decodeWasmException(mod, e) {
    if (typeof e === 'number') {
        const tries = [];
        if (mod) {
            if (typeof mod.getExceptionMessage === 'function') {
                try {
                    const r = mod.getExceptionMessage(e);
                    if (r) return Array.isArray(r) ? r.join(': ') : String(r);
                } catch (err) { tries.push(`getExceptionMessage:${err && err.message}`); }
            }
            if (typeof mod.getCppExceptionMessage === 'function') {
                try { const r = mod.getCppExceptionMessage(e); if (r) return String(r); }
                catch (err) { tries.push(`getCppExceptionMessage:${err && err.message}`); }
            }
            if (typeof mod.UTF8ToString === 'function') {
                try {
                    const msg = mod.UTF8ToString(e);
                    if (msg && msg.length > 0 && msg.length < 512 && /^[\x20-\x7e\n\t]+$/.test(msg)) {
                        return msg;
                    }
                } catch (err) { tries.push(`utf8:${err && err.message}`); }
            }
        }
        return `WASM exception ptr=${e}` + (tries.length ? ` [tries: ${tries.join(', ')}]` : '');
    }
    if (e instanceof Error) {
        const msg = e.message || '';
        if (msg && (msg.startsWith('[mvbpp]') || msg.startsWith('[MVB]')
                    || msg.includes('ctor failed') || msg.includes('schema'))) {
            return msg;
        }
        return msg || e.stack || String(e);
    }
    return String(e);
}

// ── Unified-API plumbing ────────────────────────────────────────────────────
// New MVB++ binding signature for every drawXxx (STEP/STL builder):
//   drawXxx(json, mode, plane, offset, format, scale, polygonSegments, symmetry, side)
//
// The frontend's old worker exposed STL-specific helpers
// (buildCoreSTL/buildSpacersSTL/...). We keep those names but route them
// through the unified API so call-sites do not need to be rewritten.

const DEFAULTS = {
    scale:   1.0,
    wireSeg: 16,
    coreSeg: 32,
    binary:  true,            // STL only — kept for API compatibility
};

function o(opts) { return { ...DEFAULTS, ...opts }; }

function symmetryToken(planes) {
    // 0 = full, 1 = half, 2 = quarter (matches old buildXxxSTL semantics).
    if (!planes) return 'none';
    if (planes === 1) return 'half';
    if (planes === 2) return 'quarter';
    return 'none';
}

function callDraw(name, fn, args, { quiet = false } = {}) {
    try {
        return toBuffer(fn(...args));
    } catch (e) {
        const msg = decodeWasmException(_mvbpp, e);
        if (!quiet) {
            console.error(`[MVB Worker] ${name} failed:`, msg, 'raw:', e);
        }
        const err = new Error(`[MVB] ${name}: ${msg}`);
        err.mvbMessage = msg;
        throw err;
    }
}

// "Optional component absent" markers thrown by deliver()/builders when the
// magnetic legitimately has no spacers / no PCB / etc. Treated as null by
// callers, not as errors.
const ABSENT_PATTERNS = [
    'STL export produced empty output',
    'filtered out all geometry',
    'no SPACER',
    'no PCB',
    'no FR4',
];
function isAbsentGeometry(e) {
    const m = String(e && (e.mvbMessage || e.message) || e);
    return ABSENT_PATTERNS.some(p => m.includes(p));
}

function hasSpacerEntries(magnetic) {
    const gd = magnetic?.core?.geometricalDescription
            ?? magnetic?.core?.geometrical_description;
    if (!Array.isArray(gd)) return false;
    return gd.some(e => {
        const t = (e?.type || '').toString().toLowerCase();
        return t === 'spacer' || t.includes('spacer');
    });
}

function hasPrintedWinding(magnetic) {
    const groups = magnetic?.coil?.groupsDescription
                ?? magnetic?.coil?.groups_description;
    if (!Array.isArray(groups) || !groups.length) return false;
    const t = (groups[0]?.type || '').toString().toLowerCase();
    return t === 'printed';
}

function inlineBobbin(magnetic) {
    const b = magnetic?.coil?.bobbin;
    if (!b || typeof b !== 'object') return null;
    if (!b.processedDescription && !b.processed_description) return null;
    return b;
}

function timed(name, fn) {
    return async (...args) => {
        const t0 = performance.now();
        const result = await fn(...args);
        console.log(`[MVB] ${name} took ${(performance.now() - t0).toFixed(0)}ms`);
        return result;
    };
}

// ── STL/STEP builders (legacy names → unified API) ──────────────────────────

Comlink.expose({
    waitReady: () => init(),

    // Whole magnetic in one call
    buildMagneticSTL: timed('buildMagneticSTL', async (magnetic, opts = {}) => {
        await init();
        const d = o(opts);
        const sym = symmetryToken(opts.symmetryPlanes);
        const side = opts.side ?? '';
        return callDraw('drawMagnetic[stl]', _mvbpp.drawMagnetic, [
            JSON.stringify(magnetic), '3D', 'XY', 0.0, 'stl',
            d.scale, d.coreSeg, sym, side,
            true,  // paintCoating: draw turns at OUTER (insulation) diameter (ABT #7)
        ]);
    }),

    buildMagneticSTEP: async (magnetic, opts = {}) => {
        await init();
        const d = o(opts);
        const sym = symmetryToken(opts.symmetryPlanes);
        const side = opts.side ?? '';
        return callDraw('drawMagnetic[step]', _mvbpp.drawMagnetic, [
            JSON.stringify(magnetic), '3D', 'XY', 0.0, 'step',
            d.scale, d.coreSeg, sym, side,
            true,  // paintCoating: draw turns at OUTER (insulation) diameter (ABT #7)
        ]);
    },

    // Core only (drawCore now accepts a Magnetic JSON and enriches itself)
    buildCoreSTL: timed('buildCoreSTL', async (magnetic, opts = {}) => {
        await init();
        const d = o(opts);
        const sym = symmetryToken(opts.symmetryPlanes);
        const side = opts.side ?? '';
        return callDraw('drawCore[stl]', _mvbpp.drawCore, [
            JSON.stringify(magnetic), '3D', 'XY', 0.0, 'stl',
            d.scale, d.coreSeg, sym, side,
        ]);
    }),

    // Single physical piece of the core (one half-set of a two-piece concentric
    // set; the whole ring for a toroid). Takes a CoreShape (with dimensions),
    // not a magnetic — drawCorePiece builds exactly one piece from the shape.
    buildCorePieceSTL: timed('buildCorePieceSTL', async (shape, opts = {}) => {
        await init();
        const d = o(opts);
        return callDraw('drawCorePiece[stl]', _mvbpp.drawCorePiece, [
            JSON.stringify(shape), '3D', 'XY', 0.0, 'stl',
            d.scale, d.coreSeg, 'none', '',
        ]);
    }),

    buildSpacersSTL: timed('buildSpacersSTL', async (magnetic, opts = {}) => {
        await init();
        // Most magnetics have no spacers — short-circuit before touching WASM
        // so we don't trigger the "filtered out all geometry" exception path.
        if (!hasSpacerEntries(magnetic)) return null;
        const d = o(opts);
        const sym = symmetryToken(opts.symmetryPlanes);
        const side = opts.side ?? '';
        try {
            return callDraw('drawSpacer[stl]', _mvbpp.drawSpacer, [
                JSON.stringify(magnetic), '3D', 'XY', 0.0, 'stl',
                d.scale, d.coreSeg, sym, side,
            ], { quiet: true });
        } catch (e) {
            if (isAbsentGeometry(e)) return null;
            throw e;
        }
    }),

    buildBobbinSTL: timed('buildBobbinSTL', async (magnetic, opts = {}) => {
        await init();
        // Pull the bobbin sub-object directly. We deliberately do NOT enrich
        // the whole magnetic here — enrichment can fail for unrelated reasons
        // (missing wire references, incomplete coil, etc.) and a missing
        // bobbin is a legitimate "nothing to draw" state, not an error.
        const bobbin = inlineBobbin(magnetic);
        if (!bobbin) return null;
        const d = o(opts);
        const sym = symmetryToken(opts.symmetryPlanes);
        const side = opts.side ?? '';
        try {
            return callDraw('drawBobbin[stl]', _mvbpp.drawBobbin, [
                JSON.stringify(bobbin), '3D', 'XY', 0.0, 'stl',
                d.scale, d.coreSeg, sym, side,
            ], { quiet: true });
        } catch (e) {
            if (isAbsentGeometry(e)) return null;
            throw e;
        }
    }),

    buildTurnsSTL: timed('buildTurnsSTL', async (magnetic, opts = {}) => {
        await init();
        const d = o(opts);
        const sym = symmetryToken(opts.symmetryPlanes);
        const side = opts.side ?? '';
        // drawTurns now accepts either a JSON array of MAS::Turn objects
        // (concentric only) or a full Magnetic JSON (required for toroidal
        // turns since they need bobbin context). Always pass the magnetic
        // so both layouts work uniformly.
        const turns = magnetic?.coil?.turnsDescription
                   ?? magnetic?.coil?.turns_description;
        if (!turns || !turns.length) return null;
        return callDraw('drawTurns[stl]', _mvbpp.drawTurns, [
            JSON.stringify(magnetic), '3D', 'XY', 0.0, 'stl',
            d.scale, d.wireSeg, sym, side,
            true,  // paintCoating: draw turns at OUTER (insulation) diameter (ABT #7)
        ]);
    }),

    buildFR4BoardSTL: timed('buildFR4BoardSTL', async (magnetic, opts = {}) => {
        await init();
        // Only PRINTED (planar) coils have an FR4 board — short-circuit
        // otherwise to avoid noisy "filtered out all geometry" exceptions.
        if (!hasPrintedWinding(magnetic)) return null;
        const d = o(opts);
        const sym = symmetryToken(opts.symmetryPlanes);
        const side = opts.side ?? '';
        try {
            return callDraw('drawBoard[stl]', _mvbpp.drawBoard, [
                JSON.stringify(magnetic), '3D', 'XY', 0.0, 'stl',
                d.scale, d.coreSeg, sym, side,
            ], { quiet: true });
        } catch (e) {
            if (isAbsentGeometry(e)) return null;
            throw e;
        }
    }),

    // ── Metadata ─────────────────────────────────────────────────────────────

    getSupportedFamilies: async () => {
        await init();
        return Array.from(_mvbpp.getSupportedFamilies());
    },

    // ── 2D dimensioned drawings (SVG strings) ───────────────────────────────
    // The new API has a single drawView(json, dimensions, plane, offset,
    // widthPx, format) — old plane-specific helpers map to it.
    // MVB++ convention: front view = XZ plane, top view = XY plane.

    drawDimensionedFrontView: async (magnetic, widthPx = 800, labelPx = 14, projColor = '#000000', dimColor = '#1976d2') => {
        await init();
        try {
            return _mvbpp.drawDimensionedView(JSON.stringify(magnetic), 'XZ', widthPx, labelPx, projColor, dimColor);
        } catch (e) {
            const msg = decodeWasmException(_mvbpp, e);
            console.error('[MVB Worker] drawView[front] failed:', msg, 'raw:', e);
            throw new Error('[MVB] drawDimensionedFrontView: ' + msg);
        }
    },

    drawDimensionedTopView: async (magnetic, widthPx = 800, labelPx = 14, projColor = '#000000', dimColor = '#1976d2') => {
        await init();
        try {
            return _mvbpp.drawDimensionedView(JSON.stringify(magnetic), 'XY', widthPx, labelPx, projColor, dimColor);
        } catch (e) {
            const msg = decodeWasmException(_mvbpp, e);
            console.error('[MVB Worker] drawView[top] failed:', msg, 'raw:', e);
            throw new Error('[MVB] drawDimensionedTopView: ' + msg);
        }
    },

    // No dedicated gapping technical drawing in the new API — emit the
    // dimensioned front view, which now also annotates gaps.
    drawCoreGappingTechnicalDrawing: async (magnetic, widthPx = 800, labelPx = 14, projColor = '#000000', dimColor = '#1976d2') => {
        await init();
        try {
            return _mvbpp.drawDimensionedView(JSON.stringify(magnetic), 'XZ', widthPx, labelPx, projColor, dimColor);
        } catch (e) {
            const msg = decodeWasmException(_mvbpp, e);
            console.error('[MVB Worker] drawView[gapping] failed:', msg, 'raw:', e);
            throw new Error('[MVB] drawCoreGappingTechnicalDrawing: ' + msg);
        }
    },

    drawCoreProjection: async (magnetic, plane = 'XZ', _coreSeg = 32, widthPx = 800, _strokeWidth = 1.5, _strokeColor = '#000000') => {
        await init();
        return _mvbpp.drawView(JSON.stringify(magnetic), false, plane, 0.0, widthPx, 'svg');
    },

    drawCoreCrossSection: async (magnetic, plane = 'XZ', sectionOffset = 0, _coreSeg = 32, widthPx = 800, _strokeWidth = 1.5, _strokeColor = '#000000') => {
        await init();
        return _mvbpp.drawView(JSON.stringify(magnetic), false, plane, sectionOffset, widthPx, 'svg');
    },

    drawAssemblyProjection: async (magnetic, plane = 'XZ', _components = 7, _symmetryPlanes = 0, _wireSeg = 16, _coreSeg = 32, widthPx = 800, _strokeWidth = 1.5, _strokeColor = '#000000') => {
        await init();
        return _mvbpp.drawView(JSON.stringify(magnetic), false, plane, 0.0, widthPx, 'svg');
    },

    drawAssemblyCrossSection: async (magnetic, plane = 'XZ', sectionOffset = 0, _components = 7, _symmetryPlanes = 0, _wireSeg = 16, _coreSeg = 32, widthPx = 800, _strokeWidth = 1.5, _strokeColor = '#000000') => {
        await init();
        return _mvbpp.drawView(JSON.stringify(magnetic), false, plane, sectionOffset, widthPx, 'svg');
    },
});

init().catch(() => {});
