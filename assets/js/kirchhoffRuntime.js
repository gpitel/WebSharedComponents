// kirchhoffRuntime.js - main-thread accessor for the webKirchhoff WASM module (converter models).
//
// Mirrors mkfRuntime.js, but for libKirchhoff. Converter design + ngspice simulation moved OUT of
// webMKF (now magnetics-only) into webKirchhoff. taskQueue.js / the wizards used to call per-topology
// webMKF functions (calculate_<topo>_inputs, simulate_<topo>_ideal_waveforms,
// generate_<topo>_ngspice_circuit). webKirchhoff replaced those with ONE generic entry point per verb
// (process_converter / design_tas / generate_ngspice_circuit). To avoid touching ~60 call sites, the
// proxy returned by waitForKirchhoff() ALSO understands the OLD per-topology names and reshapes the
// new output back into the legacy contract:
//   * calculate_<topo>_inputs(spec)         -> MAS::Inputs at the JSON root + a `<topo>Diagnostics` sibling
//   * calculate_advanced_<topo>_inputs(spec)-> same (advanced == same call; the spec differs, not the fn)
//   * simulate_<topo>_ideal_waveforms(spec) -> { ...inputs, converterWaveforms: [] }
//   * generate_<topo>_ngspice_circuit(spec, ivIdx, opIdx) -> ngspice deck string
// Raw Kirchhoff::api names (process_converter, design_tas, generate_ngspice_circuit, simulate_ngspice,
// extract_operating_point, topology_waveforms, diagnostics, main_magnetic_inputs, generate_ltspice_circuit)
// are forwarded 1:1. determine_pfc_mode is translated through the shared spec builder. Anything
// else (e.g. simulate_flyback_with_magnetic, process_current_transformer) returns an
// "Exception: ..." string so the caller's
// existing `result.startsWith('Exception')` check throws loudly instead of silently faking a result.

import * as Comlink from 'comlink';

let kh = null;
let khProxy = null;
let worker = null;
let resolveReady;
let ready = new Promise((resolve) => { resolveReady = resolve; });
let lastWasmJsUrl = null;

// Watchdog for the ngspice Simulated path. Some topologies (KH-side, tracked in ABTs) can make
// the in-wasm ngspice run fail to converge and spin forever; because the Embind call is synchronous
// in the worker, a hung run would block the worker for EVERY later call. On timeout we terminate the
// worker (killing the hung run), re-init a fresh one, and surface a loud error — never a fake result.
const KH_SIMULATE_WATCHDOG_MS = 90_000;

// Raw Kirchhoff::api surface (from KirchhoffApi.hpp / libKirchhoff.cpp) — forwarded verbatim.
// The component-designer sims (simulate_cmc_*, simulate_dmc_*, verify_dmc_attenuation) keep their
// old webMKF names and signatures on purpose (KH matched them), so they MUST be listed here —
// otherwise parseLegacyName() would swallow e.g. simulate_cmc_ideal_waveforms as a converter alias.
const RAW_KH_METHODS = new Set([
    'design_tas',
    'design_tas_full',
    'generate_ngspice_circuit',
    'generate_ltspice_circuit',
    'simulate_ngspice',
    'extract_operating_point',
    'topology_waveforms',
    'component_waveforms',
    'diagnostics',
    'main_magnetic_inputs',
    'process_converter',
    'design_magnetic_inputs',
    'design_cmc',
    'design_dmc',
    'propose_dmc_design',
    'design_current_transformer',
    'verify_dmc_attenuation',
]);

// Component-designer sims that keep their old webMKF names/signatures but return the KH envelope
// ({success, inputs:{operatingPoints}, converterWaveforms, ...}) — the legacy contract has
// operatingPoints at the ROOT (ConverterWizardBase.processSimulationWaveforms reads it there).
const KH_COMPONENT_SIMS = new Set([
    'simulate_cmc_ideal_waveforms',
    'simulate_cmc_lisn_waveforms',
    'simulate_dmc_waveforms',
]);

// Legacy per-topology "mid" token (from calculate_<mid>_inputs) -> webKirchhoff lowercase topology name
// accepted by process_converter / design_tas (see KirchhoffApi.cpp tas_builders()).
const LEGACY_MID_TO_TOPOLOGY = {
    flyback: 'flyback',
    buck: 'buck',
    boost: 'boost',
    sepic: 'sepic',
    cuk: 'cuk',
    zeta: 'zeta',
    four_switch_buck_boost: 'fsbb',
    weinberg: 'weinberg',
    clllc: 'clllc',
    single_switch_forward: 'forward',
    forward: 'forward',
    two_switch_forward: 'two_switch_forward',
    active_clamp_forward: 'acf',
    push_pull: 'push_pull',
    isolated_buck: 'isolated_buck',
    isolated_buck_boost: 'isolated_buck_boost',
    dab: 'dab',
    llc: 'llc',
    cllc: 'cllc',
    psfb: 'psfb',
    pshb: 'pshb',
    ahb: 'ahb',
    src: 'src',
    vienna: 'vienna',
    pfc: 'pfc',
};

// Which `<x>Diagnostics` sibling key(s) each wizard reads off the calculate_*_inputs result. The KH
// `diagnostics` object is attached under all of them (plus a generic `diagnostics`) so the wizard's
// read-only diagnostics panel finds its key. (Field-level shape of KH diagnostics vs the old MKF
// per-topology diagnostics is NOT guaranteed to match — see the handover notes.)
const LEGACY_MID_TO_DIAG_KEYS = {
    flyback: ['flybackDiagnostics'],
    buck: ['buckDiagnostics'],
    boost: ['boostDiagnostics'],
    sepic: ['sepicDiagnostics'],
    cuk: ['cukDiagnostics'],
    zeta: ['zetaDiagnostics'],
    four_switch_buck_boost: ['fsbbDiagnostics'],
    weinberg: ['weinbergDiagnostics'],
    clllc: ['clllcDiagnostics'],
    single_switch_forward: ['singleSwitchForwardDiagnostics', 'forwardDiagnostics'],
    forward: ['forwardDiagnostics', 'singleSwitchForwardDiagnostics'],
    two_switch_forward: ['twoSwitchForwardDiagnostics'],
    active_clamp_forward: ['activeClampForwardDiagnostics'],
    push_pull: ['pushPullDiagnostics'],
    isolated_buck: ['isolatedBuckDiagnostics'],
    isolated_buck_boost: ['isolatedBuckBoostDiagnostics', 'buckBoostDiagnostics'],
    dab: ['dabDiagnostics'],
    llc: ['llcDiagnostics'],
    cllc: ['cllcDiagnostics'],
    psfb: ['psfbDiagnostics'],
    pshb: ['pshbDiagnostics'],
    ahb: ['ahbDiagnostics'],
    src: ['srcDiagnostics'],
    vienna: ['viennaDiagnostics'],
    pfc: ['pfcDiagnostics'],
};

// Parse a legacy per-topology webMKF function name into {mid, verb}. Returns null for names that are
// not a legacy converter alias.
function parseLegacyName(name) {
    let m;
    if ((m = /^calculate_advanced_(.+)_inputs$/.exec(name))) return { mid: m[1], verb: 'inputs' };
    if ((m = /^calculate_(.+)_inputs$/.exec(name)))          return { mid: m[1], verb: 'inputs' };
    if (name === 'simulate_pfc_waveforms')                   return { mid: 'pfc', verb: 'waveforms' };
    if ((m = /^simulate_(.+)_ideal_waveforms$/.exec(name)))  return { mid: m[1], verb: 'waveforms' };
    if ((m = /^generate_(.+)_ngspice_circuit$/.exec(name)))  return { mid: m[1], verb: 'spice' };
    if (name === 'process_current_transformer')              return { mid: 'current_transformer', verb: 'component' };
    return null;
}

// ── Legacy wizard params → Kirchhoff converter spec ─────────────────────────────────────────────
// The wizards' buildParams() payloads predate webKirchhoff; the engine consumes the spec envelope
// documented in Kirchhoff docs/SPEC.md ({designRequirements, operatingPoints, config}). This is the
// single translation point. Mirrors Kirchhoff web/src/topologies.js::buildSpec (the canonical
// reference implementation). Payloads that already carry designRequirements pass through untouched.

// Wrap a scalar as {nominal} — dimensional objects pass through. SPEC §1: dimensional fields accept
// either, but inputVoltage should keep its full {minimum,nominal,maximum} triplet (corner sizing).
function khDim(v) {
    if (v == null) return undefined;
    return typeof v === 'object' ? v : { nominal: v };
}

// Collapse a dimensional to its NOMINAL per SPEC resolution: nominal → (min+max)/2 → max → min.
function khNominal(v) {
    if (v == null) return undefined;
    if (typeof v !== 'object') return v;
    if (v.nominal != null) return v.nominal;
    if (v.minimum != null && v.maximum != null) return (v.minimum + v.maximum) / 2;
    return v.maximum != null ? v.maximum : v.minimum;
}

