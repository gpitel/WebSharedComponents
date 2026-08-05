/**
 * Accessors for `coil.bobbin`, which MAS allows in four shapes.
 *
 * MAS types it as `Array<Bobbin | string> | Bobbin | string`:
 *   - a Bobbin object              -- a single bobbin, typically on the centre column
 *   - a string                     -- a bobbin referenced by name, or the "Dummy" sentinel
 *   - an array of either           -- per-column bobbins for multi-column magnetics
 *   - absent
 *
 * The array form is MAS "Convention A": `bobbin[i]` is mounted on
 * `core.columns[i]`, with index 0 the centre/main column. A two-leg UI core
 * therefore carries two bobbins, one per leg.
 *
 * Most callers only ever wanted "the bobbin whose winding window I am about to
 * measure", and reached for `coil.bobbin.processedDescription...` directly.
 * That throws once `bobbin` is an array, because an array has no
 * `processedDescription` -- and it threw *silently past* the usual
 * `bobbin != "Dummy"` guard, since an array is also != "Dummy".
 *
 * These helpers return null instead of throwing when the requested bobbin, its
 * processed description, or the window does not exist. For the scalar form they
 * resolve to exactly what the old direct property access produced, so
 * converting a call site cannot change single-bobbin behaviour.
 */

/**
 * Every bobbin entry as an array, whatever shape `coil.bobbin` has.
 * @param {object} coil - a MAS Coil
 * @returns {Array} the entries; empty if there is no bobbin at all
 */
export function bobbinEntries(coil) {
    const bobbin = coil?.bobbin;
    if (bobbin == null) {
        return [];
    }
    return Array.isArray(bobbin) ? bobbin : [bobbin];
}

/**
 * How many bobbins the coil declares. 0 when there is none or only a
 * name/sentinel string, so callers can branch on "is there real bobbin data".
 * @param {object} coil - a MAS Coil
 * @returns {number}
 */
export function bobbinCount(coil) {
    return bobbinEntries(coil).filter(entry => entry != null && typeof entry === 'object').length;
}

/**
 * The bobbin object governing a column, or null.
 *
 * A string entry ("Dummy", or a catalogue name not yet expanded) is not an
 * object and yields null: there is nothing to measure yet.
 *
 * @param {object} coil - a MAS Coil
 * @param {number} bobbinIndex - Convention A column index, 0 = centre/main
 * @returns {object|null}
 */
export function governingBobbin(coil, bobbinIndex = 0) {
    const entry = bobbinEntries(coil)[bobbinIndex];
    return (entry != null && typeof entry === 'object') ? entry : null;
}

/**
 * A governing bobbin's processedDescription, or null.
 * @param {object} coil - a MAS Coil
 * @param {number} bobbinIndex - Convention A column index, 0 = centre/main
 * @returns {object|null}
 */
export function bobbinProcessed(coil, bobbinIndex = 0) {
    return governingBobbin(coil, bobbinIndex)?.processedDescription ?? null;
}

/**
 * One winding window off a governing bobbin, or null.
 *
 * Note the two indices address different things: `bobbinIndex` picks the
 * bobbin (i.e. the core column it sits on), `windowIndex` picks a window
 * within that bobbin -- a 2-chamber bobbin has two windows of its own.
 *
 * @param {object} coil - a MAS Coil
 * @param {number} windowIndex - index into that bobbin's windingWindows
 * @param {number} bobbinIndex - Convention A column index, 0 = centre/main
 * @returns {object|null}
 */
export function bobbinWindow(coil, windowIndex = 0, bobbinIndex = 0) {
    const windows = bobbinProcessed(coil, bobbinIndex)?.windingWindows;
    if (!Array.isArray(windows)) {
        return null;
    }
    return windows[windowIndex] ?? null;
}

/**
 * Every winding window across every bobbin, flattened, in Convention A order.
 * A group's `windingWindow` index is defined against the governing bobbin or
 * core processed description, so callers resolving a group to a concrete window
 * across per-leg bobbins want this ordering.
 *
 * @param {object} coil - a MAS Coil
 * @returns {Array<object>}
 */
export function allBobbinWindows(coil) {
    const windows = [];
    bobbinEntries(coil).forEach((entry, index) => {
        const own = bobbinProcessed(coil, index)?.windingWindows;
        if (Array.isArray(own)) {
            windows.push(...own);
        }
    });
    return windows;
}
