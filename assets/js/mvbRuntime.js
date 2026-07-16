
import * as Comlink from 'comlink';

let worker = null;
let workerApi = null;
let isInitialized = false;
let initPromise = null;

export async function initMvbWorker() {
    if (initPromise) return initPromise;
    if (isInitialized && workerApi) return workerApi;

    initPromise = (async () => {
        try {
            const WorkerConstructor = await import('./mvbWorker.js?worker');
            worker = new WorkerConstructor.default();
            workerApi = Comlink.wrap(worker);
            await workerApi.waitReady();
            isInitialized = true;
            return workerApi;
        } catch (e) {
            console.error('[MVB Runtime] Worker initialization failed:', e);
            initPromise = null;
            throw e;
        }
    })();

    return initPromise;
}

export function terminateWorker() {
    if (worker) {
        worker.terminate();
        worker = null; workerApi = null; isInitialized = false; initPromise = null;
    }
}

export async function waitForMvb() {
    if (!initPromise) return initMvbWorker();
    return initPromise;
}

// A WASM trap (memory access out of bounds, unreachable, ...) poisons the
// Emscripten instance: every later call on the same worker fails or hangs, so
// one bad geometry used to leave every visualizer of the session stuck on its
// loading gif (web bug reports #135-137/#145). Detect fatal traps and restart
// the worker so only the offending draw fails.
const FATAL_WASM_ERROR = /memory access out of bounds|unreachable|index out of bounds|function signature mismatch|null function|RuntimeError|Aborted/i;

async function callMvb(method, args) {
    const api = await waitForMvb();
    try {
        return await api[method](...args);
    } catch (e) {
        if (FATAL_WASM_ERROR.test(String(e?.message ?? e))) {
            console.error(`[MVB Runtime] ${method} crashed the WASM instance; restarting worker:`, e);
            terminateWorker();
        }
        throw e;
    }
}

// ── 3D STL builders ─────────────────────────────────────────────────────────
// All functions take a full magnetic object (not individual geometry parts).

export async function buildMagneticSTL(magnetic, opts = {}) {
    return callMvb('buildMagneticSTL', [magnetic, opts]);
}

export async function buildMagneticSTEP(magnetic, opts = {}) {
    return callMvb('buildMagneticSTEP', [magnetic, opts]);
}

export async function buildCoreSTL(magnetic, opts = {}) {
    return callMvb('buildCoreSTL', [magnetic, opts]);
}

// Build one physical piece of the core from a CoreShape (with dimensions):
// a single half-set for a two-piece concentric core, the whole ring for a toroid.
export async function buildCorePieceSTL(shape, opts = {}) {
    return callMvb('buildCorePieceSTL', [shape, opts]);
}

export async function buildSpacersSTL(magnetic, opts = {}) {
    return callMvb('buildSpacersSTL', [magnetic, opts]);
}

export async function buildBobbinSTL(magnetic, opts = {}) {
    return callMvb('buildBobbinSTL', [magnetic, opts]);
}

export async function buildTurnsSTL(magnetic, opts = {}) {
    return callMvb('buildTurnsSTL', [magnetic, opts]);
}

export async function buildFR4BoardSTL(magnetic, opts = {}) {
    return callMvb('buildFR4BoardSTL', [magnetic, opts]);
}

// ── Metadata ────────────────────────────────────────────────────────────────

export async function getSupportedFamilies() {
    return callMvb('getSupportedFamilies', []);
}

// ── 2D dimensioned drawings (returns SVG string) ────────────────────────────

export async function drawDimensionedFrontView(magnetic, widthPx = 800, labelPx = 14, projColor = '#000000', dimColor = '#0000ff') {
    return callMvb('drawDimensionedFrontView', [magnetic, widthPx, labelPx, projColor, dimColor]);
}

export async function drawDimensionedTopView(magnetic, widthPx = 800, labelPx = 14, projColor = '#000000', dimColor = '#0000ff') {
    return callMvb('drawDimensionedTopView', [magnetic, widthPx, labelPx, projColor, dimColor]);
}

export async function drawCoreGappingTechnicalDrawing(magnetic, widthPx = 800, labelPx = 14, projColor = '#000000', dimColor = '#0000ff') {
    return callMvb('drawCoreGappingTechnicalDrawing', [magnetic, widthPx, labelPx, projColor, dimColor]);
}

export async function drawCoreProjection(magnetic, plane = 'XZ', coreSeg = 32, widthPx = 800, strokeWidth = 1.5, strokeColor = '#000000') {
    return callMvb('drawCoreProjection', [magnetic, plane, coreSeg, widthPx, strokeWidth, strokeColor]);
}

export async function drawCoreCrossSection(magnetic, plane = 'XZ', sectionOffset = 0, coreSeg = 32, widthPx = 800, strokeWidth = 1.5, strokeColor = '#000000') {
    return callMvb('drawCoreCrossSection', [magnetic, plane, sectionOffset, coreSeg, widthPx, strokeWidth, strokeColor]);
}

export async function drawAssemblyProjection(magnetic, plane = 'XZ', components = 7, symmetryPlanes = 0, wireSeg = 16, coreSeg = 32, widthPx = 800, strokeWidth = 1.5, strokeColor = '#000000') {
    return callMvb('drawAssemblyProjection', [magnetic, plane, components, symmetryPlanes, wireSeg, coreSeg, widthPx, strokeWidth, strokeColor]);
}

export async function drawAssemblyCrossSection(magnetic, plane = 'XZ', sectionOffset = 0, components = 7, symmetryPlanes = 0, wireSeg = 16, coreSeg = 32, widthPx = 800, strokeWidth = 1.5, strokeColor = '#000000') {
    return callMvb('drawAssemblyCrossSection', [magnetic, plane, sectionOffset, components, symmetryPlanes, wireSeg, coreSeg, widthPx, strokeWidth, strokeColor]);
}