// forward / push_pull / weinberg read the pri:sec ratio at turnsRatios[1] (index 0 is the 1:1
// demag / second-primary winding) — SPEC §3.
const KH_TURNS_RATIO_AT_INDEX_1 = new Set(['forward', 'single_switch_forward', 'push_pull', 'weinberg']);

// Topologies whose engine understands a PER-RAIL sign on designRequirements.outputs[i].voltage
// (Kirchhoff ABT #904). For these the rail's sign is forwarded verbatim: KH designs from |Vout| and
// mirrors only the output side, so a -12 V rail simulates at -12 V and a mixed +5 / +12 / -12 design
// is one converter. (KH picks the mirror per output stage: relabel the terminals where there is an
// output inductor, reverse the rectifier diodes for a capacitor-output rectifier.)
//
// Everything else keeps the historical magnitude-only contract: dab / cllc / clllc drive ACTIVE
// BRIDGES, where polarity is the gate pattern rather than device orientation, and they THROW on a
// negative rail; cuk / isolated_buck_boost are inherently inverting and flip the sign engine-side
// themselves (SPEC: "send positive magnitude"), so forwarding a negative there would double-negate.
const KH_SIGNED_OUTPUT_TOPOLOGIES = new Set([
    'flyback', 'forward', 'two_switch_forward', 'push_pull', 'acf', 'llc', 'src',
]);

// Every rectifier name a wizard can send. An unknown one THROWS — it used to be dropped
// silently, so the engine designed its own default rectifier: the SRC wizard's
// 'fullBridgeDiode' / 'centerTappedDiode' and the AHB wizard's 'ahbFlyback' never reached
// Kirchhoff (the SRC defaulted to centre-tapped, the AHB flyback variant ran as full bridge).
const KH_RECTIFIER_TYPES = {
    'fullBridge': 'fullBridge', 'Full Bridge': 'fullBridge', 'fullBridgeDiode': 'fullBridge',
    'centerTapped': 'centerTapped', 'Center Tapped': 'centerTapped', 'centerTappedDiode': 'centerTapped',
    'currentDoubler': 'currentDoubler', 'Current Doubler': 'currentDoubler',
    'voltageDoubler': 'voltageDoubler', 'Voltage Doubler': 'voltageDoubler',
    'ahbFlyback': 'ahbFlyback',
};

// PFC conduction mode (config.mode): the wizard's MAS names -> the canonical names KH
// normalize_pfc_mode returns. An unmapped mode throws in buildKhConverterSpec.
const KH_PFC_MODES = {
    'continuousConductionMode': 'ccm',
    'discontinuousConductionMode': 'dcm',
    'criticalConductionMode': 'crm',
};

// Primary bridge (config.bridgeType, Kirchhoff ABT #91). Only the engines that read it: SRC and LLC
// (cfg::full_bridge_selected). It was never forwarded, so both always designed a HALF bridge — the SRC
// wizard's full-bridge default got n ≈ 3.8 instead of ≈ 8.3 for 400 V → 48 V.
const KH_BRIDGE_TYPES = {
    'fullBridge': 'fullBridge', 'Full Bridge': 'fullBridge',
    'halfBridge': 'halfBridge', 'Half Bridge': 'halfBridge',
};
const KH_BRIDGE_TYPE_TOPOLOGIES = new Set(['src', 'llc']);

// The wizard's ripple ratio (currentRippleRatio) lands on the config key each Kirchhoff topology
// actually reads (Kirchhoff src/<Topology>.cpp, cfg::get(d.config, <key>, ...)). It used to go to
// config.rippleRatio for every topology, which only buck and boost read: every other topology
// silently designed with its own default ripple. The 2-inductor topologies (sepic / cuk / zeta /
// weinberg) size their main (input) inductor L1 from l1RippleRatio. A topology missing here THROWS
// when a wizard sends a ripple ratio, so a new wizard cannot drop it again.
const KH_RIPPLE_RATIO_KEY = {
    buck: 'rippleRatio',
    boost: 'rippleRatio',
    flyback: 'inductorRippleRatio',
    forward: 'inductorRippleRatio',
    two_switch_forward: 'inductorRippleRatio',
    acf: 'inductorRippleRatio',
    push_pull: 'inductorRippleRatio',
    isolated_buck: 'inductorRippleRatio',
    isolated_buck_boost: 'inductorRippleRatio',
    fsbb: 'inductorRippleRatio',
    vienna: 'inductorRippleRatio',
    sepic: 'l1RippleRatio',
    cuk: 'l1RippleRatio',
    zeta: 'l1RippleRatio',
    weinberg: 'l1RippleRatio',
    pfc: 'currentRippleFraction',
};

// The wizard's maximum duty cycle, per the key each topology reads. Flyback / forward / two-switch
// forward / push-pull read maxDutyCycle (the duty at Vin_min that sizes the turns ratio). The active
// clamp forward reads the same quantity as operatingDutyCycle ("MAX forward duty, occurs at
// Vin_min", Acf.cpp). The AHB reads maximumDutyCycle as a limit on its operating duty (Ahb.cpp).
// It used to go to config.maxDutyCycle for every topology, so the ACF and AHB dropped it.
const KH_MAX_DUTY_KEY = {
    flyback: 'maxDutyCycle',
    forward: 'maxDutyCycle',
    two_switch_forward: 'maxDutyCycle',
    push_pull: 'maxDutyCycle',
    acf: 'operatingDutyCycle',
    ahb: 'maximumDutyCycle',
};

// Switch-stress limits (KirchhoffConfig.hpp check_maximum_switch_current /
// check_maximum_drain_source_voltage; buck / boost / zeta also SIZE the inductor from the current
// limit). Same key for every topology. Neither was forwarded before.
const KH_SWITCH_LIMIT_KEYS = ['maximumSwitchCurrent', 'maximumDrainSourceVoltage'];

function khConfigKey(table, what, topology) {
    const key = table[topology];
    if (key == null) {
        throw new Error(`webKirchhoff: the wizard sent ${what} for ${topology}, but no Kirchhoff config key is mapped for it`);
    }
    return key;
}

function khFiniteNumber(value, what, topology) {
    const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    if (typeof n !== 'number' || !Number.isFinite(n)) {
        throw new Error(`webKirchhoff: ${what} for ${topology} must be a number, got ${JSON.stringify(value)}`);
    }
    return n;
}

// ── One operating point per input voltage the user entered (ABT #2160) ─────────────────────────
// Kirchhoff evaluates ONE operating point per call (operatingPoints[0]). Legacy MKF
// (Topology::collect_input_voltages, before MKF 3e0261fd) evaluated the converter at every input
// voltage the user entered, in the order Nominal, Minimum, Maximum, and never at a made-up
// midpoint. The web runtime reproduces that: one call per entered voltage.
const KH_INPUT_VOLTAGE_POINTS = [
    ['nominal', 'Nom.'],
    ['minimum', 'Min.'],
    ['maximum', 'Max.'],
];

// The input voltage the spec carries, with the wizard aliases resolved: CLLLC names it
// highVoltageBusVoltage; the Vienna wizard carries the LINE-TO-LINE grid voltage while SPEC wants
// per-phase line RMS (V_phase = V_LL / √3). `display` is the voltage as the wizard shows it.
function khResolveInputVoltage(topology, params) {
    let inputVoltage = params.inputVoltage != null ? params.inputVoltage : params.highVoltageBusVoltage;
    let display = inputVoltage;
    if (inputVoltage == null && topology === 'vienna' && params.lineToLineVoltage != null) {
        const vll = params.lineToLineVoltage;
        const scale = (x) => (x == null ? undefined : x / Math.sqrt(3));
        inputVoltage = typeof vll === 'object'
            ? { minimum: scale(vll.minimum), nominal: scale(vll.nominal), maximum: scale(vll.maximum) }
            : scale(vll);
        display = vll;
    }
    return { inputVoltage, display };
}

function khFormatVolts(v) {
    return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(4)));
}

/**
 * The operating points the wizard asked for: one per input voltage the user entered, in the
 * legacy order Nominal, Minimum, Maximum. Never a synthesized midpoint.
 * @returns {Array<{key: string, label: string, value: number, name: string}>}
 */
export function khInputVoltagePoints(topology, params) {
    const { inputVoltage, display } = khResolveInputVoltage(topology, params);
    if (inputVoltage == null) {
        throw new Error('The input voltage is empty. Enter at least one of its Nom., Min. or Max. values.');
    }
    const asObject = (v) => (typeof v === 'object' ? v : { nominal: v });
    const values = asObject(inputVoltage);
    const shown = asObject(display);
    const points = KH_INPUT_VOLTAGE_POINTS
        .filter(([key]) => values[key] != null)
        .map(([key, label]) => {
            const value = khFiniteNumber(values[key], `input voltage ${key}`, topology);
            const shownValue = khFiniteNumber(shown[key], `input voltage ${key}`, topology);
            return { key, label, value, name: `${label} input (${khFormatVolts(shownValue)} V)` };
        });
    if (!points.length) {
        throw new Error('The input voltage is empty. Enter at least one of its Nom., Min. or Max. values.');
    }
    return points;
}

