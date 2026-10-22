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
// With `engineManifest` (the deployed WebFrontend build):
//   - The generated files follow the engine: MAS.ts and the schema bundle are regenerated
//     only from schema checkouts at the MAS / PEAS commits engineManifest.json names (set
//     OM_MAS_SCHEMAS_DIR / OM_PEAS_SCHEMAS_DIR), and each records the commits it came from.
//   - Every build and dev-server start then checks the engine files against their recorded
//     sha256 and the generated files against the engine's MAS / PEAS commits, and FAILS if
//     either differs. This needs no schemas, so it also guards the production build.
//
// Behavior without `engineManifest`:
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
import crypto from 'node:crypto';
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


// The git commit a schema directory is checked out at. The generated files record it, so a
// build can tell which MAS / PEAS revision they were made from. A directory with uncommitted
// changes has no commit to name, so generating from it is refused rather than mislabelled.
export function schemaSource(dir) {
    let commit;
    try {
        commit = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
        throw new Error(`vite-plugin-mas-regen: ${dir} is not inside a git checkout; the generated files must name the schema commit they come from`);
    }
    const dirty = execFileSync('git', ['-C', dir, 'status', '--porcelain', '--', '.'], { encoding: 'utf8' }).trim();
    return { commit, dirty: dirty.length > 0 };
}

function sourcesOf(schemasDir, peasDir) {
    const mas = schemaSource(schemasDir);
    const peas = schemaSource(peasDir);
    if (mas.dirty || peas.dirty) {
        throw new Error(`vite-plugin-mas-regen: uncommitted changes in ${mas.dirty ? schemasDir : peasDir}; ` +
            'the generated files would name a commit they do not match');
    }
    return { mas: mas.commit, peas: peas.commit };
}

// First line of every generated MAS.ts: the MAS and PEAS commits it was generated from.
const MAS_TS_HEADER_RE = /^\/\/ Generated by vite-plugin-mas-regen from MAS ([0-9a-f]{40}) and PEAS ([0-9a-f]{40})\. Do not edit\.\n/;
function masTsHeader(source) {
    return `// Generated by vite-plugin-mas-regen from MAS ${source.mas} and PEAS ${source.peas}. Do not edit.\n`;
}
function masTsSource(file) {
    if (!fs.existsSync(file)) return null;
    const head = fs.readFileSync(file, 'utf8').slice(0, 200);
    const m = head.match(MAS_TS_HEADER_RE);
    return m ? { mas: m[1], peas: m[2] } : null;
}
function bundleSource(file) {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8')).source || null;
}
const sameSource = (a, b) => !!a && !!b && a.mas === b.mas && a.peas === b.peas;

// The engine manifest (engineManifest.json, committed next to the engines) names the MKF,
// MAS and PEAS commits the WASM engines were built from and the sha256 of every engine file.
// The checks below fail the build when
//   - an engine file no longer matches its recorded hash (an engine was swapped without
//     recording what it was built from), or
//   - masSchemas.json or a MAS.ts was generated from other MAS / PEAS commits than the engine.
// None of it needs the schemas, so it runs on the production box too.
export function readEngineManifest(manifestPath) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const key of ['mkf', 'mas', 'peas', 'engines']) {
        if (!manifest[key]) throw new Error(`vite-plugin-mas-regen: ${manifestPath} has no "${key}"`);
    }
    return manifest;
}

