/**
 * Mock MAS coils for the schematic playground (port of magneticdesigner
 * scripts/schematic_mocks.py). Each entry is a partial coil object
 * (`functionalDescription[]`) covering a topology variant -- the same data is also
 * stored as standalone JSON under MAS/samples/magnetic/coil/.
 */

const PIN = 'Pin';
const BL = 'Blind';

// winding with two connection ends, each a [type, pinName] pair
const w = (name, side, a, b) => ({
    name,
    isolationSide: side,
    connections: [
        { type: a[0], pinName: a[1] },
        { type: b[0], pinName: b[1] },
    ],
});

const coil = (windings) => ({ functionalDescription: windings });

export const MOCK_COILS = [
    {
        name: 'basic',
        caption: 'P + S, no blind connection',
        coil: coil([
            w('P', 'primary', [PIN, '1'], [PIN, '2']),
            w('S', 'secondary', [PIN, '3'], [PIN, '4']),
        ]),
    },
    {
        name: 'dual_secondary',
        caption: 'P + two isolated secondaries',
        coil: coil([
            w('P', 'primary', [PIN, '1'], [PIN, '2']),
            w('S1', 'secondary', [PIN, '3'], [PIN, '4']),
            w('S2', 'tertiary', [PIN, '5'], [PIN, '6']),
        ]),
    },
    {
        name: 'star_b1',
        caption: 'three primaries commoned at blind B1',
        coil: coil([
            w('P1', 'primary', [PIN, '1'], [BL, 'B1']),
            w('P2', 'primary', [PIN, '2'], [BL, 'B1']),
            w('P3', 'primary', [PIN, '3'], [BL, 'B1']),
            w('S', 'secondary', [PIN, 'S1'], [PIN, 'S2']),
        ]),
    },
    {
        name: 'primary_two_blinds',
        caption: 'two blind stars on the primary (B1, B2)',
        coil: coil([
            w('P1', 'primary', [PIN, '1'], [BL, 'B1']),
            w('P2', 'primary', [PIN, '2'], [BL, 'B1']),
            w('P3', 'primary', [PIN, '3'], [BL, 'B2']),
            w('P4', 'primary', [PIN, '4'], [BL, 'B2']),
            w('S', 'secondary', [PIN, 'S1'], [PIN, 'S2']),
        ]),
    },
    {
        name: 'dual_blind_stars',
        caption: 'two stars: B1 (primary) + B2 (tertiary)',
        coil: coil([
            w('P1', 'primary', [PIN, '1'], [BL, 'B1']),
            w('P2', 'primary', [PIN, '2'], [BL, 'B1']),
            w('P3', 'primary', [PIN, '3'], [BL, 'B1']),
            w('S', 'secondary', [PIN, 'S1'], [PIN, 'S2']),
            w('T1', 'tertiary', [PIN, '4'], [BL, 'B2']),
            w('T2', 'tertiary', [PIN, '5'], [BL, 'B2']),
            w('T3', 'tertiary', [PIN, '6'], [BL, 'B2']),
        ]),
    },
    {
        name: 'cross_blind',
        caption: 'P & S bonded at blind J1 (matched labels + NOTE)',
        coil: coil([
            w('P', 'primary', [PIN, '1'], [BL, 'J1']),
            w('S', 'secondary', [BL, 'J1'], [PIN, '2']),
        ]),
    },
    {
        name: 'blind_chain',
        caption: 'series via B1, B2 (two parallel rails)',
        coil: coil([
            w('P1', 'primary', [PIN, '1'], [BL, 'B1']),
            w('P2', 'primary', [BL, 'B1'], [BL, 'B2']),
            w('P3', 'primary', [BL, 'B2'], [PIN, '2']),
            w('S', 'secondary', [PIN, '3'], [PIN, '4']),
        ]),
    },
    {
        name: 'triple_blind_chain',
        caption: 'series via B1, B2, B3 (three parallel rails)',
        coil: coil([
            w('P1', 'primary', [PIN, '1'], [BL, 'B1']),
            w('P2', 'primary', [BL, 'B1'], [BL, 'B2']),
            w('P3', 'primary', [BL, 'B2'], [BL, 'B3']),
            w('P4', 'primary', [BL, 'B3'], [PIN, '2']),
            w('S', 'secondary', [PIN, '3'], [PIN, '4']),
        ]),
    },
];