// The duty cycle the user typed in "I know the design I want" (Forward x3, Flyback, Push-Pull,
// Isolated Buck-Boost) is keyed by the input voltage it belongs to: {nominal?, minimum?, maximum?}.
// It reaches Kirchhoff on the operating point of that input voltage, as Kirchhoff's duty pin
// spec.config.forcedDutyCycle (0 < D < 1, the main-switch command at operatingPoints[0]). Kirchhoff
// holds the load, so the delivered output voltage becomes a RESULT (diagnostics.forcedDutyCycle and
// diagnostics.outputs[{name, requestedVoltage, voltage, power}]). An empty duty row lets Kirchhoff
// derive the duty from the turns ratio at that voltage. Accepted only by these topologies:
const KH_DUTY_PIN_KEY = 'forcedDutyCycle';
const KH_DUTY_PIN_TOPOLOGIES = new Set(['flyback', 'forward', 'two_switch_forward', 'acf', 'push_pull', 'isolated_buck_boost']);
const KH_UI_FIELD_NAMES = { nominal: 'Nom.', minimum: 'Min.', maximum: 'Max.' };

function khDutyCyclesByInputVoltage(topology, params) {
    const duty = params.desiredDutyCycle;
    if (duty == null) return null;
    if (Array.isArray(duty)) {
        // The old positional form ([[d, d, d]] in min/nom/max order, entries skipped when the
        // matching voltage was missing) cannot say which input voltage a duty belongs to.
        throw new Error(`webKirchhoff: desiredDutyCycle for ${topology} must be keyed by input voltage ({nominal, minimum, maximum}), got ${JSON.stringify(duty)}`);
    }
    const out = {};
    for (const key of Object.keys(duty)) {
        if (!(key in KH_UI_FIELD_NAMES)) {
            throw new Error(`webKirchhoff: desiredDutyCycle for ${topology} has an unknown key '${key}'`);
        }
        if (duty[key] == null) continue;
        out[key] = khFiniteNumber(duty[key], `desiredDutyCycle.${key}`, topology);
    }
    return Object.keys(out).length ? out : null;
}

/**
 * A duty cycle typed for an input voltage the user did not enter (e.g. Duty Cycle Nom. with only
 * Input Voltage Min. and Max.) belongs to no operating point. Returns the message the wizard shows
 * for it, or null when every typed duty has its input voltage. Field names as the UI shows them.
 */
export function dutyCycleWithoutInputVoltageMessage(inputVoltage, dutyCycle) {
    if (dutyCycle == null || typeof dutyCycle !== 'object') return null;
    const voltages = inputVoltage != null && typeof inputVoltage === 'object' ? inputVoltage
        : inputVoltage != null ? { nominal: inputVoltage } : {};
    const orphans = Object.keys(KH_UI_FIELD_NAMES).filter((k) => dutyCycle[k] != null && voltages[k] == null);
    if (!orphans.length) return null;
    const names = orphans.map((k) => KH_UI_FIELD_NAMES[k]).join(' and ');
    return `The Duty Cycle ${names} has no Input Voltage ${names}: a duty cycle applies to the input voltage of `
        + `the same row. Enter the Input Voltage ${names} or clear the Duty Cycle ${names} row.`;
}

/**
 * The wizards' "Duty Cycle" (Nom. / Min. / Max. rows) as the desiredDutyCycle they send: keyed by
 * the input voltage each duty belongs to. Throws the UI message when a duty has no input voltage.
 * Returns undefined when no duty is typed.
 */
export function khDesiredDutyCycle(inputVoltage, dutyCycle) {
    if (dutyCycle == null) return undefined;
    if (typeof dutyCycle !== 'object') {
        throw new Error('The Duty Cycle must be entered per input voltage, in its Nom., Min. or Max. rows.');
    }
    const message = dutyCycleWithoutInputVoltageMessage(inputVoltage, dutyCycle);
    if (message) throw new Error(message);
    const out = {};
    for (const key of Object.keys(KH_UI_FIELD_NAMES)) {
        if (dutyCycle[key] != null) out[key] = dutyCycle[key];
    }
    return Object.keys(out).length ? out : undefined;
}

function khCheckDutyCycles(topology, params) {
    const duties = khDutyCyclesByInputVoltage(topology, params);
    if (!duties) return null;
    const { inputVoltage } = khResolveInputVoltage(topology, params);
    const message = dutyCycleWithoutInputVoltageMessage(inputVoltage, duties);
    if (message) throw new Error(message);
    return duties;
}

