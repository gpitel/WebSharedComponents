// node --test tests/kirchhoffRuntime.cllcSpec.test.mjs
// ABT #1503: the CLLC wizard's resonant frequency must reach Kirchhoff as designRequirements.switchingFrequency
// (the tank resonance design_cllc reads); KH solves the operating frequency in the band itself.
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

// CllcWizard-like inputs: resonance 120 kHz, operating frequency 150 kHz (set apart on purpose so the
// test tells the two apart), band 80-200 kHz.
const cllcParams = () => ({
    inputVoltage: { nominal: 400 }, bridgeType: 'fullBridge', efficiency: 0.97,
    minSwitchingFrequency: 80e3, maxSwitchingFrequency: 200e3, resonantFrequency: 120e3,
    qualityFactor: 0.4, inductanceRatio: 5,
    operatingPoints: [{ outputVoltages: [400], outputCurrents: [3300 / 400], switchingFrequency: 150e3, ambientTemperature: 25 }],
});

test('CLLC spec carries the wizard resonant frequency as designRequirements.switchingFrequency', () => {
    const spec = buildKhConverterSpec('cllc', cllcParams());
    assert.deepEqual(spec.designRequirements.switchingFrequency, { nominal: 120e3 });
    assert.equal(spec.config.resonantBandMin, 80e3);
    assert.equal(spec.config.resonantBandMax, 200e3);
    assert.equal(spec.config.resonantFrequency, undefined);
    assert.equal(spec.config.driveAtSwitchingFrequency, undefined);
    assert.equal(spec.designRequirements.efficiency, 0.97);
});

test('CLLC spec without a resonant frequency keeps the operating-point frequency', () => {
    const p = cllcParams(); delete p.resonantFrequency;
    assert.deepEqual(buildKhConverterSpec('cllc', p).designRequirements.switchingFrequency, { nominal: 150e3 });
});

// ClllcWizard has one frequency field (nominalSwitchingFrequency), sent as both the operating-point
// frequency and primaryResonantFrequency: it is the tank resonance, the band bounds the solve.
test('CLLLC spec carries its nominal frequency as the tank resonance, the band and efficiency', () => {
    const spec = buildKhConverterSpec('clllc', {
        highVoltageBusVoltage: { nominal: 400 }, lowVoltageBusVoltage: { nominal: 48 }, efficiency: 0.97,
        minSwitchingFrequency: 70e3, maxSwitchingFrequency: 150e3, primaryResonantFrequency: 100e3, qualityFactor: 0.4,
        operatingPoints: [{ outputVoltages: [48], outputCurrents: [1000 / 48], switchingFrequency: 100e3, ambientTemperature: 25 }],
    });
    assert.deepEqual(spec.designRequirements.switchingFrequency, { nominal: 100e3 });
    assert.equal(spec.config.resonantBandMin, 70e3);
    assert.equal(spec.config.resonantBandMax, 150e3);
    assert.equal(spec.config.driveAtSwitchingFrequency, undefined);
    assert.equal(spec.designRequirements.efficiency, 0.97);
});

// ABT #1538: the CLLC wizard's "Override Pri./Sec. Res. Ind./Cap." values and the CLLLC I-know
// Lr/Cr must reach Kirchhoff (they were dropped, so the inputs changed nothing).
test('CLLC spec carries the tank overrides as the KH tank pins', () => {
    const spec = buildKhConverterSpec('cllc', {
        ...cllcParams(),
        desiredResonantInductancePrimary: 36e-6,
        desiredResonantInductanceSecondary: 50e-6,
        desiredResonantCapacitancePrimary: 47e-9,
        desiredResonantCapacitanceSecondary: 40e-9,
    });
    assert.equal(spec.designRequirements.desiredResonantInductance, 36e-6);
    assert.equal(spec.designRequirements.desiredResonantCapacitance, 47e-9);
    assert.equal(spec.designRequirements.desiredSecondaryResonantInductance, 50e-6);
    assert.equal(spec.designRequirements.desiredSecondaryResonantCapacitance, 40e-9);
});

test('CLLC spec without overrides carries no tank pin', () => {
    const dr = buildKhConverterSpec('cllc', cllcParams()).designRequirements;
    for (const k of ['desiredResonantInductance', 'desiredResonantCapacitance',
                     'desiredSecondaryResonantInductance', 'desiredSecondaryResonantCapacitance']) {
        assert.equal(dr[k], undefined, k);
    }
});

test('CLLLC spec carries the I-know Lr/Cr as config.primarySeriesInductance / primaryResonantCapacitance', () => {
    const spec = buildKhConverterSpec('clllc', {
        highVoltageBusVoltage: { nominal: 400 }, lowVoltageBusVoltage: { nominal: 48 }, efficiency: 0.95,
        minSwitchingFrequency: 90e3, maxSwitchingFrequency: 150e3,
        desiredTurnsRatios: [8], desiredMagnetizingInductance: 500e-6,
        desiredPrimarySeriesInductance: 50e-6, desiredPrimaryResonantCapacitance: 33e-9,
        operatingPoints: [{ outputVoltages: [48], outputCurrents: [5], switchingFrequency: 120e3, ambientTemperature: 25 }],
    });
    assert.equal(spec.config.primarySeriesInductance, 50e-6);
    assert.equal(spec.config.primaryResonantCapacitance, 33e-9);
    assert.deepEqual(spec.designRequirements.turnsRatios, [{ nominal: 8 }]);
});

// ABT #1539: CLLC "I know the design I want": the operating frequency is the forced drive
// (designRequirements.switchingFrequency) and the wizard's resonance travels as config.resonantFrequency.
test('CLLC I-know spec forces the operating frequency as the drive and sends the resonance apart', () => {
    const spec = buildKhConverterSpec('cllc', { ...cllcParams(), driveAtSwitchingFrequency: true });
    assert.equal(spec.config.driveAtSwitchingFrequency, true);
    assert.deepEqual(spec.designRequirements.switchingFrequency, { nominal: 150e3 });
    assert.equal(spec.config.resonantFrequency, 120e3);
    assert.equal(spec.config.resonantBandMin, 80e3);
    assert.equal(spec.config.resonantBandMax, 200e3);
});

test('CLLLC ignores the drive flag (its single frequency is the tank resonance)', () => {
    const spec = buildKhConverterSpec('clllc', {
        highVoltageBusVoltage: { nominal: 400 }, lowVoltageBusVoltage: { nominal: 48 }, driveAtSwitchingFrequency: true,
        operatingPoints: [{ outputVoltages: [48], outputCurrents: [1000 / 48], switchingFrequency: 100e3, ambientTemperature: 25 }],
    });
    assert.equal(spec.config, undefined);
});
