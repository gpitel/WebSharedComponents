// vite-plugin-mas-regen
//
// Regenerates the TypeScript binding `MAS.ts` from the JSON-Schema files in
// the MAS submodule whenever any schema is newer than the existing MAS.ts.
//
// MAS schemas `$ref` shared PEAS definitions by absolute URL
// (https://psma.com/peas/...). quicktype cannot fetch those over the network, so
// the plugin locates the local PEAS schemas (MKF/PEAS, or a `peasDir` override)
// and supplies the transitively-referenced ones as additional `-S` sources. By
// default it prefers MKF's MAS+PEAS submodules — the same schemas the WASM is
// built from — so the generated TypeScript stays consistent with the WASM.
//
// Usage (in vite.config.js):
//
//     import masRegen from 'WebSharedComponents/build-tools/vite-plugin-mas-regen.js';
//     export default defineConfig({
//         plugins: [
//             masRegen({
//                 // Absolute path to MAS submodule's schemas directory.
//                 // If omitted, plugin auto-detects MKF/MAS/schemas (preferred)
//                 // or a sibling ../MAS/schemas and walks up until found.
//                 schemasDir: undefined,
//                 // Absolute path to PEAS schemas directory (for resolving the
//                 // https://psma.com/peas/... $refs in MAS). If omitted, plugin
//                 // auto-detects MKF/PEAS/schemas near the MAS dir.
//                 peasDir: undefined,
//                 // List of absolute paths where the regenerated MAS.ts should
//                 // be written. Plugin writes ONLY to these targets.
//                 targets: [
//                     path.resolve(__dirname, 'src/assets/ts/MAS.ts'),
//                     path.resolve(__dirname, 'WebSharedComponents/assets/ts/MAS.ts'),
//                 ],
//             }),
//             vue(),
//             // ...
//         ],
//     });
//
// Behavior:
//   - On `vite dev` startup AND on `vite build` start, compares the newest
//     mtime of `${schemasDir}/**/*.json` (excluding conformance/) to the oldest
//     mtime among the targets.
//   - If schemas are newer (or any target is missing), invokes the `quicktype`
//     CLI to regenerate `MAS.ts` and overwrites every target. Writes complete
//     atomically (write to .tmp + rename).
//   - If `quicktype` is not on PATH, logs a single warning and skips. The
//     committed MAS.ts is still served. This keeps standalone builds (no MAS
//     submodule, no quicktype) working.
//   - In dev, also adds the schemas directory to the watch list so HMR
//     re-triggers regen on schema edits.
//
// Design notes:
//   - We shell out to the `quicktype` CLI (no npm dep) so this plugin has zero
//     `package.json` impact. CI installs quicktype globally; devs already have
//     it for the C++ MAS.hpp regen workflow.
//   - We do NOT silently fall back to a stale MAS.ts when regen is required
//     and quicktype fails — we log loudly and let the build proceed with the
//     known-stale file rather than break the dev loop.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function newestMtime(dir, exclude = []) {
    let newest = 0;
    function walk(d) {
        for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
            const full = path.join(d, ent.name);
            if (exclude.some(e => full.includes(e))) continue;
            if (ent.isDirectory()) walk(full);
            else if (ent.isFile() && ent.name.endsWith('.json')) {
                const m = fs.statSync(full).mtimeMs;
                if (m > newest) newest = m;
            }
        }
    }
    walk(dir);
    return newest;
}

function listSchemas(dir, exclude = []) {
    const out = [];
    function walk(d) {
        for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
            const full = path.join(d, ent.name);
            if (exclude.some(e => full.includes(e))) continue;
            if (ent.isDirectory()) walk(full);
            else if (ent.isFile() && ent.name.endsWith('.json')) out.push(full);
        }
    }
    walk(dir);
    return out;
}