export function buildKhConverterSpec(topology, params, point = null) {
    if (params.designRequirements) return params;   // already the KH envelope

    const op0 = (params.operatingPoints || [])[0] || {};

    // Output rails: buck family sends scalars in operatingPoints[0], the isolated families send
    // arrays, PFC sends top-level outputVoltage/outputPower, some wizards only carry
    // outputsParameters. cuk / isolated_buck_boost invert — SPEC wants the magnitude.
    let volts = [], amps = [];
    if (Array.isArray(op0.outputVoltages)) {
        volts = op0.outputVoltages;
        amps = op0.outputCurrents || [];
    } else if (op0.outputVoltage != null) {
        volts = [op0.outputVoltage];
        amps = [op0.outputCurrent];
    } else if (Array.isArray(params.outputsParameters)) {
        volts = params.outputsParameters.map(o => o.voltage);
        amps = params.outputsParameters.map(o => (o.current != null ? o.current : (o.voltage ? o.power / o.voltage : 0)));
    } else if (params.outputVoltage != null) {
        volts = [params.outputVoltage];
        amps = [params.outputCurrent != null ? params.outputCurrent
              : (params.outputPower != null && params.outputVoltage ? params.outputPower / params.outputVoltage : 0)];
    }

    const { inputVoltage } = khResolveInputVoltage(topology, params);

    const isAc = topology === 'pfc' || topology === 'vienna';
    const signedOutputs = KH_SIGNED_OUTPUT_TOPOLOGIES.has(topology);
    const dr = {
        inputType: topology === 'pfc' ? 'acSinglePhase' : topology === 'vienna' ? 'acThreePhase' : 'dc',
        inputVoltage: khDim(inputVoltage),
        switchingFrequency: khDim(params.switchingFrequency != null ? params.switchingFrequency : op0.switchingFrequency),
        outputs: volts.map((v, i) => ({
            name: i === 0 ? 'out' : `out${i + 1}`,
            voltage: { nominal: signedOutputs ? v : Math.abs(v) },
            regulation: 'voltage',
        })),
    };
    if (params.efficiency != null) dr.efficiency = params.efficiency;
    if (isAc) dr.lineFrequency = khDim(params.lineFrequency != null ? params.lineFrequency : 50);
    if (params.isolationVoltage != null) dr.isolationVoltage = params.isolationVoltage;

    // "I know the design" pins — SPEC §3 (MAS designRequirements keys). PFC uses bare `inductance`.
    const pinL = params.desiredMagnetizingInductance != null ? params.desiredMagnetizingInductance
               : params.desiredInductance != null ? params.desiredInductance
               : params.inductance != null ? params.inductance
               : undefined;
    if (pinL != null) dr.magnetizingInductance = khDim(pinL);
    if (Array.isArray(params.desiredTurnsRatios) && params.desiredTurnsRatios.length) {
        const t0 = params.desiredTurnsRatios[0];
        dr.turnsRatios = KH_TURNS_RATIO_AT_INDEX_1.has(topology)
            ? [{ nominal: 1 }, { nominal: t0 }]
            : params.desiredTurnsRatios.map(t => ({ nominal: t }));
    }
    // LLC-only explicit tank pins (override Lr/Cr verbatim) — SPEC §3.
    if (params.desiredResonantInductance != null) dr.desiredResonantInductance = params.desiredResonantInductance;
    if (params.desiredResonantCapacitance != null) dr.desiredResonantCapacitance = params.desiredResonantCapacitance;
    // CLLC tank pins (ABT #1538). KH design_cllc reads the primary Lr1/Cr1 through the LLC keys above and
    // the physical secondary Lr2/Cr2 through desiredSecondaryResonant*; it solves the operating
    // frequency from the tank as pinned, or throws. They were dropped here, so the wizard's
    // "Override ..." inputs changed nothing.
    if (topology === 'cllc') {
        if (params.desiredResonantInductancePrimary != null) dr.desiredResonantInductance = params.desiredResonantInductancePrimary;
        if (params.desiredResonantCapacitancePrimary != null) dr.desiredResonantCapacitance = params.desiredResonantCapacitancePrimary;
        if (params.desiredResonantInductanceSecondary != null) dr.desiredSecondaryResonantInductance = params.desiredResonantInductanceSecondary;
        if (params.desiredResonantCapacitanceSecondary != null) dr.desiredSecondaryResonantCapacitance = params.desiredResonantCapacitanceSecondary;
    }

    const powers = volts.map((v, i) => {
        const p = Math.abs(v) * Math.abs(amps[i] != null ? amps[i] : 0);
        return p > 0 ? p : (params.outputPower != null ? Math.abs(params.outputPower) : p);
    });
    // Without `point` this is the DESIGN spec: one operating point at the nominal input voltage, or
    // (min+max)/2 without one, which is how legacy MKF sized DAB / LLC (Vin_nom, else the midpoint)
    // and what Kirchhoff designed from before ABT #2160. With `point` (one of khInputVoltagePoints)
    // the operating point is that input voltage, carrying the duty typed for it.
    const operatingPoints = [{
        name: point ? point.name : 'full_load',
        inputVoltage: point ? point.value : khNominal(inputVoltage),
        ambientTemperature: op0.ambientTemperature != null ? op0.ambientTemperature
                          : params.ambientTemperature != null ? params.ambientTemperature : 25,
        outputs: dr.outputs.map((o, i) => ({ name: o.name, power: powers[i] })),
    }];
    const pointConfig = {};
    if (point) {
        const duties = khCheckDutyCycles(topology, params);
        if (duties && duties[point.key] != null) {
            if (!KH_DUTY_PIN_TOPOLOGIES.has(topology)) {
                throw new Error('This converter cannot hold a typed Duty Cycle: its duty follows from the turns ratio '
                    + 'at each input voltage. Leave the Duty Cycle rows empty.');
            }
            const d = duties[point.key];
            if (!(d > 0 && d < 1)) {
                throw new Error(`The Duty Cycle ${KH_UI_FIELD_NAMES[point.key]} must be between 0 and 1, got ${d}.`);
            }
            pointConfig[KH_DUTY_PIN_KEY] = d;
        }
    }

    // Optional design knobs — only documented SPEC §4/§5 keys are forwarded.
    const config = {};
    if (params.currentRippleRatio != null) {
        config[khConfigKey(KH_RIPPLE_RATIO_KEY, 'currentRippleRatio', topology)] =
            khFiniteNumber(params.currentRippleRatio, 'currentRippleRatio', topology);
    }
    if (params.maximumDutyCycle != null) {
        config[khConfigKey(KH_MAX_DUTY_KEY, 'maximumDutyCycle', topology)] =
            khFiniteNumber(params.maximumDutyCycle, 'maximumDutyCycle', topology);
    }
    // The rectifier forward drop the wizard asks for (Kirchhoff ComponentRequirements.hpp
    // fixed_diode_drop: config.diodeVoltageDrop, read by every converter). It was never forwarded, so
    // Kirchhoff sized around its own drop instead (the ACF its synchronous-rectifier drop Io·0.01).
    if (params.diodeVoltageDrop != null) {
        config.diodeVoltageDrop = khFiniteNumber(params.diodeVoltageDrop, 'diodeVoltageDrop', topology);
    }
    for (const key of KH_SWITCH_LIMIT_KEYS) {
        if (params[key] != null) config[key] = khFiniteNumber(params[key], key, topology);
    }
    if (params.qualityFactor != null) config.qualityFactor = params.qualityFactor;
    if (params.inductanceRatio != null) config.inductanceRatio = params.inductanceRatio;
    if (params.minSwitchingFrequency != null) config.resonantBandMin = params.minSwitchingFrequency;
    if (params.maxSwitchingFrequency != null) config.resonantBandMax = params.maxSwitchingFrequency;
    // LLC: the wizard's "Resonant frequency" sets the tank resonance (KH design_llc reads
    // config.resonantFrequency). Without it KH resonated the tank at sqrt(fmin*fmax) (ABT #1503).
    // The operating frequency travels as designRequirements.switchingFrequency; in "Help me with the
    // design" KH solves the drive frequency for a pinned turns ratio and driveAtSwitchingFrequency is
    // NOT sent (the I-know forced drive is below, ABT #1539).
    if (topology === 'llc' && params.resonantFrequency != null) config.resonantFrequency = params.resonantFrequency;
    // CLLC: KH design_cllc resonates the tank at designRequirements.switchingFrequency and solves the
    // operating frequency inside [resonantBandMin, resonantBandMax] from the tank gain (or throws).
    // The CLLC wizard's operating frequency travels in operatingPoints[0].switchingFrequency, which
    // KH would take as the tank resonance; the wizard's "Resonant frequency" is the resonance (ABT #1503).
    // ABT #1539, "I know the design I want" (the wizard sends driveAtSwitchingFrequency: true): the
    // operating frequency FORCES the drive. KH drives the tank at exactly designRequirements.switchingFrequency
    // and the output voltage becomes a result (no re-solve; KH throws only for a non-physical point such as a
    // capacitive tank input). The tank resonance then travels as config.resonantFrequency for llc, cllc and src.
    // "Help me with the design" sends no flag: KH solves (llc/cllc) or runs at resonance (src), and the
    // wizard shows the solved frequency from the result.
    const forceDrive = params.driveAtSwitchingFrequency === true
        && (topology === 'llc' || topology === 'cllc' || topology === 'src');
    if (forceDrive) {
        if (!(khNominal(dr.switchingFrequency) > 0)) {
            throw new Error(`webKirchhoff: ${topology} with driveAtSwitchingFrequency needs an operating switching frequency`);
        }
        config.driveAtSwitchingFrequency = true;
        if (params.resonantFrequency != null) config.resonantFrequency = params.resonantFrequency;
    } else if (topology === 'cllc' && params.resonantFrequency != null) {
        dr.switchingFrequency = khDim(params.resonantFrequency);
    }
    // CLLLC "I know the design" tank pins (ABT #1538): MAS clllcResonant.primarySeriesInductance /
    // primaryResonantCapacitance, which KH design_clllc reads from config (Lr2/Cr2 follow through N).
    if (topology === 'clllc') {
        if (params.desiredPrimarySeriesInductance != null) config.primarySeriesInductance = params.desiredPrimarySeriesInductance;
        if (params.desiredPrimaryResonantCapacitance != null) config.primaryResonantCapacitance = params.desiredPrimaryResonantCapacitance;
    }
    if (params.rectifierType != null) {
        const rectifierType = KH_RECTIFIER_TYPES[params.rectifierType];
        if (rectifierType == null) {
            throw new Error(`webKirchhoff: unknown rectifierType '${params.rectifierType}' for ${topology}`);
        }
        config.rectifierType = rectifierType;
    }
    if (params.bridgeType != null && KH_BRIDGE_TYPE_TOPOLOGIES.has(topology)) {
        const bridgeType = KH_BRIDGE_TYPES[params.bridgeType];
        if (bridgeType == null) {
            throw new Error(`webKirchhoff: unknown bridgeType '${params.bridgeType}' for ${topology}`);
        }
        config.bridgeType = bridgeType;
    }
    // PFC/Vienna topology variant + interleave count. Forwarded so the variant sizes distinctly the
    // moment KH's design_pfc reads them (KH ABT #11); harmless keys until then.
    if (params.topologyVariant != null) config.topologyVariant = params.topologyVariant;
    if (params.numberOfPhases != null) config.numberOfPhases = params.numberOfPhases;
    // PFC conduction mode and wide-bandgap switch: KH design_pfc reads config.mode (ccm | dcm | crm |
    // transition) and config.wideBandgapSwitch. Neither was forwarded, so the wizard's DCM/CrM choice
    // changed nothing (KH sized every PFC in CCM) and a Si totem-pole in CCM was never refused.
    if (topology === 'pfc') {
        if (params.mode != null) {
            const mode = KH_PFC_MODES[params.mode];
            if (mode == null) {
                throw new Error(`webKirchhoff: unknown PFC conduction mode '${params.mode}'`);
            }
            config.mode = mode;
        }
        if (params.wideBandgapSwitch != null) {
            if (typeof params.wideBandgapSwitch !== 'boolean') {
                throw new Error(`webKirchhoff: PFC wideBandgapSwitch must be a boolean, got ${JSON.stringify(params.wideBandgapSwitch)}`);
            }
            config.wideBandgapSwitch = params.wideBandgapSwitch;
        }
    }
    // Vienna: KH reads these from `config` (Vienna.cpp cfg::get*(d.config, ...)). They were never
    // forwarded, so the wizard's samplingStrategy was silently dropped and KH fell back to its own
    // default of "fullLineCycle" -- which returns the boost-inductor excitation stamped at the LINE
    // frequency (50 Hz) instead of peak-of-line at the switching frequency. The core adviser then
    // sizes for 50 Hz and finds NOTHING: two users reported "no solution for simple PFC stage" on
    // the same day (web bug reports #173 and #174). Measured on #174's own inputs: 0 cores at the
    // 50 Hz it was handed, 5 cores at 20 kHz. The wizard's default was already 'peakOfLineOnly';
    // it just never reached the engine.
    if (topology === 'vienna') {
        if (params.samplingStrategy != null) config.samplingStrategy = params.samplingStrategy;
        if (params.phaseCount != null) config.phaseCount = params.phaseCount;
        if (params.senseResistance != null) config.senseResistance = params.senseResistance;
        if (params.busCapacitance != null) config.busCapacitance = params.busCapacitance;
    }
    // DAB: KH is SPS-only; `config.dabPhaseShiftDeg` is the outer inter-bridge shift D3 IN DEGREES,
    // valid (0, 180) (SPEC §5 "DAB modulation") — the wizard's innerPhaseShift3 field is already in
    // degrees, so it passes through directly. D1/D2 (EPS/DPS/TPS) stay unexposed engine-side; an
    // out-of-range D3 gets KH's own clear throw, surfaced by the wizard's error banner.
    if (topology === 'dab' && op0.innerPhaseShift3 != null) {
        config.dabPhaseShiftDeg = op0.innerPhaseShift3;
    }
    // Steady-state periods, KH-native form: KH expresses the ngspice window as SECONDS via
    // config.tranStopTime (see web/src/topologies.js buildSpec — settle + shown periods over fsw).
    // Only DC topologies: PFC/Vienna manage their own line-cycle-scale stop times.
    const fswForStop = khNominal(dr.switchingFrequency);
    if (!isAc && fswForStop > 0
        && Number.isFinite(params.numberOfSteadyStatePeriods) && params.numberOfSteadyStatePeriods > 0
        && Number.isFinite(params.numberOfPeriods) && params.numberOfPeriods > 0) {
        config.tranStopTime = (params.numberOfSteadyStatePeriods + params.numberOfPeriods) / fswForStop;
    }

    // Dead time: the wizards send desiredDeadTime (s). Kirchhoff takes it as config.forcedDeadTime
    // (cfg::forced_dead_time, s >= 0) for the Isolated Buck, the dead time between its two switches.
    // Any other topology here has none to set: a non-zero value is never dropped silently (a dead time of
    // 0, the Flyback wizard's default, asks for nothing). The Isolated Buck-Boost has one switch and a
    // diode, so its wizard sends none; a value that still arrives for it throws.
    const deadTimes = [].concat(params.desiredDeadTime ?? []).filter((t) => t != null);
    if (topology === 'isolated_buck') {
        if (deadTimes.length > 1) {
            throw new Error(`webKirchhoff: the Isolated Buck takes one dead time, got ${deadTimes.length} (${JSON.stringify(deadTimes)})`);
        }
        if (deadTimes.length === 1) {
            config.forcedDeadTime = khFiniteNumber(deadTimes[0], 'desiredDeadTime', topology);
        }
    }
    else if (deadTimes.some((t) => Number(t) !== 0)) {
        if (topology === 'isolated_buck_boost') {
            throw new Error('The Isolated Buck-Boost has no dead time to set: it has one switch and a diode. '
                + 'Remove the Dead Time value.');
        }
        throw new Error('The Dead Time you entered cannot be applied: a dead time can be set only for the '
            + 'Isolated Buck. Remove the Dead Time value.');
    }
    Object.assign(config, pointConfig);
    const spec = { designRequirements: dr, operatingPoints };
    if (Object.keys(config).length) spec.config = config;
    return spec;
}

