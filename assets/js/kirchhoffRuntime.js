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
// are forwarded 1:1. Anything else (e.g. simulate_flyback_with_magnetic, calculate_cmc_inputs,
// determine_pfc_mode, process_current_transformer) returns an "Exception: ..." string so the caller's
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

const KH_RECTIFIER_TYPES = {
    'fullBridge': 'fullBridge', 'Full Bridge': 'fullBridge',
    'centerTapped': 'centerTapped', 'Center Tapped': 'centerTapped',
    'currentDoubler': 'currentDoubler', 'Current Doubler': 'currentDoubler',
    'voltageDoubler': 'voltageDoubler', 'Voltage Doubler': 'voltageDoubler',
};

function buildKhConverterSpec(topology, params) {
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

    // Input rail aliases: CLLLC names it highVoltageBusVoltage; the Vienna wizard carries the
    // LINE-TO-LINE grid voltage while SPEC wants per-phase line RMS (V_phase = V_LL / √3).
    let inputVoltage = params.inputVoltage != null ? params.inputVoltage : params.highVoltageBusVoltage;
    if (inputVoltage == null && topology === 'vienna' && params.lineToLineVoltage != null) {
        const vll = params.lineToLineVoltage;
        const scale = (x) => (x == null ? undefined : x / Math.sqrt(3));
        inputVoltage = typeof vll === 'object'
            ? { minimum: scale(vll.minimum), nominal: scale(vll.nominal), maximum: scale(vll.maximum) }
            : scale(vll);
    }

    const isAc = topology === 'pfc' || topology === 'vienna';
    const dr = {
        inputType: topology === 'pfc' ? 'acSinglePhase' : topology === 'vienna' ? 'acThreePhase' : 'dc',
        inputVoltage: khDim(inputVoltage),
        switchingFrequency: khDim(params.switchingFrequency != null ? params.switchingFrequency : op0.switchingFrequency),
        outputs: volts.map((v, i) => ({
            name: i === 0 ? 'out' : `out${i + 1}`,
            voltage: { nominal: Math.abs(v) },
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

    const powers = volts.map((v, i) => {
        const p = Math.abs(v) * Math.abs(amps[i] != null ? amps[i] : 0);
        return p > 0 ? p : (params.outputPower != null ? Math.abs(params.outputPower) : p);
    });
    const operatingPoints = [{
        name: 'full_load',
        inputVoltage: khNominal(inputVoltage),
        ambientTemperature: op0.ambientTemperature != null ? op0.ambientTemperature
                          : params.ambientTemperature != null ? params.ambientTemperature : 25,
        outputs: dr.outputs.map((o, i) => ({ name: o.name, power: powers[i] })),
    }];

    // Optional design knobs — only documented SPEC §4/§5 keys are forwarded.
    const config = {};
    if (params.currentRippleRatio != null) config.rippleRatio = params.currentRippleRatio;
    if (params.maximumDutyCycle != null) config.maxDutyCycle = params.maximumDutyCycle;
    if (params.qualityFactor != null) config.qualityFactor = params.qualityFactor;
    if (params.inductanceRatio != null) config.inductanceRatio = params.inductanceRatio;
    if (params.minSwitchingFrequency != null) config.resonantBandMin = params.minSwitchingFrequency;
    if (params.maxSwitchingFrequency != null) config.resonantBandMax = params.maxSwitchingFrequency;
    if (params.rectifierType != null && KH_RECTIFIER_TYPES[params.rectifierType]) {
        config.rectifierType = KH_RECTIFIER_TYPES[params.rectifierType];
    }
    // PFC/Vienna topology variant + interleave count. Forwarded so the variant sizes distinctly the
    // moment KH's design_pfc reads them (KH ABT #11); harmless keys until then.
    if (params.topologyVariant != null) config.topologyVariant = params.topologyVariant;
    if (params.numberOfPhases != null) config.numberOfPhases = params.numberOfPhases;
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

    const spec = { designRequirements: dr, operatingPoints };
    if (Object.keys(config).length) spec.config = config;
    return spec;
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

    const parsed = parseLegacyName(name);
    if (!parsed) return null;

    // Component designers (not converters — no TAS): reshape their {inputs, <x>Diagnostics}
    // envelope back onto the legacy contract (MAS::Inputs at the root, diagnostics as sibling).
    if (parsed.mid === 'cmc' || parsed.mid === 'common_mode_choke') {
        const raw = await workerProxy.callMethod('design_cmc', args[0]);
        if (typeof raw === 'string' && raw.startsWith('Exception')) return raw;
        const out = JSON.parse(raw);
        return JSON.stringify({ ...(out.inputs || {}), cmcDiagnostics: out.cmcDiagnostics ?? null });
    }
    if (parsed.mid === 'dmc' || parsed.mid === 'differential_mode_choke') {
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
    // (docs/SPEC.md); payloads already carrying designRequirements pass through.
    const legacyParams = JSON.parse(args[0]); // callers already pass JSON.stringify(params)
    const specJson = JSON.stringify(buildKhConverterSpec(topology, legacyParams));

    if (parsed.verb === 'spice') {
        // Old signature was generate_<topo>_ngspice_circuit(spec, inputVoltageIndex, operatingPointIndex).
        // webKirchhoff assembles the deck from the whole TAS, so the per-OP indices are no longer used.
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
    let raw;
    if (engine === 'ngspice') {
        // Guard the (synchronous-in-worker) ngspice run with a watchdog: on a non-converging
        // topology it would spin forever and block the worker for good. On timeout, kill+respawn
        // the worker and surface a loud, specific Exception (the caller's startsWith('Exception')
        // check throws it) — never a fabricated result.
        let timer;
        const watchdog = new Promise((resolve) => {
            timer = setTimeout(() => resolve(
                `Exception: webKirchhoff ngspice simulation for '${topology}' did not finish within ` +
                `${Math.round(KH_SIMULATE_WATCHDOG_MS / 1000)}s and was aborted (likely a non-converging ` +
                `deck at these parameters). The analytical result is available; try the Analytical button.`), KH_SIMULATE_WATCHDOG_MS);
        });
        raw = await Promise.race([
            workerProxy.callMethod('process_converter', topology, specJson, engine),
            watchdog,
        ]);
        clearTimeout(timer);
        if (typeof raw === 'string' && raw.startsWith('Exception: webKirchhoff ngspice simulation')) {
            // The worker is still stuck in the hung Embind call — respawn it so later calls work.
            reinitKirchhoffWorker();
            return raw;
        }
    } else {
        raw = await workerProxy.callMethod('process_converter', topology, specJson, engine);
    }
    if (typeof raw === 'string' && raw.startsWith('Exception')) return raw;

    let out;
    try {
        out = JSON.parse(raw);
    } catch (e) {
        return `Exception: could not parse webKirchhoff process_converter output for ${topology}: ${e.message}`;
    }

    const inputs = out.inputs || {};
    const reshaped = { ...inputs };            // MAS::Inputs at the root (legacy contract)
    const diag = out.diagnostics ?? null;
    reshaped.diagnostics = diag;               // generic handle
    for (const key of (LEGACY_MID_TO_DIAG_KEYS[parsed.mid] || [])) {
        reshaped[key] = diag;                  // `<topo>Diagnostics` sibling(s) the wizards read
    }

    // The wizards build their charts from operatingPoints[].excitationsPerWinding[].*.waveform
    // {time,data}. main_magnetic_inputs' operating points only carry processed/harmonics. Full
    // sampled waveforms come from (in preference order):
    //   1. out.operatingPoint — the engine-extracted op; carries real traces on the ngspice path.
    //   2. the analyticalWaveforms registry ({component: MAS::OperatingPoint}) — analytical path.
    // Graft the main magnetic's excitations onto the first operating point. Conditions/name stay
    // from `inputs` (the registry op's conditions are not populated — uninitialized ambient).
    const hasWaveformData = (excitations) => Array.isArray(excitations) && excitations.some(
        (e) => e?.current?.waveform?.data?.length || e?.voltage?.waveform?.data?.length);
    let fullExcitations = null;
    if (hasWaveformData(out.operatingPoint?.excitationsPerWinding)) {
        fullExcitations = out.operatingPoint.excitationsPerWinding;
    } else {
        const registry = out.analyticalWaveforms || {};
        const registryKeys = Object.keys(registry);
        if (registryKeys.length) {
            // Main magnetic = the entry with the most windings (transformer beats output inductor).
            const mainKey = registryKeys.sort((a, b) =>
                ((registry[b].excitationsPerWinding || []).length - (registry[a].excitationsPerWinding || []).length)
                || a.localeCompare(b))[0];
            if (hasWaveformData(registry[mainKey].excitationsPerWinding)) {
                fullExcitations = registry[mainKey].excitationsPerWinding;
            }
        }
    }
    if (fullExcitations && Array.isArray(reshaped.operatingPoints) && reshaped.operatingPoints.length) {
        // KH is the master of the waveforms and emits ONE canonical steady-state period per
        // signal — that canonical period is what goes into the MAS operating points (harmonics,
        // processed and downstream MKF advisers all assume waveform span == 1/frequency; tiling
        // here once corrupted the adviser's physics). The wizard's Periods knob is display-only
        // and is applied in the chart layer (ConverterWizardBase tiles the plotted arrays).
        reshaped.operatingPoints = reshaped.operatingPoints.map((op, i) =>
            i === 0 ? { ...op, excitationsPerWinding: fullExcitations } : op);
    }

    if (parsed.verb === 'waveforms') {
        // Converter-node overlays for the magnetic↔converter view toggle come from
        // component_waveforms (SPEC §6.5) — but that is a SECOND full ngspice run over the TAS.
        // Running it eagerly here doubled every Simulated click's wall time (and pushed heavy
        // topologies past their timeouts), so we do NOT run it inline. The TAS is carried on the
        // result as `__converterTas`; the converter-view toggle can lazily call
        // component_waveforms(__converterTas) on demand and reshape via convertConverterWaveforms.
        reshaped.converterWaveforms = [];
        reshaped.__converterTas = out.tas;
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
