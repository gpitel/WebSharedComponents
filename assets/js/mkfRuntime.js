// src/services/mkfRuntime.js
// Supports both main-thread (legacy) and worker-based (non-blocking) modes
import * as Comlink from 'comlink';

let mkf = null;
let mkfProxy = null;
let worker = null;
let resolveReady;
let rejectReady;
// `ready` is re-armed by terminateWorker() so a torn-down worker doesn't leave
// waitForMkf() permanently resolved with a dead proxy (see terminateWorker).
let ready;
let readyState;
armReady();

function armReady() {
    readyState = 'pending';
    ready = new Promise((resolve, reject) => {
        resolveReady = (value) => { readyState = 'resolved'; resolve(value); };
        rejectReady = (error) => { readyState = 'rejected'; reject(error); };
    });
    // A restart that fails rejects `ready`; whoever awaits it gets the error. Nobody awaiting it is
    // not an unhandled rejection.
    ready.catch(() => {});
}

// Configuration
let useWorker = true; // Worker mode enabled - WASM runs in background thread

// Watchdog for worker calls. An Embind call is SYNCHRONOUS inside the worker, so one that never
// returns blocks the worker for every later call — and, because nothing rejects, the caller's
// promise simply never settles. That is silent: no error, no console message, no timeout. The UI
// just shows nothing forever, which is what users report as "the loss / current density details
// never appeared" (ABT #913). kirchhoffRuntime already guards its ngspice calls this way; the MKF
// worker had no equivalent, so a single hung call was unrecoverable AND invisible.
//
// Generous by design: it is a stuck-detector, not a performance budget. The slowest legitimate calls
// here are the catalogue loads (~0.5 s) and the adviser sweeps, which run in their own stores.
const MKF_CALL_WATCHDOG_MS = 120_000;
// Calls that are legitimately long-running and must NOT be interrupted.
const MKF_WATCHDOG_EXEMPT = new Set(['load_core_materials', 'load_core_shapes', 'load_wires', 'load_cores']);
// ABT #929: the ABT #913 watchdog guards worker CALLS, which are made through the proxy created at
// the END of initWorker — so the init handshake itself was never covered. A wasm fetch that stalls
// inside the worker (seen in the wild as "wasm streaming compile failed: Response body loading was
// aborted", then a fallback that never completes) left `await mkfProxy.init()` pending forever. It
// never resolved and never threw, so main.js's engine-init catch could not fire either: the app sat
// on /engine_loader showing "it will take just a few seconds" until the tab was closed, and the
// diagnosis read exactly `engineReady:false, engineLoadError:null`.
//
// Generous, like the call watchdog: a cold compile of the 32 MB engine on a slow machine is
// legitimately tens of seconds. This is a stuck-detector, not a performance budget.
const MKF_INIT_WATCHDOG_MS = 180_000;

let wasmJsUrlForRestart = null;

// The worker runs one Embind call at a time however many are posted to it. They used to be posted
// all at once, which put the queue inside the worker where nothing could see it, and the watchdog's
// clock started when a call was POSTED. A 1 ms call queued behind a long one therefore ran out the
// clock and was named as the stuck one: users importing a dense circuit-simulator file were told
// "MKF call 'resolve_dimension_with_tolerance' did not return within 120s". The queue is held here
// instead, so a call's clock starts when the worker begins it and the call it names is the one
// that took the time.
let queueTail = Promise.resolve();
// Calls queued or running on the current worker. When the worker is torn down they are rejected at
// once: their replies can never arrive, and each one left waiting would later fire its own watchdog
// and tear down the NEXT worker too, killing whatever that one was doing.
const callsInFlight = new Set();
// Bumped each time a worker is torn down. A call carries the generation of the proxy it was made
// through; one made through a proxy of a worker that no longer exists is refused, not posted into
// the void, and a timeout from an earlier generation never restarts the current worker.
let workerGeneration = 0;