// ── Same design at every input voltage (ABT #2160) ──────────────────────────────────────────────
// Kirchhoff sizes parts of the converter from the operating point's input voltage, so the same
// requirements evaluated at another input voltage give ANOTHER converter (DAB turns ratio 7.50 /
// 8.33 / 9.17 at 360 / 400 / 440 V). Legacy MKF designed once and evaluated that one design at every
// input voltage. So: ONE design call (the spec without a point), then every operating point's spec
// carries that design pinned. Pinned: the main magnetic's inductance and turns ratios, plus the
// other parts each topology lets the spec pin. After every point the pinned values are checked
// against the design; a point that comes back with another design throws.
// The value of one named part in a diagnostics list (extraInductors / capacitors), or undefined when the
// design has no such part. A part that IS listed without a positive, finite value is a broken report: it throws.
function khPartValue(list, name, field, kind) {
    const part = (list || []).find((x) => x.name === name);
    if (!part) return undefined;
    const v = part[field];
    if (!(typeof v === 'number' && Number.isFinite(v) && v > 0)) {
        throw new Error(`webKirchhoff: the design lists ${kind} ${name} with no ${field} (got ${JSON.stringify(v)})`);
    }
    return v;
}
const khInductorList = (diag) => diag.computed?.extraInductors;
const khCapacitorList = (diag) => diag.capacitors;
const khPinnedInductor = (name) => (diag) => khPartValue(khInductorList(diag), name, 'inductance', 'inductor');
const khPinnedCapacitor = (name) => (diag) => khPartValue(khCapacitorList(diag), name, 'capacitance', 'capacitor');

function khOutputCount(spec) {
    const n = spec?.designRequirements?.outputs?.length;
    if (!(n > 0)) throw new Error('webKirchhoff: the spec has no outputs, so its per-output parts cannot be pinned');
    return n;
}

// One part per output, named <base>, <base>2, <base>3, ... in output order (Kirchhoff's Cout / Lout per rail).
// Read as an array, one value per output, which is what Kirchhoff's per-output pins take. A design with the part
// on some outputs only cannot be pinned output by output: it throws.
const khPerOutputPart = (base, list, field, kind) => (diag, spec) => {
    const n = khOutputCount(spec);
    const names = Array.from({ length: n }, (_, i) => (i === 0 ? base : `${base}${i + 1}`));
    const values = names.map((name) => khPartValue(list(diag), name, field, kind));
    const found = values.filter((v) => v != null).length;
    if (found === 0) return undefined;
    if (found !== n) {
        throw new Error(`webKirchhoff: the design reports ${kind}s ${names.filter((_, i) => values[i] != null).join(', ')} `
            + `but has ${n} outputs; expected one ${base} per output`);
    }
    return values;
};
const khPerOutputCapacitor = (base) => khPerOutputPart(base, khCapacitorList, 'capacitance', 'capacitor');
const khPerOutputInductor = (base) => khPerOutputPart(base, khInductorList, 'inductance', 'inductor');

// The energy-budget snubbers (Kirchhoff cfg::snubber_cap). config.snubberCap pins every one of them to ONE value,
// so the design's snubbers (the capacitors whose names match) must share one value, or the pin cannot hold them.
const khSnubberCapacitance = (pattern) => (diag) => {
    const found = (khCapacitorList(diag) || []).filter((c) => pattern.test(c.name))
        .map((c) => [c.name, khPartValue(khCapacitorList(diag), c.name, 'capacitance', 'capacitor')]);
    if (!found.length) return undefined;
    if (found.some(([, v]) => !khSameValue(v, found[0][1]))) {
        throw new Error(`webKirchhoff: the design's energy-budget snubbers differ (${found.map(([n, v]) => `${n} ${khFormatValue(v)}`).join(', ')}), `
            + 'but config.snubberCap pins them all to one value');
    }
    return found[0][1];
};

const khSetDr = (key) => (spec, v) => { spec.designRequirements[key] = v; };
const khSetConfig = (key) => (spec, v) => { spec.config = { ...(spec.config || {}), [key]: v }; };

