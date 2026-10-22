// Checks on what the core and magnetic advisers send to MKF (ABT #1417).
//
// The adviser entry points used to rewrite bad inputs: an out-of-range
// frequency became 100 kHz, an unknown mode became 'standard cores', null
// harmonics and waveform points were cut off. Each rewrite hid a broken
// producer and advised for a design nobody asked for. These throw instead,
// naming the operating point and winding, so the producer gets fixed.

export const CORE_ADVISE_MODES = ['available cores', 'standard cores', 'custom cores', 'hybrid cores'];

export function requireCoreAdviseMode(mode) {
    if (typeof mode !== 'string' || !CORE_ADVISE_MODES.includes(mode)) {
        throw new Error(`Core adviser mode must be one of ${CORE_ADVISE_MODES.join(', ')}; got ${JSON.stringify(mode)}`);
    }
    return mode;
}

function describeExcitation(operatingPoint, operatingPointIndex, excitationIndex) {
    const name = operatingPoint?.name ? ` (${operatingPoint.name})` : '';
    return `Operating point ${operatingPointIndex + 1}${name}, winding ${excitationIndex + 1}`;
}

function requireNoNulls(values, what) {
    const index = values.findIndex((value) => value == null || !Number.isFinite(value));
    if (index !== -1) {
        throw new Error(`${what} has no number at index ${index} (got ${JSON.stringify(values[index])})`);
    }
}

function checkSignal(signal, where) {
    const harmonics = signal.harmonics;
    if (harmonics != null) {
        const amplitudes = harmonics.amplitudes ?? [];
        const frequencies = harmonics.frequencies ?? [];
        if (amplitudes.length !== frequencies.length) {
            throw new Error(`${where}: harmonics have ${amplitudes.length} amplitudes but ${frequencies.length} frequencies`);
        }
        requireNoNulls(amplitudes, `${where}: harmonic amplitudes`);
        requireNoNulls(frequencies, `${where}: harmonic frequencies`);
        // Index 0 is the DC component; every later harmonic sits above 0 Hz.
        const zeroIndex = frequencies.findIndex((frequency, index) => index > 0 && frequency <= 0);
        if (zeroIndex !== -1) {
            throw new Error(`${where}: harmonic ${zeroIndex} is at ${frequencies[zeroIndex]} Hz; only the DC component (index 0) may be at 0 Hz`);
        }
    }
    const waveform = signal.waveform;
    if (waveform != null) {
        const time = waveform.time ?? [];
        const data = waveform.data ?? [];
        if (time.length > 0 && time.length !== data.length) {
            throw new Error(`${where}: waveform has ${data.length} points but ${time.length} time stamps`);
        }
        requireNoNulls(time, `${where}: waveform time`);
        requireNoNulls(data, `${where}: waveform data`);
    }
}

export function requireAdviserExcitations(inputs) {
    const operatingPoints = inputs?.operatingPoints;
    if (!Array.isArray(operatingPoints) || operatingPoints.length === 0) {
        throw new Error('The adviser needs at least one operating point');
    }
    operatingPoints.forEach((operatingPoint, operatingPointIndex) => {
        const excitations = operatingPoint?.excitationsPerWinding;
        if (!Array.isArray(excitations) || excitations.length === 0) {
            throw new Error(`Operating point ${operatingPointIndex + 1} has no winding excitations`);
        }
        excitations.forEach((excitation, excitationIndex) => {
            const where = describeExcitation(operatingPoint, operatingPointIndex, excitationIndex);
            if (excitation == null) {
                throw new Error(`${where}: excitation is missing`);
            }
            const frequency = excitation.frequency;
            if (!Number.isFinite(frequency) || frequency <= 0) {
                throw new Error(`${where}: frequency is ${JSON.stringify(frequency)}, not a positive number`);
            }
            for (const signalName of ['current', 'voltage']) {
                if (excitation[signalName] != null) {
                    checkSignal(excitation[signalName], `${where} ${signalName}`);
                }
            }
        });
    });
}
