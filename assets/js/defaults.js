import { CTI, ConnectionType, CoreShapeFamily, CoreType, GapType, InsulationStandards, IsolationClass, IsolationSide, Market, OvervoltageCategory, PollutionDegree, Topology, WiringTechnology } from '../ts/MAS.ts'
export const coreAdviserWeights = {
    "Efficiency": 40,
    "Dimensions": 30,
    "Cost": 30,
}

export const magneticAdviserWeights = {
    "Losses": 40,
    "Dimensions": 30,
    "Cost": 30,
}


export const coreCrossReferencerPossibleLabels = [
    "Core Losses",
    "Enveloping Volume",
    "Permeance",
    "Effective Area",
    "Saturation",
    "Winding Window Area"
];


export const coreCrossReferencerPossibleCoreTypes = [
    "Toroidal",
    "Two-Piece Set",
    "Only Cores In Stock",
];


export const coreMaterialCrossReferencerPossibleLabels = [
    "Initial Permeability",
    "Remanence", 
    "Coercive Force", 
    "Saturation",
    "Curie Temperature",
    "Volumetric Losses",
    "Resistivity",
    "Density"
];


export const coreMaterialCrossReferencerPossibleCoreTypes = [
];


export const powerMas = {
    "inputs": {
        "designRequirements": {
            "name": "My Design Requirements",
            "magnetizingInductance": {
                "nominal": 100e-6
            },
            "turnsRatios": [],
            "wiringTechnology": WiringTechnology.Wound,
        },
        "operatingPoints": [],
    },
    "magnetic": {
        "coil": {
            "bobbin": "Dummy",
            "functionalDescription": [
                {
                    "name": "Winding 1",
                    "numberTurns": 0,
                    "numberParallels": 0,
                    "isolationSide": IsolationSide.Primary,
                    "wire": ""
                }
            ],
        },
        "core": {
            "name": "DummyCore",
            "functionalDescription": {
                "type": CoreType.TwoPieceSet,
                "material": "",
                "shape": "",
                "gapping": [],
                "numberStacks": 1
            }
        },
    },
    "outputs": []
}

export const filterMas = {
    "inputs": {
        "designRequirements": {
            "name": "My Design Requirements",
            "magnetizingInductance": {
                "minimum": 100e-6
            },
            "minimumImpedance": [{"frequency": 100000, "impedance": {"magnitude": 1000}}],
            "turnsRatios": [{"nominal": 1}],
        },
        "operatingPoints": [],
    },
    "magnetic": {
        "coil": {
            "bobbin": "Dummy",
            "functionalDescription": [
                {
                    "name": "Winding 1",
                    "numberTurns": 0,
                    "numberParallels": 0,
                    "isolationSide": IsolationSide.Primary,
                    "wire": ""
                },
                {
                    "name": "Winding 2",
                    "numberTurns": 0,
                    "numberParallels": 0,
                    "isolationSide": IsolationSide.Secondary,
                    "wire": ""
                }
            ],
        },
        "core": {
            "name": "DummyCore",
            "functionalDescription": {
                "type": CoreType.TwoPieceSet,
                "material": "",
                "shape": "",
                "gapping": [],
                "numberStacks": 1
            }
        },
    },
    "outputs": []
}

export const dmcMas = {
    "inputs": {
        "designRequirements": {
            "name": "My Design Requirements",
            "topology": Topology.DifferentialModeChoke,
            "magnetizingInductance": {
                "minimum": 100e-6
            },
            "turnsRatios": [],
        },
        "operatingPoints": [],
    },
    "magnetic": {
        "coil": {
            "bobbin": "Dummy",
            "functionalDescription": [
                {
                    "name": "Winding 1",
                    "numberTurns": 0,
                    "numberParallels": 0,
                    "isolationSide": IsolationSide.Primary,
                    "wire": "Dummy"
                }
            ],
        },
        "core": {
            "name": "DummyCore",
            "functionalDescription": {
                "type": CoreType.TwoPieceSet,
                "material": "",
                "shape": "",
                "gapping": [],
                "numberStacks": 1
            }
        },
    },
    "outputs": []
}

