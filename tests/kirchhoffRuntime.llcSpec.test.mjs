// node --test tests/kirchhoffRuntime.llcSpec.test.mjs
// ABT #1503: the LLC wizard's resonant frequency must reach Kirchhoff as config.resonantFrequency,
// and driveAtSwitchingFrequency must not be sent (KH solves the drive frequency itself).
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

const llcParams = () => ({
    inputVoltage: { minimum: 350, nominal: 425 }, bridgeType: 'fullBridge',
    minSwitchingFrequency: 100e3, maxSwitchingFrequency: 300e3, resonantFrequency: 180e3,
    qualityFactor: 0.3, inductanceRatio: 4.8, efficiency: 0.97, rectifierType: 'Full Bridge',
    operatingPoints: [{ outputVoltages: [90], outputCurrents: [3300 / 90], switchingFrequency: 180e3, ambientTemperature: 25 }],
});

test('LLC spec carries the wizard resonant frequency as config.resonantFrequency', () => {
    const spec = buildKhConverterSpec('llc', llcParams());
    assert.equal(spec.config.resonantFrequency, 180e3);
    assert.equal(spec.config.resonantBandMin, 100e3);
    assert.equal(spec.config.resonantBandMax, 300e3);
    assert.equal(spec.config.driveAtSwitchingFrequency, undefined);
    assert.equal(spec.designRequirements.efficiency, 0.97);
});

test('LLC spec without a resonant frequency does not invent one', () => {
    const p = llcParams(); delete p.resonantFrequency;
    assert.equal(buildKhConverterSpec('llc', p).config.resonantFrequency, undefined);
});