function findSchemasDir(startDir) {
    // Walk up looking for a MAS/schemas/MAS.json. We PREFER MKF's MAS submodule
    // (MKF/MAS) over a standalone sibling MAS, because that is the exact schema
    // set the WASM (libMKF) is generated from — regenerating MAS.ts from the
    // same source keeps the TypeScript bindings consistent with what the WASM
    // emits/consumes.
    let cur = path.resolve(startDir);
    for (let i = 0; i < 6; i++) {
        for (const rel of [
            ['MKF', 'MAS', 'schemas', 'MAS.json'],
            ['MAS', 'schemas', 'MAS.json'],
            ['..', 'MKF', 'MAS', 'schemas', 'MAS.json'],
            ['..', 'MAS', 'schemas', 'MAS.json'],
        ]) {
            const candidate = path.join(cur, ...rel);
            if (fs.existsSync(candidate)) return path.dirname(candidate);
        }
        cur = path.dirname(cur);
    }
    return null;
}

function findPeasDir(startDir) {
    // PEAS lives in MKF/PEAS (or as a sibling PEAS repo). MAS schemas $ref PEAS
    // definitions by absolute URL (e.g. https://psma.com/peas/utils.json), which
    // quicktype can only resolve if the matching local PEAS files are supplied as
    // -S sources. Prefer MKF/PEAS so it pairs with MKF/MAS above.
    let cur = path.resolve(startDir);
    for (let i = 0; i < 6; i++) {
        for (const rel of [
            ['MKF', 'PEAS', 'schemas', 'utils.json'],
            ['PEAS', 'schemas', 'utils.json'],
            ['..', 'MKF', 'PEAS', 'schemas', 'utils.json'],
            ['..', 'PEAS', 'schemas', 'utils.json'],
        ]) {
            const candidate = path.join(cur, ...rel);
            if (fs.existsSync(candidate)) return path.dirname(candidate);
        }
        cur = path.dirname(cur);
    }
    return null;
}

// MAS schemas reference PEAS `$defs` via absolute URLs. quicktype matches those
// against each supplied schema's `$id`, so we must hand it the local PEAS files.
// A referenced PEAS file may itself reference further PEAS files, so we follow
// the refs transitively and return every reachable local PEAS schema.
const PEAS_REF_RE = /https:\/\/psma\.com\/peas\/([A-Za-z0-9/_.-]+\.json)/g;
function collectPeasSources(seedFiles, peasDir) {
    if (!peasDir) return [];
    const seen = new Set();
    const queue = [];
    for (const f of seedFiles) {
        for (const m of fs.readFileSync(f, 'utf8').matchAll(PEAS_REF_RE)) queue.push(m[1]);
    }
    const sources = [];
    while (queue.length) {
        const rel = queue.shift();
        if (seen.has(rel)) continue;
        seen.add(rel);
        const full = path.join(peasDir, rel);
        if (!fs.existsSync(full)) continue;
        sources.push(full);
        for (const m of fs.readFileSync(full, 'utf8').matchAll(PEAS_REF_RE)) queue.push(m[1]);
    }
    return sources;
}

function hasQuicktype() {
    try {
        execFileSync('quicktype', ['--version'], { stdio: 'ignore' });
        return true;
    } catch { return false; }
}

