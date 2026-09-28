import { useSettingsStore } from '/src/stores/settings'

/**
 * Unit system (ABT #1099): an interpretation layer over SI storage.
 *
 * Every value in MAS and in the stores stays SI. When the user's profile says
 * `imperial`, the LENGTH family (m, m², m³), temperature (°C) and mass (kg, g)
 * are entered and shown in inch / mil / ft, °F and oz / lb; electrical
 * quantities stay SI as in every electronics tool. An "entry" is one display
 * unit: `value` is the SI amount of one display unit (a multiplier, as the
 * SI-prefix entries of DimensionUnit), `offset` is the display reading of
 * SI zero (temperature only).
 *
 *   display = si / value + offset          si = (display - offset) * value
 */

export const UNIT_SYSTEMS = {
    si: 'SI (mm, °C, kg)',
    imperial: 'Imperial (in, mil, °F, lb)',
};

const INCH = 0.0254;

// `minReading`: the smallest reading a unit is picked for automatically
// (default 1). Inches are read down to 0.05 in — 17 mm is "0.67 in", not
// "670 mil"; mil is for the sub-millimetre world of gaps and foils.
const IMPERIAL_ENTRIES = {
    'm':  [{ label: 'mil', value: INCH / 1000 }, { label: 'in', value: INCH, minReading: 0.05 }, { label: 'ft', value: 12 * INCH }],
    'm²': [{ label: 'in²', value: INCH * INCH }],
    'm³': [{ label: 'in³', value: INCH * INCH * INCH }],
    '°C': [{ label: '°F', value: 5 / 9, offset: 32 }],
    'kg': [{ label: 'oz', value: 0.028349523125 }, { label: 'lb', value: 0.45359237 }],
    'g':  [{ label: 'oz', value: 28.349523125 }, { label: 'lb', value: 453.59237 }],
};

/** The active unit system; "si" when the settings store carries no preference yet. */
export function unitSystem() {
    const preferences = useSettingsStore().userPreferences;
    return preferences?.unitSystem ?? 'si';
}

export function isImperial() {
    return unitSystem() === 'imperial';
}

/**
 * Display entries for a SI unit under the active system, or null when the
 * unit is not converted (electrical quantities, or SI mode) — callers then
 * fall back to the SI-prefix behaviour.
 */
export function displayEntries(unit) {
    if (unit == null || !isImperial()) return null;
    return IMPERIAL_ENTRIES[unit] ?? null;
}

export function toDisplay(valueSI, entry) {
    return valueSI / entry.value + (entry.offset ?? 0);
}

export function fromDisplay(display, entry) {
    return (display - (entry.offset ?? 0)) * entry.value;
}

export function entryByValue(entries, value) {
    const entry = entries.find((e) => e.value === value);
    if (entry == null) {
        throw new Error(`Unit system: no display unit with multiplier ${value} among ${entries.map((e) => e.label).join(', ')}`);
    }
    return entry;
}

/**
 * The entry that reads best for a SI value: the largest unit whose reading is
 * at least its `minReading` (so 0.004 in reads as 4 mil, 17 mm as 0.67 in,
 * 30 in as 2.5 ft), the smallest unit otherwise; zero and offset units use
 * the first entry.
 */
export function bestEntry(valueSI, entries) {
    if (entries.length === 1 || valueSI === 0 || !Number.isFinite(valueSI)) return entries[0];
    let best = entries[0];
    for (const entry of entries) {
        if (entry.offset != null) return entry;
        if (Math.abs(valueSI) / entry.value >= (entry.minReading ?? 1)) best = entry;
    }
    return best;
}

/**
 * {label, unit} for read-only text (the formatUnit shape). Returns null when
 * the unit is not converted so the caller keeps its SI formatting.
 */
export function formatInUnitSystem(valueSI, unit, precision = 0.001) {
    const entries = displayEntries(unit);
    if (entries == null) return null;
    const entry = bestEntry(valueSI, entries);
    const display = toDisplay(valueSI, entry);
    const rounded = Math.round(display / precision) * precision;
    return { label: Number(rounded.toFixed(6)), unit: entry.label };
}