// topology -> [[what (as the diagnostics card names it), read(diagnostics, spec), write(spec, value)]].
// A part the design does not have (e.g. the AHB flyback variant has no output inductor) is not pinned.
// Per-output parts are read and pinned as one value per output.
const KH_FLYBACK_PINS = [
    ['Output capacitors Cout', khPerOutputCapacitor('Cout'), khSetConfig('outputCapacitance')],
    ['Snubber capacitor Cclmp', khSnubberCapacitance(/^Cclmp$/), khSetConfig('snubberCap')],
];
const KH_FORWARD_PINS = [['Output inductors Lout', khPerOutputInductor('Lout'), khSetConfig('outputInductance')]];
const KH_EXTRA_DESIGN_PINS = {
    flyback: KH_FLYBACK_PINS,
    two_switch_flyback: KH_FLYBACK_PINS,
    active_clamp_flyback: [['Output capacitors Cout', khPerOutputCapacitor('Cout'), khSetConfig('outputCapacitance')]],
    boost: [['Capacitor Cout', khPinnedCapacitor('Cout'), khSetConfig('outputCapacitance')]],
    weinberg: [['Capacitor Cout', khPinnedCapacitor('Cout'), khSetConfig('outputCapacitance')]],
    forward: KH_FORWARD_PINS,
    two_switch_forward: KH_FORWARD_PINS,
    acf: KH_FORWARD_PINS,
    sepic: [
        ['Inductor L2', khPinnedInductor('L2'), khSetConfig('inductanceL2')],
        ['Capacitor Cs', khPinnedCapacitor('Cs'), khSetConfig('couplingCapacitance')],
    ],
    zeta: [
        ['Inductor L2', khPinnedInductor('L2'), khSetConfig('inductanceL2')],
        ['Capacitor Cc', khPinnedCapacitor('Cc'), khSetConfig('couplingCapacitance')],
    ],
    cuk: [
        ['Inductor L2', khPinnedInductor('L2'), khSetConfig('inductanceL2')],
        ['Capacitor C1', khPinnedCapacitor('C1'), khSetConfig('couplingCapacitance')],
    ],
    push_pull: [['Snubber capacitors Csn', khSnubberCapacitance(/^Csn\d+$/), khSetConfig('snubberCap')]],
    fsbb: [['Snubber capacitors Crc_sw', khSnubberCapacitance(/^Crc_sw[12](_\d+)?$/), khSetConfig('snubberCap')]],
    src: [
        ['Inductor Lr', khPinnedInductor('Lr'), khSetDr('desiredResonantInductance')],
        ['Capacitor Cr', khPinnedCapacitor('Cr'), khSetDr('desiredResonantCapacitance')],
    ],
    llc: [
        ['Inductor Lr', khPinnedInductor('Lr'), khSetDr('desiredResonantInductance')],
        ['Resonant capacitance', (d) => d.computed?.resonantCapacitance, khSetDr('desiredResonantCapacitance')],
    ],
    dab: [
        ['Inductor Lr', khPinnedInductor('Lr'), khSetDr('desiredSeriesInductance')],
        ['Snubber capacitors Csn / Crc_pri', khSnubberCapacitance(/^(Crc_pri|Csn[A-H]_(hi|lo)\w*)$/), khSetConfig('snubberCap')],
    ],
    psfb: [
        ['Inductor Lr', khPinnedInductor('Lr'), khSetDr('desiredSeriesInductance')],
        ['Inductor Lout', khPinnedInductor('Lout'), khSetConfig('outputInductance')],
        ['Snubber capacitor Crc_pri', khSnubberCapacitance(/^Crc_pri$/), khSetConfig('snubberCap')],
    ],
    pshb: [
        ['Inductor Lr', khPinnedInductor('Lr'), khSetDr('desiredSeriesInductance')],
        ['Inductor Lout', khPinnedInductor('Lout'), khSetConfig('outputInductance')],
        ['Snubber capacitor Crc_pri', khSnubberCapacitance(/^Crc_pri$/), khSetConfig('snubberCap')],
    ],
    ahb: [
        ['Inductor Lout', khPinnedInductor('Lout'), khSetConfig('outputInductance')],
        ['Capacitor Cb', khPinnedCapacitor('Cb'), khSetConfig('dcBlockingCapacitance')],
    ],
    cllc: [
        ['Inductor Lr1', khPinnedInductor('Lr1'), khSetDr('desiredResonantInductance')],
        ['Capacitor Cr1', khPinnedCapacitor('Cr1'), khSetDr('desiredResonantCapacitance')],
        ['Inductor Lr2', khPinnedInductor('Lr2'), khSetDr('desiredSecondaryResonantInductance')],
        ['Capacitor Cr2', khPinnedCapacitor('Cr2'), khSetDr('desiredSecondaryResonantCapacitance')],
    ],
    clllc: [
        ['Inductor Lr1', khPinnedInductor('Lr1'), khSetConfig('primarySeriesInductance')],
        ['Capacitor Cr1', khPinnedCapacitor('Cr1'), khSetConfig('primaryResonantCapacitance')],
    ],
};

function khMainMagnetic(diag, topology) {
    const mains = (diag?.magnetics || []).filter((m) => m.isMain);
    if (mains.length !== 1) {
        throw new Error(`webKirchhoff: the ${topology} design reports ${mains.length} main magnetics; expected exactly one`);
    }
    const main = mains[0];
    if (!(typeof main.magnetizingInductance === 'number' && main.magnetizingInductance > 0)) {
        throw new Error(`webKirchhoff: the ${topology} design reports no inductance for its main magnetic ${main.name}`);
    }
    return main;
}

// How a topology reads designRequirements.turnsRatios (Kirchhoff src/<Topology>.cpp, req::provided_turns_ratio)
// against what its main transformer reports (diagnostics.magnetics[].turnsRatios, one ratio per winding after the
// primary). Most topologies read that per-winding list itself: output i at index offset + w*i, w windings per
// output (flyback / forward / acf / dab / isolated_* with one winding per output; llc / src read wpo*i,
// Llc.cpp / Src.cpp). push_pull reads ONE ratio per output, at index 1 + i (PushPull.cpp provided_turns_ratio(dr, 1)
// and (dr, 1 + i)), while its transformer reports [1 (2nd primary half), (N_i, N_i) per output] (centre-tapped
// secondaries, PushPull.cpp build_push_pull_tas). Copied index for index, output 2 would read output 1's second
// half. offset = the reported entries before the first output's windings, sent through unchanged.
const KH_TURNS_RATIOS_PER_OUTPUT = { push_pull: { offset: 1 } };

// designRequirements.turnsRatios as the topology reads it, from the design's main transformer. A per-output
// topology's report must split into one equal group of windings per output, every winding of a group at one
// ratio (one pin per output holds the whole group); anything else throws.
function khSpecTurnsRatios(topology, main, designSpec) {
    const reported = main.turnsRatios;
    const layout = KH_TURNS_RATIOS_PER_OUTPUT[topology];
    if (!layout) return reported.slice();
    const outputs = khOutputCount(designSpec);
    const secondaryWindings = reported.length - layout.offset;
    if (!(secondaryWindings > 0) || secondaryWindings % outputs !== 0) {
        throw new Error(`webKirchhoff: the ${topology} design's ${main.name} reports turns ratios ${khFormatValue(reported)}: `
            + `${Math.max(secondaryWindings, 0)} windings after the first ${layout.offset} do not split into one group per output `
            + `for ${outputs} outputs, so its turns ratios cannot be pinned output by output`);
    }
    const perOutput = secondaryWindings / outputs;
    const ratios = Array.from({ length: outputs }, (_, i) => {
        const group = reported.slice(layout.offset + perOutput * i, layout.offset + perOutput * (i + 1));
        if (group.some((n) => !khSameValue(n, group[0]))) {
            throw new Error(`webKirchhoff: the ${topology} design's ${main.name} reports turns ratios ${khFormatValue(group)} `
                + `for the windings of output ${i + 1}, but the spec pins one turns ratio per output`);
        }
        return group[0];
    });
    return [...reported.slice(0, layout.offset), ...ratios];
}

// The design, read off the design call's diagnostics (and the spec it was designed from): [{what, value, write}].
function khDesignPins(topology, designDiag, designSpec) {
    const main = khMainMagnetic(designDiag, topology);
    const pins = [{
        what: main.windings > 1 ? 'Magnetizing inductance' : 'Inductance',
        read: (d) => khMainMagnetic(d, topology).magnetizingInductance,
        value: main.magnetizingInductance,
        write: khSetDr('magnetizingInductance'),
        asDimension: true,
    }];
    const windingRatios = main.turnsRatios || [];
    if (windingRatios.length) {
        // Checked at every point as the transformer's full per-winding list; pinned in the form the topology reads.
        const specRatios = khSpecTurnsRatios(topology, main, designSpec);
        pins.push({
            what: `Turns ratios of ${main.name}`,
            read: (d) => khMainMagnetic(d, topology).turnsRatios,
            value: windingRatios,
            write: (spec) => { spec.designRequirements.turnsRatios = specRatios.map((n) => ({ nominal: n })); },
        });
    }
    for (const [what, read, write] of (KH_EXTRA_DESIGN_PINS[topology] || [])) {
        const value = read(designDiag, designSpec);
        if (value == null) continue;
        pins.push({ what, read, value, write });
    }
    return pins;
}

function khPinDesign(spec, pins) {
    const pinned = JSON.parse(JSON.stringify(spec));
    for (const pin of pins) pin.write(pinned, pin.asDimension ? { nominal: pin.value } : pin.value);
    return pinned;
}

function khFormatValue(v) {
    if (Array.isArray(v)) return `[${v.map(khFormatValue).join(', ')}]`;
    return typeof v === 'number' ? String(Number(v.toPrecision(5))) : 'missing';
}

function khSameValue(a, b) {
    if (Array.isArray(a) || Array.isArray(b)) {
        return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => khSameValue(x, b[i]));
    }
    return typeof a === 'number' && typeof b === 'number'
        && Math.abs(a - b) <= 1e-6 * Math.max(Math.abs(a), Math.abs(b));
}

// Every pinned value must come back unchanged, or the point describes another converter.
function khCheckPinnedDesign(topology, pins, point, diag, spec) {
    for (const pin of pins) {
        const got = pin.read(diag, spec);
        if (!khSameValue(got, pin.value)) {
            throw new Error(
                `The converter changed between input voltages: ${pin.what} is ${khFormatValue(pin.value)} in the design but `
                + `${khFormatValue(got)} at ${point.name}, so the operating points would not describe one converter. `
                + 'Enter the design in "I know the design I want", or report this case with the bug reporter.');
        }
    }
}

