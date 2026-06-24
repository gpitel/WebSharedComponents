// Fire-and-forget design telemetry. Initialised once by the host app (main.js
// via initTelemetry). Captures the magnetic DESIGN (MAS) the user produces,
// finalises, or exports — so we can analyse which topologies, inputs and
// magnetic designs people actually use, and tell intermediate working state
// apart from finished designs (see `stage`).
//
// Design goals:
//  - Never break the app: every path is guarded and swallows its own errors.
//  - No export blind spots: the shared download() helpers call recordExport()
//    so EVERY downloaded artifact is captured without per-component wiring.
//  - Privacy: only a tab-scoped session UUID is sent — no user/email/IP.

let _ctx = null;

// Event types that represent a FINISHED design: the user either reached a
// report/summary page (which they can simply screenshot) or exported a file.
// Everything else is intermediate working state.
const FINAL_EVENTS = new Set(['design_report', 'design_export']);

// ctx: { axios, sessionId, environment, appVersion, masProvider }
//   masProvider: () => the current global MAS object (or null).
export function initTelemetry(ctx) {
    _ctx = ctx;
}

function _post(body) {
    if (!_ctx || !_ctx.axios) return;                 // not in an app context (e.g. unit tests)
    const endpoint = import.meta.env.VITE_API_ENDPOINT;
    if (!endpoint) return;                            // no backend configured
    try {
        _ctx.axios.post(endpoint + '/telemetry', {
            session_id: _ctx.sessionId || 'unknown',
            environment: _ctx.environment || 'production',
            app_version: _ctx.appVersion || null,
            ...body,
        }).catch(() => {});                           // fire-and-forget
    } catch (_) { /* telemetry must never break the app */ }
}

function topologyOf(mas) {
    return (mas && mas.inputs && mas.inputs.designRequirements &&
            mas.inputs.designRequirements.topology) || null;
}

// Mirror a worthy interaction to Umami (product analytics), separate from the
// design DB above. Lightweight props only — never the full MAS. No-ops when
// Umami isn't loaded; and Umami's own `data-domains="openmagnetics.com"` means
// it only records on production, so dev/localhost is never tracked there.
function trackUmami(eventName, props) {
    try {
        if (typeof window !== 'undefined' && window.umami &&
            typeof window.umami.track === 'function') {
            window.umami.track(eventName, props);
        }
    } catch (_) { /* analytics must never break the app */ }
}

// Record a design event carrying the full MAS. `mas` defaults to the current
// design from the registered provider; pass it explicitly for tools that work
// on a local MAS (e.g. cross-referencers). `stage` is derived from the event
// type unless overridden.
export function recordDesign({ event_type, source, mas, stage, topology, result_count = null }) {
    const masData = (mas !== undefined)
        ? mas
        : (_ctx && _ctx.masProvider ? _ctx.masProvider() : null);
    const resolvedStage = stage || (FINAL_EVENTS.has(event_type) ? 'final' : 'intermediate');
    const resolvedTopology = topology || topologyOf(masData);
    _post({
        event_type,
        source,
        stage: resolvedStage,
        topology: resolvedTopology,
        result_count,
        mas_data: masData || undefined,
    });
    // Same worthy interaction, mirrored to Umami (production-only, lightweight).
    trackUmami(event_type, { source, stage: resolvedStage, topology: resolvedTopology });
}

// Auto-called by the shared download()/downloadBase64asPDF() helpers so every
// exported artifact is captured as a final design — no export path is a blind
// spot. Skips when there is no meaningful design on screen.
export function recordExport(fileName) {
    const mas = _ctx && _ctx.masProvider ? _ctx.masProvider() : null;
    if (!mas || (!mas.magnetic && !mas.inputs)) return;
    const ext = (fileName && fileName.includes('.'))
        ? fileName.split('.').pop().toLowerCase()
        : 'file';
    recordDesign({ event_type: 'design_export', source: 'export/' + ext, mas });
}