function regenerate(schemasDir, peasDir, targets) {
    const schemas = listSchemas(schemasDir, ['conformance']);
    const masJson = path.join(schemasDir, 'MAS.json');
    // PEAS schemas referenced (transitively) by the MAS schemas, supplied so
    // quicktype can resolve the https://psma.com/peas/... $refs locally.
    const peasSources = collectPeasSources([masJson, ...schemas], peasDir);
    const args = [
        '-l', 'ts',
        '-s', 'schema',
        masJson,
        ...schemas.flatMap(s => ['-S', s]),
        ...peasSources.flatMap(s => ['-S', s]),
        '--top-level', 'Mas',
    ];
    // quicktype writes to the file specified by -o; we write to a temp file
    // first, then atomically rename to each target so a half-written MAS.ts
    // is never observed by Vite's file watcher.
    const tmp = path.join(path.dirname(targets[0]), '.MAS.ts.tmp.' + process.pid);
    args.push('-o', tmp);
    execFileSync('quicktype', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    let content = fs.readFileSync(tmp, 'utf8');
    // Quicktype only emits `Convert.toMas`. We post-process the file to add
    // additional converters for the partial payloads we send to WASM
    // (Inputs, Magnetic, Coil, Wire, Core). These rely on the same private
    // `cast` / `r` helpers already defined further down in MAS.ts; since we
    // inject the new methods inside the same file, they have full access.
    //
    // We only inject converters whose type registry entry actually exists in
    // the generated typeMap (quicktype omits unused types). This keeps us
    // resilient to schema renames.
    const extraTypes = ['Inputs', 'Magnetic', 'Coil', 'Wire', 'Core'];
    const present = extraTypes.filter(t => content.includes(`"${t}": o(`) || content.includes(`"${t}": r(`));
    if (present.length > 0) {
        const extras = present.map(t =>
            `    public static to${t}(json: string): ${t} {\n` +
            `        return cast(JSON.parse(json), r("${t}"));\n` +
            `    }`
        ).join('\n\n');
        content = content.replace(
            /(public static masToJson\(value: Mas\): string \{[\s\S]*?\n    \})/,
            `$1\n\n${extras}`
        );
    }
    fs.writeFileSync(tmp, content);
    for (const t of targets) {
        fs.mkdirSync(path.dirname(t), { recursive: true });
        const tmp2 = t + '.tmp.' + process.pid;
        fs.writeFileSync(tmp2, content);
        fs.renameSync(tmp2, t);
    }
    fs.unlinkSync(tmp);
}

export default function masRegenPlugin(opts = {}) {
    const { schemasDir: schemasDirOpt, peasDir: peasDirOpt, targets } = opts;
    if (!Array.isArray(targets) || targets.length === 0) {
        throw new Error('vite-plugin-mas-regen: `targets` (array of absolute paths) is required');
    }
    let warned = false;
    let didRunOnce = false;

    function maybeRegen(label) {
        const schemasDir = schemasDirOpt || findSchemasDir(process.cwd());
        if (!schemasDir) {
            // Standalone build without MAS submodule — keep checked-in MAS.ts.
            return;
        }
        const peasDir = peasDirOpt || findPeasDir(schemasDir) || findPeasDir(process.cwd());
        const newestSchema = Math.max(
            newestMtime(schemasDir, ['conformance']),
            peasDir ? newestMtime(peasDir, ['conformance']) : 0,
        );
        let oldestTarget = Infinity;
        for (const t of targets) {
            if (!fs.existsSync(t)) { oldestTarget = -1; break; }
            const m = fs.statSync(t).mtimeMs;
            if (m < oldestTarget) oldestTarget = m;
        }
        if (newestSchema <= oldestTarget) return;  // up to date

        if (!hasQuicktype()) {
            if (!warned) {
                // eslint-disable-next-line no-console
                console.warn(
                    `[mas-regen] schemas in ${schemasDir} are newer than MAS.ts but ` +
                    `\`quicktype\` is not on PATH. Install with \`npm i -g quicktype\` ` +
                    `to enable auto-regen. Build will proceed with the existing (stale) MAS.ts.`
                );
                warned = true;
            }
            return;
        }
        const t0 = Date.now();
        // eslint-disable-next-line no-console
        console.log(`[mas-regen] (${label}) schemas changed, regenerating MAS.ts -> ${targets.length} target(s)...`);
        try {
            regenerate(schemasDir, peasDir, targets);
            // eslint-disable-next-line no-console
            console.log(`[mas-regen] regenerated in ${Date.now() - t0} ms`);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(`[mas-regen] regeneration FAILED: ${e.message}. ` +
                `Falling back to existing MAS.ts (may be stale).`);
        }
    }

    return {
        name: 'mas-regen',
        // Run on both `vite dev` (configResolved) and `vite build` (buildStart).
        configResolved() {
            if (didRunOnce) return;
            didRunOnce = true;
            maybeRegen('configResolved');
        },
        buildStart() {
            maybeRegen('buildStart');
        },
        configureServer(server) {
            const schemasDir = schemasDirOpt || findSchemasDir(process.cwd());
            if (schemasDir) {
                const peasDir = peasDirOpt || findPeasDir(schemasDir) || findPeasDir(process.cwd());
                // Watch schema directories so edits trigger Vite restart-on-change.
                const watched = [schemasDir, peasDir].filter(Boolean);
                for (const dir of watched) server.watcher.add(path.join(dir, '**', '*.json'));
                server.watcher.on('change', (file) => {
                    if (file.endsWith('.json') && watched.some(d => file.startsWith(d))) {
                        maybeRegen('schema-change');
                    }
                });
            }
        },
    };
}
