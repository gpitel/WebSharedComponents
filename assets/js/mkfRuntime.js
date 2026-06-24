// src/services/mkfRuntime.js
// Supports both main-thread (legacy) and worker-based (non-blocking) modes
import * as Comlink from 'comlink';

let mkf = null;
let mkfProxy = null;
let worker = null;
let resolveReady;
const ready = new Promise((resolve) => { resolveReady = resolve; });

// Configuration
let useWorker = true; // Worker mode enabled - WASM runs in background thread

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
export async function initWorker(wasmJsUrl) {
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

    // Initialize the WASM module in the worker
    await mkfProxy.init(wasmJsUrl);
    await mkfProxy.waitReady();

    // Create a proxy object that mimics the original MKF API
    mkf = createMkfProxy(mkfProxy);
    mkf.ready = Promise.resolve();

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
 * Terminate the worker (cleanup)
 */
/**
 * Pre-enrich a magnetic JSON using the MKF worker so MVB++ can skip its
 * internal magnetic_autocomplete_safe call (much faster rendering).
 * @param {Object} magnetic - raw magnetic object
 * @returns {Promise<Object>} enriched magnetic with geometricalDescription etc.
 */
export async function enrichMagnetic(magnetic) {
    const m = await waitForMkf();
    const result = await m.mas_autocomplete(JSON.stringify({ magnetic }), false, '{}');
    const parsed = JSON.parse(result);
    return parsed?.magnetic ?? parsed;
}

export function terminateWorker() {
    if (worker) {
        worker.terminate();
        worker = null;
        mkfProxy = null;
        mkf = null;
    }
}

/**
 * Creates a proxy object that translates synchronous-looking calls 
 * to async worker calls. This maintains API compatibility.
 * 
 * All MKF methods are routed through the worker's generic callMethod(),
 * which automatically handles Embind type conversion (vectors, booleans, numbers).
 */
function createMkfProxy(workerProxy) {
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
                if (workerExplicitMethods.has(prop)) {
                    return await workerProxy[prop](...args);
                }
                // callMethod handles any MKF method with automatic type conversion
                return await workerProxy.callMethod(prop, ...args);
            };
        }
    });
}