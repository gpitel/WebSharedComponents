// kirchhoffWorker.js - Web Worker that runs the webKirchhoff WASM in a background thread.
//
// Converter modelling (design + ngspice simulation) was moved OUT of webMKF (libMKF, now
// magnetics-only) into webKirchhoff (libKirchhoff). This worker is a near-clone of mkfWorker.js
// but for the Kirchhoff module: it loads libKirchhoff.js (embind factory, default export) and
// exposes every Kirchhoff::api function through the generic callMethod().
//
// The whole Kirchhoff API is string-in / string-out JSON (see KirchhoffApi.hpp), so there are no
// Embind vectors/maps to convert on the way out — callMethod just forwards the string. The
// convertEmbindResult() helper is kept for parity/safety in case a binding ever returns a class.

import * as Comlink from 'comlink';
import { getVersionedWasmUrl } from '/src/stores/storeVersioning';

let kh = null;
let readyResolve = null;
const ready = new Promise((resolve) => { readyResolve = resolve; });

// Kirchhoff bindings are all std::string -> std::string, so this is a pass-through in practice.
// Kept defensively symmetrical with mkfWorker.convertEmbindResult().
function convertEmbindResult(result) {
    if (result == null) return result;
    if (typeof result.keys === 'function' && typeof result.get === 'function') return result; // map (unexpected)
    if (typeof result.size === 'function' && typeof result.get === 'function') return result; // vector (unexpected)
    return result;
}

const workerApi = {
    /**
     * Initialize the Kirchhoff WASM module.
     * @param {string} wasmJsUrl - URL to libKirchhoff.js
     */
    async init(wasmJsUrl) {
        if (kh) {
            return true; // Already initialized
        }

        try {
            const versionedUrl = getVersionedWasmUrl(wasmJsUrl);
            const baseUrl = versionedUrl.substring(0, versionedUrl.lastIndexOf('/') + 1);

            console.log(`[Kirchhoff Worker] Loading WASM from: ${versionedUrl}`);

            const response = await fetch(versionedUrl);
            const moduleCode = await response.text();

            const blob = new Blob([moduleCode], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);

            const ModuleFactory = (await import(/* @vite-ignore */ blobUrl)).default;
            URL.revokeObjectURL(blobUrl);

            // Match mkfWorker's console policy: quiet stdout always; stderr only in dev.
            const DEBUG_WASM_LOGS = false;
            const isProd = !!(import.meta.env && import.meta.env.PROD);
            const wasmPrint = DEBUG_WASM_LOGS ? (t) => console.log(t) : () => {};
            const wasmPrintErr = (DEBUG_WASM_LOGS || !isProd)
                ? (t) => console.warn('[Kirchhoff]', t)
                : () => {};

            return new Promise((resolve, reject) => {
                ModuleFactory({
                    print: wasmPrint,
                    printErr: wasmPrintErr,
                    locateFile(path) {
                        if (path.endsWith('.wasm')) {
                            return getVersionedWasmUrl(baseUrl + path);
                        }
                        return path;
                    },
                    onRuntimeInitialized() {
                        kh = this;
                        readyResolve(kh);
                        resolve(true);
                    }
                });
            });
        } catch (error) {
            console.error('[Kirchhoff Worker] Init error:', error);
            throw error;
        }
    },

    async waitReady() {
        await ready;
        return true;
    },

    async getAvailableMethods() {
        await ready;
        return Object.keys(kh).filter(key => typeof kh[key] === 'function');
    },

    /**
     * Generic method caller - forwards ANY Kirchhoff::api method (design_tas, process_converter,
     * generate_ngspice_circuit, simulate_ngspice, extract_operating_point, topology_waveforms,
     * diagnostics, main_magnetic_inputs, generate_ltspice_circuit).
     */
    async callMethod(methodName, ...args) {
        await ready;

        if (!kh[methodName]) {
            throw new Error(`[Kirchhoff Worker] Method not found: ${methodName}`);
        }

        try {
            const result = kh[methodName](...args);
            return convertEmbindResult(result);
        } catch (error) {
            const message = error?.message || (typeof error === 'string' ? error : `Error calling ${methodName}`);
            console.error(`[Kirchhoff Worker] Error calling ${methodName}:`, message);
            throw new Error(message);
        }
    },
};

Comlink.expose(workerApi);