export const isolationSideOrdered = [
    "Primary",
    "Secondary",
    "Tertiary",
    "Quaternary",
    "Quinary",
    "Senary",
    "Septenary",
    "Octonary",
    "Nonary",
    "Denary",
    "Undenary",
    "Duodenary",
]


export const IsolationSideOrdered = {
    primary: "Primary",
    secondary: "Secondary",
    tertiary: "Tertiary",
    quaternary: "Quaternary",
    quinary: "Quinary",
    senary: "Senary",
    septenary: "Septenary",
    octonary: "Octonary",
    nonary: "Nonary",
    denary: "Denary",
    undenary: "Undenary",
    duodenary: "Duodenary",
}

export const designRequirementsOrdered = {
    "power": [
        "numberWindings",
        "magnetizingInductance",
        "minimumImpedance",
        "turnsRatios",
        "wiringTechnology",
        "insulation",
        "leakageInductance",
        "strayCapacitance",
        "isolationSides",
        "operatingTemperature",
        "maximumWeight",
        "maximumDimensions",
        "terminalType",
        "topology",
        "market",
    ],
    "commonModeChoke": [
        "numberWindings",
        "magnetizingInductance",
        "minimumImpedance",
        "insulation",
        "leakageInductance",
        "strayCapacitance",
        "maximumWeight",
        "maximumDimensions",
    ],
    "commonModeChokeCatalog": [
        "numberWindings",
        "magnetizingInductance",
        "minimumImpedance",
        "maximumDimensions",
    ],
}

export const compulsoryRequirements = {
    "power": [
        "numberWindings",
        "magnetizingInductance",
        "turnsRatios"
    ],
    "commonModeChoke": [
        "numberWindings",
        "magnetizingInductance",
        "minimumImpedance",
        "turnsRatios"
    ],
    "commonModeChokeCatalog": [
        "numberWindings",
        "magnetizingInductance",
        "minimumImpedance",
    ],
}

export const defaultDesignRequirements = {
    "name": "My Design Requirements",
    "magnetizingInductance": {
        "minimum": 42e-6
    },
    "turnsRatios": [],
    "leakageInductance": [
        {"maximum": 3e-6}
    ],
    "minimumImpedance": [
        {"frequency": 100000, "impedance": {"magnitude": 1000}}
    ],
    "strayCapacitance": [
        {"maximum": 50e-12}
    ],
    "operatingTemperature": {
        "maximum": 85
    },
    "insulation": {
        "altitude": {
            "maximum": 2000,
        },
        "cti": CTI.GroupII,
        "pollutionDegree": PollutionDegree.Pd2,
        "overvoltageCategory": OvervoltageCategory.Iii,
        "insulationType": IsolationClass.Double,
        "mainSupplyVoltage": {
            "maximum": 400
        },
        "standards": [InsulationStandards.IEC606641]
    },
    "market": Market.Industrial,
    "topology": Topology.BuckConverter,
    "maximumWeight": 300,
    "isolationSides": [IsolationSide.Primary],
    "maximumDimensions": {"width": null, "height": 0.05, "depth": null},
    "terminalType": [ConnectionType.FlyingLead],
    "wiringTechnology": WiringTechnology.Wound
}

export const defaultOperatingPointExcitationForInsulation = {  
    "frequency": 100000,
    "voltage": {
        "processed": {
            "dutyCycle" : 0.5,
            "peak" : 800,
            "peakToPeak" : 1600,
            "rms" : 400,
            "offset" : 0,
            "label": "rectangular"
        }
    }
}

export const defaultOperatingPointExcitation = {  
    "name": "Primary winding excitation",
    "frequency": 100000,
    "current": {
        "waveform": {
            "data": [
                -5,
                5,
                -5
            ],
            "time": [
                0,
                0.000005,
                0.00001
            ]
        },
        "processed": {
            "dutyCycle" : 0.5,
            "peakToPeak" : 10,
            "offset" : 0,
            "label": "triangular"
        }
    },
    "voltage": {
        "waveform": {
            "data": [
                -20.5,
                70.5,
                70.5,
                -20.5,
                -20.5
            ],
            "time": [
                0,
                0,
                0.000005,
                0.000005,
                0.00001
            ]
        },
        "processed": {
            "dutyCycle" : 0.5,
            "peakToPeak" : 100,
            "offset" : 0,
            "label": "rectangular"
        }
    }
}

