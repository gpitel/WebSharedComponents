
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

// ── 3D STL builders ─────────────────────────────────────────────────────────
// All functions take a full magnetic object (not individual geometry parts).

export async function buildMagneticSTL(magnetic, opts = {}) {
    const api = await waitForMvb();
    return api.buildMagneticSTL(magnetic, opts);
}

export async function buildMagneticSTEP(magnetic, opts = {}) {
    const api = await waitForMvb();
    return api.buildMagneticSTEP(magnetic, opts);
}

export async function buildCoreSTL(magnetic, opts = {}) {
    const api = await waitForMvb();
    return api.buildCoreSTL(magnetic, opts);
}

// Build one physical piece of the core from a CoreShape (with dimensions):
// a single half-set for a two-piece concentric core, the whole ring for a toroid.
export async function buildCorePieceSTL(shape, opts = {}) {
    const api = await waitForMvb();
    return api.buildCorePieceSTL(shape, opts);
}

export async function buildSpacersSTL(magnetic, opts = {}) {
    const api = await waitForMvb();
    return api.buildSpacersSTL(magnetic, opts);
}

export async function buildBobbinSTL(magnetic, opts = {}) {
    const api = await waitForMvb();
    return api.buildBobbinSTL(magnetic, opts);
}

export async function buildTurnsSTL(magnetic, opts = {}) {
    const api = await waitForMvb();
    return api.buildTurnsSTL(magnetic, opts);
}

export async function buildFR4BoardSTL(magnetic, opts = {}) {
    const api = await waitForMvb();
    return api.buildFR4BoardSTL(magnetic, opts);
}

// ── Metadata ────────────────────────────────────────────────────────────────

export async function getSupportedFamilies() {
    const api = await waitForMvb();
    return api.getSupportedFamilies();
}

// ── 2D dimensioned drawings (returns SVG string) ────────────────────────────

export async function drawDimensionedFrontView(magnetic, widthPx = 800, labelPx = 14, projColor = '#000000', dimColor = '#0000ff') {
    const api = await waitForMvb();
    return api.drawDimensionedFrontView(magnetic, widthPx, labelPx, projColor, dimColor);
}

export async function drawDimensionedTopView(magnetic, widthPx = 800, labelPx = 14, projColor = '#000000', dimColor = '#0000ff') {
    const api = await waitForMvb();
    return api.drawDimensionedTopView(magnetic, widthPx, labelPx, projColor, dimColor);
}

export async function drawCoreGappingTechnicalDrawing(magnetic, widthPx = 800, labelPx = 14, projColor = '#000000', dimColor = '#0000ff') {
    const api = await waitForMvb();
    return api.drawCoreGappingTechnicalDrawing(magnetic, widthPx, labelPx, projColor, dimColor);
}

export async function drawCoreProjection(magnetic, plane = 'XZ', coreSeg = 32, widthPx = 800, strokeWidth = 1.5, strokeColor = '#000000') {
    const api = await waitForMvb();
    return api.drawCoreProjection(magnetic, plane, coreSeg, widthPx, strokeWidth, strokeColor);
}

export async function drawCoreCrossSection(magnetic, plane = 'XZ', sectionOffset = 0, coreSeg = 32, widthPx = 800, strokeWidth = 1.5, strokeColor = '#000000') {
    const api = await waitForMvb();
    return api.drawCoreCrossSection(magnetic, plane, sectionOffset, coreSeg, widthPx, strokeWidth, strokeColor);
}

export async function drawAssemblyProjection(magnetic, plane = 'XZ', components = 7, symmetryPlanes = 0, wireSeg = 16, coreSeg = 32, widthPx = 800, strokeWidth = 1.5, strokeColor = '#000000') {
    const api = await waitForMvb();
    return api.drawAssemblyProjection(magnetic, plane, components, symmetryPlanes, wireSeg, coreSeg, widthPx, strokeWidth, strokeColor);
}

export async function drawAssemblyCrossSection(magnetic, plane = 'XZ', sectionOffset = 0, components = 7, symmetryPlanes = 0, wireSeg = 16, coreSeg = 32, widthPx = 800, strokeWidth = 1.5, strokeColor = '#000000') {
    const api = await waitForMvb();
    return api.drawAssemblyCrossSection(magnetic, plane, sectionOffset, components, symmetryPlanes, wireSeg, coreSeg, widthPx, strokeWidth, strokeColor);
}
