// node --test tests/noticeText.test.mjs
// What the user reads of a failure: the transport around it is removed, the engine's words are
// kept as they are, and the code and the full text survive as the detail.
import test from 'node:test';
import assert from 'node:assert/strict';
import { describeFailure } from '../assets/js/noticeText.js';

test('a WASM reply loses "Error: Exception: " and its code, which is kept apart', () => {
    const raw = 'Error: Exception: [MISSING_DATA] Operating point 0 has 6 excitations for a magnetic with 2 windings; every winding needs exactly one excitation\n    at Proxy.simulate (http://localhost:5191/MagneticBuilder/src/stores/taskQueue.js:1851:23)';
    const { message, code, detail } = describeFailure(raw);
    assert.equal(message, 'Operating point 0 has 6 excitations for a magnetic with 2 windings; every winding needs exactly one excitation');
    assert.equal(code, 'MISSING_DATA');
    assert.ok(detail.startsWith('Error: Exception: [MISSING_DATA]'));
    assert.ok(!detail.includes(' at Proxy'), 'no stack trace in the detail');
});

test('a C++ function name in front of the engine message goes to the detail', () => {
    const raw = 'Exception: Temperature::resolveLateralPlacement (magnetic \'My custom magnetic\'): section Secondary section 0 references winding window 2 but the bobbin has 1.';
    const { message, code, detail } = describeFailure(raw);
    assert.equal(message, 'Section Secondary section 0 references winding window 2 but the bobbin has 1.');
    assert.equal(code, null);
    assert.equal(detail, raw);
});

test('the transport is removed after a wrapper\'s own words too', () => {
    const { message, code } = describeFailure('The engine could not check the simulated results for problems: Exception: [MISSING_DATA] Turn \'P\' has no cross-sectional shape');
    assert.equal(message, 'The engine could not check the simulated results for problems: Turn \'P\' has no cross-sectional shape');
    assert.equal(code, 'MISSING_DATA');
});

test('a message\'s own details are its detail', () => {
    const raw = 'No steady temperature: the winding runs away. Details: loss loop at iterate 12, Pcu=3 W';
    const { message, detail } = describeFailure(raw);
    assert.equal(message, 'No steady temperature: the winding runs away.');
    assert.equal(detail, raw);
});

test('a JSON read error says the engine could not read the design', () => {
    const { message, code } = describeFailure("Exception: [json.exception.out_of_range.403] key 'layerThickness' not found");
    assert.equal(message, "The engine could not read this design: key 'layerThickness' not found");
    assert.equal(code, 'json.exception.out_of_range.403');
});

test('a bare C++ standard exception is called an internal error', () => {
    const { message, detail } = describeFailure('Exception: bad_optional_access');
    assert.match(message, /^The engine stopped on an internal error \(bad_optional_access\)/);
    assert.equal(detail, null, 'nothing more to tell than the message');
});

test('plain text is left as it is, with no detail', () => {
    assert.deepEqual(describeFailure('Select a core material.'), { message: 'Select a core material.', code: null, detail: null });
    assert.deepEqual(describeFailure('Exception: No coil found'), { message: 'No coil found', code: null, detail: null });
});