export const defaultOperatingPointExcitationWithHarmonics = {  
    "name": "Primary winding excitation",
    "frequency": 50,
    "current": {
        "harmonics": {
            "amplitudes": [0, 10],
            "frequencies": [0, 50]
        }
    },
    "voltage": {
        "harmonics": {
            "amplitudes": [0, 100],
            "frequencies": [0, 50]
        }
    }
}

export const minimumMaximumScalePerParameter = {
    "dimension": {"min": 0.001, "max":1},
    "weight": {"min": 0.001, "max": 1e6},
    "altitude": {"min": 1, "max": 10000},
    "inductance": {"min": 1e-9, "max": 1},
    "capacitance": {"min": 1e-15, "max": 1},
    "impedance": {"min": 1e-3, "max": 1e9},
    "leakageInductance": {"min": 1e-9, "max": 1e-6},
    "strayCapacitance": {"min": 1e-12, "max": 1e-6},
    "voltage": {"min": 1e-6, "max": 1e9},
    "current": {"min": 1e-6, "max": 1e6},
    "power": {"min": 1e-3, "max": 1e9},
    "temperature": {"min": 1, "max": 300},
    "frequency": {"min": 1, "max": 1e9},
    "percentage": {"min": 0.0001, "max": 0.9999},
}


export const gapTypes = [
    "Ungapped",
    "Ground",
    "Spacer",
    "Distributed",
    "Custom",
]

export const defaultUngappedGapping = [
    {
        "length": 0.000005,
        "type": GapType.Residual
    },
    {
        "length": 0.000005,
        "type": GapType.Residual
    },
    {
        "length": 0.000005,
        "type": GapType.Residual
    }
]
export const defaultGroundGapping = [
    {
        "length": 0.001,
        "type": GapType.Subtractive
    },
    {
        "length": 0.000005,
        "type": GapType.Residual
    },
    {
        "length": 0.000005,
        "type": GapType.Residual
    }
]
export const defaultSpacerGapping = [
    {
        "length": 0.001,
        "type": GapType.Additive
    },
    {
        "length": 0.001,
        "type": GapType.Additive
    },
    {
        "length": 0.001,
        "type": GapType.Additive
    }
]
export const defaultDistributedGapping = [
    {
        "length": 0.0003,
        "type": GapType.Subtractive
    },
    {
        "length": 0.000005,
        "type": GapType.Residual
    },
    {
        "length": 0.000005,

        "type": GapType.Residual
    },
    {
        "length": 0.0003,
        "type": GapType.Subtractive
    },
    {
        "length": 0.0003,
        "type": GapType.Subtractive
    }
]

export const defaultOperationPointExcitation = {  
    "name": "My Operating Point",
    "frequency": 100000,
    "current": {
        "waveform": {
            "data": [
                -5,
                5,
                -5
            ],
            "time": [
                0,
                0.0000025,
                0.00001
            ]
        },
        "type": "Triangular"
    },
    "voltage": {
        "waveform": {
            "data": [
                7.5,
                7.5,
                -2.5,
                -2.5,
                7.5
            ],
            "time": [
                0,
                0.0000025,
                0.0000025,
                0.00001,
                0.00001
            ]
        },
        "type": "Square"
    }
}

export const defaultCore = {
    "name": "My Core",
    "functionalDescription": {
        "type": CoreType.TwoPieceSet,
        "material": "3C97",
        "shape":  {'aliases': [],
                   'dimensions': {'A': 0.0391,
                                  'B': 0.0198,
                                  'C': 0.0125,
                                  'D': 0.0146,
                                  'E': 0.030100000000000002,
                                  'F': 0.0125,
                                  'G': 0.0,
                                  'H': 0.0},
                   'family': CoreShapeFamily.Etd,
                   'familySubtype': '1',
                   'name': 'ETD 39/20/13',
                   'type': 'standard'},
        "gapping": [{
            "type": GapType.Subtractive,
            "length": 0.001
        },{
            "type": GapType.Residual,
            "length": 0.00001
        },{
            "type": GapType.Residual,
            "length": 0.00001
        }],
        "numberStacks": 1
    },
    "geometricalDescription": null,
    "processedDescription": null,
}