// Records the engine manifest after an engine rebuild: the MKF commit the engines were built
// from, the MAS and PEAS commits that MKF tree has checked out, and the sha256 of each engine
// file (paths relative to the manifest). Refuses a dirty MKF tree or submodules off their pin.
export function writeEngineManifest({ manifestPath, mkfDir, engineFiles }) {
    const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
    const mkf = git(mkfDir, 'rev-parse', 'HEAD');
    if (git(mkfDir, 'status', '--porcelain', '--untracked-files=no')) {
        throw new Error(`writeEngineManifest: ${mkfDir} has uncommitted changes; the engine would not be MKF ${mkf}`);
    }
    const pinned = {};
    for (const sub of ['MAS', 'PEAS']) {
        const pin = git(mkfDir, 'ls-tree', 'HEAD', sub).split(/\s+/)[2];
        const checkedOut = git(path.join(mkfDir, sub), 'rev-parse', 'HEAD');
        if (pin !== checkedOut) {
            throw new Error(`writeEngineManifest: ${mkfDir}/${sub} is at ${checkedOut}, MKF ${mkf} pins ${pin}`);
        }
        pinned[sub.toLowerCase()] = pin;
    }
    const engines = {};
    for (const rel of engineFiles) {
        engines[rel] = crypto.createHash('sha256').update(fs.readFileSync(path.resolve(path.dirname(manifestPath), rel))).digest('hex');
    }
    const manifest = { mkf, mas: pinned.mas, peas: pinned.peas, engines };
    writeAtomically(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    return manifest;
}

export function checkGeneratedAgainstEngine({ manifestPath, schemaBundleTarget, targets }) {
    const manifest = readEngineManifest(manifestPath);
    const problems = [];
    for (const [rel, expected] of Object.entries(manifest.engines)) {
        const file = path.resolve(path.dirname(manifestPath), rel);
        if (!fs.existsSync(file)) { problems.push(`engine file ${rel} is missing`); continue; }
        const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
        if (actual !== expected) {
            problems.push(`engine file ${rel} has sha256 ${actual}, the manifest records ${expected}: ` +
                'an engine changed without engineManifest.json recording the MKF / MAS / PEAS it was built from');
        }
    }
    const engineSource = { mas: manifest.mas, peas: manifest.peas };
    const generated = [];
    if (schemaBundleTarget) generated.push([schemaBundleTarget, bundleSource(schemaBundleTarget)]);
    for (const t of targets) generated.push([t, masTsSource(t)]);
    for (const [file, source] of generated) {
        if (!sameSource(source, engineSource)) {
            problems.push(`${file} was generated from ${source ? `MAS ${source.mas} / PEAS ${source.peas}` : 'an unrecorded MAS / PEAS'}, ` +
                `but the engine is built from MAS ${manifest.mas} / PEAS ${manifest.peas} (MKF ${manifest.mkf}): ` +
                'regenerate it with OM_MAS_SCHEMAS_DIR / OM_PEAS_SCHEMAS_DIR at those commits');
        }
    }
    if (problems.length) {
        throw new Error(`[mas-regen] the generated MAS files do not match the engine:\n  - ${problems.join('\n  - ')}`);
    }
}

function hasQuicktype() {
    try {
        execFileSync('quicktype', ['--version'], { stdio: 'ignore' });
        return true;
    } catch { return false; }
}

function regenerate(schemasDir, peasDir, targets) {
    const source = sourcesOf(schemasDir, peasDir);
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
    content = masTsHeader(source) + content;
    fs.writeFileSync(tmp, content);
    for (const t of targets) {
        fs.mkdirSync(path.dirname(t), { recursive: true });
        const tmp2 = t + '.tmp.' + process.pid;
        fs.writeFileSync(tmp2, content);
        fs.renameSync(tmp2, t);
    }
    fs.unlinkSync(tmp);
}

// The JSON Schema bundle the MAS sentry validates against (masValidator.js):
// every MAS schema plus every PEAS schema they reach, as parsed objects sorted
// by $id so the committed file only changes when a schema does. quicktype's
// Convert.to* only checks types, enums and unknown keys; the sentry needs the
// real schemas for bounds, patterns, oneOf, const and required-in-branches.
export function buildSchemaBundle(schemasDir, peasDir) {
    const masSchemas = listSchemas(schemasDir, ['conformance']);
    // EVERY PEAS schema, not only the ones MAS references by absolute URL: PEAS
    // files reference each other by RELATIVE path ("./outputBase.json"), which
    // collectPeasSources does not follow, and the validator must resolve them all.
    if (!peasDir) {
        throw new Error('vite-plugin-mas-regen: no PEAS schemas found; MAS $refs PEAS, so the bundle needs them');
    }
    const peasSources = listSchemas(peasDir, ['conformance']);
    const byId = new Map();
    for (const file of [...masSchemas, ...peasSources]) {
        const schema = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (typeof schema.$id !== 'string') {
            throw new Error(`vite-plugin-mas-regen: schema ${file} has no $id; the validator resolves $refs by $id`);
        }
        if (byId.has(schema.$id)) {
            throw new Error(`vite-plugin-mas-regen: two schemas share $id ${schema.$id}`);
        }
        byId.set(schema.$id, schema);
    }
    const ids = [...byId.keys()].sort();
    return JSON.stringify({ source: sourcesOf(schemasDir, peasDir), schemas: ids.map((id) => byId.get(id)) }, null, 1) + '\n';
}

function writeAtomically(target, content) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const tmp = target + '.tmp.' + process.pid;
    fs.writeFileSync(tmp, content);
    fs.renameSync(tmp, target);
}