// A restarted worker is a blank engine: none of the catalogues, custom parts or inventory the app
// loaded at start-up. The app registers how to rebuild that (setEngineRestoreHandler) and it runs
// before any caller can reach the new worker. Settings are replayed here: every settings writer goes
// through set_settings, and the last value sent was held only by the engine that died.
let engineRestoreHandler = null;
let lastSettingsJson = null;

/**
 * Register how this app rebuilds the engine's loaded state after a watchdog restart. It is called
 * with the new worker's proxy, after the last settings have been replayed and before `ready`
 * resolves. If it throws, the restart fails loudly.
 * @param {(mkf: Object) => Promise<void>} handler
 */
export function setEngineRestoreHandler(handler) {
    engineRestoreHandler = handler;
}

/**
 * Queue a call for the worker. It runs once every call ahead of it has settled, under the watchdog
 * (unless exempt), and it is rejected at once if its worker is torn down first.
 */
function enqueueCall(methodName, invoke, callGeneration) {
    if (callGeneration !== workerGeneration) {
        return Promise.reject(new Error(
            `MKF call '${methodName}' was made on an engine worker that has since been restarted; ` +
            `retry the action.`));
    }
    return new Promise((resolve, reject) => {
        const call = { methodName, settled: false };
        const settle = (outcome, value) => {
            if (call.settled) return;
            call.settled = true;
            callsInFlight.delete(call);
            outcome(value);
        };
        call.cancelled = new Promise((_, cancel) => { call.cancel = cancel; });
        call.cancelled.catch((error) => settle(reject, error));
        callsInFlight.add(call);

        queueTail = queueTail.then(async () => {
            if (call.settled) return;
            try {
                settle(resolve, await withWatchdog(methodName, invoke, callGeneration, call));
            } catch (error) {
                settle(reject, error);
            }
        });
    });
}

/**
 * Run a worker call under the watchdog. On timeout: tear the worker down (killing the hung Embind
 * call), re-init a fresh one so the app keeps working, and reject LOUDLY. Never resolves with a
 * fabricated result.
 */