export const defaultOperatingConditions = {
    "ambientTemperature": 25,
}

export const defaultOperatingPoint = {
    "conditions": defaultOperatingConditions,
    "excitationsPerWinding": [defaultOperationPointExcitation],
}

export const defaultInputs = {
    "designRequirements": defaultDesignRequirements,
    "operatingPoints": [defaultOperatingPoint],
}

export const defaultCoil = {
    "bobbin": "Dummy",
    "functionalDescription": [{
        "isolationSide": IsolationSide.Primary,
        "name": "Winding 1",
        "numberParallels": 1,
        "numberTurns": 23,
        "wire": "Dummy"
    }],
}

export const defaultMagnetic = {
    "core": defaultCore,
    "coil": defaultCoil,
}

export const defaultSimulation = {
    "inputs": defaultInputs,
    "magnetic": defaultMagnetic,
    "outputs": [],
}

export const defaultVoltageType = "Square"
export const defaultCurrentType = "Triangular"
export const defaultPrecision = -2
export const defaultMinimumNumberForms = 0.01

export const defaultOperationName = "My Operating Point"
export const defaultOperationNamePlaceHolder = "Operating Point Identifier"

export const defaultCoreNamePlaceHolder = "Core Identifier"
export const defaultCoreName = "My Core"

export const defaultSimulationNamePlaceHolder = "Core Identifier"
export const defaultSimulationName = "My Simulation"

export const defaultOffset = 0
export const defaultPeakToPeak = 10
export const defaultDutyCycle = 0.25
export const defaultSwitchingFrequency = 100000
export const defaultTimeExponent = 5
export const defaultSinusoidalNumberPoints = 120

export const defaultSamplingNumberPoints = 128
export const defaultMaximumNumberHarmonicsShown = 16
export const defaultOperationPointExcitationSaveConfiguration = {
    numberPoints: 128,
    exportEquidistant: false,
    includeProcessed: false,
    includeHarmonics: false,
}

export const defaultCoreSaveConfiguration = {
    includeEffectiveParameters: false,
    includeShapeDimensionsData: false,
    includeMaterialData: false,
    includeGeometricalData: false,
    includeMaximumDimensions: false,
    includeAdvancedGapData: false,
    includeAdvancedColumnData: false,
    includeAdvancedWindingWindowData: false,
    downloadOnlyPiece: false,
}

export const defaultGapType = "Ungapped";
export const defaultGapLength = 5e-6;
export const defaultNumberGaps = 1;

export const coreLossesModelDefault = 'IGSE';
export const coreTemperatureModelDefault = 'Maniktala';
export const reluctanceModelDefault = 'Zhang';

export const wireMaterialDefault = "copper";

export const defaultCmcWizardInputs = {
    numberPhases: 'Two phases',
    ambientTemperature: 25,
    mainSignalFrequency: 50,
    mainSignalRmsCurrent: 10,
    numberExtraHarmonics: 1,
    extraHarmonics: [
        {
            frequency: 10000,
            amplitude: 3,
        }
    ],
    minimumInductance: 100e-6,
    numberImpedancePoints: 1,
    impedancePoints: [
        {
            frequency: 100000,
            impedance: 100,
        }
    ],
    insulationType: 'No',
    maximumDimensions: {
        width: null,
        height: null,
        depth: null,
    }
};

export const defaultDmcWizardInputs = {
    configuration: 'Single phase',
    ambientTemperature: 25,
    lineFrequency: 50,
    operatingCurrent: 10,
    minimumInductance: 100e-6,
    filterCapacitance: 1e-6,
    numberAttenuationPoints: 1,
    attenuationPoints: [
        {
            frequency: 150000,
            attenuation: 40,
        }
    ],
    maximumDimensions: {
        width: null,
        height: null,
        depth: null,
    }
};

