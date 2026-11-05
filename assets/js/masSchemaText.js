// MAS JSON Schema violations (ajv errors) in words a design engineer reads: which part of the
// design, which field, what value is wrong and what it must be. Used where a document is refused
// for not following the MAS format (loading a file, the MAS sentry before an engine call, the MAS
// export). The raw report stays available as the detail.

// The schema's own names of the fields a violation is about, as the builder names them.
const FIELD_NAMES = {
    numberLayers: 'number of layers',
    layerThickness: 'layer thickness',
    numberTurns: 'number of turns',
    numberParallels: 'number of parallels',
    fillingFactor: 'filling factor',
    isolationSide: 'isolation side',
    wireType: 'wire type',
    conductingDiameter: 'conducting diameter',
    conductingWidth: 'conducting width',
    conductingHeight: 'conducting height',
    outerDiameter: 'outer diameter',
    outerWidth: 'outer width',
    outerHeight: 'outer height',
    numberConductors: 'number of strands',
    strand: 'strand',
    coating: 'coating',
    grade: 'grade',
    breakdownVoltage: 'breakdown voltage',
    thermalRating: 'thermal rating',
    material: 'material',
    shape: 'shape',
    gapping: 'gaps',
    length: 'length',
    numberStacks: 'number of stacks',
    connections: 'connections',
    margin: 'margin',
    windingStyle: 'winding style',
    sectionsAlignment: 'sections alignment',
    layersOrientation: 'layers orientation',
    turnsAlignment: 'turns alignment',
    magnetizingInductance: 'magnetizing inductance',
    turnsRatios: 'turns ratios',
    frequency: 'frequency',
    ambientTemperature: 'ambient temperature',
    waveform: 'waveform',
    harmonics: 'harmonics',
    processed: 'processed data',
    magnetizingCurrent: 'magnetizing current',
    current: 'current',
    voltage: 'voltage',
    time: 'time axis',
    data: 'values',
    dimensions: 'dimensions',
    coordinates: 'coordinates',
    windingWindows: 'winding windows',
    columns: 'columns',
    wallThickness: 'wall thickness',
    columnThickness: 'column thickness',
    name: 'name',
    type: 'type',
};

// Path segments that only structure the document and say nothing to the user.
const SILENT_SEGMENTS = new Set(['functionalDescription', 'processedDescription', 'manufacturerInfo']);

// Where each MAS kind sits in a whole MAS document, so its paths read the same as a file's.
const KIND_PREFIX = {
    Mas: [],
    Inputs: ['inputs'],
    Outputs: ['outputs'],
    Magnetic: ['magnetic'],
    Core: ['magnetic', 'core'],
    Coil: ['magnetic', 'coil'],
    Wire: ['wire'],
};

function fieldName(key) {
    if (FIELD_NAMES[key] != null) return FIELD_NAMES[key];
    // A field the list above does not name: its schema name in words ("windingWindowAngle").
    return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
}

function pointerTokens(pointer) {
    return pointer.split('/').slice(1).map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function valueAt(root, tokens) {
    let value = root;
    for (const token of tokens) {
        if (value == null || typeof value !== 'object') return undefined;
        value = value[token];
    }
    return value;
}

function quotedName(item) {
    return typeof item?.name === 'string' && item.name.trim() !== '' ? `'${item.name}'` : null;
}

// "coil > section 'Primary section 0' > margin" for /magnetic/coil/sectionsDescription/0/margin.
function describePlace(tokens, root) {
    const parts = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const parent = tokens[i - 1];
        if (/^\d+$/.test(token)) {
            const index = Number(token);
            const item = valueAt(root, tokens.slice(0, i + 1));
            const named = quotedName(item);
            const ordinal = `${index + 1}`;
            const labels = {
                operatingPoints: 'operating point',
                excitationsPerWinding: 'excitation of winding',
                sectionsDescription: 'section',
                layersDescription: 'layer',
                turnsDescription: 'turn',
                groupsDescription: 'group',
                gapping: 'gap',
                connections: 'connection',
                windingWindows: 'winding window',
                columns: 'column',
                frequencies: 'frequency',
                time: 'time',
                data: 'value',
            };
            if (parent === 'functionalDescription' && tokens[i - 2] === 'coil') {
                parts.push(`winding ${named ?? ordinal}`);
            }
            else if (parent === 'excitationsPerWinding') {
                const winding = valueAt(root, ['magnetic', 'coil', 'functionalDescription', token]);
                parts.push(`excitation of winding ${quotedName(winding) ?? ordinal}`);
            }
            else if (labels[parent] != null) {
                // The list's own name is replaced by the item's ("gaps > 1" reads "gap 1").
                if (parts.length > 0 && parts[parts.length - 1] === fieldName(parent)) parts.pop();
                parts.push(`${labels[parent]} ${named ?? ordinal}`);
            }
            else {
                parts.push(`item ${ordinal}`);
            }
            continue;
        }
        if (SILENT_SEGMENTS.has(token)) continue;
        if (i === 0 && ['magnetic', 'inputs'].includes(token)) continue;
        if (['operatingPoints', 'excitationsPerWinding', 'sectionsDescription', 'layersDescription',
            'turnsDescription', 'groupsDescription'].includes(token)) continue;
        parts.push(token === 'designRequirements' ? 'design requirements' : fieldName(token));
    }
    const place = parts.join(' > ');
    return place === '' ? 'The design' : place.charAt(0).toUpperCase() + place.slice(1);
}