// process_converter, with the ngspice watchdog: on a non-converging deck the synchronous Embind run
// would spin forever and block the worker for good. On timeout, kill+respawn the worker and surface
// a loud, specific Exception — never a fabricated result.
async function khProcessConverter(workerProxy, topology, specJson, engine) {
    if (engine !== 'ngspice') return await workerProxy.callMethod('process_converter', topology, specJson, engine);
    let timer;
    const watchdog = new Promise((resolve) => {
        timer = setTimeout(() => resolve(
            `Exception: webKirchhoff ngspice simulation for '${topology}' did not finish within ` +
            `${Math.round(KH_SIMULATE_WATCHDOG_MS / 1000)}s and was aborted (likely a non-converging ` +
            `deck at these parameters). The analytical result is available; try the Analytical button.`), KH_SIMULATE_WATCHDOG_MS);
    });
    const raw = await Promise.race([
        workerProxy.callMethod('process_converter', topology, specJson, engine),
        watchdog,
    ]);
    clearTimeout(timer);
    if (typeof raw === 'string' && raw.startsWith('Exception: webKirchhoff ngspice simulation')) {
        // The worker is still stuck in the hung Embind call — respawn it so later calls work.
        reinitKirchhoffWorker();
    }
    return raw;
}

function khParse(raw, topology) {
    try {
        return JSON.parse(raw);
    } catch (e) {
        throw new Error(`could not parse webKirchhoff process_converter output for ${topology}: ${e.message}`);
    }
}

/**
 * Design once, then evaluate that design at every input voltage the user entered.
 * `callEngine(topology, specJson, engine)` returns process_converter's raw string.
 * Returns {design, points: [{point, spec, out}]} or throws (engine exceptions are rethrown verbatim).
 */
// A typed duty that the engine did not apply would be dropped silently: the engine must echo the
// pin (diagnostics.forcedDutyCycle) and report the delivered outputs, or the run fails.
function khCheckAppliedDutyCycle(spec, point, diagnostics) {
    const typed = spec.config?.[KH_DUTY_PIN_KEY];
    if (typed == null) return;
    const field = KH_UI_FIELD_NAMES[point.key];
    const applied = diagnostics?.[KH_DUTY_PIN_KEY];
    if (applied == null || Math.abs(applied - typed) > 1e-9 * Math.max(1, Math.abs(typed))) {
        throw new Error(`The engine did not apply the Duty Cycle ${field} ${typed} you typed for the input voltage `
            + `${point.value} V: this engine version cannot hold a typed duty cycle. Clear the Duty Cycle ${field} row `
            + 'to let the engine derive the duty from the turns ratio.');
    }
    if (!Array.isArray(diagnostics.outputs) || !diagnostics.outputs.length) {
        throw new Error(`webKirchhoff: the engine held the Duty Cycle ${field} but reported no delivered output voltages`);
    }
}

export async function khRunAtEachInputVoltage(callEngine, topology, params, engine) {
    const points = khInputVoltagePoints(topology, params);
    khCheckDutyCycles(topology, params);
    const designSpec = buildKhConverterSpec(topology, params);
    const designRaw = await callEngine(topology, JSON.stringify(designSpec), 'analytical');
    if (typeof designRaw === 'string' && designRaw.startsWith('Exception')) throw new Error(designRaw);
    const design = khParse(designRaw, topology);
    const pins = khDesignPins(topology, design.diagnostics, designSpec);
    const results = [];
    for (const point of points) {
        const spec = khPinDesign(buildKhConverterSpec(topology, params, point), pins);
        const raw = await callEngine(topology, JSON.stringify(spec), engine);
        if (typeof raw === 'string' && raw.startsWith('Exception')) throw new Error(raw);
        const out = khParse(raw, topology);
        khCheckPinnedDesign(topology, pins, point, out.diagnostics, spec);
        khCheckAppliedDutyCycle(spec, point, out.diagnostics);
        results.push({ point, spec, out });
    }
    return { design, pins, points: results };
}

// The main magnetic's sampled excitations of one process_converter result. The wizards build their
// charts from operatingPoints[].excitationsPerWinding[].*.waveform {time,data}; main_magnetic_inputs'
// operating points only carry processed/harmonics. Full sampled waveforms come from (in preference
// order): 1. out.operatingPoint — the engine-extracted op; carries real traces on the ngspice path;
// 2. the analyticalWaveforms registry ({component: MAS::OperatingPoint}) — analytical path.
function khFullExcitations(out) {
    const hasWaveformData = (excitations) => Array.isArray(excitations) && excitations.some(
        (e) => e?.current?.waveform?.data?.length || e?.voltage?.waveform?.data?.length);
    if (hasWaveformData(out.operatingPoint?.excitationsPerWinding)) {
        return out.operatingPoint.excitationsPerWinding;
    }
    const registry = out.analyticalWaveforms || {};
    const registryKeys = Object.keys(registry);
    if (registryKeys.length) {
        // Main magnetic = the entry with the most windings (transformer beats output inductor).
        const mainKey = registryKeys.sort((a, b) =>
            ((registry[b].excitationsPerWinding || []).length - (registry[a].excitationsPerWinding || []).length)
            || a.localeCompare(b))[0];
        if (hasWaveformData(registry[mainKey].excitationsPerWinding)) {
            return registry[mainKey].excitationsPerWinding;
        }
    }
    return null;
}