export const defaultFlybackWizardInputs = {
    inputVoltage: {
        minimum: 120,
        maximum: 375
    },
    designLevel: 'Help me with the design',
    diodeVoltageDrop: 0.7,
    maximumDrainSourceVoltage: 600,
    maximumDutyCycle: 0.5,
    currentRippleRatio: 1,
    inductance: 200e-6,
    dutyCycle: {
        minimum: 0.5,
        maximum: 0.3
    },
    deadTime: 0,
    efficiency: 0.85,
    numberOutputs: 1,
    outputsParameters: [
        {
            voltage: 12,
            current: 5,
            turnsRatio: 8,
        }
    ],
    switchingFrequency: 100000,
    ambientTemperature: 25,
    insulationType: 'basic'
};

export const defaultBuckWizardInputs = {
    inputVoltage: {
        minimum: 10,
        maximum: 12
    },
    designLevel: 'Help me with the design',
    diodeVoltageDrop: 0.7,
    maximumSwitchCurrent: 8,
    currentRippleRatio: 0.4,
    inductance: 200e-6,
    efficiency: 0.85,
    outputsParameters: {
        voltage: 5,
        current: 2,
    },
    switchingFrequency: 100000,
    ambientTemperature: 25
};

export const defaultBoostWizardInputs = {
    inputVoltage: {
        minimum: 12,
        maximum: 24
    },
    designLevel: 'Help me with the design',
    diodeVoltageDrop: 0.7,
    maximumSwitchCurrent: 8,
    currentRippleRatio: 0.4,
    inductance: 200e-6,
    efficiency: 0.85,
    outputsParameters: {
        voltage: 50,
        current: 1,
    },
    switchingFrequency: 100000,
    ambientTemperature: 25
};

// Cuk converter (V1 non-isolated). MKF Cuk model also supports V2 coupled,
// V3 isolated, V4 synchronous, V5 bidirectional — exposed via optional flags.
// Wizard MVP only targets V1; advanced variants reachable later via flag toggles.
// Note: Cuk inverts polarity (Vo is signed negative internally per MKF
// convention) but the wizard takes the positive magnitude (the C++ model
// signs it). See MAS.ts CukOperatingPoint.
export const defaultCukWizardInputs = {
    inputVoltage: {
        minimum: 10,
        maximum: 14
    },
    diodeVoltageDrop: 0.7,
    maximumSwitchCurrent: 8,
    currentRippleRatio: 0.4,
    efficiency: 0.9,
    designLevel: 'Help me with the design',
    inductance: 100e-6,
    outputsParameters: {
        voltage: 12,
        current: 1,
    },
    switchingFrequency: 100000,
    ambientTemperature: 25
};

// Zeta converter (non-isolated buck-boost relative, non-inverting Vo positive).
// MKF Zeta model uses L1 (primary inductor) — wizard sizes only L1 here; L2
// is an extra-component output of process_extra_components_inputs.
export const defaultZetaWizardInputs = {
    inputVoltage: {
        minimum: 5,
        maximum: 15
    },
    diodeVoltageDrop: 0.7,
    maximumSwitchCurrent: 8,
    currentRippleRatio: 0.4,
    efficiency: 0.9,
    designLevel: 'Help me with the design',
    inductance: 100e-6,
    outputsParameters: {
        voltage: 12,
        current: 1,
    },
    switchingFrequency: 100000,
    ambientTemperature: 25
};

// Four-Switch Buck-Boost (non-isolated, non-inverting Vo positive). Single
// inductor between the two H-bridge legs. Operates in buck, boost, or
// passthrough mode depending on Vin/Vo ratio — selected automatically by the
// MKF FourSwitchBuckBoost model.
export const defaultFourSwitchBuckBoostWizardInputs = {
    inputVoltage: {
        minimum: 9,
        maximum: 18
    },
    diodeVoltageDrop: 0.7,
    maximumSwitchCurrent: 8,
    currentRippleRatio: 0.4,
    efficiency: 0.92,
    designLevel: 'Help me with the design',
    inductance: 47e-6,
    outputsParameters: {
        voltage: 12,
        current: 2,
    },
    switchingFrequency: 100000,
    ambientTemperature: 25
};

