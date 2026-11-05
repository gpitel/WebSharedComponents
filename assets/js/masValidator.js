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
import { describeMasSchemaErrors, rawMasSchemaErrors } from './masSchemaText.js';
import { DETAILS_SEPARATOR } from './noticeText.js';

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
            ajv = new Ajv2020({ strict: false, allErrors: true, verbose: true });
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
    return rawMasSchemaErrors(validate.errors || []);
}

/**
 * The schema violations of `obj` as MAS `kind`: `sentences` say them in words (which part of the
 * design, which field, what is wrong), `raw` is the validator's report. Both empty when valid.
 */
export function masSchemaViolations(kind, obj) {
    const validate = compiled(kind);
    if (validate(obj)) return { sentences: [], raw: [] };
    const errors = validate.errors || [];
    return { sentences: describeMasSchemaErrors(errors, kind, obj), raw: rawMasSchemaErrors(errors) };
}

/**
 * Throw a specific error listing the violations if `obj` is not a valid MAS `kind`. Its message
 * says them in words, followed by the validator's report after DETAILS_SEPARATOR; the sentences
 * are also on the error as `masSchemaSentences`.
 */
export function assertValidMas(kind, obj, where) {
    const { sentences, raw } = masSchemaViolations(kind, obj);
    if (raw.length > 0) {
        const shown = raw.slice(0, 8).join('; ');
        const more = raw.length > 8 ? ` (+${raw.length - 8} more)` : '';
        const error = new Error(`${sentences.join(' ')}${DETAILS_SEPARATOR}[MAS schema @ ${where}] not a valid MAS ${kind}: ${shown}${more}`);
        error.masSchemaSentences = sentences;
        throw error;
    }
}