function describeValue(value) {
    if (typeof value === 'number') return Number.isInteger(value) ? `${value}` : `${Number(value.toPrecision(4))}`;
    if (typeof value === 'string') return `'${value}'`;
    if (Array.isArray(value)) return `a list of ${value.length}`;
    if (value == null) return 'empty';
    return 'a group of values';
}

const TYPE_WORDS = { number: 'a number', integer: 'a whole number', string: 'a text', array: 'a list', object: 'a group of values', boolean: 'yes or no' };
const COMBINATORS = new Set(['oneOf', 'anyOf', 'allOf', 'if', 'then', 'else', 'not']);

/**
 * Sentences describing the violations, one per place and problem, with the noise of the
 * schema's alternatives removed (a margin that is an object is also reported as "must be array"
 * by the branch it does not take, and as "must match exactly one schema in oneOf").
 * @param {Array} errors ajv errors (instancePath, keyword, params, message)
 * @param {string} kind the MAS kind validated ('Mas', 'Magnetic', ...), to place the paths
 * @param {object} document what was validated, to name items and quote values
 */
export function describeMasSchemaErrors(errors, kind, document) {
    const prefix = KIND_PREFIX[kind];
    if (prefix == null) {
        throw new Error(`describeMasSchemaErrors: unknown MAS kind '${kind}'`);
    }
    // A whole-MAS view of what was validated, so items are named the same way for every kind.
    let root = document;
    for (let i = prefix.length - 1; i >= 0; i--) {
        root = { [prefix[i]]: root };
    }
    const withPaths = errors.map((error) => ({ error, tokens: [...prefix, ...pointerTokens(error.instancePath || '')] }));
    const pathOf = (tokens) => tokens.join('/');
    const isUnder = (tokens, base) => pathOf(tokens) === pathOf(base) || pathOf(tokens).startsWith(`${pathOf(base)}/`);

    // Where the schema offers alternatives (a margin that is a group of values or a list, a wire
    // that is round, rectangular, foil or litz), every alternative the value does not take reports
    // its own mismatches at that place: those are dropped. What the place's own conditions require
    // (an "if ... then" of the schema) and what is wrong deeper inside it are kept.
    const alternativePlaces = withPaths.filter(({ error }) => ['oneOf', 'anyOf'].includes(error.keyword)).map(({ tokens }) => pathOf(tokens));
    // Where the value's type rules out every form but one (a margin given as a group of values
    // rules out the list), what that one form requires is what is wrong there ("the number of
    // layers is missing"). The forms are counted from the alternative itself (`error.schema`, given
    // by a validator compiled with `verbose`); each form that refuses the value's type says so once.
    // Only where that is the place's only alternative: a wire's remaining form is itself a choice of
    // wire types, whose own mismatches would be said as one.
    const singleFormPlaces = new Set();
    for (const { error, tokens } of withPaths) {
        if (!['oneOf', 'anyOf'].includes(error.keyword) || !Array.isArray(error.schema)) continue;
        const place = pathOf(tokens);
        if (alternativePlaces.filter((other) => other === place).length !== 1) continue;
        const formsRefusingTheType = withPaths.filter(({ error: other, tokens: otherTokens }) =>
            pathOf(otherTokens) === place && other.keyword === 'type' && !/\/then\//.test(other.schemaPath ?? '')).length;
        if (error.schema.length - formsRefusingTheType === 1) singleFormPlaces.add(place);
    }
    const kept = withPaths.filter(({ error, tokens }) => {
        if (COMBINATORS.has(error.keyword) || error.keyword === 'false schema') return false;
        const place = pathOf(tokens);
        if (alternativePlaces.includes(place)) {
            return /\/then\//.test(error.schemaPath ?? '') || (singleFormPlaces.has(place) && error.keyword !== 'type');
        }
        return true;
    });
    // An alternative none of whose forms fits, with nothing more specific to say, is said as such.
    for (const place of new Set(alternativePlaces)) {
        if (!kept.some(({ tokens }) => isUnder(tokens, place.split('/')))) {
            kept.push({ error: { keyword: 'combinator' }, tokens: place.split('/') });
        }
    }

    // One sentence per place: what is missing there, then what is wrong with each field.
    const byPlace = new Map();
    const add = (placeTokens, problem) => {
        const key = pathOf(placeTokens);
        if (!byPlace.has(key)) byPlace.set(key, { placeTokens, problems: [] });
        const entry = byPlace.get(key);
        if (!entry.problems.includes(problem)) entry.problems.push(problem);
    };
    for (const { error, tokens } of kept) {
        const params = error.params ?? {};
        const value = valueAt(root, tokens);
        const last = tokens[tokens.length - 1];
        const fieldTokens = tokens.slice(0, -1);
        const isIndex = /^\d+$/.test(last ?? '');
        // A problem with a field is told at the place that holds it, naming the field.
        const field = last != null && !isIndex ? fieldName(last) : null;
        const at = field != null ? fieldTokens : tokens;
        const subject = field != null ? `the ${field}` : 'it';
        switch (error.keyword) {
        case 'required':
            add(tokens, `the ${fieldName(params.missingProperty)} is missing`);
            break;
        case 'exclusiveMinimum':
        case 'minimum':
        case 'exclusiveMaximum':
        case 'maximum': {
            const bound = { exclusiveMinimum: 'greater than', minimum: 'at least', exclusiveMaximum: 'less than', maximum: 'at most' }[error.keyword];
            add(at, `${subject} is ${describeValue(value)}, but must be ${bound} ${describeValue(params.limit)}`);
            break;
        }
        case 'type':
            add(at, `${subject} is ${describeValue(value)}, but must be ${TYPE_WORDS[params.type] ?? params.type}`);
            break;
        case 'enum':
            add(at, `${subject} is ${describeValue(value)}, which is not one of ${(params.allowedValues ?? []).slice(0, 8).map(describeValue).join(', ')}`);
            break;
        case 'const':
            add(at, `${subject} is ${describeValue(value)}, but must be ${describeValue(params.allowedValue)}`);
            break;
        case 'minItems':
        case 'maxItems': {
            // "the connections list holds 1 entry, but needs at least 2"
            const count = Array.isArray(value) ? value.length : 0;
            const holder = field != null ? `the ${field} list holds` : 'it holds';
            const bound = error.keyword === 'minItems' ? 'needs at least' : 'allows at most';
            add(at, `${holder} ${count} ${count === 1 ? 'entry' : 'entries'}, but ${bound} ${params.limit}`);
            break;
        }
        case 'additionalProperties':
        case 'unevaluatedProperties':
            add(tokens, `the field '${params.additionalProperty ?? params.unevaluatedProperty}' is not part of the MAS format`);
            break;
        case 'pattern':
        case 'format':
            add(at, `${subject} is ${describeValue(value)}, which is not a valid value for it`);
            break;
        case 'combinator':
            add(tokens, 'it does not match any of the forms the MAS format allows');
            break;
        default:
            add(at, `${subject} ${error.message}`);
        }
    }

    const sentences = [];
    for (const { placeTokens, problems } of byPlace.values()) {
        const missing = problems.filter((p) => p.endsWith(' is missing')).map((p) => p.slice(0, -' is missing'.length));
        const others = problems.filter((p) => !p.endsWith(' is missing'));
        const said = [];
        const plural = (field) => /s$/.test(field) && !/(ss|thickness)$/.test(field);
        if (missing.length === 1) said.push(`${missing[0]} ${plural(missing[0]) ? 'are' : 'is'} missing`);
        else if (missing.length > 1) said.push(`${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]} are missing`);
        said.push(...others);
        sentences.push(`${describePlace(placeTokens, root)}: ${said.join('; ')}.`);
    }
    return sentences;
}

/** The raw report of the violations (the detail behind the sentences). */
export function rawMasSchemaErrors(errors) {
    return errors.map((error) => {
        const extra = error.params && Object.keys(error.params).length ? ` ${JSON.stringify(error.params)}` : '';
        return `${error.instancePath || '/'} ${error.message}${extra}`;
    });
}