// Reshape webKirchhoff output back into the legacy webMKF string contract. Returns a JSON string (or a
// deck string for the spice verb), or an "Exception: ..." string on failure — matching what the old
// webMKF functions returned, so downstream error handling (`result.startsWith('Exception')`) is unchanged.
async function legacyConverterCall(workerProxy, name, args) {
    // CMC/DMC sims: forward with their multi-arg signatures, then lift inputs.operatingPoints to
    // the root so the wizard base finds the magnetic waveforms where the legacy contract put them.
    if (KH_COMPONENT_SIMS.has(name)) {
        const raw = await workerProxy.callMethod(name, ...args);
        if (typeof raw !== 'string' || raw.startsWith('Exception')) return raw;
        const out = JSON.parse(raw);
        if (out && !out.operatingPoints && out.inputs && Array.isArray(out.inputs.operatingPoints)) {
            out.operatingPoints = out.inputs.operatingPoints;
        }
        return JSON.stringify(out);
    }

    // PFC "I know the design" conduction-mode hint: legacy webMKF determine_pfc_mode(paramsJson, L).
    // Translate the wizard params through the shared spec builder and keep the OLD error contract
    // ({"error": ...} JSON, not an "Exception:" string) — PfcWizard JSON.parses the result
    // unconditionally, exactly like the removed webMKF function's contract.
    if (name === 'determine_pfc_mode') {
        const params = typeof args[0] === 'string' ? JSON.parse(args[0]) : (args[0] || {});
        const spec = buildKhConverterSpec('pfc', params);
        const raw = await workerProxy.callMethod('determine_pfc_mode', JSON.stringify(spec), args[1]);
        if (typeof raw === 'string' && raw.startsWith('Exception')) {
            return JSON.stringify({ error: raw });
        }
        return raw;
    }

    const parsed = parseLegacyName(name);
    if (!parsed) return null;

    // Component designers (not converters — no TAS): reshape their {inputs, <x>Diagnostics}
    // envelope back onto the legacy contract (MAS::Inputs at the root, diagnostics as sibling).
    if (parsed.mid === 'cmc' || parsed.mid === 'common_mode_choke') {
        // SPICE button: the ideal CM deck the Simulated button runs, as netlist text. (Every verb used
        // to fall through to design_cmc, so the SPICE modal showed the design JSON.)
        if (parsed.verb === 'spice') return await workerProxy.callMethod('generate_cmc_ngspice_circuit', args[0]);
        const raw = await workerProxy.callMethod('design_cmc', args[0]);
        if (typeof raw === 'string' && raw.startsWith('Exception')) return raw;
        const out = JSON.parse(raw);
        return JSON.stringify({ ...(out.inputs || {}), cmcDiagnostics: out.cmcDiagnostics ?? null });
    }
    if (parsed.mid === 'dmc' || parsed.mid === 'differential_mode_choke') {
        // SPICE button: the LC deck the Simulated button runs (first test frequency), as netlist text.
        if (parsed.verb === 'spice') return await workerProxy.callMethod('generate_dmc_ngspice_circuit', args[0]);
        const raw = await workerProxy.callMethod('design_dmc', args[0]);
        if (typeof raw === 'string' && raw.startsWith('Exception')) return raw;
        const out = JSON.parse(raw);
        return JSON.stringify({ ...(out.inputs || {}), dmcDiagnostics: out.dmcDiagnostics ?? null });
    }
    if (parsed.mid === 'current_transformer') {
        // design_current_transformer already returns the bare MAS::Inputs — legacy shape unchanged.
        return await workerProxy.callMethod('design_current_transformer', args[0]);
    }

    const topology = LEGACY_MID_TO_TOPOLOGY[parsed.mid];
    if (!topology) {
        return `Exception: webKirchhoff has no converter topology mapping for '${parsed.mid}' (called as ${name}).`;
    }

    // Translate the wizard's legacy buildParams() payload into the KH spec envelope
    // (docs/SPEC.md); payloads already carrying designRequirements pass through untouched (one call,
    // the caller owns its operating point).
    const legacyParams = JSON.parse(args[0]); // callers already pass JSON.stringify(params)
    const callEngine = (topo, specJson, engine) => khProcessConverter(workerProxy, topo, specJson, engine);

    if (parsed.verb === 'spice') {
        // Old signature was generate_<topo>_ngspice_circuit(spec, inputVoltageIndex, operatingPointIndex).
        // inputVoltageIndex picks the input voltage (legacy order Nom., Min., Max.); the deck is the
        // design pinned at that voltage, the same converter the Simulated button runs there.
        let specJson;
        try {
            if (legacyParams.designRequirements) {
                specJson = JSON.stringify(legacyParams);
            } else {
                const points = khInputVoltagePoints(topology, legacyParams);
                const index = args[1] == null ? 0 : args[1];
                const point = points[index];
                if (!point) {
                    return `Exception: input voltage index ${index} is out of range; this design has ${points.length} input voltage(s)`;
                }
                const designSpec = buildKhConverterSpec(topology, legacyParams);
                const designRaw = await callEngine(topology, JSON.stringify(designSpec), 'analytical');
                if (typeof designRaw === 'string' && designRaw.startsWith('Exception')) return designRaw;
                const pins = khDesignPins(topology, khParse(designRaw, topology).diagnostics, designSpec);
                const pointSpec = khPinDesign(buildKhConverterSpec(topology, legacyParams, point), pins);
                if (pointSpec.config?.[KH_DUTY_PIN_KEY] != null) {
                    // The deck must hold the typed duty too: confirm the engine applies it at this point.
                    const pointRaw = await callEngine(topology, JSON.stringify(pointSpec), 'analytical');
                    if (typeof pointRaw === 'string' && pointRaw.startsWith('Exception')) return pointRaw;
                    khCheckAppliedDutyCycle(pointSpec, point, khParse(pointRaw, topology).diagnostics);
                }
                specJson = JSON.stringify(pointSpec);
            }
        } catch (e) {
            return `Exception: ${e.message}`;
        }
        const tas = await workerProxy.callMethod('design_tas', topology, specJson);
        if (typeof tas === 'string' && tas.startsWith('Exception')) return tas;
        // PEAS Fidelity requires an origin; REQUIREMENTS = ideal devices from the design
        // requirements (the canonical default — see Kirchhoff web/src/kh.js generateNetlist).
        return await workerProxy.callMethod('generate_ngspice_circuit', tas, '{"origin":"REQUIREMENTS"}');
    }

    // Both verbs derive from process_converter. The legacy split maps onto the extract engine:
    // calculate_<topo>_inputs (Analytical button) → 'analytical'; simulate_<topo>_ideal_waveforms
    // (Simulated button) → 'ngspice' (the old webMKF ran the ngspice deck for that button too).
    const engine = parsed.verb === 'waveforms' ? 'ngspice' : 'analytical';
    let runs;
    try {
        if (legacyParams.designRequirements) {
            const raw = await callEngine(topology, JSON.stringify(legacyParams), engine);
            if (typeof raw === 'string' && raw.startsWith('Exception')) return raw;
            const out = khParse(raw, topology);
            const name = out.inputs?.operatingPoints?.[0]?.name || legacyParams.operatingPoints?.[0]?.name || 'Operating Point 1';
            runs = { design: out, points: [{ point: { name }, out }] };
        } else {
            runs = await khRunAtEachInputVoltage(callEngine, topology, legacyParams, engine);
        }
    } catch (e) {
        return e.message.startsWith('Exception') ? e.message : `Exception: ${e.message}`;
    }

    // MAS::Inputs at the root (legacy contract). designRequirements come from the design call (they
    // carry its tolerances); the operating points are one per input voltage, in legacy order.
    const first = runs.points[0].out;
    const reshaped = { ...(first.inputs || {}) };
    if (runs.design.inputs?.designRequirements) reshaped.designRequirements = runs.design.inputs.designRequirements;
    reshaped.operatingPoints = runs.points.map(({ point, out }) => {
        const op = (out.inputs?.operatingPoints || [])[0];
        if (!op) throw new Error(`webKirchhoff: ${topology} returned no operating point for ${point.name}`);
        // KH is the master of the waveforms and emits ONE canonical steady-state period per
        // signal — that canonical period is what goes into the MAS operating points (harmonics,
        // processed and downstream MKF advisers all assume waveform span == 1/frequency; tiling
        // here once corrupted the adviser's physics). The wizard's Periods knob is display-only
        // and is applied in the chart layer (ConverterWizardBase tiles the plotted arrays).
        const fullExcitations = khFullExcitations(out);
        return { ...op, name: point.name, ...(fullExcitations ? { excitationsPerWinding: fullExcitations } : {}) };
    });

    // Diagnostics: the first point's envelope (the shape every wizard reads), plus every point's own
    // envelope under inputVoltagePoints for the diagnostics card.
    const diag = first.diagnostics == null ? null : {
        ...first.diagnostics,
        inputVoltagePoints: runs.points.map(({ point, out }) => ({
            name: point.name,
            inputVoltage: point.value,
            diagnostics: out.diagnostics ?? null,
        })),
    };
    reshaped.diagnostics = diag;               // generic handle
    for (const key of (LEGACY_MID_TO_DIAG_KEYS[parsed.mid] || [])) {
        reshaped[key] = diag;                  // `<topo>Diagnostics` sibling(s) the wizards read
    }

    if (parsed.verb === 'waveforms') {
        // Converter-node overlays for the magnetic↔converter view toggle come from
        // component_waveforms (SPEC §6.5) — but that is a SECOND full ngspice run over the TAS.
        // Running it eagerly here doubled every Simulated click's wall time (and pushed heavy
        // topologies past their timeouts), so we do NOT run it inline. Each operating point's TAS is
        // carried on the result; the converter-view toggle lazily calls component_waveforms on them.
        reshaped.converterWaveforms = [];
        reshaped.__converterTas = first.tas;
        reshaped.__converterTasPerOperatingPoint = runs.points.map(({ point, out }) => ({ name: point.name, tas: out.tas }));
    }

    return JSON.stringify(reshaped);
}

/**
 * Initialize webKirchhoff in a dedicated Web Worker (mirrors initWorker() in mkfRuntime.js).
 * @param {string} wasmJsUrl - URL to libKirchhoff.js
 * @returns {Promise<Object>} the Kirchhoff proxy
 */
export async function initKirchhoffWorker(wasmJsUrl) {
    if (kh) {
        return kh;
    }
    lastWasmJsUrl = wasmJsUrl;

    worker = new Worker(
        new URL('./kirchhoffWorker.js', import.meta.url),
        { type: 'module' }
    );

    khProxy = Comlink.wrap(worker);

    await khProxy.init(wasmJsUrl);
    await khProxy.waitReady();

    kh = createKirchhoffProxy(khProxy);
    kh.ready = Promise.resolve();

    resolveReady(kh);
    return kh;
}

// Terminate a hung worker and stand a fresh one back up (best-effort, fire-and-forget). Returns a
// promise that resolves when the new worker is ready; callers that just need the OLD call to stop
// blocking can ignore it — the next waitForKirchhoff() awaits the re-armed `ready`.
async function reinitKirchhoffWorker() {
    terminateKirchhoffWorker();
    if (lastWasmJsUrl) {
        try { await initKirchhoffWorker(lastWasmJsUrl); } catch (_) { /* next call retries */ }
    }
}

/** Wait for webKirchhoff to be ready. Resolves to the proxy. */
export function waitForKirchhoff() {
    return ready;
}

/** Get the current webKirchhoff proxy (or null). */
export function getKirchhoff() {
    return kh;
}

/** Terminate the Kirchhoff worker (cleanup). Re-arms `ready` like mkfRuntime.terminateWorker(). */
export function terminateKirchhoffWorker() {
    if (worker) {
        worker.terminate();
        worker = null;
        khProxy = null;
        kh = null;
        ready = new Promise((resolve) => { resolveReady = resolve; });
    }
}

function createKirchhoffProxy(workerProxy) {
    return new Proxy({}, {
        get(target, prop) {
            if (typeof prop === 'symbol') return undefined;
            if (prop === 'then' || prop === 'toJSON' || prop === 'valueOf' ||
                prop === 'toString' || prop === 'constructor' || prop === '$$typeof') {
                return undefined;
            }
            if (prop === 'ready') {
                return target.ready || Promise.resolve();
            }

            return async (...args) => {
                // 1) Raw Kirchhoff::api methods -> forward verbatim.
                if (RAW_KH_METHODS.has(prop)) {
                    return await workerProxy.callMethod(prop, ...args);
                }
                // 2) Legacy per-topology webMKF aliases -> reshape onto process_converter/design_tas.
                const legacy = await legacyConverterCall(workerProxy, prop, args);
                if (legacy !== null) {
                    return legacy;
                }
                // 3) Not available in webKirchhoff. Surface loudly (do not fabricate a result).
                return `Exception: '${prop}' is not available in webKirchhoff. Converter functionality moved ` +
                       `from webMKF to webKirchhoff, but this function has no webKirchhoff equivalent yet.`;
            };
        }
    });
}
