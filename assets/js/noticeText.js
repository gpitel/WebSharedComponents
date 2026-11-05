// What a user reads of a failure. An error reaches the components as text that went through
// several hands: MKF's exception ("[MISSING_DATA] ...", or "Temperature::createBobbinNodes: ..."),
// the WASM reply ("Exception: ..."), a JS Error ("Error: ...", a stack trace), a wrapper naming
// the engine method ("MKF get_settings: ..."). The user needs only what happened and what to do;
// everything else is kept as the detail (a tooltip, and what is copied for a bug report).
//
// Only transport is removed here. What MKF says is MKF's to word: its messages are never
// rewritten by matching their text.

// A message that carries its own technical part after this separator (MKF's "No steady
// temperature: ... Details: loss loop at iterate ...", the MAS sentry's raw schema report) keeps
// only the part before it; the rest is the detail.
export const DETAILS_SEPARATOR = ' Details: ';

const LEADING_TRANSPORT = /^(?:Uncaught\s+)?(?:Error|Exception|TypeError|RangeError|ReferenceError):\s*/;
const ENGINE_METHOD = /^MKF [a-z_][a-z0-9_]*:\s*/;
const ERROR_CODE = /^\[([A-Z][A-Z0-9_]*)\]\s*/;
const JSON_ERROR = /^\[(json\.exception\.[a-z_]+\.\d+)\]\s*/;
// "Temperature::createBobbinNodes: ", "Temperature::resolveLateralPlacement (magnetic 'X'): "
const CPP_ORIGIN = /^((?:[A-Za-z_]\w*::)+~?[A-Za-z_]\w*)(?:\s*\([^)]*\))?:\s*/;
// "[mvbpp] parseEnriched[autocomplete]: ", "[mvbpp] build_toroidal_turn: "
const MODULE_ORIGIN = /^\[(mvbpp|MVB Worker|mkf|MKF)\]\s*(?:[A-Za-z_][\w[\]]*:\s*)?/;
// What a C++ standard exception says when nothing above it said more.
const STD_EXCEPTION = /^(?:std::)?(?:bad_optional_access|bad_variant_access|bad_alloc|bad_function_call|out_of_range|invalid_argument|length_error|logic_error|runtime_error)$/;

function withoutStack(text) {
    const stackAt = text.search(/\n\s*at\s/);
    return (stackAt >= 0 ? text.slice(0, stackAt) : text).trim();
}

// Removes the transport in front of one clause; returns what it found.
function stripClause(clause, found) {
    let text = clause;
    for (;;) {
        let match;
        if ((match = text.match(LEADING_TRANSPORT)) || (match = text.match(ENGINE_METHOD))) {
            text = text.slice(match[0].length);
        }
        else if ((match = text.match(ERROR_CODE))) {
            found.codes.push(match[1]);
            text = text.slice(match[0].length);
        }
        else if ((match = text.match(JSON_ERROR))) {
            found.codes.push(match[1]);
            found.unreadable = true;
            text = text.slice(match[0].length);
        }
        else if ((match = text.match(CPP_ORIGIN)) || (match = text.match(MODULE_ORIGIN))) {
            found.origins.push(match[1]);
            text = text.slice(match[0].length);
        }
        else {
            return text;
        }
    }
}

function capitalized(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The readable part of a failure and what was taken out of it.
 * @param {unknown} raw an Error, or the text of one
 * @returns {{message: string, code: string|null, detail: string|null}}
 *   message: what the user reads; code: the first engine error code ("MISSING_DATA"), if any;
 *   detail: the full text (without the stack trace) when something was taken out, else null.
 */
export function describeFailure(raw) {
    const original = withoutStack(String(raw?.message ?? raw ?? ''));
    const found = { codes: [], origins: [], unreadable: false };

    let summary = original;
    let ownDetails = null;
    const detailsAt = summary.indexOf(DETAILS_SEPARATOR);
    if (detailsAt >= 0) {
        ownDetails = summary.slice(detailsAt + DETAILS_SEPARATOR.length).trim();
        summary = summary.slice(0, detailsAt).trim();
    }

    // A wrapper may put its own words before the engine's ("... could not analyse the simulated
    // results: Exception: [X] ..."): the transport is removed from every clause, not only the first.
    const clauses = summary.split(/(?<=: |; )/);
    let message = clauses.map((clause) => stripClause(clause, found)).join('').trim();
    // "Exception: Exception: X" leaves nothing between two separators.
    message = message.replace(/(: |; )(?=: |; )/g, '');

    if (STD_EXCEPTION.test(message)) {
        message = `The engine stopped on an internal error (${message}). Please report this design.`;
    }
    else if (found.unreadable) {
        message = `The engine could not read this design: ${message}`;
    }
    message = capitalized(message);

    const removed = found.codes.length > 0 || found.origins.length > 0 || ownDetails != null || found.unreadable;
    return {
        message,
        code: found.codes[0] ?? null,
        detail: removed && original !== message ? original : null,
    };
}
