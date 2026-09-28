// JSON Schema validation of MAS documents against the REAL MAS + PEAS schemas
// (Draft 2020-12), for the MAS sentry and the MAS exporter.
//
// quicktype's Convert.to* (MAS.ts) only checks types, enums and unknown keys. It
// accepts documents the schema rejects: out-of-range numbers, patterns, `const`,
// `oneOf` branches, required keys inside a branch (ABT #1388). This validator is
// the contract itself. The schema bundle (masSchemas.json) is generated from the
// same MAS/PEAS schemas the engine is built with, by the mas-regen vite plugin.
//
// `null` is NOT a value MAS accepts for an optional key: the key must be absent.
// Callers that hold engine output (which writes unset optionals as null) strip
// nulls first — exactly what they then send or save.

import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import bundle from './masSchemas.json';

const KIND_TO_ID = {
    Mas: 'https://psma.com/mas/MAS.json',
    Inputs: 'https://psma.com/mas/inputs.json',
    Outputs: 'https://psma.com/mas/outputs.json',
    Magnetic: 'https://psma.com/mas/magnetic.json',
    Core: 'https://psma.com/mas/magnetic/core.json',
    Coil: 'https://psma.com/mas/magnetic/coil.json',
    Wire: 'https://psma.com/mas/magnetic/wire.json',
};

let ajv = null;
const validators = new Map();

function compiled(kind) {
    const id = KIND_TO_ID[kind];
    if (!id) {
        throw new Error(`masValidator: unknown MAS kind "${kind}" (known: ${Object.keys(KIND_TO_ID).join(', ')})`);
    }
    if (!validators.has(kind)) {
        if (ajv == null) {
            // strict:false only relaxes checks on the SCHEMAS (e.g. unknown
            // annotation keywords in PEAS); the data is validated in full.
            ajv = new Ajv2020({ strict: false, allErrors: true });
            addFormats(ajv);
            for (const schema of bundle.schemas) ajv.addSchema(schema);
        }
        const validate = ajv.getSchema(id);
        if (!validate) {
            throw new Error(`masValidator: schema ${id} is not in the bundle — regenerate masSchemas.json`);
        }
        validators.set(kind, validate);
    }
    return validators.get(kind);
}

/** The schema violations of `obj` as MAS `kind`, as readable strings; empty when valid. */
export function masSchemaErrors(kind, obj) {
    const validate = compiled(kind);
    if (validate(obj)) return [];
    return (validate.errors || []).map((e) => {
        const where = e.instancePath || '/';
        const extra = e.params && Object.keys(e.params).length ? ` ${JSON.stringify(e.params)}` : '';
        return `${where} ${e.message}${extra}`;
    });
}

/** Throw a specific error listing the violations if `obj` is not a valid MAS `kind`. */
export function assertValidMas(kind, obj, where) {
    const errors = masSchemaErrors(kind, obj);
    if (errors.length > 0) {
        const shown = errors.slice(0, 8).join('; ');
        const more = errors.length > 8 ? ` (+${errors.length - 8} more)` : '';
        throw new Error(`[MAS schema @ ${where}] not a valid MAS ${kind}: ${shown}${more}`);
    }
}