export default function masRegenPlugin(opts = {}) {
    const { schemasDir: schemasDirOpt, peasDir: peasDirOpt, targets, schemaBundleTarget, engineManifest } = opts;
    if (!Array.isArray(targets) || targets.length === 0) {
        throw new Error('vite-plugin-mas-regen: `targets` (array of absolute paths) is required');
    }
    let warned = false;
    let didRunOnce = false;

    // With an engine manifest the generated files follow the ENGINE, not whichever schema
    // checkout happens to be nearby: they are regenerated only from schema directories at the
    // MAS / PEAS commits the manifest names, and then checked against it. The check fails the
    // build (and the dev server) when they differ, so they cannot go stale against the engine.
    function regenForEngine(label, schemasDir, peasDir) {
        const manifest = readEngineManifest(engineManifest);
        if (!peasDir) {
            console.warn(`[mas-regen] (${label}) no PEAS schemas found next to ${schemasDir}; not regenerating`);
            return;
        }
        let source;
        try {
            source = sourcesOf(schemasDir, peasDir);
        } catch (e) {
            console.warn(`[mas-regen] (${label}) not regenerating: ${e.message}`);
            return;
        }
        if (source.mas !== manifest.mas || source.peas !== manifest.peas) {
            console.warn(`[mas-regen] (${label}) not regenerating from MAS ${source.mas} / PEAS ${source.peas} ` +
                `(${schemasDir}): the engine is built from MAS ${manifest.mas} / PEAS ${manifest.peas}. ` +
                'Point OM_MAS_SCHEMAS_DIR / OM_PEAS_SCHEMAS_DIR at checkouts of those commits to regenerate.');
            return;
        }
        if (schemaBundleTarget) {
            const bundle = buildSchemaBundle(schemasDir, peasDir);
            if (!fs.existsSync(schemaBundleTarget) || fs.readFileSync(schemaBundleTarget, 'utf8') !== bundle) {
                writeAtomically(schemaBundleTarget, bundle);
                console.log(`[mas-regen] (${label}) wrote the validator schema bundle from MAS ${source.mas} -> ${schemaBundleTarget}`);
            }
        }
        if (targets.every((t) => sameSource(masTsSource(t), source))) return;
        if (!hasQuicktype()) {
            throw new Error('[mas-regen] MAS.ts must be regenerated for the engine\'s MAS but `quicktype` is not on PATH ' +
                '(npm i -g quicktype@23.2.6)');
        }
        const t0 = Date.now();
        console.log(`[mas-regen] (${label}) regenerating MAS.ts from MAS ${source.mas} / PEAS ${source.peas} -> ${targets.length} target(s)...`);
        regenerate(schemasDir, peasDir, targets);
        console.log(`[mas-regen] regenerated in ${Date.now() - t0} ms`);
    }

    function maybeRegen(label) {
        const schemasDir = schemasDirOpt || findSchemasDir(process.cwd());
        if (engineManifest) {
            if (schemasDir) {
                regenForEngine(label, schemasDir, peasDirOpt || findPeasDir(schemasDir) || findPeasDir(process.cwd()));
            }
            checkGeneratedAgainstEngine({ manifestPath: engineManifest, schemaBundleTarget, targets });
            return;
        }
        if (!schemasDir) {
            // Standalone build without MAS submodule — keep checked-in MAS.ts.
            return;
        }
        const peasDir = peasDirOpt || findPeasDir(schemasDir) || findPeasDir(process.cwd());
        const newestSchema = Math.max(
            newestMtime(schemasDir, ['conformance']),
            peasDir ? newestMtime(peasDir, ['conformance']) : 0,
        );
        // The validator's schema bundle needs no quicktype: refresh it whenever the
        // schemas are newer (or it is missing), independently of MAS.ts.
        if (schemaBundleTarget && (!fs.existsSync(schemaBundleTarget)
                || fs.statSync(schemaBundleTarget).mtimeMs < newestSchema)) {
            const bundle = buildSchemaBundle(schemasDir, peasDir);
            if (!fs.existsSync(schemaBundleTarget) || fs.readFileSync(schemaBundleTarget, 'utf8') !== bundle) {
                writeAtomically(schemaBundleTarget, bundle);
                // eslint-disable-next-line no-console
                console.log(`[mas-regen] (${label}) wrote the validator schema bundle -> ${schemaBundleTarget}`);
            }
        }
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
