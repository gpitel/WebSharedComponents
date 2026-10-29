// Where the components' warnings and errors go (a calculation that failed, a plot MKF refused, an
// adviser that found nothing). A host with a log of its own (the web app's Engine log) registers a
// sink at start-up, before mounting: every notice is then sent there and none is drawn inline over
// or inside the cards (Alf, 2026-10-22). A host that registers none keeps the inline messages.

let sink = null;

// sink: (level, source, message) => void; level is 'WARNING' or 'ERROR'.
export function setNoticeSink(fn) {
    if (typeof fn !== 'function') {
        throw new Error(`setNoticeSink needs a function, got ${typeof fn}`);
    }
    sink = fn;
}

// Whether components draw their notices themselves.
export function noticesShownInline() {
    return sink == null;
}

export function reportNotice(level, source, message) {
    if (level !== 'WARNING' && level !== 'ERROR') {
        throw new Error(`Unknown notice level '${level}'`);
    }
    if (typeof message !== 'string' || message.trim() === '') return;
    if (sink != null) sink(level, source, message.trim());
}