async function withWatchdog(methodName, invoke, callGeneration, call) {
    if (MKF_WATCHDOG_EXEMPT.has(methodName)) return Promise.race([invoke(), call.cancelled]);

    let timer;
    let timedOut = false;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            timedOut = true;
            reject(new Error(
                `MKF call '${methodName}' did not return within ` +
                `${Math.round(MKF_CALL_WATCHDOG_MS / 1000)}s and was aborted. The engine worker has been ` +
                `restarted; retry the action.`));
        }, MKF_CALL_WATCHDOG_MS);
    });
    try {
        return await Promise.race([invoke(), timeout, call.cancelled]);
    } catch (error) {
        if (timedOut && callGeneration === workerGeneration) {
            console.error('[MKF] worker call stuck — restarting the engine worker:', methodName);
            // This call fails with the timeout, not with the cancellation sent to the calls behind it.
            callsInFlight.delete(call);
            const url = wasmJsUrlForRestart;
            terminateWorker(`the engine worker was restarted because '${methodName}' did not return ` +
                `within ${Math.round(MKF_CALL_WATCHDOG_MS / 1000)}s`);
            if (url) restartWorker(url);
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Bring up a replacement worker and restore what the app had loaded into the old one. Callers are
 * waiting on `ready`; if the restart fails they get the error instead of waiting forever.
 */
function restartWorker(wasmJsUrl) {
    initWorker(wasmJsUrl, { restore: true }).catch((error) => {
        console.error('[MKF] worker restart failed:', error);
        terminateWorker('the engine worker could not be restarted');
        rejectReady(new Error(
            `The magnetic engine stopped responding and could not be restarted (${error?.message ?? error}). ` +
            `Reload the page.`));
    });
}

/**
 * Enable or disable worker mode. Must be called before initialization.
 * @param {boolean} enable - Whether to use Web Worker for WASM calls
 */
export function setWorkerMode(enable) {
    if (mkf || mkfProxy) {
        return;
    }
    useWorker = enable;
}

/**
 * Check if worker mode is enabled
 */
export function isWorkerMode() {
    return useWorker;
}

/**
 * Initialize WASM in a Web Worker (non-blocking mode)
 * @param {string} wasmJsUrl - URL to the libMKF.wasm.js file
 * @returns {Promise} Resolves when worker is ready
 */
export async function initWorker(wasmJsUrl, { restore = false } = {}) {
    // Remembered so the watchdog can rebuild the worker after killing a stuck call.
    wasmJsUrlForRestart = wasmJsUrl;
    // Return the existing MKF proxy if already initialized
    if (mkf) {
        return mkf;
    }

    useWorker = true;
    
    // Create the worker - Vite handles the URL transformation
    worker = new Worker(
        new URL('./mkfWorker.js', import.meta.url),
        { type: 'module' }
    );

    // Wrap with Comlink
    mkfProxy = Comlink.wrap(worker);

    // Initialize the WASM module in the worker, under the init watchdog (ABT #929). On timeout the
    // worker is torn down and we reject LOUDLY, so the caller can retry or tell the user, instead
    // of the whole app hanging on a promise that will never settle.
    let initTimer;
    const initTimeout = new Promise((_, reject) => {
        initTimer = setTimeout(() => reject(new Error(
            `The magnetic engine did not finish loading within ` +
            `${Math.round(MKF_INIT_WATCHDOG_MS / 1000)}s. This is usually a network problem while ` +
            `fetching the engine; reloading the page normally clears it.`)), MKF_INIT_WATCHDOG_MS);
    });
    try {
        await Promise.race([
            (async () => {
                await mkfProxy.init(wasmJsUrl);
                await mkfProxy.waitReady();
            })(),
            initTimeout,
        ]);
    }
    catch (error) {
        // Leave nothing half-alive: a stuck worker holds the hung fetch and its 32 MB of memory,
        // and a later initWorker() would return the same broken proxy through the `if (mkf)` guard
        // at the top of this function.
        console.error('[MKF] engine initialization failed — tearing the worker down:', error);
        terminateWorker();
        throw error;
    }
    finally {
        clearTimeout(initTimer);
    }

    // Create a proxy object that mimics the original MKF API
    const newMkf = createMkfProxy(mkfProxy, workerGeneration);
    newMkf.ready = Promise.resolve();

    if (restore) {
        if (lastSettingsJson != null) {
            await newMkf.set_settings(lastSettingsJson);
        }
        if (engineRestoreHandler) {
            await engineRestoreHandler(newMkf);
        }
        console.warn('[MKF] engine worker restarted and its data reloaded');
    }

    mkf = newMkf;
    if (readyState !== 'pending') armReady();
    resolveReady(mkf);
    
    return mkf;
}

/**
 * Set the MKF instance directly (legacy main-thread mode)
 * @param {Object} newMkf - The WASM module instance
 */
export function setMkf(newMkf) {
    if (useWorker) {
        return;
    }
    mkf = newMkf;
    resolveReady(newMkf);
}

/**
 * Wait for MKF to be ready
 * @returns {Promise<Object>} The MKF instance or proxy
 */
export function waitForMkf() {
    return ready;
}

/**
 * Get the current MKF instance
 * @returns {Object|null} The MKF instance or proxy
 */
export function getMkf() {
    return mkf;
}

/**
 * Pre-enrich a magnetic JSON using the MKF worker so MVB++ can skip its
 * internal magnetic_autocomplete_safe call (much faster rendering).
 * @param {Object} magnetic - raw magnetic object
 * @returns {Promise<Object>} enriched magnetic with geometricalDescription etc.
 */
export async function enrichMagnetic(magnetic) {
    const m = await waitForMkf();
    if (typeof m.magnetic_autocomplete !== 'function') {
        // The MAS variant needs `inputs`, which a bare magnetic does not carry (ABT #1100).
        throw new Error('The engine has no magnetic_autocomplete binding; rebuild libMKF');
    }
    const result = await m.magnetic_autocomplete(JSON.stringify(magnetic), '{}');
    if (typeof result === 'string' && result.startsWith('Exception')) {
        // Surface the engine's message; JSON.parse on it only said "not valid JSON".
        throw new Error(result);
    }
    return JSON.parse(result);
}

/**
 * Push the real-winding flag into the engine's (global, sticky) settings.
 *
 * This has to happen BEFORE anything winds, not before anything paints: the
 * painter draws the turnsDescription it is handed and never re-winds, so a coil
 * wound while the flag was still off is painted as idealised rings no matter
 * what the flag says by the time the plot is requested. That is why the setting
 * is applied at engine init from the persisted store — once it is on, every wind
 * of the session is a real one, with no intermediate ideal pass to be painted.
 *
 * Every other settings writer in the app seeds its object from get_settings(),
 * so this value then survives all of them.
 *
 * @param {Object} mkf - the MKF instance/proxy
 * @param {boolean} useRealWindingGeometry
 */
export async function applyRealWindingGeometrySetting(mkf, useRealWindingGeometry) {
    const settings = JSON.parse(await mkf.get_settings());
    settings.coilUseRealWindingGeometry = !!useRealWindingGeometry;
    await mkf.set_settings(JSON.stringify(settings));
}

/**
 * Terminate the worker. Every call queued or running on it is rejected at once with `reason`.
 * @param {string} [reason] - why, for the message those calls are rejected with
 */
export function terminateWorker(reason = 'the engine worker was shut down') {
    if (worker) {
        worker.terminate();
        worker = null;
        mkfProxy = null;
        mkf = null;
        workerGeneration++;
        queueTail = Promise.resolve();
        const orphaned = [...callsInFlight];
        callsInFlight.clear();
        for (const call of orphaned) {
            call.cancel(new Error(`MKF call '${call.methodName}' was cancelled: ${reason}. Retry the action.`));
        }
        // Re-arm `ready` so the NEXT initWorker() resolves a FRESH promise. Without
        // this, `ready` stays resolved with the terminated worker's proxy, so every
        // waitForMkf() consumer (LtSpice export, masAutocomplete) keeps calling the
        // dead worker after a rebuild (e.g. an El Choker palette switch). A `ready`
        // still pending has handed out nothing: it is kept, so whoever is already
        // waiting on it gets the replacement worker (or the error if there is none).
        if (readyState !== 'pending') armReady();
    }
}

/**
 * Creates a proxy object that translates synchronous-looking calls 
 * to async worker calls. This maintains API compatibility.
 * 
 * All MKF methods are routed through the worker's generic callMethod(),
 * which automatically handles Embind type conversion (vectors, booleans, numbers).
 */
function createMkfProxy(workerProxy, generation) {
    // Only methods explicitly defined in mkfWorker.js
    // Everything else goes through callMethod() which handles any MKF method
    const workerExplicitMethods = new Set([
        'init', 'waitReady', 'callMethod', 'getAvailableMethods',
        'load_core_materials', 'load_core_shapes', 'load_wires', 'load_cores',
    ]);

    return new Proxy({}, {
        get(target, prop) {
            // Ignore symbols (used by Comlink, Promises, etc.)
            if (typeof prop === 'symbol') {
                return undefined;
            }
            
            // Ignore internal JS properties
            if (prop === 'then' || prop === 'toJSON' || prop === 'valueOf' || 
                prop === 'toString' || prop === 'constructor' || prop === '$$typeof') {
                return undefined;
            }
            
            // Special properties
            if (prop === 'ready') {
                return target.ready || Promise.resolve();
            }
            
            // Return an async function that calls the worker
            return async (...args) => {
                // Use explicit worker method if defined, otherwise use generic callMethod
                // (which handles any MKF method with automatic type conversion)
                const invoke = workerExplicitMethods.has(prop)
                    ? () => workerProxy[prop](...args)
                    : () => workerProxy.callMethod(prop, ...args);
                const result = await enqueueCall(String(prop), invoke, generation);
                if (prop === 'set_settings') {
                    // Replayed into a restarted worker (see lastSettingsJson).
                    lastSettingsJson = args[0];
                }
                return result;
            };
        }
    });
}