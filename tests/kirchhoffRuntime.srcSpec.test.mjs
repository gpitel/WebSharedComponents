// node --test tests/kirchhoffRuntime.srcSpec.test.mjs
// ABT #1539: the SRC wizard's resonant frequency was silently ignored (KH took the operating frequency as both
// the tank resonance and the drive). Help-me: the wizard sends its resonance as the switching frequency and no
// flag. I-know: driveAtSwitchingFrequency forces the operating frequency and the resonance goes to
// config.resonantFrequency.
// kirchhoffRuntime.js imports comlink (browser worker glue), so the spec builder is loaded from a
// temporary copy with that import removed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '../assets/js/kirchhoffRuntime.js'), 'utf8');
if (!/^import \* as Comlink from 'comlink';$/m.test(src)) throw new Error('kirchhoffRuntime.js imports changed; update this test loader');
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'khrt-')), 'rt.mjs');
fs.writeFileSync(tmp, src.replace(/^import \* as Comlink from 'comlink';$/m, 'const Comlink = null;') + '\nexport { buildKhConverterSpec };\n');
const { buildKhConverterSpec } = await import(pathToFileURL(tmp).href);

const srcParams = () => ({
    inputVoltage: { nominal: 400 }, bridgeType: 'halfBridge', efficiency: 0.95, resonantFrequency: 100e3,
    qualityFactor: 0.8,
    operatingPoints: [{ outputVoltages: [48], outputCurrents: [10], switchingFrequency: 100e3, ambientTemperature: 25 }],
});

test('SRC help-me spec: the switching frequency is the resonance and no drive flag is sent', () => {
    const spec = buildKhConverterSpec('src', srcParams());
    assert.deepEqual(spec.designRequirements.switchingFrequency, { nominal: 100e3 });
    assert.equal(spec.config.driveAtSwitchingFrequency, undefined);
    assert.equal(spec.config.resonantFrequency, undefined);
});

test('SRC I-know spec forces the operating frequency and sends the resonance as config.resonantFrequency', () => {
    const p = srcParams();
    p.driveAtSwitchingFrequency = true;
    p.operatingPoints[0].switchingFrequency = 120e3;
    const spec = buildKhConverterSpec('src', p);
    assert.equal(spec.config.driveAtSwitchingFrequency, true);
    assert.deepEqual(spec.designRequirements.switchingFrequency, { nominal: 120e3 });
    assert.equal(spec.config.resonantFrequency, 100e3);
});

test('I-know without an operating frequency throws instead of guessing one', () => {
    const p = srcParams();
    p.driveAtSwitchingFrequency = true;
    delete p.operatingPoints[0].switchingFrequency;
    assert.throws(() => buildKhConverterSpec('src', p), /needs an operating switching frequency/);
});