// Weinberg converter (isolated, push-pull-derived, non-inverting Vo positive).
// Two primary windings + center-tapped secondary, single output inductor.
// MKF Weinberg returns the 2-winding power transformer; secondary inductor
// and clamp components come from process_extra_components_inputs.
export const defaultWeinbergWizardInputs = {
    inputVoltage: {
        minimum: 20,
        maximum: 30
    },
    diodeVoltageDrop: 0.7,
    maximumSwitchCurrent: 5,
    currentRippleRatio: 0.4,
    efficiency: 0.9,
    turnsRatio: 0.5,
    designLevel: 'Help me with the design',
    inductance: 200e-6,
    outputsParameters: {
        voltage: 48,
        current: 2,
    },
    switchingFrequency: 200000,
    ambientTemperature: 25,
    insulationType: 'basic',
    // Backend-known optional fields exposed through the wizard so the user
    // can pin them rather than letting the solver pick. Defaults map to
    // typical fielded values.
    variant: 'classic',                  // 'classic' (V1 push-pull) | 'bridge' (V2 H-bridge)
    synchronousRectifier: false,         // diodes -> actively-driven MOSFETs on secondary
    couplingCoefficientInput: 0.999,     // k for the two L1 windings (input coupled inductor)
    couplingCoefficientMain: 0.97,       // k for the 4-way main-transformer coupling
};

// CLLLC bidirectional symmetric resonant converter — Lr_p / Cr_p / Lm /
// Cr_s / Lr_s layout. The wizard exposes the converter as a designed-by-MKF
// flow: user specifies switching range + output range; MKF picks Lm, turns
// ratio, and the resonant elements via process_design_requirements.
export const defaultClllcWizardInputs = {
    inputVoltage: {
        minimum: 380,
        maximum: 420
    },
    minSwitchingFrequency: 90000,
    maxSwitchingFrequency: 150000,
    nominalSwitchingFrequency: 120000,
    diodeVoltageDrop: 0.7,
    efficiency: 0.95,
    qualityFactor: 0.4,
    designLevel: 'Help me with the design',
    magnetizingInductance: 500e-6,
    turnsRatio: 8,
    primarySeriesInductance: 50e-6,
    primaryResonantCapacitance: 33e-9,
    outputsParameters: {
        voltage: 48,
        current: 5,
    },
    ambientTemperature: 25,
    insulationType: 'basic'
};

export const defaultSepicWizardInputs = {
    inputVoltage: {
        minimum: 9,
        maximum: 16
    },
    designLevel: 'Help me with the design',
    diodeVoltageDrop: 0.5,
    maximumSwitchCurrent: 4,
    currentRippleRatio: 0.4,
    inductance: 47e-6,
    efficiency: 0.9,
    coupledInductor: false,
    couplingCoefficient: 0.95,
    synchronousRectifier: false,
    outputsParameters: {
        voltage: 12,
        current: 1,
    },
    switchingFrequency: 250000,
    ambientTemperature: 25
};

export const defaultIsolatedBuckWizardInputs = {
    inputVoltage: {
        minimum: 36,
        maximum: 72
    },
    designLevel: 'Help me with the design',
    diodeVoltageDrop: 0.7,
    maximumSwitchCurrent: 1,
    currentRippleRatio: 0.4,
    // dutyCycle: required in I-know mode (buildParams zips .min/.nom/.max
    // with inputVoltage to emit desiredDutyCycle). Without this, analytical
    // sends an empty array and the backend produces no waveforms.
    dutyCycle: { minimum: 0.25, nominal: 0.40, maximum: 0.55 },
    deadTime: 100e-9,
    inductance: 10e-6,
    efficiency: 0.9,
    numberOutputs: 2,
    outputsParameters: [
        {
            voltage: 10,
            current: 0.02,
            turnsRatio: 5,
        },
        {
            voltage: 10,
            current: 0.1,
            turnsRatio: 5,
        }
    ],
    switchingFrequency: 750000,
    ambientTemperature: 25,
    insulationType: 'basic'
};

export const defaultIsolatedBuckBoostWizardInputs = {
    inputVoltage: {
        minimum: 10,
        maximum: 30
    },
    designLevel: 'Help me with the design',
    diodeVoltageDrop: 0.7,
    maximumSwitchCurrent: 2.5,
    currentRippleRatio: 0.4,
    // dutyCycle: required in I-know mode (see IsolatedBuck comment).
    dutyCycle: { minimum: 0.30, nominal: 0.50, maximum: 0.65 },
    deadTime: 100e-9,
    inductance: 10e-6,
    efficiency: 0.9,
    numberOutputs: 3,
    outputsParameters: [
        {
            voltage: 6,
            current: 0.01,
            turnsRatio: 0.5,
        },
        {
            voltage: 5,
            current: 1,
            turnsRatio: 0.5,
        },
        {
            voltage: 3.3,
            current: 0.3,
            turnsRatio: 0.5,
        }
    ],
    switchingFrequency: 400000,
    ambientTemperature: 25,
    insulationType: 'basic'
};

export const defaultPushPullWizardInputs = {
    inputVoltage: {
        minimum: 20,
        maximum: 30
    },
    designLevel: 'Help me with the design',
    diodeVoltageDrop: 0.7,
    maximumSwitchCurrent: 3,
    currentRippleRatio: 0.3,
    // dutyCycle: I-know mode reads .minimum/.nominal/.maximum and zips with
    // inputVoltage triple to build desiredDutyCycle. Scalar default would
    // produce an empty array and crash analytical in I-know mode.
    dutyCycle: { minimum: 0.30, nominal: 0.40, maximum: 0.45 },
    inductance: 100e-6,
    efficiency: 0.9,
    numberOutputs: 1,
    outputsParameters: [
        {
            voltage: 12,
            current: 1.0,
            turnsRatio: 1.25,
        }
    ],
    switchingFrequency: 100000,
    ambientTemperature: 25,
    insulationType: 'basic'
};

export const defaultForwardWizardInputs = {
    inputVoltage: {
        minimum: 36,
        maximum: 72
    },
    designLevel: 'Help me with the design',
    diodeVoltageDrop: 0.7,
    maximumSwitchCurrent: 3,
    currentRippleRatio: 0.3,
    dutyCycle: {
        minimum: null,
        nominal: 0.40,  // 40% duty cycle - good balance for 36-72V input range
        maximum: null
    },
    inductance: 200e-6,  // 200µH - better for 200kHz forward converter
    efficiency: 0.92,
    numberOutputs: 1,
    outputsParameters: [
        {
            voltage: 12,
            current: 3,
            turnsRatio: 0.35,  // Ns/Np = 0.35 for 36-72V → 12V at D≈40%
        }
    ],
    switchingFrequency: 200000,
    ambientTemperature: 25,
    insulationType: 'basic'
};

export const defaultPfcWizardInputs = {
    inputVoltage: {
        minimum: 85,
        maximum: 265
    },
    designLevel: 'Help me with the design',
    mode: 'continuousConductionMode',
    topologyVariant: 'boost', // boost|bridgeless|semiBridgeless|interleavedBoost|totemPole|sepic|cuk
    numberOfPhases: 2,        // interleavedBoost only (2 or 3)
    wideBandgapSwitch: true,  // GaN/SiC; required for totemPole in CCM
    outputVoltage: 400,      // 400V DC bus for universal input PFC
    outputPower: 300,        // 300W - typical for small-medium PFC
    switchingFrequency: 65000,  // 65kHz - good balance of size/losses
    lineFrequency: 50,
    currentRippleRatio: 0.3,    // 30% ripple - good for CCM
    inductance: 250e-6,      // 250µH - calculated for CCM at 85V, 300W, 30% ripple
    diodeVoltageDrop: 0.6,
    efficiency: 0.95,
    ambientTemperature: 25,
    maximumDimensions: {
        width: null,
        height: null,
        depth: null,
    }
};
