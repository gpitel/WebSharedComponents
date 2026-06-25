// To parse this data:
//
//   import { Convert, Mas } from "./file";
//
//   const mas = Convert.toMas(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

/**
 * All the data structure used in the Magnetic Agnostic Structure
 */
export interface Mas {
    /**
     * The description of the inputs that can be used to design a Magnetic
     */
    inputs: Inputs;
    /**
     * The description of a magnetic
     */
    magnetic: Magnetic;
    /**
     * Optional declaration of which MAS conformance class this document targets. Class A —
     * Inductor Basic. Class B — Transformer (multi-winding, insulation, isolated topologies).
     * Class C — Full (all schemas, all topologies). See docs/conformance.md and
     * schemas/conformance/.
     */
    masConformance?: MASConformance;
    /**
     * SemVer version of the MAS specification this document conforms to (MAJOR.MINOR.PATCH).
     * Optional in 0.x; will become required in 1.0.
     */
    masVersion?: string;
    /**
     * The description of the outputs that are produced after designing a Magnetic
     */
    outputs: Outputs[];
}

/**
 * The description of the inputs that can be used to design a Magnetic
 */
export interface Inputs {
    converterInformation?: ConverterInformation;
    /**
     * Data describing the design requirements
     */
    designRequirements: DesignRequirements;
    /**
     * Data describing the operating points
     */
    operatingPoints: OperatingPoint[];
}

export interface ConverterInformation {
    supportedTopologies?: SupportedTopologies;
}

export interface SupportedTopologies {
    asymmetricHalfBridge?:   AsymmetricHalfBridge;
    boost?:                  Boost;
    buck?:                   Buck;
    cllcResonant?:           CllcResonant;
    clllcResonant?:          ClllcResonant;
    commonModeChoke?:        CommonModeChoke;
    cuk?:                    Cuk;
    currentTransformer?:     CurrentTransformer;
    differentialModeChoke?:  DifferentialModeChoke;
    dualActiveBridge?:       DualActiveBridge;
    flyback?:                Flyback;
    forward?:                Forward;
    fourSwitchBuckBoost?:    FourSwitchBuckBoost;
    isolatedBuck?:           IsolatedBuck;
    isolatedBuckBoost?:      IsolatedBuckBoost;
    llcResonant?:            LlcResonant;
    phaseShiftedFullBridge?: PhaseShiftedFullBridge;
    phaseShiftedHalfBridge?: PhaseShiftedHalfBridge;
    powerFactorCorrection?:  PowerFactorCorrection;
    pushPull?:               PushPull;
    sepic?:                  Sepic;
    seriesResonant?:         SeriesResonant;
    viennaRectifier?:        ViennaRectifier;
    weinberg?:               Weinberg;
    zeta?:                   Zeta;
}

/**
 * The description of an Asymmetric Half-Bridge (AHB) converter (Imbertson-Mohan 1993):
 * single-leg, two-switch isolated PWM converter with DC-blocking capacitor and
 * complementary D/(1-D) drive.
 */
export interface AsymmetricHalfBridge {
    /**
     * Optional explicit DC-blocking capacitance in farads
     */
    dcBlockingCapacitance?: number;
    /**
     * The voltage drop of the rectifier diode (or SR FET drain-source drop)
     */
    diodeVoltageDrop?: number;
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage of the AHB converter
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * Optional Vin step magnitude (in volts) used to compute worst-case transient flux excursion
     */
    inputVoltageStepRange?: number;
    /**
     * Optional explicit primary leakage inductance in henries
     */
    leakageInductance?: number;
    /**
     * Optional explicit primary magnetizing inductance in henries
     */
    magnetizingInductance?: number;
    /**
     * Maximum duty cycle of Q1 (chosen branch of non-monotonic gain curve, conventionally <=
     * 0.5)
     */
    maximumDutyCycle?: number;
    /**
     * A list of operating points
     */
    operatingPoints: AhbOperatingPoint[];
    /**
     * Optional explicit output filter inductance in henries
     */
    outputInductance?: number;
    /**
     * The type of secondary rectifier
     */
    rectifierType?: AhbRectifierType;
    /**
     * Whether to use transformer leakage inductance for ZVS
     */
    useLeakageInductance?: boolean;
}

/**
 * The input voltage of the AHB converter
 *
 * The input voltage of the boost
 *
 * The input voltage of the buck
 *
 * The input voltage (HV side) of the CLLC converter
 *
 * The HV-side bus voltage (typically 380-800 V for OBC)
 *
 * The LV-side bus voltage (typically 200-500 V for OBC)
 *
 * The operating voltage across the choke (line-to-line or line-to-neutral)
 *
 * The input voltage of the Cuk
 *
 * The input voltage of the filter stage
 *
 * The input voltage of the DAB converter
 *
 * The input voltage of the flyback
 *
 * The input voltage of the forward
 *
 * The input voltage of the 4-switch buck-boost (must support a sweep range that crosses
 * Vo)
 *
 * The input voltage of the isolatedBuck
 *
 * The input voltage of the isolatedBuckBoost
 *
 * The input voltage of the LLC converter
 *
 * The input voltage of the PSFB converter
 *
 * The input voltage of the PSHB converter
 *
 * The AC input voltage (RMS) with tolerance range (e.g., 85-265V universal input)
 *
 * The input voltage of the pushPull
 *
 * The input voltage of the SEPIC
 *
 * The input voltage of the SRC converter
 *
 * AC line-to-line RMS voltage (e.g. 400 V for EU, 480 V for US)
 *
 * The input voltage of the Weinberg
 *
 * The input voltage of the Zeta
 *
 * Required values for the altitude
 *
 * Voltage RMS of the main supply to which this transformer is connected to.
 *
 * Required values for the magnetizing inductance
 *
 * The maximum thickness of the insulation around the wire, in m
 *
 * The conducting area of the wire, in m². Used for some rectangular shapes where the area
 * is smaller than expected due to rounded corners
 *
 * The conducting diameter of the wire, in m
 *
 * The outer diameter of the wire, in m
 *
 * The conducting height of the wire, in m
 *
 * The conducting width of the wire, in m
 *
 * The outer height of the wire, in m
 *
 * The outer width of the wire, in m
 *
 * The radius of the edge, in case of rectangular wire, in m
 *
 * The outer diameter of the wire. Unit: m.
 *
 * Length of one full twist of the litz bundle along the wire axis. Unit: m. Vendors quote
 * this in mm or as 'lay length'; convert to metres before serialisation. No international
 * standard exists for litz construction; this field captures the most commonly published
 * vendor parameter.
 *
 * Specific heat capacity value according to manufacturer. Unit: J/(kg*K).
 *
 * Thermal conductivity value according to manufacturer. Unit: W/(m*K).
 *
 * DC resistance in Ohms. nominal = typical value, maximum = datasheet max.
 *
 * Inductance in Henries, with tolerance.
 *
 * Inductance per winding in Henries, with tolerance.
 *
 * Leakage inductance in Henries.
 *
 * Magnetizing inductance in Henries, with tolerance.
 *
 * Rated common-mode inductance in Henries (the per-line inductance presented to common-mode
 * current). Datasheet-specified for common-mode chokes; distinct from leakageInductance
 * (the differential-mode term).
 *
 * Differential-mode (leakage) inductance in Henries.
 *
 * Body diameter in metres (for cylindrical parts).
 *
 * Body height in metres.
 *
 * Body length in metres.
 *
 * Pin length in metres.
 *
 * Body weight in kilograms.
 *
 * Body width in metres.
 *
 * Operating temperature in degrees Celsius.
 *
 * Value of the leakage inductance between the primary and a secondary winding given by the
 * position in the array
 *
 * Value of the magnetizing inductance. Unit: H. The operating point at which this value
 * applies (frequency, AC test amplitude, DC bias, temperature) is recorded in the optional
 * `measurementCondition` block; if absent, small-signal at 0 A DC bias and the ambient
 * temperature of the operating point is assumed.
 *
 * Required values for the temperature that the component can reach under operation, in
 * Celsius
 *
 * A dimension with minimum, nominal, and maximum values.
 */
export interface DimensionWithTolerance {
    /**
     * True if the maximum value must be excluded from the range
     */
    excludeMaximum?: boolean;
    /**
     * True if the minimum value must be excluded from the range
     */
    excludeMinimum?: boolean;
    /**
     * The maximum value of the dimension.
     */
    maximum?: number;
    /**
     * The minimum value of the dimension.
     */
    minimum?: number;
    /**
     * The nominal value of the dimension.
     */
    nominal?: number;
    /**
     * Optional SI unit string (e.g. 'H', 'F', 'V', 'A', 'Ohm', 'm', 'kg'). When absent, the
     * unit is implied by the field name.
     */
    unit?: string;
    [property: string]: any;
}

/**
 * The description of one AHB operating point
 *
 * Base fields common to all topology operating points
 *
 * The description of one boost operating point
 *
 * The description of one buck operating point
 *
 * The description of one forward operating point
 *
 * The description of one 4-switch buck-boost operating point. Outputs are non-inverting (Vo
 * positive).
 *
 * The description of one isolatedBuck operating point
 *
 * The description of one isolatedBuckBoost operating point
 *
 * The description of one LLC operating point
 *
 * The description of one pushPull operating point
 *
 * The description of one SEPIC operating point. SEPIC outputs are non-inverting (Vo
 * positive).
 *
 * The description of one SRC operating point
 *
 * The description of one Vienna rectifier operating point
 *
 * The description of one Weinberg operating point. Weinberg outputs are non-inverting (Vo
 * positive); positive Iout flows through the load to GND.
 *
 * The description of one Zeta operating point. Zeta outputs are non-inverting (Vo positive).
 */
export interface AhbOperatingPoint {
    /**
     * Commanded duty cycle of Q1 for this operating point (0 < D <= 0.5 for the conventional
     * non-monotonic gain branch). Schema bounds 0 <= D <= 1 to permit the upper-branch research
     * configuration.
     */
    dutyCycle: number;
    /**
     * Ambient temperature of the operating point. Unit: Celsius. See docs/units.md.
     */
    ambientTemperature: number;
    /**
     * List of output currents, one per output. Interpreted per outputCurrentsType (default:
     * dc). See docs/normative-references.md.
     */
    outputCurrents: number[];
    /**
     * Type of value carried in outputCurrents: which aggregate of the periodic waveform the
     * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
     */
    outputCurrentsType?: OutputSType;
    /**
     * List of output voltages, one per output. Interpreted per outputVoltagesType (default:
     * dc). See docs/normative-references.md.
     */
    outputVoltages: number[];
    /**
     * Type of value carried in outputVoltages: which aggregate of the periodic waveform the
     * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
     */
    outputVoltagesType?: OutputSType;
    /**
     * Switching frequency of the operating point. Unit: Hz. See docs/units.md.
     */
    switchingFrequency: number;
    [property: string]: any;
}

/**
 * Type of value carried in outputCurrents: which aggregate of the periodic waveform the
 * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
 *
 * Type of value carried in outputVoltages: which aggregate of the periodic waveform the
 * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
 *
 * Type of value carried in outputCurrents. Defaults to dc.
 *
 * Type of value carried in outputVoltages. Defaults to dc.
 */
export enum OutputSType {
    Average = "average",
    Dc = "dc",
    Peak = "peak",
    PeakToPeak = "peakToPeak",
    RMS = "rms",
}

/**
 * The type of secondary rectifier
 *
 * The type of secondary rectifier for the AHB
 */
export enum AhbRectifierType {
    AhbFlyback = "ahbFlyback",
    CenterTapped = "centerTapped",
    CurrentDoubler = "currentDoubler",
    FullBridge = "fullBridge",
}

/**
 * The description of a Boost converter excitation
 */
export interface Boost {
    /**
     * The maximum current ripple allowed in the output
     */
    currentRippleRatio?: number;
    /**
     * The voltage drop on the diode
     */
    diodeVoltageDrop: number;
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage of the boost
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * The maximum current that can go through the selected switch
     */
    maximumSwitchCurrent?: number;
    /**
     * A list of operating points
     */
    operatingPoints: TopologyExcitation[];
}

/**
 * Base fields common to all topology operating points
 *
 * The description of one boost operating point
 *
 * The description of one buck operating point
 *
 * The description of one forward operating point
 *
 * The description of one 4-switch buck-boost operating point. Outputs are non-inverting (Vo
 * positive).
 *
 * The description of one isolatedBuck operating point
 *
 * The description of one isolatedBuckBoost operating point
 *
 * The description of one LLC operating point
 *
 * The description of one pushPull operating point
 *
 * The description of one SEPIC operating point. SEPIC outputs are non-inverting (Vo
 * positive).
 *
 * The description of one SRC operating point
 *
 * The description of one Vienna rectifier operating point
 *
 * The description of one Weinberg operating point. Weinberg outputs are non-inverting (Vo
 * positive); positive Iout flows through the load to GND.
 *
 * The description of one Zeta operating point. Zeta outputs are non-inverting (Vo positive).
 */
export interface TopologyExcitation {
    /**
     * Ambient temperature of the operating point. Unit: Celsius. See docs/units.md.
     */
    ambientTemperature: number;
    /**
     * List of output currents, one per output. Interpreted per outputCurrentsType (default:
     * dc). See docs/normative-references.md.
     */
    outputCurrents: number[];
    /**
     * Type of value carried in outputCurrents: which aggregate of the periodic waveform the
     * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
     */
    outputCurrentsType?: OutputSType;
    /**
     * List of output voltages, one per output. Interpreted per outputVoltagesType (default:
     * dc). See docs/normative-references.md.
     */
    outputVoltages: number[];
    /**
     * Type of value carried in outputVoltages: which aggregate of the periodic waveform the
     * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
     */
    outputVoltagesType?: OutputSType;
    /**
     * Switching frequency of the operating point. Unit: Hz. See docs/units.md.
     */
    switchingFrequency: number;
    [property: string]: any;
}

/**
 * The description of a Buck converter excitation
 */
export interface Buck {
    /**
     * The maximum current ripple allowed in the output
     */
    currentRippleRatio?: number;
    /**
     * The voltage drop on the diode
     */
    diodeVoltageDrop: number;
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage of the buck
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * The maximum current that can go through the selected switch
     */
    maximumSwitchCurrent?: number;
    /**
     * A list of operating points
     */
    operatingPoints: TopologyExcitation[];
}

/**
 * CLLC Bidirectional Resonant converter excitation. Schema v2 adds asymmetric-tank ratios
 * (a, b), bridge-type selection (full/half) and leakage-integration flags so that Lr1, Lr2
 * can be either discrete components or absorbed into transformer leakage. The pre-v2
 * boolean `symmetricDesign` is retained as a derived alias (true iff a==1 && b==1). See
 * Infineon AN-2024-06 §2.3 for the canonical 11-step design procedure and the asymmetric
 * design rationale of Min et al., IEEE TPE 36(6) 2021.
 */
export interface CllcResonant {
    /**
     * Whether the converter operates in bidirectional mode (active synchronous rectifier on the
     * secondary side, capable of reverse power flow). When false the secondary still uses SR
     * for efficiency but reverse mode is not exercised.
     */
    bidirectional?: boolean;
    /**
     * Bridge topology of the primary inverter. Full-bridge gives bridge-voltage factor 1.0
     * (peak Vpri = Vin); half-bridge gives 0.5 (peak Vpri = Vin/2). Most CLLC > 1 kW use full
     * bridge; sub-1 kW server / V2L designs use half-bridge.
     */
    bridgeType?: LlcBridgeType;
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage (HV side) of the CLLC converter
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * If true, the primary resonant inductor Lr1 is realised as transformer primary leakage (no
     * discrete inductor). When false, Lr1 is a discrete component placed in series with the
     * primary winding.
     */
    integratedResonantInductor1?: boolean;
    /**
     * If true, the secondary resonant inductor Lr2 is realised as transformer secondary
     * leakage. When false, Lr2 is a discrete component placed in series with the secondary
     * winding (CLLLC layout).
     */
    integratedResonantInductor2?: boolean;
    /**
     * The maximum switching frequency for regulation
     */
    maxSwitchingFrequency: number;
    /**
     * The minimum switching frequency for regulation
     */
    minSwitchingFrequency: number;
    /**
     * A list of operating points
     */
    operatingPoints: CllcOperatingPoint[];
    /**
     * Quality factor of the resonant tank, Infineon convention Q = sqrt(Lr/Cr) / Ro. Two other
     * conventions exist in the literature (Steigerwald uses 1/Q, Erickson uses Ro/sqrt(Lr/Cr));
     * the Infineon convention is documented in the class header.
     */
    qualityFactor?: number;
    /**
     * Asymmetric-tank ratio b = Cr2 / (n^2 * Cr1). Symmetric tank: b = 1. Typical asymmetric
     * battery-charger design: b ~= 1.052 so that fr1 = fr2 (a*b ~ 1).
     */
    resonantCapacitorRatio?: number;
    /**
     * Asymmetric-tank ratio a = n^2 * Lr2 / Lr1. Symmetric tank: a = 1. Typical asymmetric
     * battery-charger design (Min IEEE TPE 2021): a ~= 0.95.
     */
    resonantInductorRatio?: number;
    /**
     * DEPRECATED - retained for v1 compatibility. True iff resonantInductorRatio==1 &&
     * resonantCapacitorRatio==1. New code should set the ratio fields directly.
     */
    symmetricDesign?: boolean;
}

/**
 * Bridge topology of the primary inverter. Full-bridge gives bridge-voltage factor 1.0
 * (peak Vpri = Vin); half-bridge gives 0.5 (peak Vpri = Vin/2). Most CLLC > 1 kW use full
 * bridge; sub-1 kW server / V2L designs use half-bridge.
 *
 * CLLC primary bridge topology selector
 *
 * The HV-side bridge topology
 *
 * The type of bridge for CLLLC
 *
 * The LV-side bridge topology
 *
 * The type of primary bridge
 *
 * The type of primary bridge for LLC
 */
export enum LlcBridgeType {
    FullBridge = "fullBridge",
    HalfBridge = "halfBridge",
}

/**
 * The description of one CLLC operating point
 *
 * Base fields common to all topology operating points
 *
 * The description of one boost operating point
 *
 * The description of one buck operating point
 *
 * The description of one forward operating point
 *
 * The description of one 4-switch buck-boost operating point. Outputs are non-inverting (Vo
 * positive).
 *
 * The description of one isolatedBuck operating point
 *
 * The description of one isolatedBuckBoost operating point
 *
 * The description of one LLC operating point
 *
 * The description of one pushPull operating point
 *
 * The description of one SEPIC operating point. SEPIC outputs are non-inverting (Vo
 * positive).
 *
 * The description of one SRC operating point
 *
 * The description of one Vienna rectifier operating point
 *
 * The description of one Weinberg operating point. Weinberg outputs are non-inverting (Vo
 * positive); positive Iout flows through the load to GND.
 *
 * The description of one Zeta operating point. Zeta outputs are non-inverting (Vo positive).
 */
export interface CllcOperatingPoint {
    /**
     * The power flow direction.
     */
    powerFlow: PowerFlowDirection;
    /**
     * Ambient temperature of the operating point. Unit: Celsius. See docs/units.md.
     */
    ambientTemperature: number;
    /**
     * List of output currents, one per output. Interpreted per outputCurrentsType (default:
     * dc). See docs/normative-references.md.
     */
    outputCurrents: number[];
    /**
     * Type of value carried in outputCurrents: which aggregate of the periodic waveform the
     * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
     */
    outputCurrentsType?: OutputSType;
    /**
     * List of output voltages, one per output. Interpreted per outputVoltagesType (default:
     * dc). See docs/normative-references.md.
     */
    outputVoltages: number[];
    /**
     * Type of value carried in outputVoltages: which aggregate of the periodic waveform the
     * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
     */
    outputVoltagesType?: OutputSType;
    /**
     * Switching frequency of the operating point. Unit: Hz. See docs/units.md.
     */
    switchingFrequency: number;
    [property: string]: any;
}

/**
 * The power flow direction.
 *
 * Bidirectional power-flow direction. Used by all topologies that share forward/reverse
 * semantics (CLLC, CLLLC, Cuk). Single canonical definition; topology schemas reference
 * this via $ref.
 *
 * Power-flow direction. Forward = source -> load via L1; reverse = load -> source via L2.
 */
export enum PowerFlowDirection {
    Forward = "forward",
    Reverse = "reverse",
}

/**
 * The description of a CLLLC bidirectional symmetric resonant converter excitation
 */
export interface ClllcResonant {
    /**
     * The HV-side bridge topology
     */
    bridgeTypePrimary?: LlcBridgeType;
    /**
     * The LV-side bridge topology
     */
    bridgeTypeSecondary?: LlcBridgeType;
    /**
     * How the controller modulates frequency vs phase-shift
     */
    controlStrategy?: ClllcControlStrategy;
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The HV-side bus voltage (typically 380-800 V for OBC)
     */
    highVoltageBusVoltage: DimensionWithTolerance;
    /**
     * K = Lm/Lr1, the magnetizing-to-series-inductance ratio
     */
    inductanceRatioK?: number;
    /**
     * If true, Lr1 and Lr2 are integrated as transformer leakage on each side
     */
    integratedResonantInductors?: boolean;
    /**
     * The LV-side bus voltage (typically 200-500 V for OBC)
     */
    lowVoltageBusVoltage: DimensionWithTolerance;
    /**
     * The maximum switching frequency for regulation
     */
    maxSwitchingFrequency: number;
    /**
     * The minimum switching frequency for regulation
     */
    minSwitchingFrequency: number;
    /**
     * A list of operating points
     */
    operatingPoints: ClllcOperatingPoint[];
    /**
     * Optional explicit primary-side resonant capacitor (Cr1) in F. Overrides Q/K/fr derivation
     * when set.
     */
    primaryResonantCapacitance?: number;
    /**
     * f_r1 = 1/(2*pi*sqrt(Lr1*Cr1)). Optional; computed if absent.
     */
    primaryResonantFrequency?: number;
    /**
     * Optional explicit primary-side resonant inductor (Lr1) in H. Overrides Q/K/fr derivation
     * when set.
     */
    primarySeriesInductance?: number;
    /**
     * The quality factor of the resonant tank
     */
    qualityFactor?: number;
    /**
     * (Lr2/(n^2*Lr1)) * (Cr2*n^2/Cr1). 1.0 = perfectly symmetric.
     */
    tankSymmetryRatio?: number;
}

/**
 * How the controller modulates frequency vs phase-shift
 *
 * The CLLLC control strategy
 */
export enum ClllcControlStrategy {
    FixedFrequencyPhaseShift = "fixedFrequencyPhaseShift",
    HybridPfmPSM = "hybridPfmPsm",
    PSM = "psm",
    Pfm = "pfm",
}

/**
 * The description of one CLLLC operating point
 *
 * Base fields common to all topology operating points
 *
 * The description of one boost operating point
 *
 * The description of one buck operating point
 *
 * The description of one forward operating point
 *
 * The description of one 4-switch buck-boost operating point. Outputs are non-inverting (Vo
 * positive).
 *
 * The description of one isolatedBuck operating point
 *
 * The description of one isolatedBuckBoost operating point
 *
 * The description of one LLC operating point
 *
 * The description of one pushPull operating point
 *
 * The description of one SEPIC operating point. SEPIC outputs are non-inverting (Vo
 * positive).
 *
 * The description of one SRC operating point
 *
 * The description of one Vienna rectifier operating point
 *
 * The description of one Weinberg operating point. Weinberg outputs are non-inverting (Vo
 * positive); positive Iout flows through the load to GND.
 *
 * The description of one Zeta operating point. Zeta outputs are non-inverting (Vo positive).
 */
export interface ClllcOperatingPoint {
    /**
     * Inter-bridge phase shift; only used by psm or hybridPfmPsm
     */
    phaseShiftDegrees?: number;
    /**
     * The power flow direction.
     */
    powerFlowDirection?: PowerFlowDirection;
    /**
     * Ambient temperature of the operating point. Unit: Celsius. See docs/units.md.
     */
    ambientTemperature: number;
    /**
     * List of output currents, one per output. Interpreted per outputCurrentsType (default:
     * dc). See docs/normative-references.md.
     */
    outputCurrents: number[];
    /**
     * Type of value carried in outputCurrents: which aggregate of the periodic waveform the
     * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
     */
    outputCurrentsType?: OutputSType;
    /**
     * List of output voltages, one per output. Interpreted per outputVoltagesType (default:
     * dc). See docs/normative-references.md.
     */
    outputVoltages: number[];
    /**
     * Type of value carried in outputVoltages: which aggregate of the periodic waveform the
     * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
     */
    outputVoltagesType?: OutputSType;
    /**
     * Switching frequency of the operating point. Unit: Hz. See docs/units.md.
     */
    switchingFrequency: number;
    [property: string]: any;
}

/**
 * The description of a Common Mode Choke (CMC) for EMI filtering. Common mode chokes use
 * coupled inductors wound on a toroidal core to suppress common mode noise while passing
 * differential signals. The choke presents high impedance to common mode currents (both
 * lines with same phase) and low impedance to differential mode currents (opposite phase).
 */
export interface CommonModeChoke {
    /**
     * The ambient temperature for the application
     */
    ambientTemperature: number;
    /**
     * The mains/line frequency in Hz (50 or 60 Hz typically). This is the frequency of the
     * differential mode current that causes magnetic excitation.
     */
    lineFrequency: number;
    /**
     * The characteristic line impedance (typically 50 ohms for LISN measurements)
     */
    lineImpedance?: number;
    /**
     * Maximum allowable DC resistance per winding in ohms
     */
    maximumDcResistance?: number;
    /**
     * Maximum allowable leakage inductance in henries (for tight coupling)
     */
    maximumLeakageInductance?: number;
    /**
     * The minimum impedance requirements at specified frequencies
     */
    minimumImpedance: ImpedanceAtFrequency[];
    /**
     * The nominal operating current through each winding (differential mode current)
     */
    operatingCurrent: number;
    /**
     * The operating voltage across the choke (line-to-line or line-to-neutral)
     */
    operatingVoltage: DimensionWithTolerance;
    /**
     * Target insertion loss in dB at specified frequencies (optional, alternative to impedance
     * specification)
     */
    targetInsertionLoss?: InsertionLossAtFrequency[];
}

/**
 * An impedance value pinned to a specific frequency. The impedance is a structured
 * impedancePoint with magnitude, phase and real/imaginary parts. Bare-magnitude callers
 * populate magnitude only and leave phase / real / imaginary unset.
 */
export interface ImpedanceAtFrequency {
    /**
     * Frequency at which the impedance applies. Unit: Hz.
     */
    frequency: number;
    impedance: ImpedancePoint;
}

/**
 * Data describing one impendance value
 *
 * Impedance value. Uses the same impedancePoint structure as designRequirements.
 */
export interface ImpedancePoint {
    imaginaryPart?: number;
    /**
     * Magnitude of the impedance, in Ohm
     */
    magnitude: number;
    phase?:    number;
    realPart?: number;
}

/**
 * Insertion loss requirement at a specific frequency
 */
export interface InsertionLossAtFrequency {
    /**
     * The frequency in Hz
     */
    frequency: number;
    /**
     * The target insertion loss in dB at this frequency
     */
    insertionLoss: number;
}

/**
 * Cuk converter excitation. Five wiring variants are supported via the boolean flags below:
 * V1 non-isolated (defaults), V2 coupled-inductor zero-ripple (coupledInductor=true), V3
 * transformer-isolated (isolated=true), V4 synchronous (synchronous=true), V5 bidirectional
 * (bidirectional=true, V4 implied). For V1/V2/V4/V5 the magnetic returned by
 * process_design_requirements is the input inductor L1 (V2: a 2-winding coupled inductor);
 * for V3 it is a 2-winding transformer. The remaining reactive elements (L2, C1, Co, plus
 * Ca/Cb in V3) are emitted via get_extra_components_inputs.
 */
export interface Cuk {
    /**
     * If true, both switches are active and the converter can transfer power in either
     * direction depending on operatingPoint.powerFlow. Implies synchronous=true.
     */
    bidirectional?: boolean;
    /**
     * If true, L1 and L2 are wound on the same core with coupling coefficient
     * couplingCoefficient (Cuk's zero-ripple trick when k = sqrt(L1/L2)). The magnetic returned
     * is a 2-winding coupled inductor. Mutually exclusive with isolated=true.
     */
    coupledInductor?: boolean;
    /**
     * Secondary-side coupling capacitance Cb in farads (used only when isolated=true). If
     * absent, Cb defaults to Ca scaled by turnsRatio^2 to balance V*s on each side.
     */
    couplingCapacitanceSecondary?: number;
    /**
     * Magnetic coupling coefficient k between L1 and L2 (used only when coupledInductor=true).
     * Zero-ripple condition: k * sqrt(L2/L1) = 1.
     */
    couplingCoefficient?: number;
    /**
     * The maximum input-inductor (L1) current ripple ratio (delta-IL1 / IL1_avg)
     */
    currentRippleRatio?: number;
    /**
     * The voltage drop on the diode (ignored when synchronous=true)
     */
    diodeVoltageDrop: number;
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage of the Cuk
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * If true, the coupling capacitor is split into Ca/Cb and an isolation transformer is
     * inserted between them. The magnetic returned is the transformer (2 windings, isolation
     * sides PRIMARY and SECONDARY); L1 and L2 become extra components.
     */
    isolated?: boolean;
    /**
     * The maximum current that can go through the selected switch
     */
    maximumSwitchCurrent?: number;
    /**
     * A list of operating points
     */
    operatingPoints: CukOperatingPoint[];
    /**
     * If true, the catch diode D1 is replaced by an actively-driven synchronous switch S2.
     * Reduces conduction loss; mandatory for bidirectional=true.
     */
    synchronous?: boolean;
    /**
     * Transformer turns ratio Np:Ns for isolated=true (used as Vo/Vin step targeting). Ignored
     * for non-isolated variants.
     */
    turnsRatio?: number;
}

/**
 * The description of one Cuk operating point. NOTE: outputVoltages magnitudes are passed
 * positive here; Vo is signed negative internally per Cuk polarity convention. powerFlow is
 * required only when the parent Cuk has bidirectional=true.
 *
 * Base fields common to all topology operating points
 *
 * The description of one boost operating point
 *
 * The description of one buck operating point
 *
 * The description of one forward operating point
 *
 * The description of one 4-switch buck-boost operating point. Outputs are non-inverting (Vo
 * positive).
 *
 * The description of one isolatedBuck operating point
 *
 * The description of one isolatedBuckBoost operating point
 *
 * The description of one LLC operating point
 *
 * The description of one pushPull operating point
 *
 * The description of one SEPIC operating point. SEPIC outputs are non-inverting (Vo
 * positive).
 *
 * The description of one SRC operating point
 *
 * The description of one Vienna rectifier operating point
 *
 * The description of one Weinberg operating point. Weinberg outputs are non-inverting (Vo
 * positive); positive Iout flows through the load to GND.
 *
 * The description of one Zeta operating point. Zeta outputs are non-inverting (Vo positive).
 */
export interface CukOperatingPoint {
    /**
     * Power-flow direction. Forward = source -> load via L1; reverse = load -> source via L2.
     */
    powerFlow?: PowerFlowDirection;
    /**
     * Ambient temperature of the operating point. Unit: Celsius. See docs/units.md.
     */
    ambientTemperature: number;
    /**
     * List of output currents, one per output. Interpreted per outputCurrentsType (default:
     * dc). See docs/normative-references.md.
     */
    outputCurrents: number[];
    /**
     * Type of value carried in outputCurrents: which aggregate of the periodic waveform the
     * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
     */
    outputCurrentsType?: OutputSType;
    /**
     * List of output voltages, one per output. Interpreted per outputVoltagesType (default:
     * dc). See docs/normative-references.md.
     */
    outputVoltages: number[];
    /**
     * Type of value carried in outputVoltages: which aggregate of the periodic waveform the
     * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
     */
    outputVoltagesType?: OutputSType;
    /**
     * Switching frequency of the operating point. Unit: Hz. See docs/units.md.
     */
    switchingFrequency: number;
    [property: string]: any;
}

/**
 * The description of a Current Transformer excitation
 */
export interface CurrentTransformer {
    /**
     * The ambient temperature of the operating point
     */
    ambientTemperature: number;
    /**
     * The value of the burden resistor in the measuring circuit
     */
    burdenResistor: number;
    /**
     * The voltage drop on the diode
     */
    diodeVoltageDrop: number;
    /**
     * Frequency of the input
     */
    frequency: number;
    /**
     * The maximum duty cycle in the input
     */
    maximumDutyCycle: number;
    /**
     * The maximum current peak in the input
     */
    maximumPrimaryCurrentPeak: number;
    /**
     * Waveform of the signal to measure
     */
    waveformLabel: WaveformLabel;
}

/**
 * Waveform of the signal to measure
 *
 * Label of the waveform, if applicable. Used for common waveforms
 */
export enum WaveformLabel {
    BipolarRectangular = "bipolarRectangular",
    BipolarTriangular = "bipolarTriangular",
    Custom = "custom",
    FlybackPrimary = "flybackPrimary",
    FlybackSecondary = "flybackSecondary",
    FlybackSecondaryWithDeadtime = "flybackSecondaryWithDeadtime",
    Rectangular = "rectangular",
    RectangularDCM = "rectangularDCM",
    RectangularWithDeadtime = "rectangularWithDeadtime",
    SecondaryRectangular = "secondaryRectangular",
    SecondaryRectangularWithDeadtime = "secondaryRectangularWithDeadtime",
    Sinusoidal = "sinusoidal",
    Triangular = "triangular",
    TriangularWithDeadtime = "triangularWithDeadtime",
    UnipolarRectangular = "unipolarRectangular",
    UnipolarTriangular = "unipolarTriangular",
}

/**
 * The description of a Differential Mode Choke (DMC) for EMI filtering. Differential mode
 * chokes use an inductor to attenuate differential mode noise (noise between line and
 * neutral or between lines). Unlike CMCs, DMCs present impedance to differential signals
 * and are typically used in combination with capacitors to form LC filters.
 */
export interface DifferentialModeChoke {
    /**
     * The ambient temperature for the application
     */
    ambientTemperature: number;
    /**
     * The DMC configuration type
     */
    configuration?: Configuration;
    /**
     * The filter capacitance in Farads (for LC filter design)
     */
    filterCapacitance?: number;
    /**
     * The input voltage of the filter stage
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * The mains/line frequency in Hz (50 or 60 Hz typically). This is the frequency of the load
     * current that causes magnetic excitation.
     */
    lineFrequency: number;
    /**
     * Maximum allowable temperature rise due to core and winding losses
     */
    maximumCoreTemperatureRise?: number;
    /**
     * Maximum allowable DC resistance in ohms
     */
    maximumDcResistance?: number;
    /**
     * The minimum impedance requirements at specified frequencies
     */
    minimumImpedance?: ImpedanceAtFrequency[];
    /**
     * The minimum required inductance in henries for the filter cutoff frequency
     */
    minimumInductance?: number;
    /**
     * The nominal operating current through the choke
     */
    operatingCurrent: number;
    /**
     * The peak current including ripple
     */
    peakCurrent?: number;
    /**
     * The switching frequency of the converter being filtered
     */
    switchingFrequency?: number;
    /**
     * Target attenuation in dB at specified frequencies
     */
    targetAttenuation?: AttenuationAtFrequency[];
    [property: string]: any;
}

/**
 * The DMC configuration type
 */
export enum Configuration {
    SinglePhase = "singlePhase",
    SinglePhaseBalanced = "singlePhaseBalanced",
    ThreePhase = "threePhase",
    ThreePhaseWithNeutral = "threePhaseWithNeutral",
}

/**
 * Attenuation requirement at a specific frequency
 */
export interface AttenuationAtFrequency {
    /**
     * The target attenuation in dB at this frequency
     */
    attenuation: number;
    /**
     * The frequency in Hz
     */
    frequency: number;
}

/**
 * Dual Active Bridge (DAB) DC-DC converter excitation. Modulation parameters follow the
 * standard Triple Phase Shift (TPS) convention: D1 = primary-bridge intra-leg shift, D2 =
 * secondary-bridge intra-leg shift, D3 = inter-bridge (outer) shift. See Huang et al.,
 * Energies 11(9):2419 (2018) and Maniktala & Rosano, 'Power Supplies A to Z', 3rd ed. (Ch.
 * 2).
 */
export interface DualActiveBridge {
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage of the DAB converter
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * A list of operating points
     */
    operatingPoints: DabOperatingPoint[];
    /**
     * Optional per-secondary leakage inductance in H, one entry per output. Required for
     * physically meaningful multi-output DAB simulation; if absent, all secondaries share the
     * same series inductance.
     */
    perSecondaryLeakage?: number[];
    /**
     * The series inductance for power transfer control. If 0, uses transformer leakage
     * inductance
     */
    seriesInductance?: number;
    /**
     * Whether to use transformer leakage inductance as the series inductor
     */
    useLeakageInductance?: boolean;
}

/**
 * One DAB operating point. Modulation is parameterised by three phase-shift variables D1,
 * D2, D3 (Huang et al. 2018 convention): D1 and D2 are intra-bridge (leg-to-leg) shifts
 * that control each bridge's effective duty cycle, and D3 is the outer inter-bridge shift
 * that controls power transfer. SPS uses D3 only (D1=D2=0). EPS uses D3 + one inner shift
 * (D1, with D2=0). DPS uses D3 + one symmetric inner shift (D1=D2). TPS uses all three
 * independently.
 *
 * Base fields common to all topology operating points
 *
 * The description of one boost operating point
 *
 * The description of one buck operating point
 *
 * The description of one forward operating point
 *
 * The description of one 4-switch buck-boost operating point. Outputs are non-inverting (Vo
 * positive).
 *
 * The description of one isolatedBuck operating point
 *
 * The description of one isolatedBuckBoost operating point
 *
 * The description of one LLC operating point
 *
 * The description of one pushPull operating point
 *
 * The description of one SEPIC operating point. SEPIC outputs are non-inverting (Vo
 * positive).
 *
 * The description of one SRC operating point
 *
 * The description of one Vienna rectifier operating point
 *
 * The description of one Weinberg operating point. Weinberg outputs are non-inverting (Vo
 * positive); positive Iout flows through the load to GND.
 *
 * The description of one Zeta operating point. Zeta outputs are non-inverting (Vo positive).
 */
export interface DabOperatingPoint {
    /**
     * D1 in degrees
     */
    innerPhaseShift1?: number;
    /**
     * D2 in degrees
     */
    innerPhaseShift2?: number;
    /**
     * D3 in degrees
     */
    innerPhaseShift3?: number;
    /**
     * DAB modulation scheme. SPS (only D3), EPS (D1>0, D2=0), DPS (D1=D2>0), TPS (independent).
     * Ref: Huang et al., Energies 11(9):2419 (2018).
     */
    modulationType?: ModulationType;
    /**
     * Ambient temperature of the operating point. Unit: Celsius. See docs/units.md.
     */
    ambientTemperature: number;
    /**
     * List of output currents, one per output. Interpreted per outputCurrentsType (default:
     * dc). See docs/normative-references.md.
     */
    outputCurrents: number[];
    /**
     * Type of value carried in outputCurrents: which aggregate of the periodic waveform the
     * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
     */
    outputCurrentsType?: OutputSType;
    /**
     * List of output voltages, one per output. Interpreted per outputVoltagesType (default:
     * dc). See docs/normative-references.md.
     */
    outputVoltages: number[];
    /**
     * Type of value carried in outputVoltages: which aggregate of the periodic waveform the
     * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
     */
    outputVoltagesType?: OutputSType;
    /**
     * Switching frequency of the operating point. Unit: Hz. See docs/units.md.
     */
    switchingFrequency: number;
    [property: string]: any;
}

/**
 * DAB modulation scheme. SPS (only D3), EPS (D1>0, D2=0), DPS (D1=D2>0), TPS (independent).
 * Ref: Huang et al., Energies 11(9):2419 (2018).
 */
export enum ModulationType {
    Dps = "DPS",
    Eps = "EPS",
    Sps = "SPS",
    Tps = "TPS",
}

/**
 * The description of a Flyback converter excitation
 */
export interface Flyback {
    /**
     * The maximum current ripple allowed in the output
     */
    currentRippleRatio: number;
    /**
     * The voltage drop on the diode
     */
    diodeVoltageDrop: number;
    /**
     * The target efficiency
     */
    efficiency: number;
    /**
     * The input voltage of the flyback
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * The maximum drain-source voltage in the selected switch
     */
    maximumDrainSourceVoltage?: number;
    /**
     * The maximum duty cycle in the selected switch
     */
    maximumDutyCycle?: number;
    /**
     * A list of operating points
     */
    operatingPoints: FlybackOperatingPoint[];
}

/**
 * The description of one flyback operating point. Flyback does not require
 * switchingFrequency at the schema level: when omitted, it is inferred from the conduction
 * mode, see docs/inputs.md.
 */
export interface FlybackOperatingPoint {
    /**
     * Ambient temperature of the operating point. Unit: Celsius.
     */
    ambientTemperature: number;
    /**
     * The conduction mode of the operating point.
     */
    mode?: FlybackModes;
    /**
     * List of output currents, one per output. Interpreted per outputCurrentsType (default: dc).
     */
    outputCurrents: number[];
    /**
     * Type of value carried in outputCurrents. Defaults to dc.
     */
    outputCurrentsType?: OutputSType;
    /**
     * List of output voltages, one per output. Interpreted per outputVoltagesType (default: dc).
     */
    outputVoltages: number[];
    /**
     * Type of value carried in outputVoltages. Defaults to dc.
     */
    outputVoltagesType?: OutputSType;
    /**
     * Switching frequency of the operating point. Unit: Hz. Optional for flyback when mode is
     * supplied.
     */
    switchingFrequency?: number;
}

/**
 * The conduction mode of the operating point.
 *
 * The conduction mode of the Flyback
 */
export enum FlybackModes {
    BoundaryModeOperation = "boundaryModeOperation",
    ContinuousConductionMode = "continuousConductionMode",
    DiscontinuousConductionMode = "discontinuousConductionMode",
    QuasiResonantMode = "quasiResonantMode",
}

/**
 * The description of a Forward converter excitation
 */
export interface Forward {
    /**
     * The maximum current ripple allowed in the output
     */
    currentRippleRatio: number;
    /**
     * The voltage drop on the diode
     */
    diodeVoltageDrop: number;
    /**
     * Duty cycle for the converter, maximum 50%
     */
    dutyCycle?: number;
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage of the forward
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * The maximum current that can go through the selected switch
     */
    maximumSwitchCurrent?: number;
    /**
     * A list of operating points
     */
    operatingPoints: TopologyExcitation[];
}

/**
 * 4-Switch Buck-Boost (also called non-inverting buck-boost, H-bridge buck-boost, FSBB)
 * excitation. Single inductor with two half-bridges (Q1/Q2 buck leg, Q3/Q4 boost leg). The
 * controller selects one of three operating regions per Vin value: BUCK (Vo/Vin <
 * 1-hysteresis: Q3 always-on, Q1/Q2 PWM), BOOST (Vo/Vin > 1+hysteresis: Q1 always-on, Q3/Q4
 * PWM), or BUCK_BOOST (transition band: all four switches modulate). The magnetic returned
 * by process_design_requirements is the single inductor sized for the worst-case region
 * across the Vin sweep (max(L_buck@VinMax, L_boost@VinMin)). Cin and Co are emitted via
 * get_extra_components_inputs. References: TI SLVA535B, TI LM5175/LM5176, ADI LT8390,
 * Restrepo IEEE 8986423.
 */
export interface FourSwitchBuckBoost {
    /**
     * If true, controller allows reverse power flow (V2G / battery / 12V<->48V mild-hybrid)
     */
    bidirectional?: boolean;
    /**
     * Controller duty-assignment strategy in the buck-boost region (peakCurrent: TI LM5176,
     * peakBuckPeakBoost: ADI LT8390, averageCurrent: USB-PD, voltageMode: legacy)
     */
    controlMode?: ControlMode;
    /**
     * The maximum inductor current ripple ratio (delta-IL / IL_avg)
     */
    currentRippleRatio?: number;
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage of the 4-switch buck-boost (must support a sweep range that crosses Vo)
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * The maximum current that can go through any of the four switches
     */
    maximumSwitchCurrent?: number;
    /**
     * A list of operating points
     */
    operatingPoints: TopologyExcitation[];
    /**
     * The output voltage ripple ratio (delta-Vo / Vo)
     */
    outputVoltageRippleRatio?: number;
    /**
     * Number of interleaved phases (default 1; >1 for automotive 12V<->48V)
     */
    phaseCount?: number;
    /**
     * Width of the buck-boost band as |1 - Vo/Vin| (default 0.15 per LM5176)
     */
    transitionHysteresisRatio?: number;
    /**
     * Buck-boost-region modulation: 'simultaneous' (Mode 1, Q1+Q3 ON together) or 'splitPwm'
     * (Mode 2, sequential split-PWM, LM5176/LT8390 default)
     */
    transitionMode?: TransitionMode;
}

/**
 * Controller duty-assignment strategy in the buck-boost region (peakCurrent: TI LM5176,
 * peakBuckPeakBoost: ADI LT8390, averageCurrent: USB-PD, voltageMode: legacy)
 */
export enum ControlMode {
    AverageCurrent = "averageCurrent",
    PeakBuckPeakBoost = "peakBuckPeakBoost",
    PeakCurrent = "peakCurrent",
    VoltageMode = "voltageMode",
}

/**
 * Buck-boost-region modulation: 'simultaneous' (Mode 1, Q1+Q3 ON together) or 'splitPwm'
 * (Mode 2, sequential split-PWM, LM5176/LT8390 default)
 */
export enum TransitionMode {
    Simultaneous = "simultaneous",
    SplitPwm = "splitPwm",
}

/**
 * The description of a Isolated Buck / Flybuck converter excitation
 */
export interface IsolatedBuck {
    /**
     * The maximum current ripple allowed in the output
     */
    currentRippleRatio?: number;
    /**
     * The voltage drop on the diode
     */
    diodeVoltageDrop: number;
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage of the isolatedBuck
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * The maximum current that can go through the selected switch
     */
    maximumSwitchCurrent?: number;
    /**
     * A list of operating points
     */
    operatingPoints: TopologyExcitation[];
}

/**
 * The description of a Isolated BuckBoost / FlyBuck - Boost converter excitation
 */
export interface IsolatedBuckBoost {
    /**
     * The maximum current ripple allowed in the output
     */
    currentRippleRatio?: number;
    /**
     * The voltage drop on the diode
     */
    diodeVoltageDrop: number;
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage of the isolatedBuckBoost
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * The maximum current that can go through the selected switch
     */
    maximumSwitchCurrent?: number;
    /**
     * A list of operating points
     */
    operatingPoints: TopologyExcitation[];
}

/**
 * The description of an LLC Resonant converter excitation
 */
export interface LlcResonant {
    /**
     * The type of primary bridge
     */
    bridgeType?: LlcBridgeType;
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The inductance ratio between Lm/Ls
     */
    inductanceRatio?: number;
    /**
     * The input voltage of the LLC converter
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * Whether the resonant inductor is integrated in the transformer (leakage)
     */
    integratedResonantInductor?: boolean;
    /**
     * The maximum switching frequency for regulation
     */
    maxSwitchingFrequency: number;
    /**
     * The minimum switching frequency for regulation
     */
    minSwitchingFrequency: number;
    /**
     * A list of operating points
     */
    operatingPoints: TopologyExcitation[];
    /**
     * The quality factor of the resonant tank
     */
    qualityFactor?: number;
    /**
     * The type of secondary rectifier
     */
    rectifierType?: LlcRectifierType;
    /**
     * Optional explicit resonant capacitor (Cr) value in F. Overrides the Q/Ln/fr derivation
     * when set.
     */
    resonantCapacitance?: number;
    /**
     * The resonant frequency of the tank (optional, will be calculated if not provided)
     */
    resonantFrequency?: number;
    /**
     * Optional explicit resonant inductor (Ls) value in H. Overrides the Q/Ln/fr derivation
     * when set.
     */
    seriesInductance?: number;
}

/**
 * The type of secondary rectifier
 *
 * The type of secondary rectifier for LLC
 */
export enum LlcRectifierType {
    CenterTapped = "centerTapped",
    CurrentDoubler = "currentDoubler",
    FullBridge = "fullBridge",
    VoltageDoubler = "voltageDoubler",
}

/**
 * The description of a Phase Shift Full Bridge (PSFB) converter excitation
 */
export interface PhaseShiftedFullBridge {
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage of the PSFB converter
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * The maximum phase shift as ratio of half period (0-1)
     */
    maximumPhaseShift?: number;
    /**
     * A list of operating points
     */
    operatingPoints: PsfbOperatingPoint[];
    /**
     * The output filter inductance
     */
    outputInductance?: number;
    /**
     * The type of secondary rectifier
     */
    rectifierType?: BRectifierType;
    /**
     * The series inductance for ZVS and duty cycle control. If 0, uses transformer leakage
     * inductance
     */
    seriesInductance?: number;
    /**
     * Whether to use transformer leakage inductance as the series inductor
     */
    useLeakageInductance?: boolean;
}

/**
 * The description of one PSFB operating point
 *
 * Base fields common to all topology operating points
 *
 * The description of one boost operating point
 *
 * The description of one buck operating point
 *
 * The description of one forward operating point
 *
 * The description of one 4-switch buck-boost operating point. Outputs are non-inverting (Vo
 * positive).
 *
 * The description of one isolatedBuck operating point
 *
 * The description of one isolatedBuckBoost operating point
 *
 * The description of one LLC operating point
 *
 * The description of one pushPull operating point
 *
 * The description of one SEPIC operating point. SEPIC outputs are non-inverting (Vo
 * positive).
 *
 * The description of one SRC operating point
 *
 * The description of one Vienna rectifier operating point
 *
 * The description of one Weinberg operating point. Weinberg outputs are non-inverting (Vo
 * positive); positive Iout flows through the load to GND.
 *
 * The description of one Zeta operating point. Zeta outputs are non-inverting (Vo positive).
 */
export interface PsfbOperatingPoint {
    /**
     * Phase shift in degrees
     */
    phaseShift: number;
    /**
     * Ambient temperature of the operating point. Unit: Celsius. See docs/units.md.
     */
    ambientTemperature: number;
    /**
     * List of output currents, one per output. Interpreted per outputCurrentsType (default:
     * dc). See docs/normative-references.md.
     */
    outputCurrents: number[];
    /**
     * Type of value carried in outputCurrents: which aggregate of the periodic waveform the
     * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
     */
    outputCurrentsType?: OutputSType;
    /**
     * List of output voltages, one per output. Interpreted per outputVoltagesType (default:
     * dc). See docs/normative-references.md.
     */
    outputVoltages: number[];
    /**
     * Type of value carried in outputVoltages: which aggregate of the periodic waveform the
     * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
     */
    outputVoltagesType?: OutputSType;
    /**
     * Switching frequency of the operating point. Unit: Hz. See docs/units.md.
     */
    switchingFrequency: number;
    [property: string]: any;
}

/**
 * The type of secondary rectifier
 */
export enum BRectifierType {
    CenterTapped = "centerTapped",
    CurrentDoubler = "currentDoubler",
    FullBridge = "fullBridge",
}

/**
 * The description of a Phase Shifted Half Bridge (PSHB) converter excitation. PSHB uses a
 * single 3-level Neutral-Point-Clamped (NPC) leg with split-capacitor input bus, producing
 * a 3-level primary voltage waveform (±Vin/2 / 0). The configuration fields mirror those of
 * phaseShiftFullBridge for now, but the topology, switch count, and primary-voltage
 * amplitude differ — see the corresponding C++ class documentation for details.
 */
export interface PhaseShiftedHalfBridge {
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage of the PSHB converter
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * The maximum phase shift as ratio of half period (0-1). For the single-leg NPC
     * implementation this is interpreted as the maximum effective duty cycle of the active
     * sub-interval.
     */
    maximumPhaseShift?: number;
    /**
     * A list of operating points
     */
    operatingPoints: PshbOperatingPoint[];
    /**
     * The output filter inductance
     */
    outputInductance?: number;
    /**
     * The type of secondary rectifier
     */
    rectifierType?: BRectifierType;
    /**
     * The series inductance for ZVS and duty cycle control. If 0, uses transformer leakage
     * inductance
     */
    seriesInductance?: number;
    /**
     * Whether to use transformer leakage inductance as the series inductor
     */
    useLeakageInductance?: boolean;
}

/**
 * The description of one PSHB operating point. The phaseShift field is mapped internally to
 * an effective duty cycle Deff = phaseShift/180 for the single-leg 3-level NPC
 * implementation.
 *
 * Base fields common to all topology operating points
 *
 * The description of one boost operating point
 *
 * The description of one buck operating point
 *
 * The description of one forward operating point
 *
 * The description of one 4-switch buck-boost operating point. Outputs are non-inverting (Vo
 * positive).
 *
 * The description of one isolatedBuck operating point
 *
 * The description of one isolatedBuckBoost operating point
 *
 * The description of one LLC operating point
 *
 * The description of one pushPull operating point
 *
 * The description of one SEPIC operating point. SEPIC outputs are non-inverting (Vo
 * positive).
 *
 * The description of one SRC operating point
 *
 * The description of one Vienna rectifier operating point
 *
 * The description of one Weinberg operating point. Weinberg outputs are non-inverting (Vo
 * positive); positive Iout flows through the load to GND.
 *
 * The description of one Zeta operating point. Zeta outputs are non-inverting (Vo positive).
 */
export interface PshbOperatingPoint {
    /**
     * Phase shift in degrees
     */
    phaseShift: number;
    /**
     * Ambient temperature of the operating point. Unit: Celsius. See docs/units.md.
     */
    ambientTemperature: number;
    /**
     * List of output currents, one per output. Interpreted per outputCurrentsType (default:
     * dc). See docs/normative-references.md.
     */
    outputCurrents: number[];
    /**
     * Type of value carried in outputCurrents: which aggregate of the periodic waveform the
     * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
     */
    outputCurrentsType?: OutputSType;
    /**
     * List of output voltages, one per output. Interpreted per outputVoltagesType (default:
     * dc). See docs/normative-references.md.
     */
    outputVoltages: number[];
    /**
     * Type of value carried in outputVoltages: which aggregate of the periodic waveform the
     * number represents. Defaults to dc. See IEV 103-02 (values of a periodic quantity).
     */
    outputVoltagesType?: OutputSType;
    /**
     * Switching frequency of the operating point. Unit: Hz. See docs/units.md.
     */
    switchingFrequency: number;
    [property: string]: any;
}

/**
 * The description of a Power Factor Correction (PFC) stage. PFC converters shape the input
 * current to follow the input voltage waveform, achieving near-unity power factor. The
 * inductor operates with a triangular current ripple superimposed on a half-sinusoidal
 * envelope. This topology covers both continuous (CCM) and discontinuous (DCM) conduction
 * modes across the standard single-phase and three-phase variants (boost, bridgeless,
 * totem-pole, interleaved boost, Vienna, etc.).
 */
export interface PowerFactorCorrection {
    /**
     * The ambient temperature for the application
     */
    ambientTemperature: number;
    /**
     * The DC bus bulk capacitance in farads. Used by the operating-point synthesis to compute
     * the twice-line-frequency bus-voltage ripple: ΔVbus ≈ Pout / (2·π·f_line·Cbus·Vbus). Sized
     * in practice from hold-up-time requirements (~1–4 µF/W of output power for 230 Vrms input,
     * 400 V bus, 20 ms hold-up).
     */
    bulkCapacitance?: number;
    /**
     * The peak-to-peak current ripple as a ratio of the average current (typically 0.2-0.4 for
     * CCM)
     */
    currentRippleRatio?: number;
    /**
     * The voltage drop on the boost diode
     */
    diodeVoltageDrop?: number;
    /**
     * The target efficiency of the PFC stage
     */
    efficiency?: number;
    /**
     * The AC input voltage (RMS) with tolerance range (e.g., 85-265V universal input)
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * The AC line frequency (50 or 60 Hz)
     */
    lineFrequency?: number;
    /**
     * Maximum allowable temperature rise
     */
    maximumCoreTemperatureRise?: number;
    /**
     * The maximum current rating of the switch (optional constraint)
     */
    maximumSwitchCurrent?: number;
    /**
     * The conduction mode of the PFC
     */
    mode?: PfcModes;
    /**
     * Number of parallel phases / interleaved cells. 1 for boost/bridgeless/totemPole/buck
     * variants; 2 or 3 for interleavedBoost; 3 for vienna.
     */
    numberOfPhases?: number;
    /**
     * The output power in watts
     */
    outputPower: number;
    /**
     * The DC output voltage (typically 385-400V for universal input)
     */
    outputVoltage: number;
    /**
     * The switching frequency of the PFC stage
     */
    switchingFrequency: number;
    /**
     * The PFC topology variant. 'boost' is the classical single-phase boost PFC (full-bridge
     * rectifier + boost stage), the default. 'bridgeless' / 'semiBridgeless' / 'totemPole'
     * eliminate the input rectifier bridge for higher efficiency. 'interleavedBoost' uses N>=2
     * parallel boost cells phase-shifted for ripple cancellation. 'vienna' is the 3-phase
     * 3-level rectifier used in telecom and EV chargers. 'buck' / 'buckBoost' / 'sepic' / 'cuk'
     * are step-down or buck-boost variants used in low-power LED drivers and isolated PFC
     * stages.
     */
    topologyVariant?: PfcTopologyVariants;
    /**
     * Whether the active switches are wide-bandgap (GaN/SiC) devices. Required true for
     * totem-pole CCM PFC (Si MOSFET body-diode reverse recovery makes CCM totem-pole
     * infeasible).
     */
    wideBandgapSwitch?: boolean;
}

/**
 * The conduction mode of the PFC
 */
export enum PfcModes {
    ContinuousConductionMode = "continuousConductionMode",
    CriticalConductionMode = "criticalConductionMode",
    DiscontinuousConductionMode = "discontinuousConductionMode",
    TransitionMode = "transitionMode",
}

/**
 * The PFC topology variant. 'boost' is the classical single-phase boost PFC (full-bridge
 * rectifier + boost stage), the default. 'bridgeless' / 'semiBridgeless' / 'totemPole'
 * eliminate the input rectifier bridge for higher efficiency. 'interleavedBoost' uses N>=2
 * parallel boost cells phase-shifted for ripple cancellation. 'vienna' is the 3-phase
 * 3-level rectifier used in telecom and EV chargers. 'buck' / 'buckBoost' / 'sepic' / 'cuk'
 * are step-down or buck-boost variants used in low-power LED drivers and isolated PFC
 * stages.
 *
 * The PFC topology variant. See `topologyVariant` field for descriptions.
 */
export enum PfcTopologyVariants {
    Boost = "boost",
    Bridgeless = "bridgeless",
    Buck = "buck",
    BuckBoost = "buckBoost",
    Cuk = "cuk",
    InterleavedBoost = "interleavedBoost",
    SemiBridgeless = "semiBridgeless",
    Sepic = "sepic",
    TotemPole = "totemPole",
    Vienna = "vienna",
}

/**
 * The description of a Push-Pull excitation
 */
export interface PushPull {
    /**
     * The maximum current ripple allowed in the output
     */
    currentRippleRatio: number;
    /**
     * The voltage drop on the diode
     */
    diodeVoltageDrop: number;
    /**
     * Duty cycle for the converter, maximum 50%
     */
    dutyCycle?: number;
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage of the pushPull
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * The maximum drain-source voltage in the selected switch
     */
    maximumDrainSourceVoltage?: number;
    /**
     * The maximum current that can go through the selected switch
     */
    maximumSwitchCurrent?: number;
    /**
     * A list of operating points
     */
    operatingPoints: TopologyExcitation[];
}

/**
 * SEPIC (Single-Ended Primary-Inductor Converter) excitation. Non-inverting fourth-order
 * DC-DC converter with capacitive energy transfer through the coupling capacitor Cs between
 * L1 and L2. Two wiring variants are supported via the boolean flags below: V1 uncoupled
 * (defaults; L1 and L2 are independent inductors) and V2 coupled-inductor
 * (coupledInductor=true; L1 and L2 share one core, ripple-steering per TI SLYT411).
 * Optional synchronousRectifier replaces the catch diode with a low-side MOSFET. The
 * magnetic returned by process_design_requirements is the input inductor L1 (or, when
 * coupledInductor=true, a 2-winding coupled inductor). The remaining reactive elements (L2,
 * Cs, Co) are emitted via get_extra_components_inputs.
 */
export interface Sepic {
    /**
     * If true, L1 and L2 are wound on the same core (1:1 coupled) with coupling coefficient
     * couplingCoefficient. Ripple-steering per TI SLYT411 reduces input-current ripple. The
     * magnetic returned is a 2-winding coupled inductor.
     */
    coupledInductor?: boolean;
    /**
     * Magnetic coupling coefficient k between L1 and L2 (used only when coupledInductor=true).
     * Typical values 0.95-0.999.
     */
    couplingCoefficient?: number;
    /**
     * The maximum input-inductor (L1) current ripple ratio (delta-IL1 / IL1_avg)
     */
    currentRippleRatio?: number;
    /**
     * The voltage drop on the rectifier diode (ignored when synchronousRectifier=true)
     */
    diodeVoltageDrop: number;
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage of the SEPIC
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * The maximum current that can go through the selected switch
     */
    maximumSwitchCurrent?: number;
    /**
     * A list of operating points
     */
    operatingPoints: TopologyExcitation[];
    /**
     * If true, the catch diode is replaced by an actively-driven low-side synchronous MOSFET.
     * Reduces conduction loss; common at low Vout.
     */
    synchronousRectifier?: boolean;
}

/**
 * The description of a Series Resonant Converter (SRC) excitation. Two-element series Lr+Cr
 * tank with no Lm branch. Gain M <= 1 (step-down only). Steigerwald 1988; Kazimierczuk Ch.
 * 4. See src/converter_models/SRC_PLAN.md for the full design rationale.
 */
export interface SeriesResonant {
    /**
     * The type of primary bridge
     */
    bridgeType?: SrcBridgeType;
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage of the SRC converter
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * Whether the converter has an isolation transformer between the resonant tank and the
     * rectifier. When false, the tank drives the rectifier directly (non-isolated SRC).
     */
    isolated?: boolean;
    /**
     * The maximum switching frequency for regulation
     */
    maxSwitchingFrequency: number;
    /**
     * The minimum switching frequency for regulation
     */
    minSwitchingFrequency: number;
    /**
     * A list of operating points
     */
    operatingPoints: TopologyExcitation[];
    /**
     * The quality factor Q = sqrt(Lr/Cr) / Rload of the resonant tank. Determines gain-curve
     * sharpness and Cr peak voltage stress (Vcr_peak ~ Q*Vin/pi at resonance for half-bridge).
     */
    qualityFactor?: number;
    /**
     * The secondary rectifier topology
     */
    rectifierType?: SrcRectifierType;
    /**
     * Optional explicit resonant capacitor (Cr) value in F. Overrides Q/fr derivation when set.
     */
    resonantCapacitance?: number;
    /**
     * The resonant frequency fr = 1/(2*pi*sqrt(Lr*Cr)) of the tank (optional, will be
     * calculated if not provided)
     */
    resonantFrequency?: number;
    /**
     * Optional explicit resonant inductor (Lr) value in H. Overrides Q/fr derivation when set.
     */
    seriesInductance?: number;
    /**
     * Whether the secondary rectifier uses synchronous MOSFETs instead of diodes
     */
    useSynchronousRectifier?: boolean;
}

/**
 * The type of primary bridge
 *
 * The type of primary bridge for the SRC
 */
export enum SrcBridgeType {
    FullBridge = "fullBridge",
    FullBridgePhaseShift = "fullBridgePhaseShift",
    HalfBridge = "halfBridge",
}

/**
 * The secondary rectifier topology
 *
 * The secondary rectifier topology for the SRC
 */
export enum SrcRectifierType {
    CenterTappedDiode = "centerTappedDiode",
    CurrentDoubler = "currentDoubler",
    FullBridgeDiode = "fullBridgeDiode",
}

/**
 * The description of a Vienna rectifier (3-phase 3-level boost-type PFC, unidirectional).
 * Three identical line-frequency boost inductors carry pure-AC line current. Switch
 * blocking voltage = Vdc/2 (3-level advantage). Originally Kolar & Zach 1994; modern SiC
 * industrial implementations: TI TIDA-010257, ST STDES-VIENNARECT, Microchip
 * MSCSICPFC-REF5. See src/converter_models/VIENNA_PLAN.md for the full design rationale.
 */
export interface ViennaRectifier {
    /**
     * DeltaI_L,pp / I_pk at peak-of-line (typical 0.2-0.3)
     */
    currentRippleRatio?: number;
    /**
     * Target efficiency
     */
    efficiency?: number;
    /**
     * Line frequency in Hz (typically 50 or 60)
     */
    lineFrequency?: number;
    /**
     * AC line-to-line RMS voltage (e.g. 400 V for EU, 480 V for US)
     */
    lineToLineVoltage: DimensionWithTolerance;
    /**
     * A list of operating points
     */
    operatingPoints: TopologyExcitation[];
    /**
     * Total DC bus voltage Vdc = Vdc+ + |Vdc-| (typical 700-800 V)
     */
    outputDcVoltage: number;
    /**
     * Number of interleaved Vienna channels in parallel (1 = single Vienna, >1 = multi-channel
     * for >50 kW)
     */
    phaseCount?: number;
    /**
     * Target input power factor (typically >= 0.99)
     */
    powerFactor?: number;
    /**
     * How the line-cycle envelope is sampled: peakOfLineOnly = single sample at omega*t = pi/2
     * (cheapest); peakOfLinePlusSectors = peak + 30/60-degree sector samples; fullLineCycle =
     * 36 samples per cycle (THD validation only)
     */
    samplingStrategy?: ViennaSamplingStrategy;
    /**
     * Per-leg switching frequency in Hz
     */
    switchingFrequency: number;
    /**
     * How each per-leg bidirectional switch is realised: tType (modern SiC default, two
     * anti-series MOSFETs to neutral); backToBackMosfet; singleMosfetIn4DiodeBridge (Kolar 1994
     * classic)
     */
    switchType?: ViennaSwitchType;
    /**
     * If true, the 6 fast rectifier diodes are replaced with MOSFETs
     */
    synchronousRectifier?: boolean;
    /**
     * Vienna switch arrangement: viennaI = single bidirectional switch per leg (3 switches
     * total, classic Kolar 1994); viennaII = two switches per leg (reduced conduction loss at
     * >30 kW)
     */
    viennaVariant?: ViennaVariant;
}

/**
 * How the line-cycle envelope is sampled: peakOfLineOnly = single sample at omega*t = pi/2
 * (cheapest); peakOfLinePlusSectors = peak + 30/60-degree sector samples; fullLineCycle =
 * 36 samples per cycle (THD validation only)
 *
 * Line-cycle envelope sampling strategy
 */
export enum ViennaSamplingStrategy {
    FullLineCycle = "fullLineCycle",
    PeakOfLineOnly = "peakOfLineOnly",
    PeakOfLinePlusSectors = "peakOfLinePlusSectors",
}

/**
 * How each per-leg bidirectional switch is realised: tType (modern SiC default, two
 * anti-series MOSFETs to neutral); backToBackMosfet; singleMosfetIn4DiodeBridge (Kolar 1994
 * classic)
 *
 * Per-leg bidirectional switch realisation
 */
export enum ViennaSwitchType {
    BackToBackMOSFET = "backToBackMosfet",
    SingleMOSFETIn4DiodeBridge = "singleMosfetIn4DiodeBridge",
    TType = "tType",
}

/**
 * Vienna switch arrangement: viennaI = single bidirectional switch per leg (3 switches
 * total, classic Kolar 1994); viennaII = two switches per leg (reduced conduction loss at
 * >30 kW)
 *
 * Vienna switch arrangement variant
 */
export enum ViennaVariant {
    ViennaI = "viennaI",
    ViennaII = "viennaII",
}

/**
 * Weinberg DC-DC converter (current-fed push-pull-derivative, isolated, boost-capable).
 * Spacecraft-heritage topology featuring a 1:1 input coupled inductor L1 with
 * energy-recovery diode D3 to Vin, plus a center-tapped main transformer with center-tapped
 * full-wave secondary rectifier. Intrinsically supports switch overlap above D=0.5 (boost
 * regime) without needing a freewheel switch. Variants supported: V1 classic (push-pull
 * primary, 2 switches) and V2 bridge (H-bridge primary, 4 switches) via the `variant` flag;
 * optional synchronousRectifier replaces secondary diodes with active SR MOSFETs. The
 * magnetic returned by process_design_requirements is the main 2-winding transformer (n =
 * Np_total/Ns_total); the input coupled inductor L1 and output capacitor Co are emitted via
 * get_extra_components_inputs.
 */
export interface Weinberg {
    /**
     * Magnetic coupling coefficient k between the two L1 windings (1:1 input coupled inductor).
     * Typical values 0.99-0.999.
     */
    couplingCoefficientInput?: number;
    /**
     * Magnetic coupling coefficient k for the main transformer (4-way coupling among Lpri_a,
     * Lpri_b, Lsec_a, Lsec_b). Typical values 0.95-0.99 (some leakage required for SPICE
     * convergence and ZCS).
     */
    couplingCoefficientMain?: number;
    /**
     * The maximum input-coupled-inductor (L1) current ripple ratio (delta-IL1 / IL1_avg per
     * winding)
     */
    currentRippleRatio?: number;
    /**
     * The voltage drop on the rectifier diode (ignored when synchronousRectifier=true)
     */
    diodeVoltageDrop: number;
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage of the Weinberg
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * The maximum current that can go through the selected switch
     */
    maximumSwitchCurrent?: number;
    /**
     * A list of operating points
     */
    operatingPoints: TopologyExcitation[];
    /**
     * If true, the secondary CT-FW diodes (D_pos, D_neg) are replaced by actively-driven
     * synchronous MOSFETs (S_pos, S_neg) gated complementary to the primary switches.
     */
    synchronousRectifier?: boolean;
    /**
     * Primary topology variant: 'classic' (V1 push-pull, 2 switches; switch V_DS = 2*Vin/(1-D))
     * or 'bridge' (V2 H-bridge, 4 switches; switch V_DS = Vin).
     */
    variant?: Variant;
}

/**
 * Primary topology variant: 'classic' (V1 push-pull, 2 switches; switch V_DS = 2*Vin/(1-D))
 * or 'bridge' (V2 H-bridge, 4 switches; switch V_DS = Vin).
 */
export enum Variant {
    Bridge = "bridge",
    Classic = "classic",
}

/**
 * Zeta excitation. Non-inverting fourth-order DC-DC converter — the dual of SEPIC: same
 * gain M = D/(1-D), but the LC filter is on the OUTPUT side (so output-voltage ripple is
 * small and there is no right-half-plane zero in CCM). The switch is HIGH-SIDE (PFET by
 * default in the SPICE model). Two wiring variants are supported via the boolean flags
 * below: V1 uncoupled (defaults; L1 magnetizing and L2 output filter are independent
 * inductors) and V2 coupled-inductor (coupledInductor=true; L1 and L2 share one core,
 * ripple-steering per TI SLYT411 — same condition as coupled-SEPIC because both inductors
 * see identical voltages during both subintervals). Optional synchronousRectifier replaces
 * the catch diode with a low-side MOSFET. The magnetic returned by
 * process_design_requirements is L1 (or, when coupledInductor=true, a 2-winding coupled
 * inductor). The remaining reactive elements (L2, Cc, Co) are emitted via
 * get_extra_components_inputs.
 */
export interface Zeta {
    /**
     * If true, L1 and L2 are wound on the same core (1:1 coupled) with coupling coefficient
     * couplingCoefficient. Ripple-steering per TI SLYT411 reduces input-current ripple. The
     * magnetic returned is a 2-winding coupled inductor.
     */
    coupledInductor?: boolean;
    /**
     * Magnetic coupling coefficient k between L1 and L2 (used only when coupledInductor=true).
     * Typical values 0.95-0.999.
     */
    couplingCoefficient?: number;
    /**
     * The maximum magnetizing-inductor (L1) current ripple ratio (delta-IL1 / IL1_avg)
     */
    currentRippleRatio?: number;
    /**
     * The voltage drop on the rectifier diode (ignored when synchronousRectifier=true)
     */
    diodeVoltageDrop: number;
    /**
     * The target efficiency
     */
    efficiency?: number;
    /**
     * The input voltage of the Zeta
     */
    inputVoltage: DimensionWithTolerance;
    /**
     * The maximum current that can go through the selected switch
     */
    maximumSwitchCurrent?: number;
    /**
     * A list of operating points
     */
    operatingPoints: TopologyExcitation[];
    /**
     * If true, the catch diode is replaced by an actively-driven low-side synchronous MOSFET.
     * Reduces conduction loss; common at low Vout.
     */
    synchronousRectifier?: boolean;
}

/**
 * Data describing the design requirements
 *
 * The list of requirements that a given magnetic must comply with. Built on the shared PEAS
 * designRequirementsBase (name, role, allowedTechnologies, market, topology,
 * operatingTemperature, terminalType, maximumWeight, maximumDimensions, application,
 * subApplication) plus the magnetic-specific requirements below. This makes MAS a PEAS
 * citizen: a MAS designRequirements is also a valid PEAS designRequirementsBase.
 *
 * Family-agnostic outer shell of designRequirements. Each family schema does allOf
 * [designRequirementsBase, family-specific]; the family layer adds its required primary
 * specs (capacitance/resistance/inductance/voltage), narrows 'role' and
 * 'allowedTechnologies' to per-family enums, and adds family-specific optional fields
 * (lifetime, ESR, TCR, gate-charge, etc.).
 */
export interface DesignRequirements {
    /**
     * Subset of technologies acceptable for this design. Each family schema overrides 'items'
     * with a per-family enum.
     */
    allowedTechnologies?: string[];
    /**
     * Broad application category. Family schemas override this property with a per-family enum
     * ($ref to magneticApplication / capacitorApplication / resistorApplication /
     * semiconductorApplication).
     */
    application?:       string;
    market?:            Market;
    maximumDimensions?: MaximumDimensions;
    /**
     * Maximum weight for the designed component, in Kg
     */
    maximumWeight?: number;
    /**
     * A label that identifies these Design Requirements
     */
    name?: string;
    /**
     * Required values for the temperature that the component can reach under operation, in
     * Celsius
     */
    operatingTemperature?: DimensionWithTolerance;
    /**
     * The role this component plays in the converter. The family schema overrides this with a
     * per-family enum; this base layer leaves it as a string for extensibility.
     */
    role?: string;
    /**
     * Narrower sub-application within the chosen application. Family schemas override this
     * property with a per-family enum.
     */
    subApplication?: string;
    /**
     * Type(s) of terminal that must be used. An array so multi-terminal/multi-winding parts
     * (e.g. magnetics) can require a type per terminal; single-terminal families may supply a
     * one-element array.
     */
    terminalType?: ConnectionType[];
    topology?:     Topology;
    insulation?:   InsulationRequirements;
    /**
     * Isolation side where each winding is connected to.
     */
    isolationSides?: IsolationSide[];
    /**
     * Required values for the leakage inductance
     */
    leakageInductance?: DimensionWithTolerance[];
    /**
     * Required values for the magnetizing inductance
     */
    magnetizingInductance: DimensionWithTolerance;
    /**
     * List of minimum impedance at given frequency in the primary
     */
    minimumImpedance?: ImpedanceAtFrequency[];
    /**
     * Required values for the stray capacitance
     */
    strayCapacitance?: DimensionWithTolerance[];
    /**
     * Required turns ratios between primary and the rest of windings
     */
    turnsRatios:       DimensionWithTolerance[];
    wiringTechnology?: WiringTechnology;
    [property: string]: any;
}

export interface InsulationRequirements {
    /**
     * Required values for the altitude
     */
    altitude?: DimensionWithTolerance;
    /**
     * Required CTI
     */
    cti?:            CTI;
    insulationType?: IsolationClass;
    /**
     * Voltage RMS of the main supply to which this transformer is connected to.
     */
    mainSupplyVoltage?: DimensionWithTolerance;
    /**
     * Required overvoltage category
     */
    overvoltageCategory?: OvervoltageCategory;
    /**
     * Required pollution for the magnetic to work under
     */
    pollutionDegree?: PollutionDegree;
    /**
     * List of standards that will be taken into account for insulation.
     */
    standards?: InsulationStandards[];
}

/**
 * Required CTI
 */
export enum CTI {
    GroupI = "groupI",
    GroupII = "groupII",
    GroupIIIA = "groupIIIA",
    GroupIIIB = "groupIIIB",
}

/**
 * Insulation class per IEC 60664-1 / IEC 62368-1. Mirror of
 * MAS/utils.json#/$defs/insulationType.
 *
 * Insulation grade classification as stated in the datasheet (e.g. 'reinforced', 'basic').
 * Aligns with IEC insulationType vocabulary.
 */
export enum IsolationClass {
    Basic = "basic",
    Double = "double",
    Functional = "functional",
    Reinforced = "reinforced",
    Supplementary = "supplementary",
}

/**
 * Required overvoltage category
 */
export enum OvervoltageCategory {
    I = "I",
    Ii = "II",
    Iii = "III",
    Iv = "IV",
}

/**
 * Required pollution for the magnetic to work under
 */
export enum PollutionDegree {
    Pd1 = "PD1",
    Pd2 = "PD2",
    Pd3 = "PD3",
    Pd4 = "PD4",
}

export enum InsulationStandards {
    IEC603351 = "IEC 60335-1",
    IEC606641 = "IEC 60664-1",
    IEC615581 = "IEC 61558-1",
    IEC623681 = "IEC 62368-1",
}

/**
 * Tag to identify windings that are sharing the same ground
 */
export enum IsolationSide {
    Denary = "denary",
    Duodenary = "duodenary",
    Nonary = "nonary",
    Octonary = "octonary",
    Primary = "primary",
    Quaternary = "quaternary",
    Quinary = "quinary",
    Secondary = "secondary",
    Senary = "senary",
    Septenary = "septenary",
    Tertiary = "tertiary",
    Undenary = "undenary",
}

/**
 * Target market segment for the component. Common to MAS / CAS / RAS / SAS.
 */
export enum Market {
    Automotive = "automotive",
    Commercial = "commercial",
    Industrial = "industrial",
    Medical = "medical",
    Military = "military",
    Space = "space",
}

/**
 * Maximum allowed bounding-box dimensions for the component, in metres.
 */
export interface MaximumDimensions {
    depth?:  number;
    height?: number;
    width?:  number;
}

/**
 * PCB / terminal connection type. Superset of MAS schemas/utils.json#/$defs/connectionType:
 * includes every MAS value (pin, screw, smt, flyingLead, tht, pcbPad) plus PEAS-only
 * additions (chassis). Case-style aligned to MAS (lowerCamelCase) since MAS is the IEC
 * standard candidate.
 *
 * PCB mounting style. Uses the same connectionType enum as designRequirements.terminalType.
 */
export enum ConnectionType {
    Chassis = "chassis",
    FlyingLead = "flyingLead",
    PCBPad = "pcbPad",
    Pin = "pin",
    SMT = "smt",
    Screw = "screw",
    Tht = "tht",
}

/**
 * Power-electronics converter topology, used by every family's designRequirements to tag
 * which converter a component is designed for (e.g. a capacitor's stress/lifetime model
 * depends on it). PEAS HOSTS this shared vocabulary because all families reference it and
 * PEAS is the only layer beneath them all; MAS OWNS its content (MAS implements the
 * converter topologies under inputs/topologies/ and is the IEC standard candidate). This
 * enum must mirror MAS's implemented topology set exactly — add a value here only when MAS
 * adds the corresponding topology.
 */
export enum Topology {
    ActiveClampForwardConverter = "activeClampForwardConverter",
    AsymmetricHalfBridgeConverter = "asymmetricHalfBridgeConverter",
    BoostConverter = "boostConverter",
    BuckConverter = "buckConverter",
    CllcResonantConverter = "cllcResonantConverter",
    ClllcResonantConverter = "clllcResonantConverter",
    CommonModeChoke = "commonModeChoke",
    CukConverter = "cukConverter",
    CurrentTransformer = "currentTransformer",
    DifferentialModeChoke = "differentialModeChoke",
    DualActiveBridgeConverter = "dualActiveBridgeConverter",
    FlybackConverter = "flybackConverter",
    FourSwitchBuckBoostConverter = "fourSwitchBuckBoostConverter",
    IsolatedBuckBoostConverter = "isolatedBuckBoostConverter",
    IsolatedBuckConverter = "isolatedBuckConverter",
    LlcResonantConverter = "llcResonantConverter",
    PhaseShiftedFullBridgeConverter = "phaseShiftedFullBridgeConverter",
    PhaseShiftedHalfBridgeConverter = "phaseShiftedHalfBridgeConverter",
    PowerFactorCorrection = "powerFactorCorrection",
    PushPullConverter = "pushPullConverter",
    SepicConverter = "sepicConverter",
    SeriesResonantConverter = "seriesResonantConverter",
    SingleSwitchForwardConverter = "singleSwitchForwardConverter",
    TwoSwitchForwardConverter = "twoSwitchForwardConverter",
    ViennaRectifierConverter = "viennaRectifierConverter",
    WeinbergConverter = "weinbergConverter",
    ZetaConverter = "zetaConverter",
}

/**
 * Technology that must be used to create the wiring
 *
 * Type of the group
 */
export enum WiringTechnology {
    Deposition = "deposition",
    Printed = "printed",
    Stamped = "stamped",
    Wound = "wound",
}

/**
 * Data describing one operating point, including the operating conditions and the
 * excitations for all ports
 *
 * Excitation of the current per winding that produced the winding losses.
 */
export interface OperatingPoint {
    conditions:            OperatingConditions;
    excitationsPerWinding: OperatingPointExcitation[];
    /**
     * Name describing this operating point
     */
    name?: string;
}

/**
 * The description of a magnetic operating conditions. Cooling uses the standardized PEAS
 * cooling type (shared across all component families).
 */
export interface OperatingConditions {
    /**
     * Relative Humidity of the ambient where the magnetic will operate
     */
    ambientRelativeHumidity?: number;
    /**
     * Temperature of the ambient where the magnetic will operate
     */
    ambientTemperature: number;
    /**
     * Cooling method for the magnetic component.
     */
    cooling?: Cooling;
    /**
     * A label that identifies this Operating Conditions
     */
    name?: string;
}

/**
 * Cooling method for the magnetic component.
 *
 * Standardized cooling method for a power-electronic component of ANY family (magnetic,
 * semiconductor, capacitor, resistor). Exactly one of natural convection, forced
 * convection, a heatsink, or a cold plate. Shared across the OpenConverters families so
 * cooling is described identically wherever it appears (operating conditions, thermal
 * design requirements, etc.).
 *
 * Data describing natural convection cooling.
 *
 * Data describing forced convection cooling.
 *
 * Data describing heatsink cooling.
 *
 * Data describing cold plate cooling.
 */
export interface Cooling {
    /**
     * Name of the fluid used.
     */
    fluid?: string;
    /**
     * Temperature of the fluid, in Celsius. If absent, ambient temperature is assumed.
     *
     * Temperature of the fluid. To be used only if different from ambient temperature.
     */
    temperature?: number;
    /**
     * Diameter of the fluid flow, normally defined as a fan diameter, in m.
     */
    flowDiameter?: number;
    velocity?:     number[];
    /**
     * Physical dimensions (width, height, depth) of the heatsink, in m.
     *
     * Physical dimensions (width, height, depth) of the cold plate, in m.
     */
    dimensions?: Dimensions;
    /**
     * Thermal resistance of the thermal interface connecting the device to the heatsink. Unit:
     * K/W.
     *
     * Thermal resistance of the thermal interface connecting the device to the cold plate.
     * Unit: K/W.
     */
    interfaceThermalResistance?: number;
    /**
     * Thickness of the thermal interface connecting the device to the heatsink, in m.
     *
     * Thickness of the thermal interface connecting the device to the cold plate, in m.
     */
    interfaceThickness?: number;
    /**
     * Bulk thermal resistance of the heat sink. Unit: K/W.
     *
     * Bulk thermal resistance of the cold plate. Unit: K/W.
     */
    thermalResistance?: number;
    /**
     * Name of the liquid coolant flowing through the cold plate (e.g. water, water-glycol,
     * dielectric fluid).
     */
    coolant?: string;
    /**
     * Volumetric flow rate of the coolant through the cold plate, in m^3/s.
     */
    flowRate?: number;
    /**
     * Coolant supply (inlet) temperature, in Celsius.
     */
    inletTemperature?: number;
    /**
     * Maximum temperature of the cold plate. Unit: Celsius.
     */
    maximumTemperature?: number;
}

/**
 * Physical dimensions (width, height, depth) of the heatsink, in m.
 *
 * Physical dimensions (width, height, depth) of the cold plate, in m.
 */
export interface Dimensions {
    depth?:  number;
    height?: number;
    width?:  number;
}

/**
 * Data describing the excitation of the winding
 *
 * The description of an operating point excitation (waveform set). REFERENCE COPY of MAS
 * schemas/inputs/operatingPointExcitation.json
 * (https://schemas.psma.com/mas/inputs/operatingPointExcitation.json) — the source of truth
 * is MAS, which is the IEC standard candidate. Mirrored into PEAS so CAS / SAS / RAS can
 * share the same waveform and signal-descriptor conventions without taking a runtime
 * dependency on MAS. Keep byte-aligned with MAS apart from $id and this description; update
 * here whenever MAS updates.
 */
export interface OperatingPointExcitation {
    current?: SignalDescriptor;
    /**
     * Frequency of the waveform, common for all electromagnetic parameters, in Hz
     */
    frequency:              number;
    magneticFieldStrength?: SignalDescriptor;
    magneticFluxDensity?:   SignalDescriptor;
    magnetizingCurrent?:    SignalDescriptor;
    /**
     * A label that identifies this Operating Point
     */
    name?:    string;
    voltage?: SignalDescriptor;
    [property: string]: any;
}

/**
 * Excitation of the B field that produced the core losses
 *
 * Structure definining one electromagnetic parameters: current, voltage, magnetic flux
 * density
 */
export interface SignalDescriptor {
    /**
     * Data containing the harmonics of the waveform, defined by a list of amplitudes and a list
     * of frequencies
     */
    harmonics?: Harmonics;
    processed?: Processed;
    waveform?:  Waveform;
    [property: string]: any;
}

/**
 * Data containing the harmonics of the waveform, defined by a list of amplitudes and a list
 * of frequencies
 */
export interface Harmonics {
    /**
     * List of amplitudes of the harmonics that compose the waveform
     */
    amplitudes: number[];
    /**
     * List of frequencies of the harmonics that compose the waveform
     */
    frequencies: number[];
}

export interface Processed {
    /**
     * Effective (equivalent-sine) frequency of the AC component of the waveform (DC component
     * removed). Unit: Hz.
     */
    acEffectiveFrequency?: number;
    /**
     * The average value of the waveform, referred to 0
     */
    average?: number;
    /**
     * The dead time after TOn and Toff, in seconds, if applicable
     */
    deadTime?: number;
    /**
     * The duty cycle of the waveform, if applicable
     */
    dutyCycle?: number;
    /**
     * Effective (equivalent-sine) frequency of the waveform, defined as the frequency of a
     * sinusoid with the same RMS rate of change. Unit: Hz.
     */
    effectiveFrequency?: number;
    label:               WaveformLabel;
    /**
     * The most-negative value of the waveform (always <= 0 for bipolar signals)
     */
    negativePeak?: number;
    /**
     * The offset value of the waveform, referred to 0
     */
    offset: number;
    /**
     * The maximum absolute value of the waveform
     */
    peak?: number;
    /**
     * The peak to peak value of the waveform
     */
    peakToPeak?: number;
    /**
     * The phase of the waveform, in degrees
     */
    phase?: number;
    /**
     * The maximum positive value of the waveform
     */
    positivePeak?: number;
    /**
     * The RMS value of the waveform
     */
    rms?: number;
    /**
     * The Total Harmonic Distortion of the waveform, according to
     * https://en.wikipedia.org/wiki/Total_harmonic_distortion
     */
    thd?: number;
    [property: string]: any;
}

/**
 * Data containing the points that define an arbitrary waveform with equidistant points
 *
 * Data containing the points that define an arbitrary waveform with non-equidistant points
 * paired with their time in the period
 */
export interface Waveform {
    /**
     * List of values that compose the waveform, at equidistant times form each other
     */
    data: number[];
    /**
     * The number of periods covered by the data
     */
    numberPeriods?:  number;
    ancillaryLabel?: WaveformLabel;
    time?:           number[];
}

/**
 * The description of a magnetic
 */
export interface Magnetic {
    /**
     * Data describing the coil
     */
    coil?: Coil;
    /**
     * Data describing the magnetic core.
     */
    core?: MagneticCore;
    /**
     * The lists of distributors of the magnetic
     */
    distributorsInfo?: Utils[];
    /**
     * Manufacturer information for the magnetic. Extends the shared manufacturerInfo with a
     * datasheetInfo block for catalogue-level data.
     */
    manufacturerInfo?: MagneticManufacturerInfo;
    /**
     * The rotation of the magnetic, by default the winding column goes vertical
     */
    rotation?: number[];
}

/**
 * Data describing the coil
 *
 * The description of a magnetic coil
 */
export interface Coil {
    /**
     * Bobbin(s) for this coil. Scalar (single Bobbin object or name) describes a single bobbin
     * (typically around the centre column). Array describes per-column bobbins for multi-column
     * magnetics (e.g. 3-phase transformers). Convention A: bobbins[i] is mounted on
     * core.columns[i] (index 0 = centre/main column).
     */
    bobbin: Array<Bobbin | string> | Bobbin | string;
    /**
     * Coil data described in functional terms (the windings, per IEV 151-13-17), in a form
     * suitable for purely magnetic analytical models.
     */
    functionalDescription: CoilFunctionalDescription[];
    /**
     * Coil data at the group level. A group may define a PCB or distinct winding windows.
     */
    groupsDescription?: Group[];
    /**
     * The data from the coil at the layer level, in a way that can be used by more advanced
     * analytical and finite element models
     */
    layersDescription?: Layer[];
    /**
     * Coil data at the section level, suitable for more advanced analytical and finite-element
     * models.
     */
    sectionsDescription?: Section[];
    /**
     * The data from the coil at the turn level, in a way that can be used by the most advanced
     * analytical and finite element models
     */
    turnsDescription?: Turn[];
    [property: string]: any;
}

/**
 * Description of a bobbin (the insulating former on which one or more windings are
 * arranged). The term is industry-conventional; an IEV entry is being proposed by PSMA. See
 * docs/normative-references.md.
 */
export interface Bobbin {
    /**
     * List of distributors of this bobbin.
     */
    distributorsInfo?: Utils[];
    /**
     * Bobbin data described in functional terms, in a form suitable for analytical models.
     */
    functionalDescription?: BobbinFunctionalDescription;
    manufacturerInfo?:      ManufacturerInfo;
    /**
     * Name of the bobbin.
     */
    name?:                 string;
    processedDescription?: CoreBobbinProcessedDescription;
    [property: string]: any;
}

/**
 * Where to buy this component.
 */
export interface Utils {
    /**
     * Unit cost as a monetary value with explicit currency ({value, currency}). The currency is
     * the code this distributor quotes in (derived from the distributor's country where not
     * stated).
     */
    cost?: CurrencyAmount;
    /**
     * Country of distribution.
     */
    country?: null | string;
    /**
     * Geographical area in which the distributor operates.
     */
    distributedArea?: string;
    /**
     * The distributor's email.
     */
    email?: string;
    /**
     * True if the component is internal (not publicly distributed).
     */
    internal?: boolean;
    /**
     * A note about the internal status of the component.
     */
    internalNote?: string;
    /**
     * Lead time in weeks from this distributor.
     */
    leadTime?: number | null;
    /**
     * Product page URL.
     */
    link?: null | string;
    /**
     * Minimum order quantity at this distributor.
     */
    moq?: number | null;
    /**
     * Distributor name (e.g. Digi-Key, Mouser).
     */
    name: string;
    /**
     * Packaging format from this distributor (e.g. Tape & Reel, Bulk, Tray, Cut Tape).
     */
    packaging?: null | string;
    /**
     * The distributor's phone.
     */
    phone?: string;
    /**
     * The number of individual pieces available at the distributor.
     */
    quantity?: number;
    /**
     * Distributor part number.
     */
    reference?: null | string;
    /**
     * Available stock quantity.
     */
    stock?: number | null;
    /**
     * The date this distributor information was last updated.
     */
    updatedAt?: string;
    /**
     * Units per package / reel from this distributor.
     */
    vpe?: number | null;
}

/**
 * Unit cost as a monetary value with explicit currency ({value, currency}). The currency is
 * the code this distributor quotes in (derived from the distributor's country where not
 * stated).
 *
 * Monetary value with explicit ISO 4217 currency code. Mirrors MAS/utils.json#/$defs/cost.
 * Lifted to PEAS so CAS/RAS/SAS/COAS may reference a single canonical definition.
 */
export interface CurrencyAmount {
    /**
     * ISO 4217 three-letter currency code (EUR, USD, CNY, JPY, ...).
     */
    currency: string;
    value:    number;
}

/**
 * Bobbin data described in functional terms, in a form suitable for analytical models.
 */
export interface BobbinFunctionalDescription {
    /**
     * List of connections between windings and pins
     */
    connections?: PinWindingConnection[];
    /**
     * Bobbin dimensions. Keys are the dimension labels defined in IEC 62317 / IEC 63093 for the
     * parent core shape.
     */
    dimensions: { [key: string]: number | DimensionWithTolerance };
    /**
     * Bobbin family, named after the core shape family it is intended to fit. See IEC 62317 /
     * IEC 63093.
     */
    family: BobbinFamily;
    /**
     * Subtype of the shape, where more than one variant exists in the family.
     */
    familySubtype?: string;
    material?:      InsulationMaterial | string;
    /**
     * Mounting orientation of the bobbin
     */
    orientation?: Orientation;
    pinout?:      Pinout;
    /**
     * Name of the core shape this bobbin is matched to.
     */
    shape: string;
    /**
     * Whether the bobbin is a standard catalogue part or a custom design.
     */
    type: FunctionalDescriptionType;
    /**
     * Variant name of the bobbin (e.g. flanged, foot-print)
     */
    variant?: string;
}

export interface PinWindingConnection {
    /**
     * The name of the connected pin
     */
    pin?: string;
    /**
     * The name of the connected winding
     */
    winding?: string;
}

/**
 * Bobbin family, named after the core shape family it is intended to fit. See IEC 62317 /
 * IEC 63093.
 */
export enum BobbinFamily {
    E = "e",
    Ec = "ec",
    Efd = "efd",
    El = "el",
    Ep = "ep",
    Er = "er",
    Etd = "etd",
    P = "p",
    Pm = "pm",
    Pq = "pq",
    Rm = "rm",
    T = "t",
    U = "u",
}

/**
 * A material for insulation
 */
export interface InsulationMaterial {
    /**
     * Alternative names of the material
     */
    aliases?: string[];
    /**
     * The composition of a insulation material
     */
    composition?:       string;
    dielectricStrength: DielectricStrengthElement[];
    manufacturerInfo?:  ManufacturerInfo;
    /**
     * The melting temperature of the insulation material, in Celsius
     */
    meltingPoint?: number;
    /**
     * The name of a insulation material
     */
    name: string;
    /**
     * The dielectric constant of the insulation material
     */
    relativePermittivity?: number;
    /**
     * Volume resistivity per IEC 60093. Unit: ohm metre (Ohm.m).
     */
    resistivity?: ResistivityPoint[];
    /**
     * Specific heat capacity of the insulation material. Unit: J/(kg*K).
     */
    specificHeat?: number;
    /**
     * Surface resistivity per IEC 60093. Unit: ohm per square (Ohm/sq). Relevant to tracking
     * and creepage assessment per IEC 60112 / IEC 60664-1.
     */
    surfaceResistivity?: ResistivityPoint[];
    /**
     * Insulation thermal class per IEC 60085. May be expressed as the IEC letter class (Y, A,
     * E, B, F, H, N, R, 200, 220, 250) or as the numeric maximum continuous operating
     * temperature in Celsius (the form printed on most magnet-wire spools and IEC 60317
     * sub-spec datasheets). The two forms are interchangeable per the IEC 60085 mapping. See
     * docs/normative-references.md.
     */
    temperatureClass?: number | TemperatureClassEnum;
    /**
     * Thermal conductivity of the insulation material. Unit: W/(m*K).
     */
    thermalConductivity?: number;
}

/**
 * data for describing one point of dielectric strength
 */
export interface DielectricStrengthElement {
    /**
     * Humidity for the field value, in proportion over 1
     */
    humidity?: number;
    /**
     * Temperature for the field value, in Celsius.
     */
    temperature?: number;
    /**
     * Thickness of the material
     */
    thickness?: number;
    /**
     * Dielectric strength value, in V / m
     */
    value: number;
}

/**
 * Shared manufacturer-info fields. Each component family builds its OWN closed
 * manufacturerInfo by $ref-ing these field definitions (by JSON pointer) and adding its
 * datasheetInfo; families do NOT allOf-extend this (incompatible with
 * additionalProperties:false).
 */
export interface ManufacturerInfo {
    /**
     * URL to manufacturer datasheet
     */
    datasheetUrl?: string;
    /**
     * Description of the part per its manufacturer
     */
    description?: string;
    /**
     * Manufacturer product family / product-line name (e.g. 'CoolMOS C7', 'WE-MAPI').
     */
    family?: string;
    /**
     * Manufacturer name
     */
    name: string;
    /**
     * Manufacturer order code
     */
    orderCode?: string;
    /**
     * Manufacturer part number
     */
    reference?: string;
    /**
     * Manufacturer product series within the family.
     */
    series?: string;
    /**
     * SPICE simulation model for this component
     */
    spiceModel?: { [key: string]: any };
    /**
     * Production status
     */
    status?: Status;
    [property: string]: any;
}

/**
 * Production status
 */
export enum Status {
    Nrnd = "nrnd",
    Obsolete = "obsolete",
    Preview = "preview",
    Production = "production",
    Prototype = "prototype",
}

/**
 * data for describing one point of resistivity
 */
export interface ResistivityPoint {
    /**
     * Temperature for the field value, in Celsius.
     */
    temperature?: number;
    /**
     * Resistivity value, in Ohm * m
     */
    value: number;
}

export enum TemperatureClassEnum {
    A = "A",
    B = "B",
    E = "E",
    F = "F",
    H = "H",
    N = "N",
    R = "R",
    The200 = "200",
    The220 = "220",
    The250 = "250",
    Y = "Y",
}

/**
 * Mounting orientation of the bobbin
 */
export enum Orientation {
    Horizontal = "horizontal",
    Vertical = "vertical",
}

/**
 * Data describing the pinout of a bobbin
 */
export interface Pinout {
    /**
     * The distance between central pins
     */
    centralPitch?: number;
    /**
     * The number of pins
     */
    numberPins: number;
    /**
     * List of pins per row
     */
    numberPinsPerRow?: number[];
    /**
     * The number of rows of a bobbin, typically 2
     */
    numberRows?:     number;
    pinDescription?: Pin;
    pitch?:          number[] | number;
    /**
     * The distance between a row of pins and the center of the bobbin
     */
    rowDistance?: number;
}

/**
 * Data describing one pin in a bobbin
 */
export interface Pin {
    /**
     * The coordinates of the center of the pin, referred to the center of the main column
     */
    coordinates?: number[];
    /**
     * Dimensions of the rectangle defining the pin
     */
    dimensions: number[];
    /**
     * Name given to the pin
     */
    name?: string;
    /**
     * The rotation of the pin, default is vertical
     */
    rotation?: number[];
    /**
     * The shape of the pin
     */
    shape: PinShape;
    /**
     * Type of pin
     */
    type: PinDescriptionType;
}

/**
 * The shape of the pin
 */
export enum PinShape {
    Irregular = "irregular",
    Rectangular = "rectangular",
    Round = "round",
}

/**
 * Type of pin
 */
export enum PinDescriptionType {
    Smd = "smd",
    Tht = "tht",
}

/**
 * Whether the bobbin is a standard catalogue part or a custom design.
 *
 * The type of a magnetic shape
 */
export enum FunctionalDescriptionType {
    Custom = "custom",
    Standard = "standard",
}

export interface CoreBobbinProcessedDescription {
    /**
     * The depth of the central column wall, including thickness, in the z axis
     */
    columnDepth: number;
    columnShape: ColumnShape;
    /**
     * The thickness of the central column wall, where the wire is wound, in the X axis
     */
    columnThickness: number;
    /**
     * The width of the central column wall, including thickness, in the x axis
     */
    columnWidth?: number;
    /**
     * The coordinates of the center of the bobbin central wall, where the wires are wound,
     * referred to the center of the main column.
     */
    coordinates?: number[];
    /**
     * List of pins, geometrically defining how and where it is
     */
    pins?: Pin[];
    /**
     * The thickness of the walls that hold the wire on both sides of the column
     */
    wallThickness: number;
    /**
     * List of winding windows, all elements in the list must be of the same type
     */
    windingWindows: WindingWindowElement[];
}

/**
 * Shape of the column, also used for gaps
 */
export enum ColumnShape {
    Irregular = "irregular",
    Oblong = "oblong",
    Rectangular = "rectangular",
    Round = "round",
}

/**
 * List of rectangular winding windows
 *
 * It is the area between the winding column and the closest lateral column, and it
 * represents the area where all the wires of the magnetic will have to fit, and
 * equivalently, where all the current must circulate once, in the case of inductors, or
 * twice, in the case of transformers
 *
 * List of radial winding windows
 *
 * It is the area between the delimited between a height from the surface of the toroidal
 * core at a given angle, and it represents the area where all the wires of the magnetic
 * will have to fit, and equivalently, where all the current must circulate once, in the
 * case of inductors, or twice, in the case of transformers
 */
export interface WindingWindowElement {
    /**
     * Area of the winding window
     */
    area?: number;
    /**
     * The coordinates of the center of the winding window, referred to the center of the main
     * column. In the case of half-sets, the center will be in the top point, where it would
     * join another half-set
     *
     * The coordinates of the point of the winding window where the middle height touches the
     * main column, referred to the center of the main column. In the case of half-sets, the
     * center will be in the top point, where it would join another half-set
     */
    coordinates?: number[];
    /**
     * Vertical height of the winding window
     */
    height?: number;
    /**
     * Way in which the sections are aligned inside the winding window
     */
    sectionsAlignment?: CoilAlignment;
    /**
     * Way in which the sections are oriented inside the winding window
     */
    sectionsOrientation?: WindingOrientation;
    /**
     * Shape of the winding window
     */
    shape?: WindingWindowShape;
    /**
     * Horizontal width of the winding window
     */
    width?: number;
    /**
     * Default order in which consecutive layers are wound within each section in this winding
     * window (overridable per section). 'U' alternates the winding direction every layer
     * (back-and-forth); 'Z' winds every layer in the same direction with a return wire
     * (foldback).
     */
    windingOrder?: WindingOrder;
    /**
     * Total angle of the window
     */
    angle?: number;
    /**
     * Radial height of the winding window
     */
    radialHeight?: number;
}

/**
 * Way in which the sections are aligned inside the winding window
 *
 * Way in which the turns are aligned inside the layer
 *
 * Way in which the layers are aligned inside the section
 */
export enum CoilAlignment {
    Centered = "centered",
    InnerOrTop = "innerOrTop",
    OuterOrBottom = "outerOrBottom",
    Spread = "spread",
}

/**
 * Way in which the sections are oriented inside the winding window
 *
 * Way in which the layer is oriented inside the section
 *
 * Way in which the layers are oriented inside the section
 */
export enum WindingOrientation {
    Contiguous = "contiguous",
    Overlapping = "overlapping",
}

export enum WindingWindowShape {
    Rectangular = "rectangular",
    Round = "round",
}

/**
 * Default order in which consecutive layers are wound within each section in this winding
 * window (overridable per section). 'U' alternates the winding direction every layer
 * (back-and-forth); 'Z' winds every layer in the same direction with a return wire
 * (foldback).
 *
 * Order in which consecutive layers are wound within this section. 'U' alternates the
 * winding direction every layer (back-and-forth); 'Z' winds every layer in the same
 * direction with a return wire (foldback). If unset, the winding window's windingOrder
 * applies, else 'Z'.
 */
export enum WindingOrder {
    U = "U",
    Z = "Z",
}

/**
 * One winding (assembly of interconnected turns and/or coils intended for common operation,
 * per IEV 151-13-17). Examples: primary, secondary, auxiliary.
 */
export interface CoilFunctionalDescription {
    /**
     * Array of all the pins this winding is connected to.
     */
    connections?:  ConnectionElement[];
    isolationSide: IsolationSide;
    /**
     * Name of the winding (e.g. primary, secondary).
     */
    name: string;
    /**
     * Number of parallel-connected conductors making up one electrical turn of the winding.
     */
    numberParallels: number;
    /**
     * Number of turns (per IEV 151-13-14) in the winding.
     */
    numberTurns: number;
    wire:        Wire | string;
    /**
     * List of winding names that are wound together with this winding.
     */
    woundWith?: string[];
}

/**
 * Connection of a wire to a terminal.
 */
export interface ConnectionElement {
    /**
     * Direction of the current in the connection.
     */
    direction?: Direction;
    /**
     * Length of the connection, from the exit of the last turn to the terminal. Unit: m.
     */
    length?: number;
    /**
     * Metric of the terminal, if applicable.
     */
    metric?: number;
    /**
     * Name of the pin where the wire is connected, if applicable.
     */
    pinName?: string;
    type?:    ConnectionType;
}

/**
 * Direction of the current in the connection.
 */
export enum Direction {
    Input = "input",
    Output = "output",
}

/**
 * The description of a solid round magnet wire
 *
 * The description of a basic magnet wire
 *
 * The description of a solid foil magnet wire
 *
 * The description of a solid rectangular magnet wire
 *
 * The description of a stranded litz magnet wire
 *
 * The description of a solid planar magnet wire
 */
export interface Wire {
    /**
     * The conducting diameter of the wire, in m
     */
    conductingDiameter?: DimensionWithTolerance;
    material?:           WireMaterial | string;
    /**
     * The outer diameter of the wire, in m
     *
     * The outer diameter of the wire. Unit: m.
     */
    outerDiameter?: DimensionWithTolerance;
    coating?:       InsulationWireCoating | string;
    /**
     * The conducting area of the wire, in m². Used for some rectangular shapes where the area
     * is smaller than expected due to rounded corners
     */
    conductingArea?:   DimensionWithTolerance;
    manufacturerInfo?: ManufacturerInfo;
    /**
     * The name of wire
     */
    name?: string;
    /**
     * The number of conductors in the wire
     */
    numberConductors?: number;
    /**
     * The standard of wire
     */
    standard?: WireStandard;
    /**
     * Name according to the standard of wire
     */
    standardName?: string;
    type:          WireType;
    /**
     * The conducting height of the wire, in m
     */
    conductingHeight?: DimensionWithTolerance;
    /**
     * The conducting width of the wire, in m
     */
    conductingWidth?: DimensionWithTolerance;
    /**
     * The outer height of the wire, in m
     */
    outerHeight?: DimensionWithTolerance;
    /**
     * The outer width of the wire, in m
     */
    outerWidth?: DimensionWithTolerance;
    /**
     * The radius of the edge, in case of rectangular wire, in m
     */
    edgeRadius?: DimensionWithTolerance;
    /**
     * The wire used as strands
     */
    strand?: WireRound | string;
    /**
     * Length of one full twist of the litz bundle along the wire axis. Unit: m. Vendors quote
     * this in mm or as 'lay length'; convert to metres before serialisation. No international
     * standard exists for litz construction; this field captures the most commonly published
     * vendor parameter.
     */
    twistPitch?: DimensionWithTolerance;
    [property: string]: any;
}

/**
 * A coating for a wire
 */
export interface InsulationWireCoating {
    /**
     * The minimum voltage that causes a portion of an insulator to experience electrical
     * breakdown and become electrically conductive, in V
     */
    breakdownVoltage?: number;
    /**
     * The grade of the insulation around the wire
     */
    grade?:    number;
    material?: InsulationMaterial | string;
    /**
     * The number of layers of the insulation around the wire
     */
    numberLayers?: number;
    /**
     * The maximum temperature that the wire coating can withstand
     */
    temperatureRating?: number;
    /**
     * The maximum thickness of the insulation around the wire, in m
     */
    thickness?: DimensionWithTolerance;
    /**
     * The thickness of the layers of the insulation around the wire, in m
     */
    thicknessLayers?: number;
    /**
     * The type of the coating
     */
    type?: InsulationWireCoatingType;
    [property: string]: any;
}

/**
 * The type of the coating
 */
export enum InsulationWireCoatingType {
    Bare = "bare",
    Enamelled = "enamelled",
    Extruded = "extruded",
    Insulated = "insulated",
    Served = "served",
    Taped = "taped",
}

/**
 * A material for wire
 */
export interface WireMaterial {
    /**
     * The name of a wire material
     */
    name: string;
    /**
     * The permeability of a wire material
     */
    permeability:         number;
    resistivity:          Resistivity;
    thermalConductivity?: ThermalConductivityElement[];
}

/**
 * data for describing the resistivity of a wire
 */
export interface Resistivity {
    /**
     * Temperature reference value, in Celsius
     */
    referenceTemperature: number;
    /**
     * Resistivity reference value, in Ohm * m
     */
    referenceValue: number;
    /**
     * Temperature coefficient value, alpha, in 1 / Celsius
     */
    temperatureCoefficient: number;
}

/**
 * data for describing one point of thermal conductivity
 */
export interface ThermalConductivityElement {
    /**
     * Temperature for the field value, in Celsius.
     */
    temperature: number;
    /**
     * Thermal conductivity value. Unit: W/(m*K).
     */
    value: number;
}

/**
 * The standard of wire
 */
export enum WireStandard {
    IEC60317 = "IEC 60317",
    IPC6012 = "IPC-6012",
    NemaMw1000C = "NEMA MW 1000 C",
}

/**
 * The description of a solid round magnet wire
 *
 * The description of a basic magnet wire
 */
export interface WireRound {
    /**
     * The conducting diameter of the wire, in m
     */
    conductingDiameter: DimensionWithTolerance;
    material?:          WireMaterial | string;
    /**
     * The outer diameter of the wire, in m
     */
    outerDiameter?: DimensionWithTolerance;
    coating?:       InsulationWireCoating | string;
    /**
     * The conducting area of the wire, in m². Used for some rectangular shapes where the area
     * is smaller than expected due to rounded corners
     */
    conductingArea?:   DimensionWithTolerance;
    manufacturerInfo?: ManufacturerInfo;
    /**
     * The name of wire
     */
    name?: string;
    /**
     * The number of conductors in the wire
     */
    numberConductors?: number;
    /**
     * The standard of wire
     */
    standard?: WireStandard;
    /**
     * Name according to the standard of wire
     */
    standardName?: string;
    type:          WireType;
    [property: string]: any;
}

/**
 * The type of wire
 */
export enum WireType {
    Foil = "foil",
    Litz = "litz",
    Planar = "planar",
    Rectangular = "rectangular",
    Round = "round",
}

/**
 * Data describing one group in a magnetic, which can include several sections. Ideally this
 * is used for PCB or different winding windows
 */
export interface Group {
    /**
     * The coordinates of the center of the section, referred to the center of the main column
     */
    coordinates: number[];
    /**
     * System in which dimension and coordinates are in
     */
    coordinateSystem?: CoordinateSystem;
    /**
     * Dimensions of the rectangle defining the group
     */
    dimensions: number[];
    /**
     * Name given to the group
     */
    name: string;
    /**
     * List of partial windings in this group
     */
    partialWindings: PartialWinding[];
    /**
     * Way in which the sections are oriented inside the winding window
     */
    sectionsOrientation: WindingOrientation;
    /**
     * Type of the group
     */
    type: WiringTechnology;
}

/**
 * System in which dimension and coordinates are in
 */
export enum CoordinateSystem {
    Cartesian = "cartesian",
    Cylindrical = "cylindrical",
    Polar = "polar",
}

/**
 * One part of a winding, described by the proportion of each parallel that is contained
 * here.
 */
export interface PartialWinding {
    /**
     * Two-element array representing the input and output connections of this partial winding.
     */
    connections?: ConnectionElement[];
    /**
     * Per-parallel proportion of turns contained in this part.
     */
    parallelsProportion: number[];
    /**
     * Name of the winding that this part belongs to.
     */
    winding: string;
}

/**
 * Data describing one layer in a magnetic
 */
export interface Layer {
    /**
     * List of additional coordinates of the center of the layer, referred to the center of the
     * main column, in case the layer is not symmetrical, as in toroids
     */
    additionalCoordinates?: Array<number[]>;
    /**
     * The coordinates of the center of the layer, referred to the center of the main column
     */
    coordinates: number[];
    /**
     * System in which dimension and coordinates are in
     */
    coordinateSystem?: CoordinateSystem;
    /**
     * Dimensions of the rectangle defining the layer
     */
    dimensions: number[];
    /**
     * How much space in this layer is used by wires compared to the total
     */
    fillingFactor?: number;
    /**
     * In case of insulating layer, the material used
     */
    insulationMaterial?: InsulationMaterial | string;
    /**
     * Name given to the layer
     */
    name: string;
    /**
     * Way in which the layer is oriented inside the section
     */
    orientation: WindingOrientation;
    /**
     * List of partial windings in this layer
     */
    partialWindings: PartialWinding[];
    /**
     * The name of the section that this layer belongs to
     */
    section?: string;
    /**
     * Way in which the turns are aligned inside the layer
     */
    turnsAlignment?: CoilAlignment;
    /**
     * Type of the layer
     */
    type: ElectricalType;
    /**
     * Defines if the layer is wound by consecutive turns or parallels
     */
    windingStyle?: WindingStyle;
}

/**
 * Type of the layer
 *
 * Type of the section
 */
export enum ElectricalType {
    Conduction = "conduction",
    Insulation = "insulation",
    Shielding = "shielding",
}

/**
 * Defines if the layer is wound by consecutive turns or parallels
 *
 * Defines if the section is wound by consecutive turns or parallels
 */
export enum WindingStyle {
    WindByConsecutiveParallels = "windByConsecutiveParallels",
    WindByConsecutiveTurns = "windByConsecutiveTurns",
}

/**
 * Data describing one section in a magnetic
 */
export interface Section {
    /**
     * The coordinates of the center of the section, referred to the center of the main column
     */
    coordinates: number[];
    /**
     * System in which dimension and coordinates are in
     */
    coordinateSystem?: CoordinateSystem;
    /**
     * Dimensions of the rectangle defining the section
     */
    dimensions: number[];
    /**
     * How much space in this section is used by wires compared to the total
     */
    fillingFactor?: number;
    /**
     * The name of the group that this section belongs to
     */
    group?: string;
    /**
     * Way in which the layers are aligned inside the section
     */
    layersAlignment?: CoilAlignment;
    /**
     * Way in which the layers are oriented inside the section
     */
    layersOrientation: WindingOrientation;
    /**
     * Defines the distance at the extremes of the section reserved for margin tape. Two-element
     * array, from 'inner or top' to 'outer or bottom'.
     */
    margin?: number[] | MarginInfo;
    /**
     * Name given to the winding
     */
    name: string;
    /**
     * Optional field to force how many layers must fit in a section
     */
    numberLayers?: number;
    /**
     * List of partial windings in this section
     */
    partialWindings: PartialWinding[];
    /**
     * Type of the section
     */
    type: ElectricalType;
    /**
     * Order in which consecutive layers are wound within this section. 'U' alternates the
     * winding direction every layer (back-and-forth); 'Z' winds every layer in the same
     * direction with a return wire (foldback). If unset, the winding window's windingOrder
     * applies, else 'Z'.
     */
    windingOrder?: WindingOrder;
    /**
     * Defines if the section is wound by consecutive turns or parallels
     */
    windingStyle?: WindingStyle;
}

/**
 * Data describing the information about the margin of a section
 */
export interface MarginInfo {
    /**
     * Width of the margin in the bottom or right side of the section, along where the clearance
     * would happen. Also the width of the tape to implement it.
     */
    bottomOrRightWidth: number;
    /**
     * In case of insulating layer, the material used
     */
    insulationMaterial?: InsulationMaterial | string;
    /**
     * Thickness of the layers used to implement the margin.
     */
    layerThickness: number;
    /**
     * Number of layers to implement the margin
     */
    numberLayers: number;
    /**
     * Width of the margin in the top or left side of the section, along where the clearance
     * would happen. Also the width of the tape to implement it.
     */
    topOrLeftWidth: number;
}

/**
 * Data describing one turn in a magnetic
 */
export interface Turn {
    /**
     * List of additional coordinates of the center of the turn, referred to the center of the
     * main column, in case the turn is not symmetrical, as in toroids
     */
    additionalCoordinates?: Array<number[]>;
    /**
     * The angle that the turn does, useful for partial turns, in degrees
     */
    angle?: number;
    /**
     * The coordinates of the center of the turn, referred to the center of the main column
     */
    coordinates: number[];
    /**
     * System in which dimension and coordinates are in
     */
    coordinateSystem?:    CoordinateSystem;
    crossSectionalShape?: TurnCrossSectionalShape;
    /**
     * Dimensions of the rectangle defining the turn
     */
    dimensions?: number[];
    /**
     * The name of the layer that this turn belongs to
     */
    layer?: string;
    /**
     * The length of the turn, referred from the center of its cross section, in m
     */
    length: number;
    /**
     * Name given to the turn
     */
    name: string;
    /**
     * Way in which the turn is wound
     */
    orientation?: TurnOrientation;
    /**
     * The index of the parallel that this turn belongs to
     */
    parallel: number;
    /**
     * Rotation of the rectangle defining the turn, in degrees
     */
    rotation?: number;
    /**
     * The name of the section that this turn belongs to
     */
    section?: string;
    /**
     * The name of the winding that this turn belongs to
     */
    winding: string;
}

export enum TurnCrossSectionalShape {
    Oval = "oval",
    Rectangular = "rectangular",
    Round = "round",
}

/**
 * Way in which the turn is wound
 */
export enum TurnOrientation {
    Clockwise = "clockwise",
    CounterClockwise = "counterClockwise",
}

/**
 * Data describing the magnetic core.
 *
 * The description of a magnetic core
 */
export interface MagneticCore {
    /**
     * The lists of distributors of the magnetic core
     */
    distributorsInfo?: Utils[];
    /**
     * The data from the core based on its function, in a way that can be used by analytical
     * models.
     */
    functionalDescription: CoreFunctionalDescription;
    /**
     * List with data from the core based on its geometrical description, in a way that can be
     * used by CAD models.
     */
    geometricalDescription?: CoreGeometricalDescriptionElement[];
    manufacturerInfo?:       ManufacturerInfo;
    /**
     * The name of core
     */
    name?: string;
    /**
     * The data from the core after been processed, and ready to use by the analytical models
     */
    processedDescription?: CoreProcessedDescription;
}

/**
 * The data from the core based on its function, in a way that can be used by analytical
 * models.
 */
export interface CoreFunctionalDescription {
    /**
     * The coating of the core
     */
    coating?: CoreCoating | string;
    /**
     * The lists of gaps in the magnetic core
     */
    gapping:  CoreGap[];
    material: CoreMaterial | string;
    /**
     * The number of stacked cores
     */
    numberStacks?: number;
    shape:         CoreShape | string;
    /**
     * The type of core
     */
    type: CoreType;
}

/**
 * Data describing the insulating coating applied to a magnetic core
 */
export interface CoreCoating {
    /**
     * Material of the coating, providing its relative permittivity and dielectric strength
     */
    material?: InsulationMaterial | string;
    /**
     * Thickness of the coating, in m
     */
    thickness: number;
    /**
     * The type of coating material applied to the core
     */
    type?: CoatingType;
}

/**
 * The type of coating material applied to the core
 */
export enum CoatingType {
    Epoxy = "epoxy",
    Glass = "glass",
    Nylon = "nylon",
    Parylene = "parylene",
}

/**
 * A gap for the magnetic cores
 */
export interface CoreGap {
    /**
     * Geometrical area of the gap
     */
    area?: number;
    /**
     * The coordinates of the center of the gap, referred to the center of the main column.
     */
    coordinates?: number[];
    /**
     * The distance where the closest perpendicular surface is. This usually is half the winding
     * height
     */
    distanceClosestNormalSurface?: number;
    /**
     * The distance where the closest parallel surface is. This usually is the opposite side of
     * the winnding window
     */
    distanceClosestParallelSurface?: number;
    /**
     * The length of the gap
     */
    length: number;
    /**
     * Dimension of the section normal to the magnetic flux
     */
    sectionDimensions?: number[];
    shape?:             ColumnShape;
    /**
     * The type of a gap
     */
    type: GapType;
}

/**
 * The type of a gap
 */
export enum GapType {
    Additive = "additive",
    Residual = "residual",
    Subtractive = "subtractive",
}

/**
 * A material for the magnetic cores
 */
export interface CoreMaterial {
    /**
     * A list of alternative materials that could replace this one
     */
    alternatives?: string[];
    application?:  MagneticApplication[];
    bhCycle?:      BhCycleElement[];
    /**
     * BH Cycle points where the magnetic flux density is 0
     */
    coerciveForce?: BhCycleElement[];
    /**
     * The name of a magnetic material together its manufacturer
     */
    commercialName?: string;
    /**
     * The temperature at which this material loses all ferromagnetism. Unit: Celsius.
     */
    curieTemperature?: number;
    /**
     * Density value according to manufacturer, in kg/m3
     */
    density?: number;
    /**
     * The family of a magnetic material according to its manufacturer
     */
    family?: string;
    /**
     * Specific heat capacity value according to manufacturer. Unit: J/(kg*K).
     */
    heatCapacity?: DimensionWithTolerance;
    /**
     * Thermal conductivity value according to manufacturer. Unit: W/(m*K).
     */
    heatConductivity?: DimensionWithTolerance;
    manufacturerInfo:  ManufacturerInfo;
    /**
     * Mass-specific core losses. Values throughout this block are in watts per kilogram (W/kg).
     * Note: this is the per-mass form used for tape-wound, amorphous and nanocrystalline
     * materials; the per-volume form lives in `volumetricLosses` and uses W/m^3. The two are
     * NOT interchangeable without the material density. See docs/units.md and
     * docs/normative-references.md.
     */
    massLosses?: { [key: string]: Array<MassLossesPoint[] | MagnetecCoreLossesMethodData> };
    /**
     * The composition of a magnetic material
     */
    material: MaterialType;
    /**
     * The composition of a magnetic material
     */
    materialComposition?: MaterialComposition;
    /**
     * The name of a magnetic material
     */
    name: string;
    /**
     * Relative permeability of the magnetic material, broken down by which kind of permeability
     * was measured. At minimum `initial` is required for materials that have one (essentially
     * all ferrites and tape-wound alloys). Each entry uses permeabilityPoint, which pins
     * frequency, temperature, AC peak flux density and DC bias per measurement.
     */
    permeability: Permeabilities;
    /**
     * Manufacturer recommended operating conditions for this material
     */
    recommendations?: CoreMaterialRecommendations;
    /**
     * BH Cycle points where the magnetic field is 0
     */
    remanence?: BhCycleElement[];
    /**
     * Resistivity value according to manufacturer
     */
    resistivity: ResistivityPoint[];
    /**
     * BH curve points characterising the saturation flux density of the material. By
     * convention, saturation is reported at the field strength at which the relative
     * differential permeability has fallen to approximately 10 % of the initial permeability.
     * See docs/normative-references.md.
     */
    saturation: BhCycleElement[];
    /**
     * The type of a magnetic material
     */
    type: CoreMaterialType;
    /**
     * Volumetric core losses. Values throughout this block are in watts per cubic metre
     * (W/m^3). Coefficient-based methods (Steinmetz, Roshen, ...) assume the same unit system:
     * P in W/m^3, f in Hz, B in T (peak). See docs/units.md and docs/normative-references.md.
     */
    volumetricLosses: { [key: string]: Array<VolumetricLossesPoint[] | CoreLossesMethodData> };
}

/**
 * List of applications a magnetic material can serve
 *
 * Magnetic component application. Mirror of MAS schemas/utils.json#/$defs/application —
 * kept in PEAS so MAS stays the IEC source of truth without other families taking a runtime
 * dependency on MAS. Update here whenever MAS updates.
 */
export enum MagneticApplication {
    InterferenceSuppression = "interferenceSuppression",
    Power = "power",
    SignalProcessing = "signalProcessing",
}

/**
 * One point of the BH cycle.
 */
export interface BhCycleElement {
    /**
     * Magnetic field strength value. Unit: A/m.
     */
    magneticField: number;
    /**
     * Magnetic flux density value. Unit: T.
     */
    magneticFluxDensity: number;
    /**
     * Temperature for the field value, in Celsius.
     */
    temperature: number;
}

/**
 * List of mass losses points
 *
 * Mass-specific losses at a given point of magnetic flux density, frequency and
 * temperature. Unit: W/kg.
 */
export interface MassLossesPoint {
    magneticFluxDensity: OperatingPointExcitation;
    /**
     * origin of the data
     */
    origin: string;
    /**
     * Temperature value, in Celsius.
     */
    temperature: number;
    /**
     * Mass-specific losses value. Unit: W/kg.
     */
    value: number;
}

/**
 * Magnetec method for estimating mass losses
 */
export interface MagnetecCoreLossesMethodData {
    /**
     * Name of this method
     */
    method: MassCoreLossesMethodType;
}

export enum MassCoreLossesMethodType {
    Magnetec = "magnetec",
}

/**
 * The composition of a magnetic material
 */
export enum MaterialType {
    Amorphous = "amorphous",
    ElectricalSteel = "electricalSteel",
    Ferrite = "ferrite",
    Nanocrystalline = "nanocrystalline",
    Powder = "powder",
}

/**
 * The composition of a magnetic material
 */
export enum MaterialComposition {
    CarbonylIron = "carbonylIron",
    FeMo = "FeMo",
    FeNI = "FeNi",
    FeNIMo = "FeNiMo",
    FeSi = "FeSi",
    FeSiAl = "FeSiAl",
    Iron = "iron",
    MgZn = "MgZn",
    MnZn = "MnZn",
    NIZn = "NiZn",
    Proprietary = "proprietary",
}

/**
 * Relative permeability of the magnetic material, broken down by which kind of permeability
 * was measured. At minimum `initial` is required for materials that have one (essentially
 * all ferrites and tape-wound alloys). Each entry uses permeabilityPoint, which pins
 * frequency, temperature, AC peak flux density and DC bias per measurement.
 */
export interface Permeabilities {
    /**
     * Amplitude relative permeability mu_a. The secant slope of the BH curve at a specified
     * peak AC flux density on a defined geometry. Each point pins B_peak, frequency and
     * temperature.
     */
    amplitude?: PermeabilityPoint[] | PermeabilityPoint;
    /**
     * Complex relative permeability (mu' + j*mu''), used for high-frequency loss modelling.
     */
    complex?: ComplexPermeabilityData;
    /**
     * Incremental relative permeability mu_delta. The slope of a small AC excursion
     * superimposed on a non-zero DC bias H. Each point pins magneticFieldDcBias and the AC
     * magneticFluxDensityPeak. Required to model inductors operating under DC bias (PFC chokes,
     * output filters, flyback primaries).
     */
    incremental?: PermeabilityPoint[] | PermeabilityPoint;
    /**
     * Initial relative permeability mu_i. Measured at near-zero AC excitation (e.g. B < 0.25
     * mT) and low frequency (typically <= 10 kHz) at the material's reference temperature, per
     * the IEC 60401-3 catalogue convention.
     */
    initial: PermeabilityPoint[] | PermeabilityPoint;
    /**
     * Reversible relative permeability mu_rev. The limit of mu_delta as the AC excursion tends
     * to zero. Tabulated vs magneticFieldDcBias; used for small-signal AC analysis around a DC
     * operating point.
     */
    reversible?: PermeabilityPoint[] | PermeabilityPoint;
}

/**
 * data for describing one point of permeability
 */
export interface PermeabilityPoint {
    /**
     * Frequency of the Magnetic field, in Hz
     */
    frequency?: number;
    /**
     * DC bias in the magnetic field, in A/m
     */
    magneticFieldDcBias?: number;
    /**
     * magnetic flux density peak for the field value, in T
     */
    magneticFluxDensityPeak?: number;
    /**
     * Per-manufacturer factor blocks applied to the base permeability value to account for DC
     * bias, frequency and temperature dependence.
     */
    modifiers?: { [key: string]: InitialPermeabilitModifier };
    /**
     * temperature for the field value, in Celsius
     */
    temperature?: number;
    /**
     * tolerance for the field value
     */
    tolerance?: number;
    /**
     * Permeability value
     */
    value: number;
}

/**
 * Object where keys are shape families for which this permeability is valid. If missing,
 * the variant is valid for all shapes
 *
 * Coefficients given by Magnetics in order to calculate the permeability of their cores
 *
 * Coefficients given by Micrometals in order to calculate the permeability of their cores
 *
 * Coefficients given by Fair-Rite in order to calculate the permeability of their
 * materials
 *
 * Coefficients given by Poco in order to calculate the permeability of their materials
 *
 * Coefficients given by TDG in order to calculate the permeability of their materials
 */
export interface InitialPermeabilitModifier {
    /**
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the frequency, as factor = a + b * f + c * pow(f, 2) + d * pow(f, 3) + e * pow(f, 4)
     *
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the frequency, as factor = 1 / (a + b * pow(f, c) ) + d
     */
    frequencyFactor?: FrequencyFactor;
    /**
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the H DC bias, as factor = a + b * pow(H, c)
     *
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the H DC bias, as factor = a + b * pow(H, c) + d
     *
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the H DC bias, as factor = 1 / (a + b * pow(H, c))
     */
    magneticFieldDcBiasFactor?: MagneticFieldDcBiasFactor;
    /**
     * Name of this method
     */
    method?: InitialPermeabilitModifierMethod;
    /**
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the temperature, as factor = a + b * T + c * pow(T, 2) + d * pow(T, 3) + e * pow(T, 4)
     *
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the temperature, as either factor = a * (T -20) * 0.0001 or factor = (a + c * T + e *
     * pow(T, 2)) / (1 + b * T + d * pow(T, 2))
     *
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the temperature, as either factor = a
     */
    temperatureFactor?: TemperatureFactor;
    /**
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the B field, as factor = = 1 / ( 1 / ( a + b * pow(B,c)) + 1 / (d * pow(B, e) ) + 1 / f )
     */
    magneticFluxDensityFactor?: MagneticFluxDensityFactor;
}

/**
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the frequency, as factor = a + b * f + c * pow(f, 2) + d * pow(f, 3) + e * pow(f, 4)
 *
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the frequency, as factor = 1 / (a + b * pow(f, c) ) + d
 */
export interface FrequencyFactor {
    a:  number;
    b:  number;
    c:  number;
    d:  number;
    e?: number;
}

/**
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the H DC bias, as factor = a + b * pow(H, c)
 *
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the H DC bias, as factor = a + b * pow(H, c) + d
 *
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the H DC bias, as factor = 1 / (a + b * pow(H, c))
 */
export interface MagneticFieldDcBiasFactor {
    a:  number;
    b:  number;
    c:  number;
    d?: number;
}

/**
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the B field, as factor = = 1 / ( 1 / ( a + b * pow(B,c)) + 1 / (d * pow(B, e) ) + 1 / f )
 */
export interface MagneticFluxDensityFactor {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
}

export enum InitialPermeabilitModifierMethod {
    FairRite = "fair-rite",
    Magnetics = "magnetics",
    Micrometals = "micrometals",
    Poco = "poco",
    Tdg = "tdg",
}

/**
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the temperature, as factor = a + b * T + c * pow(T, 2) + d * pow(T, 3) + e * pow(T, 4)
 *
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the temperature, as either factor = a * (T -20) * 0.0001 or factor = (a + c * T + e *
 * pow(T, 2)) / (1 + b * T + d * pow(T, 2))
 *
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the temperature, as either factor = a
 */
export interface TemperatureFactor {
    a:  number;
    b?: number;
    c?: number;
    d?: number;
    e?: number;
}

/**
 * Complex relative permeability (mu' + j*mu''), used for high-frequency loss modelling.
 */
export interface ComplexPermeabilityData {
    imaginary: PermeabilityPoint[] | PermeabilityPoint;
    real:      PermeabilityPoint[] | PermeabilityPoint;
}

/**
 * Manufacturer recommended operating conditions for this material
 */
export interface CoreMaterialRecommendations {
    /**
     * Maximum recommended operating frequency in Hz
     */
    maximumFrequency?: number;
    /**
     * Maximum recommended AC flux density, in T
     */
    maximumMagneticFluxDensity?: number;
    /**
     * Maximum recommended operating temperature in Celsius
     */
    maximumOperatingTemperature?: number;
    /**
     * Minimum recommended operating frequency in Hz
     */
    minimumFrequency?: number;
    /**
     * Typical applications per manufacturer
     */
    typicalApplications?: string[];
    /**
     * Recommended converter topologies
     */
    typicalTopologies?: string[];
}

/**
 * The type of a magnetic material
 */
export enum CoreMaterialType {
    Commercial = "commercial",
    Custom = "custom",
}

/**
 * data for describing the volumetric losses at a given point of magnetic flux density,
 * frequency and temperature
 *
 * List of volumetric losses points
 */
export interface VolumetricLossesPoint {
    magneticFluxDensity: OperatingPointExcitation;
    /**
     * Origin of the data (datasheet, measurement, simulation, fitted).
     */
    origin: string;
    /**
     * temperature value, in Celsius
     */
    temperature: number;
    /**
     * Volumetric losses value. Unit: W/m^3.
     */
    value: number;
}

/**
 * Steinmetz coefficients for estimating volumetric losses in a given frequency range. The
 * model is P = k * f^alpha * B^beta. By normative convention in MAS, P is in W/m^3, f in Hz
 * and B in T (peak); k therefore has units of W/(m^3 * Hz^alpha * T^beta). Datasheets that
 * publish coefficients in scaled units (kW/m^3, mW/cm^3, kHz, mT) must be converted before
 * serialisation.
 *
 * Roshen coefficients for estimating volumetric losses
 *
 * Micrometals method for estimating volumetric losses
 *
 * Magnetics method for estimating volumetric losses
 *
 * Poco method for estimating volumetric losses
 *
 * TDG method for estimating volumetric losses
 *
 * Loss factor method for estimating volumetric losses
 */
export interface CoreLossesMethodData {
    /**
     * Name of this method
     */
    method:  VolumetricCoreLossesMethodType;
    ranges?: SteinmetzCoreLossesMethodRangeDatum[];
    /**
     * List of coefficients for taking into account the excess losses and the dependencies of
     * the resistivity
     */
    coefficients?: RoshenAdditionalCoefficients;
    /**
     * List of reference volumetric losses used to estimate excess eddy current losses
     */
    referenceVolumetricLosses?: VolumetricLossesPoint[];
    a?:                         number;
    b?:                         number;
    c?:                         number;
    d?:                         number;
    factors?:                   LossFactorPoint[];
}

/**
 * List of coefficients for taking into account the excess losses and the dependencies of
 * the resistivity
 */
export interface RoshenAdditionalCoefficients {
    excessLossesCoefficient:                   number;
    resistivityFrequencyCoefficient:           number;
    resistivityMagneticFluxDensityCoefficient: number;
    resistivityOffset:                         number;
    resistivityTemperatureCoefficient:         number;
}

/**
 * Data for describing the loss factor at a given frequency and temperature
 */
export interface LossFactorPoint {
    /**
     * Frequency of the field, in Hz
     */
    frequency?: number;
    /**
     * temperature for the value, in Celsius
     */
    temperature?: number;
    /**
     * Loss Factor value
     */
    value: number;
}

export enum VolumetricCoreLossesMethodType {
    LossFactor = "lossFactor",
    Magnetics = "magnetics",
    Micrometals = "micrometals",
    Poco = "poco",
    Roshen = "roshen",
    Steinmetz = "steinmetz",
    Tdg = "tdg",
}

export interface SteinmetzCoreLossesMethodRangeDatum {
    /**
     * frequency power coefficient alpha
     */
    alpha: number;
    /**
     * magnetic flux density power coefficient beta
     */
    beta: number;
    /**
     * Constant temperature coefficient ct0
     */
    ct0?: number;
    /**
     * Proportional negative temperature coefficient ct1
     */
    ct1?: number;
    /**
     * Square temperature coefficient ct2
     */
    ct2?: number;
    /**
     * Proportional coefficient k
     */
    k: number;
    /**
     * maximum frequency for which the coefficients are valid, in Hz
     */
    maximumFrequency?: number;
    /**
     * minimum frequency for which the coefficients are valid, in Hz
     */
    minimumFrequency?: number;
}

/**
 * A shape for the magnetic cores
 */
export interface CoreShape {
    /**
     * Alternative names of a magnetic shape
     */
    aliases?: string[];
    /**
     * The dimensions of a magnetic shape. Keys are the dimension labels defined in IEC 62317
     * (and the modernised IEC 63093 series for planar cores).
     */
    dimensions?: { [key: string]: number | DimensionWithTolerance };
    /**
     * The family of a magnetic shape
     */
    family: CoreShapeFamily;
    /**
     * The subtype of the shape, in case there are more than one
     */
    familySubtype?: string;
    /**
     * Describes if the magnetic circuit of the shape is open, and can be combined with others;
     * or closed, and has to be used by itself
     */
    magneticCircuit?: MagneticCircuit;
    /**
     * The name of a magnetic shape
     */
    name?: string;
    /**
     * The type of a magnetic shape
     */
    type: FunctionalDescriptionType;
}

/**
 * The family of a magnetic shape
 */
export enum CoreShapeFamily {
    C = "c",
    Drum = "drum",
    E = "e",
    Ec = "ec",
    Efd = "efd",
    Ei = "ei",
    El = "el",
    Elp = "elp",
    Ep = "ep",
    Epx = "epx",
    Eq = "eq",
    Er = "er",
    Etd = "etd",
    H = "h",
    Lp = "lp",
    P = "p",
    PlanarE = "planarE",
    PlanarEL = "planarEL",
    PlanarER = "planarER",
    Pm = "pm",
    Pq = "pq",
    Pqi = "pqi",
    Rm = "rm",
    Rod = "rod",
    T = "t",
    U = "u",
    UI = "ui",
    Ur = "ur",
    Ut = "ut",
}

/**
 * Describes if the magnetic circuit of the shape is open, and can be combined with others;
 * or closed, and has to be used by itself
 */
export enum MagneticCircuit {
    Closed = "closed",
    Open = "open",
}

/**
 * The type of core
 */
export enum CoreType {
    ClosedShape = "closedShape",
    PieceAndPlate = "pieceAndPlate",
    Toroidal = "toroidal",
    TwoPieceSet = "twoPieceSet",
}

/**
 * The data from the core based on its geometrical description, in a way that can be used by
 * CAD models.
 *
 * Data describing the a piece of a core
 *
 * Data describing the spacer used to separate cores in additive gaps
 */
export interface CoreGeometricalDescriptionElement {
    /**
     * The coordinates of the top of the piece, referred to the center of the main column
     *
     * The coordinates of the center of the gap, referred to the center of the main column
     */
    coordinates: number[];
    machining?:  Machining[];
    material?:   CoreMaterial | string;
    /**
     * The rotation of the top of the piece from its original state, referred to the center of
     * the main column
     */
    rotation?: number[];
    shape?:    CoreShape | string;
    /**
     * The type of piece
     *
     * The type of spacer
     */
    type: CoreGeometricalDescriptionElementType;
    /**
     * Dimensions of the cube defining the spacer
     */
    dimensions?: number[];
    /**
     * Material of the spacer
     */
    insulationMaterial?: InsulationMaterial | string;
}

/**
 * Data describing the machining applied to a piece
 */
export interface Machining {
    /**
     * The coordinates of the start of the machining, referred to the top of the main column of
     * the piece
     */
    coordinates: number[];
    /**
     * Length of the machining
     */
    length: number;
}

/**
 * The type of piece
 *
 * The type of spacer
 */
export enum CoreGeometricalDescriptionElementType {
    Closed = "closed",
    HalfSet = "halfSet",
    Plate = "plate",
    Sheet = "sheet",
    Spacer = "spacer",
    Toroidal = "toroidal",
}

/**
 * The data from the core after been processed, and ready to use by the analytical models
 */
export interface CoreProcessedDescription {
    /**
     * List of columns in the core
     */
    columns: ColumnElement[];
    /**
     * Total depth of the core
     */
    depth:               number;
    effectiveParameters: EffectiveParameters;
    /**
     * Total height of the core
     */
    height: number;
    /**
     * Parameter describing steady state temperature rise versus dissipated power within a given
     * device.
     */
    thermalResistance?: number;
    /**
     * Total width of the core
     */
    width: number;
    /**
     * List of winding windows, all elements in the list must be of the same type
     */
    windingWindows: WindingWindowElement[];
}

/**
 * Data describing a column of the core
 */
export interface ColumnElement {
    /**
     * Area of the section column, normal to the magnetic flux direction
     */
    area: number;
    /**
     * The coordinates of the center of the column, referred to the center of the main column.
     * In the case of half-sets, the center will be in the top point, where it would join
     * another half-set
     */
    coordinates: number[];
    /**
     * Depth of the column
     */
    depth: number;
    /**
     * Height of the column
     */
    height: number;
    /**
     * Minimum depth of the column, if irregular
     */
    minimumDepth?: number;
    /**
     * Minimum width of the column, if irregular
     */
    minimumWidth?: number;
    shape:         ColumnShape;
    /**
     * Name of the column
     */
    type: ColumnType;
    /**
     * Width of the column
     */
    width: number;
}

/**
 * Name of the column
 */
export enum ColumnType {
    Central = "central",
    Lateral = "lateral",
}

/**
 * Effective data of the magnetic core
 */
export interface EffectiveParameters {
    /**
     * This is the equivalent section that the magnetic flux traverses, because the shape of the
     * core is not uniform and its section changes along the path
     */
    effectiveArea: number;
    /**
     * This is the equivalent length that the magnetic flux travels through the core.
     */
    effectiveLength: number;
    /**
     * This is the product of the effective length by the effective area, and represents the
     * equivalent volume that is magnetized by the field
     */
    effectiveVolume: number;
    /**
     * This is the minimum area seen by the magnetic flux along its path
     */
    minimumArea: number;
}

/**
 * Manufacturer information for the magnetic. Extends the shared manufacturerInfo with a
 * datasheetInfo block for catalogue-level data.
 *
 * Shared manufacturer-info fields. Each component family builds its OWN closed
 * manufacturerInfo by $ref-ing these field definitions (by JSON pointer) and adding its
 * datasheetInfo; families do NOT allOf-extend this (incompatible with
 * additionalProperties:false).
 */
export interface MagneticManufacturerInfo {
    /**
     * All values extracted directly from the component datasheet, organised by domain.
     */
    datasheetInfo?: DatasheetInfo;
    /**
     * URL to manufacturer datasheet
     */
    datasheetUrl?: string;
    /**
     * Description of the part per its manufacturer
     */
    description?: string;
    /**
     * Manufacturer product family / product-line name (e.g. 'CoolMOS C7', 'WE-MAPI').
     */
    family?: string;
    /**
     * Manufacturer name
     */
    name: string;
    /**
     * Manufacturer order code
     */
    orderCode?: string;
    /**
     * Manufacturer part number
     */
    reference?: string;
    /**
     * Manufacturer product series within the family.
     */
    series?: string;
    /**
     * SPICE simulation model for this component
     */
    spiceModel?: { [key: string]: any };
    /**
     * Production status
     */
    status?: Status;
    [property: string]: any;
}

/**
 * All values extracted directly from the component datasheet, organised by domain.
 */
export interface DatasheetInfo {
    /**
     * Application parameters published by the manufacturer — describes the circuit this
     * component was designed for, not the component's intrinsic electrical properties.
     */
    application?: MagneticDatasheetApplication;
    /**
     * Electrical characteristics as stated in the datasheet, one entry per connection
     * configuration. A part with a single configuration has a one-entry array; parts that can
     * be wired several ways (e.g. a multiline suppression bead used as common-mode choke,
     * series inductor, etc.) have one entry per wiring. In each entry the required `subtype`
     * selects the variant, `name` / `numberTurns` describe the configuration, and the remaining
     * fields are the electrical characteristics for that wiring.
     */
    electrical?: MagneticDatasheetElectrical[];
    /**
     * Physical dimensions and mounting style from the datasheet.
     */
    mechanical?: Mechanical;
    /**
     * Circuit model parameters for SPICE simulation, specialised per magnetic subtype. The
     * required `subtype` field selects the variant. Only the chip-bead model is defined so far;
     * transformer / inductor variants can be added to this oneOf.
     */
    model?: MagneticDatasheetChipBeadModel;
    /**
     * Basic part identification from the datasheet.
     */
    part?: Part;
    /**
     * Operating temperature range from the datasheet.
     */
    thermal?: Thermal;
}

/**
 * Application parameters published by the manufacturer — describes the circuit this
 * component was designed for, not the component's intrinsic electrical properties.
 *
 * Application parameters published by the manufacturer in the datasheet. These describe the
 * circuit the component was designed for, not the component's intrinsic electrical
 * properties.
 */
export interface MagneticDatasheetApplication {
    /**
     * Auxiliary winding voltage in Volts.
     */
    auxiliaryVoltage?: number;
    /**
     * Input voltage range for which this component is designed, in Volts.
     */
    inputVoltage?: number | DimensionWithTolerance;
    /**
     * Output currents per secondary winding in Amperes.
     */
    outputCurrents?: number[];
    /**
     * Output voltages per secondary winding in Volts.
     */
    outputVoltages?: number[];
    /**
     * Nominal switching frequency in Hz for which this component is designed.
     */
    switchingFrequency?: number;
}

/**
 * Datasheet electrical characteristics of a single-winding inductor.
 *
 * Datasheet electrical characteristics of a multi-winding coupled inductor.
 *
 * Datasheet electrical characteristics of a transformer.
 *
 * Datasheet electrical characteristics of a common-mode choke.
 *
 * Datasheet electrical characteristics of a chip bead (ferrite bead).
 */
export interface MagneticDatasheetElectrical {
    /**
     * DC resistance in Ohms. nominal = typical value, maximum = datasheet max.
     */
    dcResistance?: DimensionWithTolerance;
    /**
     * Impedance vs. frequency points (RF / high-frequency inductors).
     *
     * Common-mode impedance vs. frequency points.
     *
     * Impedance vs. frequency points, optionally parameterised by DC bias current.
     */
    impedancePoints?: DatasheetImpedancePoint[];
    /**
     * Inductance in Henries, with tolerance.
     *
     * Inductance per winding in Henries, with tolerance.
     *
     * Magnetizing inductance in Henries, with tolerance.
     *
     * Rated common-mode inductance in Henries (the per-line inductance presented to common-mode
     * current). Datasheet-specified for common-mode chokes; distinct from leakageInductance
     * (the differential-mode term).
     */
    inductance?: DimensionWithTolerance;
    /**
     * Inductance vs. DC-bias current points (inductance roll-off / saturation curve),
     * optionally per temperature.
     */
    inductancePoints?: DatasheetInductancePoint[];
    /**
     * Peak / maximum impedance magnitude in Ohms.
     */
    maximumImpedance?: number;
    /**
     * Label of this connection configuration as given in the datasheet (e.g. '4 x current
     * compensated', '4 turns'). Omit for a part with a single configuration.
     */
    name?: string;
    /**
     * Effective number of turns for this connection configuration.
     */
    numberTurns?: number;
    /**
     * Rated DC current, as a single-entry array.
     *
     * Rated DC current per winding (one entry per winding; a single-entry array for a single
     * rated value).
     *
     * Rated DC current per line (one entry per line; a single-entry array for a single rated
     * value).
     *
     * Rated DC current per element (one entry per element of a bead array; a single-entry array
     * for a single bead).
     */
    ratedCurrents?: number[];
    /**
     * Peak saturation current in Amperes (I_sat from datasheet).
     */
    saturationCurrentPeak?: number;
    /**
     * Self-resonant frequency in Hz.
     */
    selfResonantFrequency?: number;
    /**
     * Discriminator selecting this electrical variant.
     */
    subtype: ElectricalSubtype;
    /**
     * Magnetic coupling coefficient k (0-1).
     */
    couplingCoefficient?: number;
    /**
     * DC resistance per winding.
     *
     * DC resistance per line / winding.
     */
    dcResistances?: DimensionWithTolerance[];
    /**
     * Leakage inductance in Henries.
     *
     * Differential-mode (leakage) inductance in Henries.
     */
    leakageInductance?: DimensionWithTolerance;
    /**
     * Turns ratios between the primary and each other winding (primary turns / winding turns),
     * one entry per secondary. Uses the same array-of-dimensionWithTolerance shape as
     * designRequirements.turnsRatios.
     */
    turnsRatios?: DimensionWithTolerance[];
    /**
     * Minimum insulation resistance between windings in Ohms.
     */
    insulationResistance?: number;
    /**
     * Hi-pot / dielectric withstand test voltage (AC RMS) in Volts.
     */
    insulationTestVoltageAC?: number;
    /**
     * Maximum rated AC voltage (RMS) between windings in Volts.
     */
    ratedVoltageAC?: number;
    /**
     * Maximum rated DC voltage between any two terminals in Volts.
     */
    ratedVoltageDC?: number;
    /**
     * Common-mode filter performance figures from the datasheet.
     */
    commonModeFilter?: CommonModeFilter;
    /**
     * Tolerance on the impedance values, expressed as a percentage (e.g. 20 means +/-20%).
     */
    impedanceTolerance?: number;
    /**
     * Number of pulses vs. maximum pulse current points.
     */
    numberPulsesPoints?: DatasheetNumberPulsesPoint[];
    /**
     * Maximum pulse current vs. pulse length points.
     */
    pulsePoints?: DatasheetPulsePoint[];
    /**
     * Reactance vs. frequency points, optionally parameterised by DC bias current.
     */
    reactancePoints?: DatasheetReactancePoint[];
    /**
     * Resistance vs. frequency points, optionally parameterised by DC bias current.
     */
    resistancePoints?: DatasheetResistancePoint[];
}

/**
 * Common-mode filter performance figures from the datasheet.
 *
 * Common-mode filter performance figures.
 */
export interface CommonModeFilter {
    /**
     * Common-mode insertion-loss / attenuation value from the datasheet in dB.
     */
    attenuation?: number;
    /**
     * Test condition string for the attenuation figure (e.g. '100 MHz, 50 Ω').
     */
    attenuationTestCondition?: string;
    /**
     * -3 dB cut-off frequency of the common-mode filter in Hz.
     */
    cutOffFrequency?: number;
}

/**
 * Impedance vs. frequency point from the datasheet, optionally parameterised by DC bias
 * current. The magnitude goes in impedance.magnitude; phase / real / imaginary parts are
 * optional.
 */
export interface DatasheetImpedancePoint {
    /**
     * DC bias current in Amperes at which this point was measured (chip beads / DC-biased
     * parts).
     */
    current?: number;
    /**
     * Frequency in Hz.
     */
    frequency: number;
    /**
     * Impedance value. Uses the same impedancePoint structure as designRequirements.
     */
    impedance: ImpedancePoint;
    /**
     * Winding / array element this point applies to (e.g. element of a bead array). Omit for
     * single-winding parts.
     */
    winding?: string;
}

/**
 * One inductance measurement at a DC-bias current (and optional temperature) — a point on
 * the inductance roll-off / saturation curve.
 */
export interface DatasheetInductancePoint {
    /**
     * DC bias current in Amperes at which this point was measured.
     */
    current?: number;
    /**
     * Inductance in Henries.
     */
    inductance: number;
    /**
     * Measurement temperature in degrees Celsius.
     */
    temperature?: number;
}

/**
 * Number of pulses vs. maximum pulse current point from the datasheet.
 */
export interface DatasheetNumberPulsesPoint {
    /**
     * Number of pulses.
     */
    numberPulses: number;
    /**
     * Pulse current value in Amperes.
     */
    pulseCurrent: number;
    /**
     * Winding / array element this point applies to (e.g. element of a bead array). Omit for
     * single-winding parts.
     */
    winding?: string;
}

/**
 * Maximum pulse current vs. pulse length point from the datasheet.
 */
export interface DatasheetPulsePoint {
    /**
     * Pulse current value in Amperes.
     */
    pulseCurrent: number;
    /**
     * Pulse length in seconds.
     */
    pulseLength: number;
    /**
     * Winding / array element this point applies to (e.g. element of a bead array). Omit for
     * single-winding parts.
     */
    winding?: string;
}

/**
 * Reactance vs. frequency point from the datasheet, optionally parameterised by DC bias
 * current.
 */
export interface DatasheetReactancePoint {
    /**
     * DC bias current in Amperes at which this point was measured.
     */
    current?: number;
    /**
     * Frequency in Hz.
     */
    frequency: number;
    /**
     * Reactance value in Ohms.
     */
    reactance: number;
    /**
     * Winding / array element this point applies to (e.g. element of a bead array). Omit for
     * single-winding parts.
     */
    winding?: string;
}

/**
 * Resistance vs. frequency point from the datasheet, optionally parameterised by DC bias
 * current.
 */
export interface DatasheetResistancePoint {
    /**
     * DC bias current in Amperes at which this point was measured.
     */
    current?: number;
    /**
     * Frequency in Hz.
     */
    frequency: number;
    /**
     * Resistance value in Ohms.
     */
    resistance: number;
    /**
     * Winding / array element this point applies to (e.g. element of a bead array). Omit for
     * single-winding parts.
     */
    winding?: string;
}

export enum ElectricalSubtype {
    ChipBead = "chipBead",
    CommonModeChoke = "commonModeChoke",
    CoupledInductor = "coupledInductor",
    Inductor = "inductor",
    Transformer = "transformer",
}

/**
 * Physical dimensions and mounting style from the datasheet.
 *
 * Physical dimensions and mounting style.
 */
export interface Mechanical {
    /**
     * Assembly type (e.g. 'SMT', 'Through-hole').
     */
    assemblyType?: string;
    /**
     * Body diameter in metres (for cylindrical parts).
     */
    diameter?: DimensionWithTolerance;
    /**
     * Body height in metres.
     */
    height?: DimensionWithTolerance;
    /**
     * Body length in metres.
     */
    length?: DimensionWithTolerance;
    /**
     * PCB mounting style. Uses the same connectionType enum as designRequirements.terminalType.
     */
    mounting?: ConnectionType;
    /**
     * Pin length in metres.
     */
    pinLength?: DimensionWithTolerance;
    /**
     * Body weight in kilograms.
     */
    weight?: DimensionWithTolerance;
    /**
     * Body width in metres.
     */
    width?: DimensionWithTolerance;
}

/**
 * Circuit model parameters for SPICE simulation, specialised per magnetic subtype. The
 * required `subtype` field selects the variant. Only the chip-bead model is defined so far;
 * transformer / inductor variants can be added to this oneOf.
 *
 * Circuit model parameters for SPICE simulation of chip beads (series R in series with a
 * parallel R-L-C).
 */
export interface MagneticDatasheetChipBeadModel {
    /**
     * Parallel capacitance in Farads
     */
    cp: number;
    /**
     * Parallel inductance in Henries
     */
    lp: number;
    /**
     * Parallel resistance in Ohms
     */
    rp: number;
    /**
     * Series resistance in Ohms
     */
    rs?: number;
    /**
     * Discriminator selecting this model variant.
     */
    subtype: ModelSubtype;
}

export enum ModelSubtype {
    ChipBead = "chipBead",
}

/**
 * Basic part identification from the datasheet.
 *
 * Basic part identification.
 */
export interface Part {
    /**
     * True if the part is qualified for automotive applications (AEC-Q200 or equivalent).
     */
    automotive?: boolean;
    /**
     * Case or package code / size reference (e.g. '0805', 'SMD-4P').
     */
    caseCode?: string;
    /**
     * Human-readable product description as given in the datasheet or catalogue.
     */
    description?: string;
    /**
     * Product family or series name (e.g. WE-CMB, WE-CNSW).
     */
    family?: string;
    /**
     * Insulation grade classification as stated in the datasheet (e.g. 'reinforced', 'basic').
     * Aligns with IEC insulationType vocabulary.
     */
    insulationGrade?: IsolationClass;
    /**
     * Internal match / order code used by the manufacturer.
     */
    matchCode?: string;
    /**
     * Core material designation as given in the datasheet (e.g. NiZn, MnZn).
     */
    material?: string;
    /**
     * Total number of electrically independent windings.
     */
    numberOfWindings?: number;
    /**
     * Manufacturer part number.
     */
    partNumber?: string;
    /**
     * True if the component has a shielded construction.
     */
    shielded?: boolean;
    /**
     * Winding construction style (e.g. bifilar, sectional, trifilar).
     */
    windingStyle?: string;
}

/**
 * Operating temperature range from the datasheet.
 *
 * Operating temperature range.
 */
export interface Thermal {
    /**
     * Operating temperature in degrees Celsius.
     */
    operatingTemperature?: DimensionWithTolerance;
    /**
     * Maximum temperature rise above ambient. Unit: K (numerically equivalent to a Celsius
     * difference).
     */
    temperatureRise?: number;
    /**
     * Thermal resistance. Unit: K/W (numerically equivalent to °C/W).
     */
    thermalResistance?: number;
}

/**
 * Optional declaration of which MAS conformance class this document targets. Class A —
 * Inductor Basic. Class B — Transformer (multi-winding, insulation, isolated topologies).
 * Class C — Full (all schemas, all topologies). See docs/conformance.md and
 * schemas/conformance/.
 */
export enum MASConformance {
    A = "A",
    B = "B",
    C = "C",
}

/**
 * The description of the outputs that result of simulating a Magnetic
 */
export interface Outputs {
    /**
     * Data describing the output core losses
     */
    coreLosses?: CoreLossesOutput;
    /**
     * Data describing the output impedance
     */
    impedance?: ImpedanceOutput;
    /**
     * Data describing the output inductance
     */
    inductance?: InductanceOutput;
    /**
     * Data describing the output insulation that the magnetic has
     */
    insulation?:             DielectricVoltage[];
    insulationCoordination?: InsulationCoordination;
    /**
     * Data describing the output stray capacitance
     */
    strayCapacitance?: StrayCapacitanceOutput[];
    /**
     * Data describing the output temperature
     */
    temperature?: TemperatureOutput;
    /**
     * Data describing the output winding losses
     */
    windingLosses?: WindingLossesOutput;
    /**
     * Data describing the output current density field
     */
    windingWindowCurrentDensityField?: WindingWindowCurrentDensityFieldOutput;
    /**
     * Data describing the output current field
     */
    windingWindowCurrentField?: WindingWindowCurrentFieldOutput;
    /**
     * Data describing the output magnetic strength field
     */
    windingWindowMagneticStrengthField?: WindingWindowMagneticStrengthFieldOutput;
}

/**
 * Data describing the output core losses
 *
 * Data describing the core losses and the intermediate inputs used to calculate them
 */
export interface CoreLossesOutput {
    /**
     * Total core losses. Unit: W.
     */
    coreLosses: number;
    /**
     * Part of the core losses due to eddy currents. Unit: W.
     */
    eddyCurrentCoreLosses?: number;
    /**
     * Part of the core losses due to hysteresis. Unit: W.
     */
    hysteresisCoreLosses?: number;
    /**
     * Excitation of the B field that produced the core losses
     */
    magneticFluxDensity?: SignalDescriptor;
    /**
     * Mass-specific value of the core losses. Unit: W/kg.
     */
    massLosses?: number;
    /**
     * Model used to calculate the core losses in the case of simulation, or method used to
     * measure it
     */
    methodUsed: string;
    origin:     ResultOrigin;
    /**
     * temperature in the core that produced the core losses
     */
    temperature: number;
    /**
     * Volumetric value of the core losses. Unit: W/m^3.
     */
    volumetricLosses?: number;
}

/**
 * Origin of the value of an output result. Mirror of MAS
 * schemas/outputs.json#/$defs/resultOrigin.
 *
 * Origin of the value of the result
 */
export enum ResultOrigin {
    Manufacturer = "manufacturer",
    Measurement = "measurement",
    Simulation = "simulation",
}

/**
 * Data describing the output impedance
 *
 * Data describing the impedance and the intermediate inputs used to calculate it
 */
export interface ImpedanceOutput {
    /**
     * List of impedance matrix per frequency
     */
    impedanceMatrix?: ComplexMatrixAtFrequency[];
    /**
     * List of inductance matrix per frequency
     */
    inductanceMatrix: ScalarMatrixAtFrequency[];
    /**
     * Model used to calculate the impedance in the case of simulation, or method used to
     * measure it
     */
    methodUsed: string;
    origin:     ResultOrigin;
    /**
     * List of resistance matrix per frequency
     */
    resistanceMatrix: ScalarMatrixAtFrequency[];
}

export interface ComplexMatrixAtFrequency {
    /**
     * Frequency of the matrix
     */
    frequency: number;
    magnitude: { [key: string]: { [key: string]: DimensionWithTolerance } };
    phase:     { [key: string]: { [key: string]: DimensionWithTolerance } };
}

export interface ScalarMatrixAtFrequency {
    /**
     * Frequency of the matrix
     */
    frequency: number;
    magnitude: { [key: string]: { [key: string]: DimensionWithTolerance } };
}

/**
 * Data describing the output inductance
 *
 * Data describing the inductance
 */
export interface InductanceOutput {
    /**
     * List of coupling coefficients matrix per frequency
     */
    couplingCoefficientsMatrix?: ScalarMatrixAtFrequency[];
    /**
     * List of inductance matrix per frequency
     */
    inductanceMatrix?:     ScalarMatrixAtFrequency[];
    leakageInductance?:    LeakageInductanceOutput;
    magnetizingInductance: MagnetizingInductanceOutput;
}

/**
 * Data describing the leakage inductance and the intermediate inputs used to calculate them
 */
export interface LeakageInductanceOutput {
    leakageInductancePerWinding: DimensionWithTolerance[];
    /**
     * Model used to calculate the leakage inductance in the case of simulation, or method used
     * to measure it
     */
    methodUsed: string;
    origin:     ResultOrigin;
}

/**
 * Data describing the magnetizing inductance and the intermediate inputs used to calculate
 * them
 */
export interface MagnetizingInductanceOutput {
    /**
     * Value of the reluctance of the core
     */
    coreReluctance: number;
    /**
     * Value of the reluctance of the gaps
     */
    gappingReluctance?: number;
    /**
     * Value of the magnetizing inductance. Unit: H. The operating point at which this value
     * applies (frequency, AC test amplitude, DC bias, temperature) is recorded in the optional
     * `measurementCondition` block; if absent, small-signal at 0 A DC bias and the ambient
     * temperature of the operating point is assumed.
     */
    magnetizingInductance: DimensionWithTolerance;
    /**
     * Maximum value of the fringing of the gaps
     */
    maximumFringingFactor?: number;
    /**
     * Value of the maximum magnetic energy storable in the core
     */
    maximumMagneticEnergyCore?: number;
    /**
     * Value of the maximum magnetic energy storable in the gaps
     */
    maximumStorableMagneticEnergyGapping?: number;
    /**
     * Operating point at which `magnetizingInductance` was measured or computed. All fields
     * optional; absence implies the conventional small-signal default. See
     * docs/normative-references.md.
     */
    measurementCondition?: InductanceMeasurementCondition;
    /**
     * Model used to calculate the magnetizing inductance in the case of simulation, or method
     * used to measure it
     */
    methodUsed: string;
    origin:     ResultOrigin;
    /**
     * Reluctance per gap in the magnetic core
     */
    reluctancePerGap?: AirGapReluctanceOutput[];
    /**
     * Value of the reluctance of the core
     */
    ungappedCoreReluctance?: number;
}

/**
 * Operating point at which `magnetizingInductance` was measured or computed. All fields
 * optional; absence implies the conventional small-signal default. See
 * docs/normative-references.md.
 */
export interface InductanceMeasurementCondition {
    /**
     * RMS test current through the winding. Unit: A.
     */
    currentRms?: number;
    /**
     * DC bias current through the winding at which this inductance was measured. Unit: A.
     */
    dcBiasCurrent?: number;
    /**
     * Test frequency. Unit: Hz.
     */
    frequency?: number;
    /**
     * Temperature at which this inductance was measured. Unit: Celsius.
     */
    temperature?: number;
    /**
     * RMS test voltage applied across the winding (small-signal characterisation). Unit: V.
     */
    voltageRms?: number;
}

/**
 * Data describing the reluctance of an air gap
 */
export interface AirGapReluctanceOutput {
    /**
     * Value of the Fringing Factor
     */
    fringingFactor: number;
    /**
     * Value of the maximum magnetic energy storable in the gap
     */
    maximumStorableMagneticEnergy: number;
    /**
     * Model used to calculate the magnetizing inductance in the case of simulation, or method
     * used to measure it
     */
    methodUsed: string;
    origin:     ResultOrigin;
    /**
     * Value of the reluctance of the gap
     */
    reluctance: number;
}

/**
 * Data describing the output insulation that the magnetic has
 *
 * List of voltages that the magnetic can withstand
 */
export interface DielectricVoltage {
    /**
     * Duration of the voltage test, or undefined if the field is not present
     */
    duration?: number;
    /**
     * Model used to calculate the voltage in the case of simulation, or method used to measure
     * it
     */
    methodUsed?: string;
    /**
     * Origin of the value of the result
     */
    origin: ResultOrigin;
    /**
     * Voltage that the magnetic withstands
     */
    voltage: number;
    /**
     * Type of the voltage
     */
    voltageType: VoltageType;
}

/**
 * Type of the voltage
 *
 * Type of the voltage.
 */
export enum VoltageType {
    AC = "AC",
    Dc = "DC",
}

/**
 * Required clearance / creepage / distance-through-insulation and withstand-voltage figures
 * for a component. Mirror of MAS schemas/outputs.json#/$defs/insulationCoordination so
 * safety / EMC capacitors and isolated semiconductors can use the same shape.
 */
export interface InsulationCoordination {
    /**
     * Clearance required for this component, in m
     */
    clearance: number;
    /**
     * Creepage distance required for this component, in m
     */
    creepageDistance: number;
    /**
     * Distance through insulation required for this component, in m
     */
    distanceThroughInsulation: number;
    /**
     * Voltage that the component withstands, in V
     */
    withstandVoltage: number;
    /**
     * Duration of the voltage test, in s. Absent if the test specification does not require a
     * fixed duration.
     */
    withstandVoltageDuration?: number;
    /**
     * Type of the voltage.
     */
    withstandVoltageType?: VoltageType;
}

/**
 * Data describing the output stray capacitance
 *
 * Data describing the stray capacitance and the intermediate inputs used to calculate them
 */
export interface StrayCapacitanceOutput {
    /**
     * Capacitance among all pair of adjacent turns
     */
    capacitanceAmongTurns?: { [key: string]: { [key: string]: number } };
    /**
     * Capacitance among all windings
     */
    capacitanceAmongWindings?: { [key: string]: { [key: string]: number } };
    /**
     * List of capacitance matrix per frequency
     */
    capacitanceMatrix?: { [key: string]: { [key: string]: ScalarMatrixAtFrequency } };
    /**
     * Electric energy among all pair of adjacent turns
     */
    electricEnergyAmongTurns?: { [key: string]: { [key: string]: number } };
    /**
     * List of Maxwell capacitance matrix per frequency
     */
    maxwellCapacitanceMatrix?: ScalarMatrixAtFrequency[];
    /**
     * Model used to calculate the stray capacitance in the case of simulation, or method used
     * to measure it
     */
    methodUsed: string;
    /**
     * Origin of the value of the result
     */
    origin: ResultOrigin;
    /**
     * Network of six equivalent capacitors that describe the capacitance between two given
     * windings
     */
    sixCapacitorNetworkPerWinding?: { [key: string]: { [key: string]: SixCapacitorNetworkPerWinding } };
    /**
     * The three values of a three input electrostatic multipole that describe the capacitance
     * between two given windings
     */
    tripoleCapacitancePerWinding?: { [key: string]: { [key: string]: TripoleCapacitancePerWinding } };
    /**
     * Voltage divider at the end of the physical turn
     */
    voltageDividerEndPerTurn?: number[];
    /**
     * Voltage divider at the start of the physical turn
     */
    voltageDividerStartPerTurn?: number[];
    /**
     * Voltage drop among all pair of adjacent turns
     */
    voltageDropAmongTurns?: { [key: string]: { [key: string]: number } };
    /**
     * Voltage at the beginning of the physical turn
     */
    voltagePerTurn?: number[];
    [property: string]: any;
}

export interface SixCapacitorNetworkPerWinding {
    C1: number;
    C2: number;
    C3: number;
    C4: number;
    C5: number;
    C6: number;
}

export interface TripoleCapacitancePerWinding {
    C1: number;
    C2: number;
    C3: number;
}

/**
 * Data describing the output temperature
 *
 * Data describing the temperature and the intermediate inputs used to calculate them
 */
export interface TemperatureOutput {
    /**
     * Bulk thermal resistance of the whole magnetic. Unit: K/W.
     */
    bulkThermalResistance?: number;
    /**
     * Temperature of the magnetic before it started working. If missing ambient temperature
     * must be assumed
     */
    initialTemperature?: number;
    /**
     * maximum temperature reached
     */
    maximumTemperature: number;
    /**
     * Model used to calculate the temperature in the case of simulation, or method used to
     * measure it
     */
    methodUsed:        string;
    origin:            ResultOrigin;
    temperaturePoint?: TemperaturePoint;
}

export interface TemperaturePoint {
    /**
     * The coordinates of the temperature point, referred to the center of the main column
     */
    coordinates: number[];
    /**
     * temperature at the point, in Celsius
     */
    value: number;
}

/**
 * Data describing the output winding losses
 *
 * Data describing the winding losses and the intermediate inputs used to calculate them
 */
export interface WindingLossesOutput {
    /**
     * Excitation of the current per physical turn that produced the winding losses
     */
    currentDividerPerTurn?: number[];
    /**
     * Excitation of the current per winding that produced the winding losses.
     */
    currentPerWinding?: OperatingPoint;
    /**
     * List of DC resistance per turn
     */
    dcResistancePerTurn?: number[];
    /**
     * List of DC resistance per winding
     */
    dcResistancePerWinding?: number[];
    /**
     * Model used to calculate the winding losses in the case of simulation, or method used to
     * measure it
     */
    methodUsed: string;
    origin:     ResultOrigin;
    /**
     * List of resistance matrix per frequency
     */
    resistanceMatrix?: ScalarMatrixAtFrequency[];
    /**
     * temperature in the winding that produced the winding losses
     */
    temperature?: number;
    /**
     * Value of the winding losses
     */
    windingLosses:            number;
    windingLossesPerLayer?:   WindingLossesPerElement[];
    windingLossesPerSection?: WindingLossesPerElement[];
    windingLossesPerTurn?:    WindingLossesPerElement[];
    windingLossesPerWinding?: WindingLossesPerElement[];
}

export interface WindingLossesPerElement {
    /**
     * Name of the element
     */
    name?: string;
    /**
     * List of value of the winding ohmic losses
     */
    ohmicLosses?: OhmicLosses;
    /**
     * List of value of the winding proximity losses per harmonic
     */
    proximityEffectLosses?: LossElementPerHarmonic;
    /**
     * List of value of the winding skin losses per harmonic
     */
    skinEffectLosses?: LossElementPerHarmonic;
}

/**
 * List of value of the winding ohmic losses
 */
export interface OhmicLosses {
    /**
     * Value of the losses
     */
    losses: number;
    /**
     * Model used to calculate the magnetizing inductance in the case of simulation, or method
     * used to measure it
     */
    methodUsed?: string;
    /**
     * Origin of the value of the result
     */
    origin: ResultOrigin;
}

/**
 * List of value of the winding proximity losses per harmonic
 *
 * List of value of the winding skin losses per harmonic
 *
 * Loss spectrum: a list of losses paired with the harmonic frequencies that produced them.
 * Useful when the loss mechanism is frequency-selective (skin effect, proximity effect,
 * dielectric loss, ESR vs. frequency). Generalisation of MAS
 * schemas/outputs.json#/$defs/windingLossElementPerHarmonic — same shape but
 * family-agnostic name.
 *
 * Provenance shell that wraps every output result block in MAS / CAS / RAS / SAS. Each
 * per-domain output schema does allOf [outputBase, domain-specific] so every result records
 * where its value came from (manufacturer datasheet, lab measurement, or simulation) and
 * which model or method produced it. Mirrors the implicit {origin, methodUsed} pattern
 * present on every output $def in MAS schemas/outputs.json.
 */
export interface LossElementPerHarmonic {
    /**
     * Model name used to compute the result (in case of simulation), or the test method used to
     * measure it (in case of measurement), or the datasheet section it was extracted from (in
     * case of manufacturer).
     */
    methodUsed: string;
    origin:     ResultOrigin;
    /**
     * Frequencies of the harmonics that are producing losses, in Hz.
     */
    harmonicFrequencies: number[];
    /**
     * Losses produced by each harmonic, in W. Index-aligned with harmonicFrequencies.
     */
    lossesPerHarmonic: number[];
    [property: string]: any;
}

/**
 * Data describing the output current density field
 *
 * Data describing the current in the different chunks used in field calculation
 */
export interface WindingWindowCurrentDensityFieldOutput {
    fieldPerFrequency: Field[];
    /**
     * Model used to calculate the current field
     */
    methodUsed: string;
    origin:     ResultOrigin;
    wires:      Array<Wire | string>;
}

/**
 * Data describing a field in a 2D or 3D space
 */
export interface Field {
    /**
     * Value of the magnetizing inductance
     */
    data: FieldPoint[];
    /**
     * Value of the field at this point
     */
    frequency: number;
}

/**
 * Data describing the value of a field in a 2D or 3D space
 */
export interface FieldPoint {
    /**
     * If this point has some special significance, can be identified with this label
     */
    label?: string;
    /**
     * The coordinates of the point of the field
     */
    point: number[];
    /**
     * Rotation of the rectangle defining the turn, in degrees
     */
    rotation?: number;
    /**
     * If this field point is inside of a wire, this is the index of the turn
     */
    turnIndex?: number;
    /**
     * If this field point is inside of a wire, this is the length of the turn
     */
    turnLength?: number;
    /**
     * Value of the field at this point.
     */
    value: number;
}

/**
 * Data describing the output current field
 *
 * Data describing the current in the different chunks used in field calculation
 */
export interface WindingWindowCurrentFieldOutput {
    fieldPerFrequency: Field[];
    /**
     * Model used to calculate the current field
     */
    methodUsed: string;
    origin:     ResultOrigin;
}

/**
 * Data describing the output magnetic strength field
 */
export interface WindingWindowMagneticStrengthFieldOutput {
    fieldPerFrequency: ComplexField[];
    /**
     * Model used to calculate the magnetic strength field
     */
    methodUsed: string;
    origin:     ResultOrigin;
}

/**
 * Data describing a field in a 2D or 3D space
 */
export interface ComplexField {
    /**
     * Value of the magnetizing inductance
     */
    data: ComplexFieldPoint[];
    /**
     * Value of the field at this point
     */
    frequency: number;
}

/**
 * Data describing the complex value of a field in a 2D or 3D space
 */
export interface ComplexFieldPoint {
    /**
     * Imaginary value of the field at this point.
     */
    imaginary: number;
    /**
     * If this point has some special significance, can be identified with this label
     */
    label?: string;
    /**
     * The coordinates of the point of the field
     */
    point: number[];
    /**
     * Real value of the field at this point
     */
    real: number;
    /**
     * If this field point is inside of a wire, this is the index of the turn
     */
    turnIndex?: number;
    /**
     * If this field point is inside of a wire, this is the length of the turn
     */
    turnLength?: number;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toMas(json: string): Mas {
        return cast(JSON.parse(json), r("Mas"));
    }

    public static masToJson(value: Mas): string {
        return JSON.stringify(uncast(value, r("Mas")), null, 2);
    }

    public static toInputs(json: string): Inputs {
        return cast(JSON.parse(json), r("Inputs"));
    }

    public static toMagnetic(json: string): Magnetic {
        return cast(JSON.parse(json), r("Magnetic"));
    }

    public static toCoil(json: string): Coil {
        return cast(JSON.parse(json), r("Coil"));
    }

    public static toWire(json: string): Wire {
        return cast(JSON.parse(json), r("Wire"));
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "Mas": o([
        { json: "inputs", js: "inputs", typ: r("Inputs") },
        { json: "magnetic", js: "magnetic", typ: r("Magnetic") },
        { json: "masConformance", js: "masConformance", typ: u(undefined, r("MASConformance")) },
        { json: "masVersion", js: "masVersion", typ: u(undefined, "") },
        { json: "outputs", js: "outputs", typ: a(r("Outputs")) },
    ], false),
    "Inputs": o([
        { json: "converterInformation", js: "converterInformation", typ: u(undefined, r("ConverterInformation")) },
        { json: "designRequirements", js: "designRequirements", typ: r("DesignRequirements") },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("OperatingPoint")) },
    ], false),
    "ConverterInformation": o([
        { json: "supportedTopologies", js: "supportedTopologies", typ: u(undefined, r("SupportedTopologies")) },
    ], false),
    "SupportedTopologies": o([
        { json: "asymmetricHalfBridge", js: "asymmetricHalfBridge", typ: u(undefined, r("AsymmetricHalfBridge")) },
        { json: "boost", js: "boost", typ: u(undefined, r("Boost")) },
        { json: "buck", js: "buck", typ: u(undefined, r("Buck")) },
        { json: "cllcResonant", js: "cllcResonant", typ: u(undefined, r("CllcResonant")) },
        { json: "clllcResonant", js: "clllcResonant", typ: u(undefined, r("ClllcResonant")) },
        { json: "commonModeChoke", js: "commonModeChoke", typ: u(undefined, r("CommonModeChoke")) },
        { json: "cuk", js: "cuk", typ: u(undefined, r("Cuk")) },
        { json: "currentTransformer", js: "currentTransformer", typ: u(undefined, r("CurrentTransformer")) },
        { json: "differentialModeChoke", js: "differentialModeChoke", typ: u(undefined, r("DifferentialModeChoke")) },
        { json: "dualActiveBridge", js: "dualActiveBridge", typ: u(undefined, r("DualActiveBridge")) },
        { json: "flyback", js: "flyback", typ: u(undefined, r("Flyback")) },
        { json: "forward", js: "forward", typ: u(undefined, r("Forward")) },
        { json: "fourSwitchBuckBoost", js: "fourSwitchBuckBoost", typ: u(undefined, r("FourSwitchBuckBoost")) },
        { json: "isolatedBuck", js: "isolatedBuck", typ: u(undefined, r("IsolatedBuck")) },
        { json: "isolatedBuckBoost", js: "isolatedBuckBoost", typ: u(undefined, r("IsolatedBuckBoost")) },
        { json: "llcResonant", js: "llcResonant", typ: u(undefined, r("LlcResonant")) },
        { json: "phaseShiftedFullBridge", js: "phaseShiftedFullBridge", typ: u(undefined, r("PhaseShiftedFullBridge")) },
        { json: "phaseShiftedHalfBridge", js: "phaseShiftedHalfBridge", typ: u(undefined, r("PhaseShiftedHalfBridge")) },
        { json: "powerFactorCorrection", js: "powerFactorCorrection", typ: u(undefined, r("PowerFactorCorrection")) },
        { json: "pushPull", js: "pushPull", typ: u(undefined, r("PushPull")) },
        { json: "sepic", js: "sepic", typ: u(undefined, r("Sepic")) },
        { json: "seriesResonant", js: "seriesResonant", typ: u(undefined, r("SeriesResonant")) },
        { json: "viennaRectifier", js: "viennaRectifier", typ: u(undefined, r("ViennaRectifier")) },
        { json: "weinberg", js: "weinberg", typ: u(undefined, r("Weinberg")) },
        { json: "zeta", js: "zeta", typ: u(undefined, r("Zeta")) },
    ], false),
    "AsymmetricHalfBridge": o([
        { json: "dcBlockingCapacitance", js: "dcBlockingCapacitance", typ: u(undefined, 3.14) },
        { json: "diodeVoltageDrop", js: "diodeVoltageDrop", typ: u(undefined, 3.14) },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "inputVoltageStepRange", js: "inputVoltageStepRange", typ: u(undefined, 3.14) },
        { json: "leakageInductance", js: "leakageInductance", typ: u(undefined, 3.14) },
        { json: "magnetizingInductance", js: "magnetizingInductance", typ: u(undefined, 3.14) },
        { json: "maximumDutyCycle", js: "maximumDutyCycle", typ: u(undefined, 3.14) },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("AhbOperatingPoint")) },
        { json: "outputInductance", js: "outputInductance", typ: u(undefined, 3.14) },
        { json: "rectifierType", js: "rectifierType", typ: u(undefined, r("AhbRectifierType")) },
        { json: "useLeakageInductance", js: "useLeakageInductance", typ: u(undefined, true) },
    ], false),
    "DimensionWithTolerance": o([
        { json: "excludeMaximum", js: "excludeMaximum", typ: u(undefined, true) },
        { json: "excludeMinimum", js: "excludeMinimum", typ: u(undefined, true) },
        { json: "maximum", js: "maximum", typ: u(undefined, 3.14) },
        { json: "minimum", js: "minimum", typ: u(undefined, 3.14) },
        { json: "nominal", js: "nominal", typ: u(undefined, 3.14) },
        { json: "unit", js: "unit", typ: u(undefined, "") },
    ], "any"),
    "AhbOperatingPoint": o([
        { json: "dutyCycle", js: "dutyCycle", typ: 3.14 },
        { json: "ambientTemperature", js: "ambientTemperature", typ: 3.14 },
        { json: "outputCurrents", js: "outputCurrents", typ: a(3.14) },
        { json: "outputCurrentsType", js: "outputCurrentsType", typ: u(undefined, r("OutputSType")) },
        { json: "outputVoltages", js: "outputVoltages", typ: a(3.14) },
        { json: "outputVoltagesType", js: "outputVoltagesType", typ: u(undefined, r("OutputSType")) },
        { json: "switchingFrequency", js: "switchingFrequency", typ: 3.14 },
    ], "any"),
    "Boost": o([
        { json: "currentRippleRatio", js: "currentRippleRatio", typ: u(undefined, 3.14) },
        { json: "diodeVoltageDrop", js: "diodeVoltageDrop", typ: 3.14 },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "maximumSwitchCurrent", js: "maximumSwitchCurrent", typ: u(undefined, 3.14) },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("TopologyExcitation")) },
    ], false),
    "TopologyExcitation": o([
        { json: "ambientTemperature", js: "ambientTemperature", typ: 3.14 },
        { json: "outputCurrents", js: "outputCurrents", typ: a(3.14) },
        { json: "outputCurrentsType", js: "outputCurrentsType", typ: u(undefined, r("OutputSType")) },
        { json: "outputVoltages", js: "outputVoltages", typ: a(3.14) },
        { json: "outputVoltagesType", js: "outputVoltagesType", typ: u(undefined, r("OutputSType")) },
        { json: "switchingFrequency", js: "switchingFrequency", typ: 3.14 },
    ], "any"),
    "Buck": o([
        { json: "currentRippleRatio", js: "currentRippleRatio", typ: u(undefined, 3.14) },
        { json: "diodeVoltageDrop", js: "diodeVoltageDrop", typ: 3.14 },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "maximumSwitchCurrent", js: "maximumSwitchCurrent", typ: u(undefined, 3.14) },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("TopologyExcitation")) },
    ], false),
    "CllcResonant": o([
        { json: "bidirectional", js: "bidirectional", typ: u(undefined, true) },
        { json: "bridgeType", js: "bridgeType", typ: u(undefined, r("LlcBridgeType")) },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "integratedResonantInductor1", js: "integratedResonantInductor1", typ: u(undefined, true) },
        { json: "integratedResonantInductor2", js: "integratedResonantInductor2", typ: u(undefined, true) },
        { json: "maxSwitchingFrequency", js: "maxSwitchingFrequency", typ: 3.14 },
        { json: "minSwitchingFrequency", js: "minSwitchingFrequency", typ: 3.14 },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("CllcOperatingPoint")) },
        { json: "qualityFactor", js: "qualityFactor", typ: u(undefined, 3.14) },
        { json: "resonantCapacitorRatio", js: "resonantCapacitorRatio", typ: u(undefined, 3.14) },
        { json: "resonantInductorRatio", js: "resonantInductorRatio", typ: u(undefined, 3.14) },
        { json: "symmetricDesign", js: "symmetricDesign", typ: u(undefined, true) },
    ], false),
    "CllcOperatingPoint": o([
        { json: "powerFlow", js: "powerFlow", typ: r("PowerFlowDirection") },
        { json: "ambientTemperature", js: "ambientTemperature", typ: 3.14 },
        { json: "outputCurrents", js: "outputCurrents", typ: a(3.14) },
        { json: "outputCurrentsType", js: "outputCurrentsType", typ: u(undefined, r("OutputSType")) },
        { json: "outputVoltages", js: "outputVoltages", typ: a(3.14) },
        { json: "outputVoltagesType", js: "outputVoltagesType", typ: u(undefined, r("OutputSType")) },
        { json: "switchingFrequency", js: "switchingFrequency", typ: 3.14 },
    ], "any"),
    "ClllcResonant": o([
        { json: "bridgeTypePrimary", js: "bridgeTypePrimary", typ: u(undefined, r("LlcBridgeType")) },
        { json: "bridgeTypeSecondary", js: "bridgeTypeSecondary", typ: u(undefined, r("LlcBridgeType")) },
        { json: "controlStrategy", js: "controlStrategy", typ: u(undefined, r("ClllcControlStrategy")) },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "highVoltageBusVoltage", js: "highVoltageBusVoltage", typ: r("DimensionWithTolerance") },
        { json: "inductanceRatioK", js: "inductanceRatioK", typ: u(undefined, 3.14) },
        { json: "integratedResonantInductors", js: "integratedResonantInductors", typ: u(undefined, true) },
        { json: "lowVoltageBusVoltage", js: "lowVoltageBusVoltage", typ: r("DimensionWithTolerance") },
        { json: "maxSwitchingFrequency", js: "maxSwitchingFrequency", typ: 3.14 },
        { json: "minSwitchingFrequency", js: "minSwitchingFrequency", typ: 3.14 },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("ClllcOperatingPoint")) },
        { json: "primaryResonantCapacitance", js: "primaryResonantCapacitance", typ: u(undefined, 3.14) },
        { json: "primaryResonantFrequency", js: "primaryResonantFrequency", typ: u(undefined, 3.14) },
        { json: "primarySeriesInductance", js: "primarySeriesInductance", typ: u(undefined, 3.14) },
        { json: "qualityFactor", js: "qualityFactor", typ: u(undefined, 3.14) },
        { json: "tankSymmetryRatio", js: "tankSymmetryRatio", typ: u(undefined, 3.14) },
    ], false),
    "ClllcOperatingPoint": o([
        { json: "phaseShiftDegrees", js: "phaseShiftDegrees", typ: u(undefined, 3.14) },
        { json: "powerFlowDirection", js: "powerFlowDirection", typ: u(undefined, r("PowerFlowDirection")) },
        { json: "ambientTemperature", js: "ambientTemperature", typ: 3.14 },
        { json: "outputCurrents", js: "outputCurrents", typ: a(3.14) },
        { json: "outputCurrentsType", js: "outputCurrentsType", typ: u(undefined, r("OutputSType")) },
        { json: "outputVoltages", js: "outputVoltages", typ: a(3.14) },
        { json: "outputVoltagesType", js: "outputVoltagesType", typ: u(undefined, r("OutputSType")) },
        { json: "switchingFrequency", js: "switchingFrequency", typ: 3.14 },
    ], "any"),
    "CommonModeChoke": o([
        { json: "ambientTemperature", js: "ambientTemperature", typ: 3.14 },
        { json: "lineFrequency", js: "lineFrequency", typ: 3.14 },
        { json: "lineImpedance", js: "lineImpedance", typ: u(undefined, 3.14) },
        { json: "maximumDcResistance", js: "maximumDcResistance", typ: u(undefined, 3.14) },
        { json: "maximumLeakageInductance", js: "maximumLeakageInductance", typ: u(undefined, 3.14) },
        { json: "minimumImpedance", js: "minimumImpedance", typ: a(r("ImpedanceAtFrequency")) },
        { json: "operatingCurrent", js: "operatingCurrent", typ: 3.14 },
        { json: "operatingVoltage", js: "operatingVoltage", typ: r("DimensionWithTolerance") },
        { json: "targetInsertionLoss", js: "targetInsertionLoss", typ: u(undefined, a(r("InsertionLossAtFrequency"))) },
    ], false),
    "ImpedanceAtFrequency": o([
        { json: "frequency", js: "frequency", typ: 3.14 },
        { json: "impedance", js: "impedance", typ: r("ImpedancePoint") },
    ], false),
    "ImpedancePoint": o([
        { json: "imaginaryPart", js: "imaginaryPart", typ: u(undefined, 3.14) },
        { json: "magnitude", js: "magnitude", typ: 3.14 },
        { json: "phase", js: "phase", typ: u(undefined, 3.14) },
        { json: "realPart", js: "realPart", typ: u(undefined, 3.14) },
    ], false),
    "InsertionLossAtFrequency": o([
        { json: "frequency", js: "frequency", typ: 3.14 },
        { json: "insertionLoss", js: "insertionLoss", typ: 3.14 },
    ], false),
    "Cuk": o([
        { json: "bidirectional", js: "bidirectional", typ: u(undefined, true) },
        { json: "coupledInductor", js: "coupledInductor", typ: u(undefined, true) },
        { json: "couplingCapacitanceSecondary", js: "couplingCapacitanceSecondary", typ: u(undefined, 3.14) },
        { json: "couplingCoefficient", js: "couplingCoefficient", typ: u(undefined, 3.14) },
        { json: "currentRippleRatio", js: "currentRippleRatio", typ: u(undefined, 3.14) },
        { json: "diodeVoltageDrop", js: "diodeVoltageDrop", typ: 3.14 },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "isolated", js: "isolated", typ: u(undefined, true) },
        { json: "maximumSwitchCurrent", js: "maximumSwitchCurrent", typ: u(undefined, 3.14) },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("CukOperatingPoint")) },
        { json: "synchronous", js: "synchronous", typ: u(undefined, true) },
        { json: "turnsRatio", js: "turnsRatio", typ: u(undefined, 3.14) },
    ], false),
    "CukOperatingPoint": o([
        { json: "powerFlow", js: "powerFlow", typ: u(undefined, r("PowerFlowDirection")) },
        { json: "ambientTemperature", js: "ambientTemperature", typ: 3.14 },
        { json: "outputCurrents", js: "outputCurrents", typ: a(3.14) },
        { json: "outputCurrentsType", js: "outputCurrentsType", typ: u(undefined, r("OutputSType")) },
        { json: "outputVoltages", js: "outputVoltages", typ: a(3.14) },
        { json: "outputVoltagesType", js: "outputVoltagesType", typ: u(undefined, r("OutputSType")) },
        { json: "switchingFrequency", js: "switchingFrequency", typ: 3.14 },
    ], "any"),
    "CurrentTransformer": o([
        { json: "ambientTemperature", js: "ambientTemperature", typ: 3.14 },
        { json: "burdenResistor", js: "burdenResistor", typ: 3.14 },
        { json: "diodeVoltageDrop", js: "diodeVoltageDrop", typ: 3.14 },
        { json: "frequency", js: "frequency", typ: 3.14 },
        { json: "maximumDutyCycle", js: "maximumDutyCycle", typ: 3.14 },
        { json: "maximumPrimaryCurrentPeak", js: "maximumPrimaryCurrentPeak", typ: 3.14 },
        { json: "waveformLabel", js: "waveformLabel", typ: r("WaveformLabel") },
    ], false),
    "DifferentialModeChoke": o([
        { json: "ambientTemperature", js: "ambientTemperature", typ: 3.14 },
        { json: "configuration", js: "configuration", typ: u(undefined, r("Configuration")) },
        { json: "filterCapacitance", js: "filterCapacitance", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "lineFrequency", js: "lineFrequency", typ: 3.14 },
        { json: "maximumCoreTemperatureRise", js: "maximumCoreTemperatureRise", typ: u(undefined, 3.14) },
        { json: "maximumDcResistance", js: "maximumDcResistance", typ: u(undefined, 3.14) },
        { json: "minimumImpedance", js: "minimumImpedance", typ: u(undefined, a(r("ImpedanceAtFrequency"))) },
        { json: "minimumInductance", js: "minimumInductance", typ: u(undefined, 3.14) },
        { json: "operatingCurrent", js: "operatingCurrent", typ: 3.14 },
        { json: "peakCurrent", js: "peakCurrent", typ: u(undefined, 3.14) },
        { json: "switchingFrequency", js: "switchingFrequency", typ: u(undefined, 3.14) },
        { json: "targetAttenuation", js: "targetAttenuation", typ: u(undefined, a(r("AttenuationAtFrequency"))) },
    ], "any"),
    "AttenuationAtFrequency": o([
        { json: "attenuation", js: "attenuation", typ: 3.14 },
        { json: "frequency", js: "frequency", typ: 3.14 },
    ], false),
    "DualActiveBridge": o([
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("DabOperatingPoint")) },
        { json: "perSecondaryLeakage", js: "perSecondaryLeakage", typ: u(undefined, a(3.14)) },
        { json: "seriesInductance", js: "seriesInductance", typ: u(undefined, 3.14) },
        { json: "useLeakageInductance", js: "useLeakageInductance", typ: u(undefined, true) },
    ], false),
    "DabOperatingPoint": o([
        { json: "innerPhaseShift1", js: "innerPhaseShift1", typ: u(undefined, 3.14) },
        { json: "innerPhaseShift2", js: "innerPhaseShift2", typ: u(undefined, 3.14) },
        { json: "innerPhaseShift3", js: "innerPhaseShift3", typ: u(undefined, 3.14) },
        { json: "modulationType", js: "modulationType", typ: u(undefined, r("ModulationType")) },
        { json: "ambientTemperature", js: "ambientTemperature", typ: 3.14 },
        { json: "outputCurrents", js: "outputCurrents", typ: a(3.14) },
        { json: "outputCurrentsType", js: "outputCurrentsType", typ: u(undefined, r("OutputSType")) },
        { json: "outputVoltages", js: "outputVoltages", typ: a(3.14) },
        { json: "outputVoltagesType", js: "outputVoltagesType", typ: u(undefined, r("OutputSType")) },
        { json: "switchingFrequency", js: "switchingFrequency", typ: 3.14 },
    ], "any"),
    "Flyback": o([
        { json: "currentRippleRatio", js: "currentRippleRatio", typ: 3.14 },
        { json: "diodeVoltageDrop", js: "diodeVoltageDrop", typ: 3.14 },
        { json: "efficiency", js: "efficiency", typ: 3.14 },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "maximumDrainSourceVoltage", js: "maximumDrainSourceVoltage", typ: u(undefined, 3.14) },
        { json: "maximumDutyCycle", js: "maximumDutyCycle", typ: u(undefined, 3.14) },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("FlybackOperatingPoint")) },
    ], false),
    "FlybackOperatingPoint": o([
        { json: "ambientTemperature", js: "ambientTemperature", typ: 3.14 },
        { json: "mode", js: "mode", typ: u(undefined, r("FlybackModes")) },
        { json: "outputCurrents", js: "outputCurrents", typ: a(3.14) },
        { json: "outputCurrentsType", js: "outputCurrentsType", typ: u(undefined, r("OutputSType")) },
        { json: "outputVoltages", js: "outputVoltages", typ: a(3.14) },
        { json: "outputVoltagesType", js: "outputVoltagesType", typ: u(undefined, r("OutputSType")) },
        { json: "switchingFrequency", js: "switchingFrequency", typ: u(undefined, 3.14) },
    ], false),
    "Forward": o([
        { json: "currentRippleRatio", js: "currentRippleRatio", typ: 3.14 },
        { json: "diodeVoltageDrop", js: "diodeVoltageDrop", typ: 3.14 },
        { json: "dutyCycle", js: "dutyCycle", typ: u(undefined, 3.14) },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "maximumSwitchCurrent", js: "maximumSwitchCurrent", typ: u(undefined, 3.14) },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("TopologyExcitation")) },
    ], false),
    "FourSwitchBuckBoost": o([
        { json: "bidirectional", js: "bidirectional", typ: u(undefined, true) },
        { json: "controlMode", js: "controlMode", typ: u(undefined, r("ControlMode")) },
        { json: "currentRippleRatio", js: "currentRippleRatio", typ: u(undefined, 3.14) },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "maximumSwitchCurrent", js: "maximumSwitchCurrent", typ: u(undefined, 3.14) },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("TopologyExcitation")) },
        { json: "outputVoltageRippleRatio", js: "outputVoltageRippleRatio", typ: u(undefined, 3.14) },
        { json: "phaseCount", js: "phaseCount", typ: u(undefined, 0) },
        { json: "transitionHysteresisRatio", js: "transitionHysteresisRatio", typ: u(undefined, 3.14) },
        { json: "transitionMode", js: "transitionMode", typ: u(undefined, r("TransitionMode")) },
    ], false),
    "IsolatedBuck": o([
        { json: "currentRippleRatio", js: "currentRippleRatio", typ: u(undefined, 3.14) },
        { json: "diodeVoltageDrop", js: "diodeVoltageDrop", typ: 3.14 },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "maximumSwitchCurrent", js: "maximumSwitchCurrent", typ: u(undefined, 3.14) },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("TopologyExcitation")) },
    ], false),
    "IsolatedBuckBoost": o([
        { json: "currentRippleRatio", js: "currentRippleRatio", typ: u(undefined, 3.14) },
        { json: "diodeVoltageDrop", js: "diodeVoltageDrop", typ: 3.14 },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "maximumSwitchCurrent", js: "maximumSwitchCurrent", typ: u(undefined, 3.14) },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("TopologyExcitation")) },
    ], false),
    "LlcResonant": o([
        { json: "bridgeType", js: "bridgeType", typ: u(undefined, r("LlcBridgeType")) },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inductanceRatio", js: "inductanceRatio", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "integratedResonantInductor", js: "integratedResonantInductor", typ: u(undefined, true) },
        { json: "maxSwitchingFrequency", js: "maxSwitchingFrequency", typ: 3.14 },
        { json: "minSwitchingFrequency", js: "minSwitchingFrequency", typ: 3.14 },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("TopologyExcitation")) },
        { json: "qualityFactor", js: "qualityFactor", typ: u(undefined, 3.14) },
        { json: "rectifierType", js: "rectifierType", typ: u(undefined, r("LlcRectifierType")) },
        { json: "resonantCapacitance", js: "resonantCapacitance", typ: u(undefined, 3.14) },
        { json: "resonantFrequency", js: "resonantFrequency", typ: u(undefined, 3.14) },
        { json: "seriesInductance", js: "seriesInductance", typ: u(undefined, 3.14) },
    ], false),
    "PhaseShiftedFullBridge": o([
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "maximumPhaseShift", js: "maximumPhaseShift", typ: u(undefined, 3.14) },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("PsfbOperatingPoint")) },
        { json: "outputInductance", js: "outputInductance", typ: u(undefined, 3.14) },
        { json: "rectifierType", js: "rectifierType", typ: u(undefined, r("BRectifierType")) },
        { json: "seriesInductance", js: "seriesInductance", typ: u(undefined, 3.14) },
        { json: "useLeakageInductance", js: "useLeakageInductance", typ: u(undefined, true) },
    ], false),
    "PsfbOperatingPoint": o([
        { json: "phaseShift", js: "phaseShift", typ: 3.14 },
        { json: "ambientTemperature", js: "ambientTemperature", typ: 3.14 },
        { json: "outputCurrents", js: "outputCurrents", typ: a(3.14) },
        { json: "outputCurrentsType", js: "outputCurrentsType", typ: u(undefined, r("OutputSType")) },
        { json: "outputVoltages", js: "outputVoltages", typ: a(3.14) },
        { json: "outputVoltagesType", js: "outputVoltagesType", typ: u(undefined, r("OutputSType")) },
        { json: "switchingFrequency", js: "switchingFrequency", typ: 3.14 },
    ], "any"),
    "PhaseShiftedHalfBridge": o([
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "maximumPhaseShift", js: "maximumPhaseShift", typ: u(undefined, 3.14) },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("PshbOperatingPoint")) },
        { json: "outputInductance", js: "outputInductance", typ: u(undefined, 3.14) },
        { json: "rectifierType", js: "rectifierType", typ: u(undefined, r("BRectifierType")) },
        { json: "seriesInductance", js: "seriesInductance", typ: u(undefined, 3.14) },
        { json: "useLeakageInductance", js: "useLeakageInductance", typ: u(undefined, true) },
    ], false),
    "PshbOperatingPoint": o([
        { json: "phaseShift", js: "phaseShift", typ: 3.14 },
        { json: "ambientTemperature", js: "ambientTemperature", typ: 3.14 },
        { json: "outputCurrents", js: "outputCurrents", typ: a(3.14) },
        { json: "outputCurrentsType", js: "outputCurrentsType", typ: u(undefined, r("OutputSType")) },
        { json: "outputVoltages", js: "outputVoltages", typ: a(3.14) },
        { json: "outputVoltagesType", js: "outputVoltagesType", typ: u(undefined, r("OutputSType")) },
        { json: "switchingFrequency", js: "switchingFrequency", typ: 3.14 },
    ], "any"),
    "PowerFactorCorrection": o([
        { json: "ambientTemperature", js: "ambientTemperature", typ: 3.14 },
        { json: "bulkCapacitance", js: "bulkCapacitance", typ: u(undefined, 3.14) },
        { json: "currentRippleRatio", js: "currentRippleRatio", typ: u(undefined, 3.14) },
        { json: "diodeVoltageDrop", js: "diodeVoltageDrop", typ: u(undefined, 3.14) },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "lineFrequency", js: "lineFrequency", typ: u(undefined, 3.14) },
        { json: "maximumCoreTemperatureRise", js: "maximumCoreTemperatureRise", typ: u(undefined, 3.14) },
        { json: "maximumSwitchCurrent", js: "maximumSwitchCurrent", typ: u(undefined, 3.14) },
        { json: "mode", js: "mode", typ: u(undefined, r("PfcModes")) },
        { json: "numberOfPhases", js: "numberOfPhases", typ: u(undefined, 0) },
        { json: "outputPower", js: "outputPower", typ: 3.14 },
        { json: "outputVoltage", js: "outputVoltage", typ: 3.14 },
        { json: "switchingFrequency", js: "switchingFrequency", typ: 3.14 },
        { json: "topologyVariant", js: "topologyVariant", typ: u(undefined, r("PfcTopologyVariants")) },
        { json: "wideBandgapSwitch", js: "wideBandgapSwitch", typ: u(undefined, true) },
    ], false),
    "PushPull": o([
        { json: "currentRippleRatio", js: "currentRippleRatio", typ: 3.14 },
        { json: "diodeVoltageDrop", js: "diodeVoltageDrop", typ: 3.14 },
        { json: "dutyCycle", js: "dutyCycle", typ: u(undefined, 3.14) },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "maximumDrainSourceVoltage", js: "maximumDrainSourceVoltage", typ: u(undefined, 3.14) },
        { json: "maximumSwitchCurrent", js: "maximumSwitchCurrent", typ: u(undefined, 3.14) },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("TopologyExcitation")) },
    ], false),
    "Sepic": o([
        { json: "coupledInductor", js: "coupledInductor", typ: u(undefined, true) },
        { json: "couplingCoefficient", js: "couplingCoefficient", typ: u(undefined, 3.14) },
        { json: "currentRippleRatio", js: "currentRippleRatio", typ: u(undefined, 3.14) },
        { json: "diodeVoltageDrop", js: "diodeVoltageDrop", typ: 3.14 },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "maximumSwitchCurrent", js: "maximumSwitchCurrent", typ: u(undefined, 3.14) },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("TopologyExcitation")) },
        { json: "synchronousRectifier", js: "synchronousRectifier", typ: u(undefined, true) },
    ], false),
    "SeriesResonant": o([
        { json: "bridgeType", js: "bridgeType", typ: u(undefined, r("SrcBridgeType")) },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "isolated", js: "isolated", typ: u(undefined, true) },
        { json: "maxSwitchingFrequency", js: "maxSwitchingFrequency", typ: 3.14 },
        { json: "minSwitchingFrequency", js: "minSwitchingFrequency", typ: 3.14 },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("TopologyExcitation")) },
        { json: "qualityFactor", js: "qualityFactor", typ: u(undefined, 3.14) },
        { json: "rectifierType", js: "rectifierType", typ: u(undefined, r("SrcRectifierType")) },
        { json: "resonantCapacitance", js: "resonantCapacitance", typ: u(undefined, 3.14) },
        { json: "resonantFrequency", js: "resonantFrequency", typ: u(undefined, 3.14) },
        { json: "seriesInductance", js: "seriesInductance", typ: u(undefined, 3.14) },
        { json: "useSynchronousRectifier", js: "useSynchronousRectifier", typ: u(undefined, true) },
    ], false),
    "ViennaRectifier": o([
        { json: "currentRippleRatio", js: "currentRippleRatio", typ: u(undefined, 3.14) },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "lineFrequency", js: "lineFrequency", typ: u(undefined, 3.14) },
        { json: "lineToLineVoltage", js: "lineToLineVoltage", typ: r("DimensionWithTolerance") },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("TopologyExcitation")) },
        { json: "outputDcVoltage", js: "outputDcVoltage", typ: 3.14 },
        { json: "phaseCount", js: "phaseCount", typ: u(undefined, 0) },
        { json: "powerFactor", js: "powerFactor", typ: u(undefined, 3.14) },
        { json: "samplingStrategy", js: "samplingStrategy", typ: u(undefined, r("ViennaSamplingStrategy")) },
        { json: "switchingFrequency", js: "switchingFrequency", typ: 3.14 },
        { json: "switchType", js: "switchType", typ: u(undefined, r("ViennaSwitchType")) },
        { json: "synchronousRectifier", js: "synchronousRectifier", typ: u(undefined, true) },
        { json: "viennaVariant", js: "viennaVariant", typ: u(undefined, r("ViennaVariant")) },
    ], false),
    "Weinberg": o([
        { json: "couplingCoefficientInput", js: "couplingCoefficientInput", typ: u(undefined, 3.14) },
        { json: "couplingCoefficientMain", js: "couplingCoefficientMain", typ: u(undefined, 3.14) },
        { json: "currentRippleRatio", js: "currentRippleRatio", typ: u(undefined, 3.14) },
        { json: "diodeVoltageDrop", js: "diodeVoltageDrop", typ: 3.14 },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "maximumSwitchCurrent", js: "maximumSwitchCurrent", typ: u(undefined, 3.14) },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("TopologyExcitation")) },
        { json: "synchronousRectifier", js: "synchronousRectifier", typ: u(undefined, true) },
        { json: "variant", js: "variant", typ: u(undefined, r("Variant")) },
    ], false),
    "Zeta": o([
        { json: "coupledInductor", js: "coupledInductor", typ: u(undefined, true) },
        { json: "couplingCoefficient", js: "couplingCoefficient", typ: u(undefined, 3.14) },
        { json: "currentRippleRatio", js: "currentRippleRatio", typ: u(undefined, 3.14) },
        { json: "diodeVoltageDrop", js: "diodeVoltageDrop", typ: 3.14 },
        { json: "efficiency", js: "efficiency", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: r("DimensionWithTolerance") },
        { json: "maximumSwitchCurrent", js: "maximumSwitchCurrent", typ: u(undefined, 3.14) },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("TopologyExcitation")) },
        { json: "synchronousRectifier", js: "synchronousRectifier", typ: u(undefined, true) },
    ], false),
    "DesignRequirements": o([
        { json: "allowedTechnologies", js: "allowedTechnologies", typ: u(undefined, a("")) },
        { json: "application", js: "application", typ: u(undefined, "") },
        { json: "market", js: "market", typ: u(undefined, r("Market")) },
        { json: "maximumDimensions", js: "maximumDimensions", typ: u(undefined, r("MaximumDimensions")) },
        { json: "maximumWeight", js: "maximumWeight", typ: u(undefined, 3.14) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "operatingTemperature", js: "operatingTemperature", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "role", js: "role", typ: u(undefined, "") },
        { json: "subApplication", js: "subApplication", typ: u(undefined, "") },
        { json: "terminalType", js: "terminalType", typ: u(undefined, a(r("ConnectionType"))) },
        { json: "topology", js: "topology", typ: u(undefined, r("Topology")) },
        { json: "insulation", js: "insulation", typ: u(undefined, r("InsulationRequirements")) },
        { json: "isolationSides", js: "isolationSides", typ: u(undefined, a(r("IsolationSide"))) },
        { json: "leakageInductance", js: "leakageInductance", typ: u(undefined, a(r("DimensionWithTolerance"))) },
        { json: "magnetizingInductance", js: "magnetizingInductance", typ: r("DimensionWithTolerance") },
        { json: "minimumImpedance", js: "minimumImpedance", typ: u(undefined, a(r("ImpedanceAtFrequency"))) },
        { json: "strayCapacitance", js: "strayCapacitance", typ: u(undefined, a(r("DimensionWithTolerance"))) },
        { json: "turnsRatios", js: "turnsRatios", typ: a(r("DimensionWithTolerance")) },
        { json: "wiringTechnology", js: "wiringTechnology", typ: u(undefined, r("WiringTechnology")) },
    ], "any"),
    "InsulationRequirements": o([
        { json: "altitude", js: "altitude", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "cti", js: "cti", typ: u(undefined, r("CTI")) },
        { json: "insulationType", js: "insulationType", typ: u(undefined, r("IsolationClass")) },
        { json: "mainSupplyVoltage", js: "mainSupplyVoltage", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "overvoltageCategory", js: "overvoltageCategory", typ: u(undefined, r("OvervoltageCategory")) },
        { json: "pollutionDegree", js: "pollutionDegree", typ: u(undefined, r("PollutionDegree")) },
        { json: "standards", js: "standards", typ: u(undefined, a(r("InsulationStandards"))) },
    ], false),
    "MaximumDimensions": o([
        { json: "depth", js: "depth", typ: u(undefined, 3.14) },
        { json: "height", js: "height", typ: u(undefined, 3.14) },
        { json: "width", js: "width", typ: u(undefined, 3.14) },
    ], false),
    "OperatingPoint": o([
        { json: "conditions", js: "conditions", typ: r("OperatingConditions") },
        { json: "excitationsPerWinding", js: "excitationsPerWinding", typ: a(r("OperatingPointExcitation")) },
        { json: "name", js: "name", typ: u(undefined, "") },
    ], false),
    "OperatingConditions": o([
        { json: "ambientRelativeHumidity", js: "ambientRelativeHumidity", typ: u(undefined, 3.14) },
        { json: "ambientTemperature", js: "ambientTemperature", typ: 3.14 },
        { json: "cooling", js: "cooling", typ: u(undefined, r("Cooling")) },
        { json: "name", js: "name", typ: u(undefined, "") },
    ], false),
    "Cooling": o([
        { json: "fluid", js: "fluid", typ: u(undefined, "") },
        { json: "temperature", js: "temperature", typ: u(undefined, 3.14) },
        { json: "flowDiameter", js: "flowDiameter", typ: u(undefined, 3.14) },
        { json: "velocity", js: "velocity", typ: u(undefined, a(3.14)) },
        { json: "dimensions", js: "dimensions", typ: u(undefined, r("Dimensions")) },
        { json: "interfaceThermalResistance", js: "interfaceThermalResistance", typ: u(undefined, 3.14) },
        { json: "interfaceThickness", js: "interfaceThickness", typ: u(undefined, 3.14) },
        { json: "thermalResistance", js: "thermalResistance", typ: u(undefined, 3.14) },
        { json: "coolant", js: "coolant", typ: u(undefined, "") },
        { json: "flowRate", js: "flowRate", typ: u(undefined, 3.14) },
        { json: "inletTemperature", js: "inletTemperature", typ: u(undefined, 3.14) },
        { json: "maximumTemperature", js: "maximumTemperature", typ: u(undefined, 3.14) },
    ], false),
    "Dimensions": o([
        { json: "depth", js: "depth", typ: u(undefined, 3.14) },
        { json: "height", js: "height", typ: u(undefined, 3.14) },
        { json: "width", js: "width", typ: u(undefined, 3.14) },
    ], false),
    "OperatingPointExcitation": o([
        { json: "current", js: "current", typ: u(undefined, r("SignalDescriptor")) },
        { json: "frequency", js: "frequency", typ: 3.14 },
        { json: "magneticFieldStrength", js: "magneticFieldStrength", typ: u(undefined, r("SignalDescriptor")) },
        { json: "magneticFluxDensity", js: "magneticFluxDensity", typ: u(undefined, r("SignalDescriptor")) },
        { json: "magnetizingCurrent", js: "magnetizingCurrent", typ: u(undefined, r("SignalDescriptor")) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "voltage", js: "voltage", typ: u(undefined, r("SignalDescriptor")) },
    ], "any"),
    "SignalDescriptor": o([
        { json: "harmonics", js: "harmonics", typ: u(undefined, r("Harmonics")) },
        { json: "processed", js: "processed", typ: u(undefined, r("Processed")) },
        { json: "waveform", js: "waveform", typ: u(undefined, r("Waveform")) },
    ], "any"),
    "Harmonics": o([
        { json: "amplitudes", js: "amplitudes", typ: a(3.14) },
        { json: "frequencies", js: "frequencies", typ: a(3.14) },
    ], false),
    "Processed": o([
        { json: "acEffectiveFrequency", js: "acEffectiveFrequency", typ: u(undefined, 3.14) },
        { json: "average", js: "average", typ: u(undefined, 3.14) },
        { json: "deadTime", js: "deadTime", typ: u(undefined, 3.14) },
        { json: "dutyCycle", js: "dutyCycle", typ: u(undefined, 3.14) },
        { json: "effectiveFrequency", js: "effectiveFrequency", typ: u(undefined, 3.14) },
        { json: "label", js: "label", typ: r("WaveformLabel") },
        { json: "negativePeak", js: "negativePeak", typ: u(undefined, 3.14) },
        { json: "offset", js: "offset", typ: 3.14 },
        { json: "peak", js: "peak", typ: u(undefined, 3.14) },
        { json: "peakToPeak", js: "peakToPeak", typ: u(undefined, 3.14) },
        { json: "phase", js: "phase", typ: u(undefined, 3.14) },
        { json: "positivePeak", js: "positivePeak", typ: u(undefined, 3.14) },
        { json: "rms", js: "rms", typ: u(undefined, 3.14) },
        { json: "thd", js: "thd", typ: u(undefined, 3.14) },
    ], "any"),
    "Waveform": o([
        { json: "data", js: "data", typ: a(3.14) },
        { json: "numberPeriods", js: "numberPeriods", typ: u(undefined, 0) },
        { json: "ancillaryLabel", js: "ancillaryLabel", typ: u(undefined, r("WaveformLabel")) },
        { json: "time", js: "time", typ: u(undefined, a(3.14)) },
    ], false),
    "Magnetic": o([
        { json: "coil", js: "coil", typ: u(undefined, r("Coil")) },
        { json: "core", js: "core", typ: u(undefined, r("MagneticCore")) },
        { json: "distributorsInfo", js: "distributorsInfo", typ: u(undefined, a(r("Utils"))) },
        { json: "manufacturerInfo", js: "manufacturerInfo", typ: u(undefined, r("MagneticManufacturerInfo")) },
        { json: "rotation", js: "rotation", typ: u(undefined, a(3.14)) },
    ], false),
    "Coil": o([
        { json: "bobbin", js: "bobbin", typ: u(a(u(r("Bobbin"), "")), r("Bobbin"), "") },
        { json: "functionalDescription", js: "functionalDescription", typ: a(r("CoilFunctionalDescription")) },
        { json: "groupsDescription", js: "groupsDescription", typ: u(undefined, a(r("Group"))) },
        { json: "layersDescription", js: "layersDescription", typ: u(undefined, a(r("Layer"))) },
        { json: "sectionsDescription", js: "sectionsDescription", typ: u(undefined, a(r("Section"))) },
        { json: "turnsDescription", js: "turnsDescription", typ: u(undefined, a(r("Turn"))) },
    ], "any"),
    "Bobbin": o([
        { json: "distributorsInfo", js: "distributorsInfo", typ: u(undefined, a(r("Utils"))) },
        { json: "functionalDescription", js: "functionalDescription", typ: u(undefined, r("BobbinFunctionalDescription")) },
        { json: "manufacturerInfo", js: "manufacturerInfo", typ: u(undefined, r("ManufacturerInfo")) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "processedDescription", js: "processedDescription", typ: u(undefined, r("CoreBobbinProcessedDescription")) },
    ], "any"),
    "Utils": o([
        { json: "cost", js: "cost", typ: u(undefined, r("CurrencyAmount")) },
        { json: "country", js: "country", typ: u(undefined, u(null, "")) },
        { json: "distributedArea", js: "distributedArea", typ: u(undefined, "") },
        { json: "email", js: "email", typ: u(undefined, "") },
        { json: "internal", js: "internal", typ: u(undefined, true) },
        { json: "internalNote", js: "internalNote", typ: u(undefined, "") },
        { json: "leadTime", js: "leadTime", typ: u(undefined, u(3.14, null)) },
        { json: "link", js: "link", typ: u(undefined, u(null, "")) },
        { json: "moq", js: "moq", typ: u(undefined, u(0, null)) },
        { json: "name", js: "name", typ: "" },
        { json: "packaging", js: "packaging", typ: u(undefined, u(null, "")) },
        { json: "phone", js: "phone", typ: u(undefined, "") },
        { json: "quantity", js: "quantity", typ: u(undefined, 3.14) },
        { json: "reference", js: "reference", typ: u(undefined, u(null, "")) },
        { json: "stock", js: "stock", typ: u(undefined, u(0, null)) },
        { json: "updatedAt", js: "updatedAt", typ: u(undefined, "") },
        { json: "vpe", js: "vpe", typ: u(undefined, u(0, null)) },
    ], false),
    "CurrencyAmount": o([
        { json: "currency", js: "currency", typ: "" },
        { json: "value", js: "value", typ: 3.14 },
    ], false),
    "BobbinFunctionalDescription": o([
        { json: "connections", js: "connections", typ: u(undefined, a(r("PinWindingConnection"))) },
        { json: "dimensions", js: "dimensions", typ: m(u(3.14, r("DimensionWithTolerance"))) },
        { json: "family", js: "family", typ: r("BobbinFamily") },
        { json: "familySubtype", js: "familySubtype", typ: u(undefined, "") },
        { json: "material", js: "material", typ: u(undefined, u(r("InsulationMaterial"), "")) },
        { json: "orientation", js: "orientation", typ: u(undefined, r("Orientation")) },
        { json: "pinout", js: "pinout", typ: u(undefined, r("Pinout")) },
        { json: "shape", js: "shape", typ: "" },
        { json: "type", js: "type", typ: r("FunctionalDescriptionType") },
        { json: "variant", js: "variant", typ: u(undefined, "") },
    ], false),
    "PinWindingConnection": o([
        { json: "pin", js: "pin", typ: u(undefined, "") },
        { json: "winding", js: "winding", typ: u(undefined, "") },
    ], false),
    "InsulationMaterial": o([
        { json: "aliases", js: "aliases", typ: u(undefined, a("")) },
        { json: "composition", js: "composition", typ: u(undefined, "") },
        { json: "dielectricStrength", js: "dielectricStrength", typ: a(r("DielectricStrengthElement")) },
        { json: "manufacturerInfo", js: "manufacturerInfo", typ: u(undefined, r("ManufacturerInfo")) },
        { json: "meltingPoint", js: "meltingPoint", typ: u(undefined, 3.14) },
        { json: "name", js: "name", typ: "" },
        { json: "relativePermittivity", js: "relativePermittivity", typ: u(undefined, 3.14) },
        { json: "resistivity", js: "resistivity", typ: u(undefined, a(r("ResistivityPoint"))) },
        { json: "specificHeat", js: "specificHeat", typ: u(undefined, 3.14) },
        { json: "surfaceResistivity", js: "surfaceResistivity", typ: u(undefined, a(r("ResistivityPoint"))) },
        { json: "temperatureClass", js: "temperatureClass", typ: u(undefined, u(3.14, r("TemperatureClassEnum"))) },
        { json: "thermalConductivity", js: "thermalConductivity", typ: u(undefined, 3.14) },
    ], false),
    "DielectricStrengthElement": o([
        { json: "humidity", js: "humidity", typ: u(undefined, 3.14) },
        { json: "temperature", js: "temperature", typ: u(undefined, 3.14) },
        { json: "thickness", js: "thickness", typ: u(undefined, 3.14) },
        { json: "value", js: "value", typ: 3.14 },
    ], false),
    "ManufacturerInfo": o([
        { json: "datasheetUrl", js: "datasheetUrl", typ: u(undefined, "") },
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "family", js: "family", typ: u(undefined, "") },
        { json: "name", js: "name", typ: "" },
        { json: "orderCode", js: "orderCode", typ: u(undefined, "") },
        { json: "reference", js: "reference", typ: u(undefined, "") },
        { json: "series", js: "series", typ: u(undefined, "") },
        { json: "spiceModel", js: "spiceModel", typ: u(undefined, m("any")) },
        { json: "status", js: "status", typ: u(undefined, r("Status")) },
    ], "any"),
    "ResistivityPoint": o([
        { json: "temperature", js: "temperature", typ: u(undefined, 3.14) },
        { json: "value", js: "value", typ: 3.14 },
    ], false),
    "Pinout": o([
        { json: "centralPitch", js: "centralPitch", typ: u(undefined, 3.14) },
        { json: "numberPins", js: "numberPins", typ: 0 },
        { json: "numberPinsPerRow", js: "numberPinsPerRow", typ: u(undefined, a(0)) },
        { json: "numberRows", js: "numberRows", typ: u(undefined, 0) },
        { json: "pinDescription", js: "pinDescription", typ: u(undefined, r("Pin")) },
        { json: "pitch", js: "pitch", typ: u(undefined, u(a(3.14), 3.14)) },
        { json: "rowDistance", js: "rowDistance", typ: u(undefined, 3.14) },
    ], false),
    "Pin": o([
        { json: "coordinates", js: "coordinates", typ: u(undefined, a(3.14)) },
        { json: "dimensions", js: "dimensions", typ: a(3.14) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "rotation", js: "rotation", typ: u(undefined, a(3.14)) },
        { json: "shape", js: "shape", typ: r("PinShape") },
        { json: "type", js: "type", typ: r("PinDescriptionType") },
    ], false),
    "CoreBobbinProcessedDescription": o([
        { json: "columnDepth", js: "columnDepth", typ: 3.14 },
        { json: "columnShape", js: "columnShape", typ: r("ColumnShape") },
        { json: "columnThickness", js: "columnThickness", typ: 3.14 },
        { json: "columnWidth", js: "columnWidth", typ: u(undefined, 3.14) },
        { json: "coordinates", js: "coordinates", typ: u(undefined, a(3.14)) },
        { json: "pins", js: "pins", typ: u(undefined, a(r("Pin"))) },
        { json: "wallThickness", js: "wallThickness", typ: 3.14 },
        { json: "windingWindows", js: "windingWindows", typ: a(r("WindingWindowElement")) },
    ], false),
    "WindingWindowElement": o([
        { json: "area", js: "area", typ: u(undefined, 3.14) },
        { json: "coordinates", js: "coordinates", typ: u(undefined, a(3.14)) },
        { json: "height", js: "height", typ: u(undefined, 3.14) },
        { json: "sectionsAlignment", js: "sectionsAlignment", typ: u(undefined, r("CoilAlignment")) },
        { json: "sectionsOrientation", js: "sectionsOrientation", typ: u(undefined, r("WindingOrientation")) },
        { json: "shape", js: "shape", typ: u(undefined, r("WindingWindowShape")) },
        { json: "width", js: "width", typ: u(undefined, 3.14) },
        { json: "windingOrder", js: "windingOrder", typ: u(undefined, r("WindingOrder")) },
        { json: "angle", js: "angle", typ: u(undefined, 3.14) },
        { json: "radialHeight", js: "radialHeight", typ: u(undefined, 3.14) },
    ], false),
    "CoilFunctionalDescription": o([
        { json: "connections", js: "connections", typ: u(undefined, a(r("ConnectionElement"))) },
        { json: "isolationSide", js: "isolationSide", typ: r("IsolationSide") },
        { json: "name", js: "name", typ: "" },
        { json: "numberParallels", js: "numberParallels", typ: 0 },
        { json: "numberTurns", js: "numberTurns", typ: 0 },
        { json: "wire", js: "wire", typ: u(r("Wire"), "") },
        { json: "woundWith", js: "woundWith", typ: u(undefined, a("")) },
    ], false),
    "ConnectionElement": o([
        { json: "direction", js: "direction", typ: u(undefined, r("Direction")) },
        { json: "length", js: "length", typ: u(undefined, 3.14) },
        { json: "metric", js: "metric", typ: u(undefined, 0) },
        { json: "pinName", js: "pinName", typ: u(undefined, "") },
        { json: "type", js: "type", typ: u(undefined, r("ConnectionType")) },
    ], false),
    "Wire": o([
        { json: "conductingDiameter", js: "conductingDiameter", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "material", js: "material", typ: u(undefined, u(r("WireMaterial"), "")) },
        { json: "outerDiameter", js: "outerDiameter", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "coating", js: "coating", typ: u(undefined, u(r("InsulationWireCoating"), "")) },
        { json: "conductingArea", js: "conductingArea", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "manufacturerInfo", js: "manufacturerInfo", typ: u(undefined, r("ManufacturerInfo")) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "numberConductors", js: "numberConductors", typ: u(undefined, 0) },
        { json: "standard", js: "standard", typ: u(undefined, r("WireStandard")) },
        { json: "standardName", js: "standardName", typ: u(undefined, "") },
        { json: "type", js: "type", typ: r("WireType") },
        { json: "conductingHeight", js: "conductingHeight", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "conductingWidth", js: "conductingWidth", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "outerHeight", js: "outerHeight", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "outerWidth", js: "outerWidth", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "edgeRadius", js: "edgeRadius", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "strand", js: "strand", typ: u(undefined, u(r("WireRound"), "")) },
        { json: "twistPitch", js: "twistPitch", typ: u(undefined, r("DimensionWithTolerance")) },
    ], "any"),
    "InsulationWireCoating": o([
        { json: "breakdownVoltage", js: "breakdownVoltage", typ: u(undefined, 3.14) },
        { json: "grade", js: "grade", typ: u(undefined, 0) },
        { json: "material", js: "material", typ: u(undefined, u(r("InsulationMaterial"), "")) },
        { json: "numberLayers", js: "numberLayers", typ: u(undefined, 0) },
        { json: "temperatureRating", js: "temperatureRating", typ: u(undefined, 3.14) },
        { json: "thickness", js: "thickness", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "thicknessLayers", js: "thicknessLayers", typ: u(undefined, 3.14) },
        { json: "type", js: "type", typ: u(undefined, r("InsulationWireCoatingType")) },
    ], "any"),
    "WireMaterial": o([
        { json: "name", js: "name", typ: "" },
        { json: "permeability", js: "permeability", typ: 3.14 },
        { json: "resistivity", js: "resistivity", typ: r("Resistivity") },
        { json: "thermalConductivity", js: "thermalConductivity", typ: u(undefined, a(r("ThermalConductivityElement"))) },
    ], false),
    "Resistivity": o([
        { json: "referenceTemperature", js: "referenceTemperature", typ: 3.14 },
        { json: "referenceValue", js: "referenceValue", typ: 3.14 },
        { json: "temperatureCoefficient", js: "temperatureCoefficient", typ: 3.14 },
    ], false),
    "ThermalConductivityElement": o([
        { json: "temperature", js: "temperature", typ: 3.14 },
        { json: "value", js: "value", typ: 3.14 },
    ], false),
    "WireRound": o([
        { json: "conductingDiameter", js: "conductingDiameter", typ: r("DimensionWithTolerance") },
        { json: "material", js: "material", typ: u(undefined, u(r("WireMaterial"), "")) },
        { json: "outerDiameter", js: "outerDiameter", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "coating", js: "coating", typ: u(undefined, u(r("InsulationWireCoating"), "")) },
        { json: "conductingArea", js: "conductingArea", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "manufacturerInfo", js: "manufacturerInfo", typ: u(undefined, r("ManufacturerInfo")) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "numberConductors", js: "numberConductors", typ: u(undefined, 0) },
        { json: "standard", js: "standard", typ: u(undefined, r("WireStandard")) },
        { json: "standardName", js: "standardName", typ: u(undefined, "") },
        { json: "type", js: "type", typ: r("WireType") },
    ], "any"),
    "Group": o([
        { json: "coordinates", js: "coordinates", typ: a(3.14) },
        { json: "coordinateSystem", js: "coordinateSystem", typ: u(undefined, r("CoordinateSystem")) },
        { json: "dimensions", js: "dimensions", typ: a(3.14) },
        { json: "name", js: "name", typ: "" },
        { json: "partialWindings", js: "partialWindings", typ: a(r("PartialWinding")) },
        { json: "sectionsOrientation", js: "sectionsOrientation", typ: r("WindingOrientation") },
        { json: "type", js: "type", typ: r("WiringTechnology") },
    ], false),
    "PartialWinding": o([
        { json: "connections", js: "connections", typ: u(undefined, a(r("ConnectionElement"))) },
        { json: "parallelsProportion", js: "parallelsProportion", typ: a(3.14) },
        { json: "winding", js: "winding", typ: "" },
    ], false),
    "Layer": o([
        { json: "additionalCoordinates", js: "additionalCoordinates", typ: u(undefined, a(a(3.14))) },
        { json: "coordinates", js: "coordinates", typ: a(3.14) },
        { json: "coordinateSystem", js: "coordinateSystem", typ: u(undefined, r("CoordinateSystem")) },
        { json: "dimensions", js: "dimensions", typ: a(3.14) },
        { json: "fillingFactor", js: "fillingFactor", typ: u(undefined, 3.14) },
        { json: "insulationMaterial", js: "insulationMaterial", typ: u(undefined, u(r("InsulationMaterial"), "")) },
        { json: "name", js: "name", typ: "" },
        { json: "orientation", js: "orientation", typ: r("WindingOrientation") },
        { json: "partialWindings", js: "partialWindings", typ: a(r("PartialWinding")) },
        { json: "section", js: "section", typ: u(undefined, "") },
        { json: "turnsAlignment", js: "turnsAlignment", typ: u(undefined, r("CoilAlignment")) },
        { json: "type", js: "type", typ: r("ElectricalType") },
        { json: "windingStyle", js: "windingStyle", typ: u(undefined, r("WindingStyle")) },
    ], false),
    "Section": o([
        { json: "coordinates", js: "coordinates", typ: a(3.14) },
        { json: "coordinateSystem", js: "coordinateSystem", typ: u(undefined, r("CoordinateSystem")) },
        { json: "dimensions", js: "dimensions", typ: a(3.14) },
        { json: "fillingFactor", js: "fillingFactor", typ: u(undefined, 3.14) },
        { json: "group", js: "group", typ: u(undefined, "") },
        { json: "layersAlignment", js: "layersAlignment", typ: u(undefined, r("CoilAlignment")) },
        { json: "layersOrientation", js: "layersOrientation", typ: r("WindingOrientation") },
        { json: "margin", js: "margin", typ: u(undefined, u(a(3.14), r("MarginInfo"))) },
        { json: "name", js: "name", typ: "" },
        { json: "numberLayers", js: "numberLayers", typ: u(undefined, 3.14) },
        { json: "partialWindings", js: "partialWindings", typ: a(r("PartialWinding")) },
        { json: "type", js: "type", typ: r("ElectricalType") },
        { json: "windingOrder", js: "windingOrder", typ: u(undefined, r("WindingOrder")) },
        { json: "windingStyle", js: "windingStyle", typ: u(undefined, r("WindingStyle")) },
    ], false),
    "MarginInfo": o([
        { json: "bottomOrRightWidth", js: "bottomOrRightWidth", typ: 3.14 },
        { json: "insulationMaterial", js: "insulationMaterial", typ: u(undefined, u(r("InsulationMaterial"), "")) },
        { json: "layerThickness", js: "layerThickness", typ: 3.14 },
        { json: "numberLayers", js: "numberLayers", typ: 0 },
        { json: "topOrLeftWidth", js: "topOrLeftWidth", typ: 3.14 },
    ], false),
    "Turn": o([
        { json: "additionalCoordinates", js: "additionalCoordinates", typ: u(undefined, a(a(3.14))) },
        { json: "angle", js: "angle", typ: u(undefined, 3.14) },
        { json: "coordinates", js: "coordinates", typ: a(3.14) },
        { json: "coordinateSystem", js: "coordinateSystem", typ: u(undefined, r("CoordinateSystem")) },
        { json: "crossSectionalShape", js: "crossSectionalShape", typ: u(undefined, r("TurnCrossSectionalShape")) },
        { json: "dimensions", js: "dimensions", typ: u(undefined, a(3.14)) },
        { json: "layer", js: "layer", typ: u(undefined, "") },
        { json: "length", js: "length", typ: 3.14 },
        { json: "name", js: "name", typ: "" },
        { json: "orientation", js: "orientation", typ: u(undefined, r("TurnOrientation")) },
        { json: "parallel", js: "parallel", typ: 0 },
        { json: "rotation", js: "rotation", typ: u(undefined, 3.14) },
        { json: "section", js: "section", typ: u(undefined, "") },
        { json: "winding", js: "winding", typ: "" },
    ], false),
    "MagneticCore": o([
        { json: "distributorsInfo", js: "distributorsInfo", typ: u(undefined, a(r("Utils"))) },
        { json: "functionalDescription", js: "functionalDescription", typ: r("CoreFunctionalDescription") },
        { json: "geometricalDescription", js: "geometricalDescription", typ: u(undefined, a(r("CoreGeometricalDescriptionElement"))) },
        { json: "manufacturerInfo", js: "manufacturerInfo", typ: u(undefined, r("ManufacturerInfo")) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "processedDescription", js: "processedDescription", typ: u(undefined, r("CoreProcessedDescription")) },
    ], false),
    "CoreFunctionalDescription": o([
        { json: "coating", js: "coating", typ: u(undefined, u(r("CoreCoating"), "")) },
        { json: "gapping", js: "gapping", typ: a(r("CoreGap")) },
        { json: "material", js: "material", typ: u(r("CoreMaterial"), "") },
        { json: "numberStacks", js: "numberStacks", typ: u(undefined, 0) },
        { json: "shape", js: "shape", typ: u(r("CoreShape"), "") },
        { json: "type", js: "type", typ: r("CoreType") },
    ], false),
    "CoreCoating": o([
        { json: "material", js: "material", typ: u(undefined, u(r("InsulationMaterial"), "")) },
        { json: "thickness", js: "thickness", typ: 3.14 },
        { json: "type", js: "type", typ: u(undefined, r("CoatingType")) },
    ], false),
    "CoreGap": o([
        { json: "area", js: "area", typ: u(undefined, 3.14) },
        { json: "coordinates", js: "coordinates", typ: u(undefined, a(3.14)) },
        { json: "distanceClosestNormalSurface", js: "distanceClosestNormalSurface", typ: u(undefined, 3.14) },
        { json: "distanceClosestParallelSurface", js: "distanceClosestParallelSurface", typ: u(undefined, 3.14) },
        { json: "length", js: "length", typ: 3.14 },
        { json: "sectionDimensions", js: "sectionDimensions", typ: u(undefined, a(3.14)) },
        { json: "shape", js: "shape", typ: u(undefined, r("ColumnShape")) },
        { json: "type", js: "type", typ: r("GapType") },
    ], false),
    "CoreMaterial": o([
        { json: "alternatives", js: "alternatives", typ: u(undefined, a("")) },
        { json: "application", js: "application", typ: u(undefined, a(r("MagneticApplication"))) },
        { json: "bhCycle", js: "bhCycle", typ: u(undefined, a(r("BhCycleElement"))) },
        { json: "coerciveForce", js: "coerciveForce", typ: u(undefined, a(r("BhCycleElement"))) },
        { json: "commercialName", js: "commercialName", typ: u(undefined, "") },
        { json: "curieTemperature", js: "curieTemperature", typ: u(undefined, 3.14) },
        { json: "density", js: "density", typ: u(undefined, 3.14) },
        { json: "family", js: "family", typ: u(undefined, "") },
        { json: "heatCapacity", js: "heatCapacity", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "heatConductivity", js: "heatConductivity", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "manufacturerInfo", js: "manufacturerInfo", typ: r("ManufacturerInfo") },
        { json: "massLosses", js: "massLosses", typ: u(undefined, m(a(u(a(r("MassLossesPoint")), r("MagnetecCoreLossesMethodData"))))) },
        { json: "material", js: "material", typ: r("MaterialType") },
        { json: "materialComposition", js: "materialComposition", typ: u(undefined, r("MaterialComposition")) },
        { json: "name", js: "name", typ: "" },
        { json: "permeability", js: "permeability", typ: r("Permeabilities") },
        { json: "recommendations", js: "recommendations", typ: u(undefined, r("CoreMaterialRecommendations")) },
        { json: "remanence", js: "remanence", typ: u(undefined, a(r("BhCycleElement"))) },
        { json: "resistivity", js: "resistivity", typ: a(r("ResistivityPoint")) },
        { json: "saturation", js: "saturation", typ: a(r("BhCycleElement")) },
        { json: "type", js: "type", typ: r("CoreMaterialType") },
        { json: "volumetricLosses", js: "volumetricLosses", typ: m(a(u(a(r("VolumetricLossesPoint")), r("CoreLossesMethodData")))) },
    ], false),
    "BhCycleElement": o([
        { json: "magneticField", js: "magneticField", typ: 3.14 },
        { json: "magneticFluxDensity", js: "magneticFluxDensity", typ: 3.14 },
        { json: "temperature", js: "temperature", typ: 3.14 },
    ], false),
    "MassLossesPoint": o([
        { json: "magneticFluxDensity", js: "magneticFluxDensity", typ: r("OperatingPointExcitation") },
        { json: "origin", js: "origin", typ: "" },
        { json: "temperature", js: "temperature", typ: 3.14 },
        { json: "value", js: "value", typ: 3.14 },
    ], false),
    "MagnetecCoreLossesMethodData": o([
        { json: "method", js: "method", typ: r("MassCoreLossesMethodType") },
    ], false),
    "Permeabilities": o([
        { json: "amplitude", js: "amplitude", typ: u(undefined, u(a(r("PermeabilityPoint")), r("PermeabilityPoint"))) },
        { json: "complex", js: "complex", typ: u(undefined, r("ComplexPermeabilityData")) },
        { json: "incremental", js: "incremental", typ: u(undefined, u(a(r("PermeabilityPoint")), r("PermeabilityPoint"))) },
        { json: "initial", js: "initial", typ: u(a(r("PermeabilityPoint")), r("PermeabilityPoint")) },
        { json: "reversible", js: "reversible", typ: u(undefined, u(a(r("PermeabilityPoint")), r("PermeabilityPoint"))) },
    ], false),
    "PermeabilityPoint": o([
        { json: "frequency", js: "frequency", typ: u(undefined, 3.14) },
        { json: "magneticFieldDcBias", js: "magneticFieldDcBias", typ: u(undefined, 3.14) },
        { json: "magneticFluxDensityPeak", js: "magneticFluxDensityPeak", typ: u(undefined, 3.14) },
        { json: "modifiers", js: "modifiers", typ: u(undefined, m(r("InitialPermeabilitModifier"))) },
        { json: "temperature", js: "temperature", typ: u(undefined, 3.14) },
        { json: "tolerance", js: "tolerance", typ: u(undefined, 3.14) },
        { json: "value", js: "value", typ: 3.14 },
    ], false),
    "InitialPermeabilitModifier": o([
        { json: "frequencyFactor", js: "frequencyFactor", typ: u(undefined, r("FrequencyFactor")) },
        { json: "magneticFieldDcBiasFactor", js: "magneticFieldDcBiasFactor", typ: u(undefined, r("MagneticFieldDcBiasFactor")) },
        { json: "method", js: "method", typ: u(undefined, r("InitialPermeabilitModifierMethod")) },
        { json: "temperatureFactor", js: "temperatureFactor", typ: u(undefined, r("TemperatureFactor")) },
        { json: "magneticFluxDensityFactor", js: "magneticFluxDensityFactor", typ: u(undefined, r("MagneticFluxDensityFactor")) },
    ], false),
    "FrequencyFactor": o([
        { json: "a", js: "a", typ: 3.14 },
        { json: "b", js: "b", typ: 3.14 },
        { json: "c", js: "c", typ: 3.14 },
        { json: "d", js: "d", typ: 3.14 },
        { json: "e", js: "e", typ: u(undefined, 3.14) },
    ], false),
    "MagneticFieldDcBiasFactor": o([
        { json: "a", js: "a", typ: 3.14 },
        { json: "b", js: "b", typ: 3.14 },
        { json: "c", js: "c", typ: 3.14 },
        { json: "d", js: "d", typ: u(undefined, 3.14) },
    ], false),
    "MagneticFluxDensityFactor": o([
        { json: "a", js: "a", typ: 3.14 },
        { json: "b", js: "b", typ: 3.14 },
        { json: "c", js: "c", typ: 3.14 },
        { json: "d", js: "d", typ: 3.14 },
        { json: "e", js: "e", typ: 3.14 },
        { json: "f", js: "f", typ: 3.14 },
    ], false),
    "TemperatureFactor": o([
        { json: "a", js: "a", typ: 3.14 },
        { json: "b", js: "b", typ: u(undefined, 3.14) },
        { json: "c", js: "c", typ: u(undefined, 3.14) },
        { json: "d", js: "d", typ: u(undefined, 3.14) },
        { json: "e", js: "e", typ: u(undefined, 3.14) },
    ], false),
    "ComplexPermeabilityData": o([
        { json: "imaginary", js: "imaginary", typ: u(a(r("PermeabilityPoint")), r("PermeabilityPoint")) },
        { json: "real", js: "real", typ: u(a(r("PermeabilityPoint")), r("PermeabilityPoint")) },
    ], false),
    "CoreMaterialRecommendations": o([
        { json: "maximumFrequency", js: "maximumFrequency", typ: u(undefined, 3.14) },
        { json: "maximumMagneticFluxDensity", js: "maximumMagneticFluxDensity", typ: u(undefined, 3.14) },
        { json: "maximumOperatingTemperature", js: "maximumOperatingTemperature", typ: u(undefined, 3.14) },
        { json: "minimumFrequency", js: "minimumFrequency", typ: u(undefined, 3.14) },
        { json: "typicalApplications", js: "typicalApplications", typ: u(undefined, a("")) },
        { json: "typicalTopologies", js: "typicalTopologies", typ: u(undefined, a("")) },
    ], false),
    "VolumetricLossesPoint": o([
        { json: "magneticFluxDensity", js: "magneticFluxDensity", typ: r("OperatingPointExcitation") },
        { json: "origin", js: "origin", typ: "" },
        { json: "temperature", js: "temperature", typ: 3.14 },
        { json: "value", js: "value", typ: 3.14 },
    ], false),
    "CoreLossesMethodData": o([
        { json: "method", js: "method", typ: r("VolumetricCoreLossesMethodType") },
        { json: "ranges", js: "ranges", typ: u(undefined, a(r("SteinmetzCoreLossesMethodRangeDatum"))) },
        { json: "coefficients", js: "coefficients", typ: u(undefined, r("RoshenAdditionalCoefficients")) },
        { json: "referenceVolumetricLosses", js: "referenceVolumetricLosses", typ: u(undefined, a(r("VolumetricLossesPoint"))) },
        { json: "a", js: "a", typ: u(undefined, 3.14) },
        { json: "b", js: "b", typ: u(undefined, 3.14) },
        { json: "c", js: "c", typ: u(undefined, 3.14) },
        { json: "d", js: "d", typ: u(undefined, 3.14) },
        { json: "factors", js: "factors", typ: u(undefined, a(r("LossFactorPoint"))) },
    ], false),
    "RoshenAdditionalCoefficients": o([
        { json: "excessLossesCoefficient", js: "excessLossesCoefficient", typ: 3.14 },
        { json: "resistivityFrequencyCoefficient", js: "resistivityFrequencyCoefficient", typ: 3.14 },
        { json: "resistivityMagneticFluxDensityCoefficient", js: "resistivityMagneticFluxDensityCoefficient", typ: 3.14 },
        { json: "resistivityOffset", js: "resistivityOffset", typ: 3.14 },
        { json: "resistivityTemperatureCoefficient", js: "resistivityTemperatureCoefficient", typ: 3.14 },
    ], false),
    "LossFactorPoint": o([
        { json: "frequency", js: "frequency", typ: u(undefined, 3.14) },
        { json: "temperature", js: "temperature", typ: u(undefined, 3.14) },
        { json: "value", js: "value", typ: 3.14 },
    ], false),
    "SteinmetzCoreLossesMethodRangeDatum": o([
        { json: "alpha", js: "alpha", typ: 3.14 },
        { json: "beta", js: "beta", typ: 3.14 },
        { json: "ct0", js: "ct0", typ: u(undefined, 3.14) },
        { json: "ct1", js: "ct1", typ: u(undefined, 3.14) },
        { json: "ct2", js: "ct2", typ: u(undefined, 3.14) },
        { json: "k", js: "k", typ: 3.14 },
        { json: "maximumFrequency", js: "maximumFrequency", typ: u(undefined, 3.14) },
        { json: "minimumFrequency", js: "minimumFrequency", typ: u(undefined, 3.14) },
    ], false),
    "CoreShape": o([
        { json: "aliases", js: "aliases", typ: u(undefined, a("")) },
        { json: "dimensions", js: "dimensions", typ: u(undefined, m(u(3.14, r("DimensionWithTolerance")))) },
        { json: "family", js: "family", typ: r("CoreShapeFamily") },
        { json: "familySubtype", js: "familySubtype", typ: u(undefined, "") },
        { json: "magneticCircuit", js: "magneticCircuit", typ: u(undefined, r("MagneticCircuit")) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "type", js: "type", typ: r("FunctionalDescriptionType") },
    ], false),
    "CoreGeometricalDescriptionElement": o([
        { json: "coordinates", js: "coordinates", typ: a(3.14) },
        { json: "machining", js: "machining", typ: u(undefined, a(r("Machining"))) },
        { json: "material", js: "material", typ: u(undefined, u(r("CoreMaterial"), "")) },
        { json: "rotation", js: "rotation", typ: u(undefined, a(3.14)) },
        { json: "shape", js: "shape", typ: u(undefined, u(r("CoreShape"), "")) },
        { json: "type", js: "type", typ: r("CoreGeometricalDescriptionElementType") },
        { json: "dimensions", js: "dimensions", typ: u(undefined, a(3.14)) },
        { json: "insulationMaterial", js: "insulationMaterial", typ: u(undefined, u(r("InsulationMaterial"), "")) },
    ], false),
    "Machining": o([
        { json: "coordinates", js: "coordinates", typ: a(3.14) },
        { json: "length", js: "length", typ: 3.14 },
    ], false),
    "CoreProcessedDescription": o([
        { json: "columns", js: "columns", typ: a(r("ColumnElement")) },
        { json: "depth", js: "depth", typ: 3.14 },
        { json: "effectiveParameters", js: "effectiveParameters", typ: r("EffectiveParameters") },
        { json: "height", js: "height", typ: 3.14 },
        { json: "thermalResistance", js: "thermalResistance", typ: u(undefined, 3.14) },
        { json: "width", js: "width", typ: 3.14 },
        { json: "windingWindows", js: "windingWindows", typ: a(r("WindingWindowElement")) },
    ], false),
    "ColumnElement": o([
        { json: "area", js: "area", typ: 3.14 },
        { json: "coordinates", js: "coordinates", typ: a(3.14) },
        { json: "depth", js: "depth", typ: 3.14 },
        { json: "height", js: "height", typ: 3.14 },
        { json: "minimumDepth", js: "minimumDepth", typ: u(undefined, 3.14) },
        { json: "minimumWidth", js: "minimumWidth", typ: u(undefined, 3.14) },
        { json: "shape", js: "shape", typ: r("ColumnShape") },
        { json: "type", js: "type", typ: r("ColumnType") },
        { json: "width", js: "width", typ: 3.14 },
    ], false),
    "EffectiveParameters": o([
        { json: "effectiveArea", js: "effectiveArea", typ: 3.14 },
        { json: "effectiveLength", js: "effectiveLength", typ: 3.14 },
        { json: "effectiveVolume", js: "effectiveVolume", typ: 3.14 },
        { json: "minimumArea", js: "minimumArea", typ: 3.14 },
    ], false),
    "MagneticManufacturerInfo": o([
        { json: "datasheetInfo", js: "datasheetInfo", typ: u(undefined, r("DatasheetInfo")) },
        { json: "datasheetUrl", js: "datasheetUrl", typ: u(undefined, "") },
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "family", js: "family", typ: u(undefined, "") },
        { json: "name", js: "name", typ: "" },
        { json: "orderCode", js: "orderCode", typ: u(undefined, "") },
        { json: "reference", js: "reference", typ: u(undefined, "") },
        { json: "series", js: "series", typ: u(undefined, "") },
        { json: "spiceModel", js: "spiceModel", typ: u(undefined, m("any")) },
        { json: "status", js: "status", typ: u(undefined, r("Status")) },
    ], "any"),
    "DatasheetInfo": o([
        { json: "application", js: "application", typ: u(undefined, r("MagneticDatasheetApplication")) },
        { json: "electrical", js: "electrical", typ: u(undefined, a(r("MagneticDatasheetElectrical"))) },
        { json: "mechanical", js: "mechanical", typ: u(undefined, r("Mechanical")) },
        { json: "model", js: "model", typ: u(undefined, r("MagneticDatasheetChipBeadModel")) },
        { json: "part", js: "part", typ: u(undefined, r("Part")) },
        { json: "thermal", js: "thermal", typ: u(undefined, r("Thermal")) },
    ], false),
    "MagneticDatasheetApplication": o([
        { json: "auxiliaryVoltage", js: "auxiliaryVoltage", typ: u(undefined, 3.14) },
        { json: "inputVoltage", js: "inputVoltage", typ: u(undefined, u(3.14, r("DimensionWithTolerance"))) },
        { json: "outputCurrents", js: "outputCurrents", typ: u(undefined, a(3.14)) },
        { json: "outputVoltages", js: "outputVoltages", typ: u(undefined, a(3.14)) },
        { json: "switchingFrequency", js: "switchingFrequency", typ: u(undefined, 3.14) },
    ], false),
    "MagneticDatasheetElectrical": o([
        { json: "dcResistance", js: "dcResistance", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "impedancePoints", js: "impedancePoints", typ: u(undefined, a(r("DatasheetImpedancePoint"))) },
        { json: "inductance", js: "inductance", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "inductancePoints", js: "inductancePoints", typ: u(undefined, a(r("DatasheetInductancePoint"))) },
        { json: "maximumImpedance", js: "maximumImpedance", typ: u(undefined, 3.14) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "numberTurns", js: "numberTurns", typ: u(undefined, 3.14) },
        { json: "ratedCurrents", js: "ratedCurrents", typ: u(undefined, a(3.14)) },
        { json: "saturationCurrentPeak", js: "saturationCurrentPeak", typ: u(undefined, 3.14) },
        { json: "selfResonantFrequency", js: "selfResonantFrequency", typ: u(undefined, 3.14) },
        { json: "subtype", js: "subtype", typ: r("ElectricalSubtype") },
        { json: "couplingCoefficient", js: "couplingCoefficient", typ: u(undefined, 3.14) },
        { json: "dcResistances", js: "dcResistances", typ: u(undefined, a(r("DimensionWithTolerance"))) },
        { json: "leakageInductance", js: "leakageInductance", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "turnsRatios", js: "turnsRatios", typ: u(undefined, a(r("DimensionWithTolerance"))) },
        { json: "insulationResistance", js: "insulationResistance", typ: u(undefined, 3.14) },
        { json: "insulationTestVoltageAC", js: "insulationTestVoltageAC", typ: u(undefined, 3.14) },
        { json: "ratedVoltageAC", js: "ratedVoltageAC", typ: u(undefined, 3.14) },
        { json: "ratedVoltageDC", js: "ratedVoltageDC", typ: u(undefined, 3.14) },
        { json: "commonModeFilter", js: "commonModeFilter", typ: u(undefined, r("CommonModeFilter")) },
        { json: "impedanceTolerance", js: "impedanceTolerance", typ: u(undefined, 3.14) },
        { json: "numberPulsesPoints", js: "numberPulsesPoints", typ: u(undefined, a(r("DatasheetNumberPulsesPoint"))) },
        { json: "pulsePoints", js: "pulsePoints", typ: u(undefined, a(r("DatasheetPulsePoint"))) },
        { json: "reactancePoints", js: "reactancePoints", typ: u(undefined, a(r("DatasheetReactancePoint"))) },
        { json: "resistancePoints", js: "resistancePoints", typ: u(undefined, a(r("DatasheetResistancePoint"))) },
    ], false),
    "CommonModeFilter": o([
        { json: "attenuation", js: "attenuation", typ: u(undefined, 3.14) },
        { json: "attenuationTestCondition", js: "attenuationTestCondition", typ: u(undefined, "") },
        { json: "cutOffFrequency", js: "cutOffFrequency", typ: u(undefined, 3.14) },
    ], false),
    "DatasheetImpedancePoint": o([
        { json: "current", js: "current", typ: u(undefined, 3.14) },
        { json: "frequency", js: "frequency", typ: 3.14 },
        { json: "impedance", js: "impedance", typ: r("ImpedancePoint") },
        { json: "winding", js: "winding", typ: u(undefined, "") },
    ], false),
    "DatasheetInductancePoint": o([
        { json: "current", js: "current", typ: u(undefined, 3.14) },
        { json: "inductance", js: "inductance", typ: 3.14 },
        { json: "temperature", js: "temperature", typ: u(undefined, 3.14) },
    ], false),
    "DatasheetNumberPulsesPoint": o([
        { json: "numberPulses", js: "numberPulses", typ: 3.14 },
        { json: "pulseCurrent", js: "pulseCurrent", typ: 3.14 },
        { json: "winding", js: "winding", typ: u(undefined, "") },
    ], false),
    "DatasheetPulsePoint": o([
        { json: "pulseCurrent", js: "pulseCurrent", typ: 3.14 },
        { json: "pulseLength", js: "pulseLength", typ: 3.14 },
        { json: "winding", js: "winding", typ: u(undefined, "") },
    ], false),
    "DatasheetReactancePoint": o([
        { json: "current", js: "current", typ: u(undefined, 3.14) },
        { json: "frequency", js: "frequency", typ: 3.14 },
        { json: "reactance", js: "reactance", typ: 3.14 },
        { json: "winding", js: "winding", typ: u(undefined, "") },
    ], false),
    "DatasheetResistancePoint": o([
        { json: "current", js: "current", typ: u(undefined, 3.14) },
        { json: "frequency", js: "frequency", typ: 3.14 },
        { json: "resistance", js: "resistance", typ: 3.14 },
        { json: "winding", js: "winding", typ: u(undefined, "") },
    ], false),
    "Mechanical": o([
        { json: "assemblyType", js: "assemblyType", typ: u(undefined, "") },
        { json: "diameter", js: "diameter", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "height", js: "height", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "length", js: "length", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "mounting", js: "mounting", typ: u(undefined, r("ConnectionType")) },
        { json: "pinLength", js: "pinLength", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "weight", js: "weight", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "width", js: "width", typ: u(undefined, r("DimensionWithTolerance")) },
    ], false),
    "MagneticDatasheetChipBeadModel": o([
        { json: "cp", js: "cp", typ: 3.14 },
        { json: "lp", js: "lp", typ: 3.14 },
        { json: "rp", js: "rp", typ: 3.14 },
        { json: "rs", js: "rs", typ: u(undefined, 3.14) },
        { json: "subtype", js: "subtype", typ: r("ModelSubtype") },
    ], false),
    "Part": o([
        { json: "automotive", js: "automotive", typ: u(undefined, true) },
        { json: "caseCode", js: "caseCode", typ: u(undefined, "") },
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "family", js: "family", typ: u(undefined, "") },
        { json: "insulationGrade", js: "insulationGrade", typ: u(undefined, r("IsolationClass")) },
        { json: "matchCode", js: "matchCode", typ: u(undefined, "") },
        { json: "material", js: "material", typ: u(undefined, "") },
        { json: "numberOfWindings", js: "numberOfWindings", typ: u(undefined, 0) },
        { json: "partNumber", js: "partNumber", typ: u(undefined, "") },
        { json: "shielded", js: "shielded", typ: u(undefined, true) },
        { json: "windingStyle", js: "windingStyle", typ: u(undefined, "") },
    ], false),
    "Thermal": o([
        { json: "operatingTemperature", js: "operatingTemperature", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "temperatureRise", js: "temperatureRise", typ: u(undefined, 3.14) },
        { json: "thermalResistance", js: "thermalResistance", typ: u(undefined, 3.14) },
    ], false),
    "Outputs": o([
        { json: "coreLosses", js: "coreLosses", typ: u(undefined, r("CoreLossesOutput")) },
        { json: "impedance", js: "impedance", typ: u(undefined, r("ImpedanceOutput")) },
        { json: "inductance", js: "inductance", typ: u(undefined, r("InductanceOutput")) },
        { json: "insulation", js: "insulation", typ: u(undefined, a(r("DielectricVoltage"))) },
        { json: "insulationCoordination", js: "insulationCoordination", typ: u(undefined, r("InsulationCoordination")) },
        { json: "strayCapacitance", js: "strayCapacitance", typ: u(undefined, a(r("StrayCapacitanceOutput"))) },
        { json: "temperature", js: "temperature", typ: u(undefined, r("TemperatureOutput")) },
        { json: "windingLosses", js: "windingLosses", typ: u(undefined, r("WindingLossesOutput")) },
        { json: "windingWindowCurrentDensityField", js: "windingWindowCurrentDensityField", typ: u(undefined, r("WindingWindowCurrentDensityFieldOutput")) },
        { json: "windingWindowCurrentField", js: "windingWindowCurrentField", typ: u(undefined, r("WindingWindowCurrentFieldOutput")) },
        { json: "windingWindowMagneticStrengthField", js: "windingWindowMagneticStrengthField", typ: u(undefined, r("WindingWindowMagneticStrengthFieldOutput")) },
    ], false),
    "CoreLossesOutput": o([
        { json: "coreLosses", js: "coreLosses", typ: 3.14 },
        { json: "eddyCurrentCoreLosses", js: "eddyCurrentCoreLosses", typ: u(undefined, 3.14) },
        { json: "hysteresisCoreLosses", js: "hysteresisCoreLosses", typ: u(undefined, 3.14) },
        { json: "magneticFluxDensity", js: "magneticFluxDensity", typ: u(undefined, r("SignalDescriptor")) },
        { json: "massLosses", js: "massLosses", typ: u(undefined, 3.14) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "temperature", js: "temperature", typ: 3.14 },
        { json: "volumetricLosses", js: "volumetricLosses", typ: u(undefined, 3.14) },
    ], false),
    "ImpedanceOutput": o([
        { json: "impedanceMatrix", js: "impedanceMatrix", typ: u(undefined, a(r("ComplexMatrixAtFrequency"))) },
        { json: "inductanceMatrix", js: "inductanceMatrix", typ: a(r("ScalarMatrixAtFrequency")) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "resistanceMatrix", js: "resistanceMatrix", typ: a(r("ScalarMatrixAtFrequency")) },
    ], false),
    "ComplexMatrixAtFrequency": o([
        { json: "frequency", js: "frequency", typ: 3.14 },
        { json: "magnitude", js: "magnitude", typ: m(m(r("DimensionWithTolerance"))) },
        { json: "phase", js: "phase", typ: m(m(r("DimensionWithTolerance"))) },
    ], false),
    "ScalarMatrixAtFrequency": o([
        { json: "frequency", js: "frequency", typ: 3.14 },
        { json: "magnitude", js: "magnitude", typ: m(m(r("DimensionWithTolerance"))) },
    ], false),
    "InductanceOutput": o([
        { json: "couplingCoefficientsMatrix", js: "couplingCoefficientsMatrix", typ: u(undefined, a(r("ScalarMatrixAtFrequency"))) },
        { json: "inductanceMatrix", js: "inductanceMatrix", typ: u(undefined, a(r("ScalarMatrixAtFrequency"))) },
        { json: "leakageInductance", js: "leakageInductance", typ: u(undefined, r("LeakageInductanceOutput")) },
        { json: "magnetizingInductance", js: "magnetizingInductance", typ: r("MagnetizingInductanceOutput") },
    ], false),
    "LeakageInductanceOutput": o([
        { json: "leakageInductancePerWinding", js: "leakageInductancePerWinding", typ: a(r("DimensionWithTolerance")) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
    ], false),
    "MagnetizingInductanceOutput": o([
        { json: "coreReluctance", js: "coreReluctance", typ: 3.14 },
        { json: "gappingReluctance", js: "gappingReluctance", typ: u(undefined, 3.14) },
        { json: "magnetizingInductance", js: "magnetizingInductance", typ: r("DimensionWithTolerance") },
        { json: "maximumFringingFactor", js: "maximumFringingFactor", typ: u(undefined, 3.14) },
        { json: "maximumMagneticEnergyCore", js: "maximumMagneticEnergyCore", typ: u(undefined, 3.14) },
        { json: "maximumStorableMagneticEnergyGapping", js: "maximumStorableMagneticEnergyGapping", typ: u(undefined, 3.14) },
        { json: "measurementCondition", js: "measurementCondition", typ: u(undefined, r("InductanceMeasurementCondition")) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "reluctancePerGap", js: "reluctancePerGap", typ: u(undefined, a(r("AirGapReluctanceOutput"))) },
        { json: "ungappedCoreReluctance", js: "ungappedCoreReluctance", typ: u(undefined, 3.14) },
    ], false),
    "InductanceMeasurementCondition": o([
        { json: "currentRms", js: "currentRms", typ: u(undefined, 3.14) },
        { json: "dcBiasCurrent", js: "dcBiasCurrent", typ: u(undefined, 3.14) },
        { json: "frequency", js: "frequency", typ: u(undefined, 3.14) },
        { json: "temperature", js: "temperature", typ: u(undefined, 3.14) },
        { json: "voltageRms", js: "voltageRms", typ: u(undefined, 3.14) },
    ], false),
    "AirGapReluctanceOutput": o([
        { json: "fringingFactor", js: "fringingFactor", typ: 3.14 },
        { json: "maximumStorableMagneticEnergy", js: "maximumStorableMagneticEnergy", typ: 3.14 },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "reluctance", js: "reluctance", typ: 3.14 },
    ], false),
    "DielectricVoltage": o([
        { json: "duration", js: "duration", typ: u(undefined, 3.14) },
        { json: "methodUsed", js: "methodUsed", typ: u(undefined, "") },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "voltage", js: "voltage", typ: 3.14 },
        { json: "voltageType", js: "voltageType", typ: r("VoltageType") },
    ], false),
    "InsulationCoordination": o([
        { json: "clearance", js: "clearance", typ: 3.14 },
        { json: "creepageDistance", js: "creepageDistance", typ: 3.14 },
        { json: "distanceThroughInsulation", js: "distanceThroughInsulation", typ: 3.14 },
        { json: "withstandVoltage", js: "withstandVoltage", typ: 3.14 },
        { json: "withstandVoltageDuration", js: "withstandVoltageDuration", typ: u(undefined, 3.14) },
        { json: "withstandVoltageType", js: "withstandVoltageType", typ: u(undefined, r("VoltageType")) },
    ], false),
    "StrayCapacitanceOutput": o([
        { json: "capacitanceAmongTurns", js: "capacitanceAmongTurns", typ: u(undefined, m(m(3.14))) },
        { json: "capacitanceAmongWindings", js: "capacitanceAmongWindings", typ: u(undefined, m(m(3.14))) },
        { json: "capacitanceMatrix", js: "capacitanceMatrix", typ: u(undefined, m(m(r("ScalarMatrixAtFrequency")))) },
        { json: "electricEnergyAmongTurns", js: "electricEnergyAmongTurns", typ: u(undefined, m(m(3.14))) },
        { json: "maxwellCapacitanceMatrix", js: "maxwellCapacitanceMatrix", typ: u(undefined, a(r("ScalarMatrixAtFrequency"))) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "sixCapacitorNetworkPerWinding", js: "sixCapacitorNetworkPerWinding", typ: u(undefined, m(m(r("SixCapacitorNetworkPerWinding")))) },
        { json: "tripoleCapacitancePerWinding", js: "tripoleCapacitancePerWinding", typ: u(undefined, m(m(r("TripoleCapacitancePerWinding")))) },
        { json: "voltageDividerEndPerTurn", js: "voltageDividerEndPerTurn", typ: u(undefined, a(3.14)) },
        { json: "voltageDividerStartPerTurn", js: "voltageDividerStartPerTurn", typ: u(undefined, a(3.14)) },
        { json: "voltageDropAmongTurns", js: "voltageDropAmongTurns", typ: u(undefined, m(m(3.14))) },
        { json: "voltagePerTurn", js: "voltagePerTurn", typ: u(undefined, a(3.14)) },
    ], "any"),
    "SixCapacitorNetworkPerWinding": o([
        { json: "C1", js: "C1", typ: 3.14 },
        { json: "C2", js: "C2", typ: 3.14 },
        { json: "C3", js: "C3", typ: 3.14 },
        { json: "C4", js: "C4", typ: 3.14 },
        { json: "C5", js: "C5", typ: 3.14 },
        { json: "C6", js: "C6", typ: 3.14 },
    ], false),
    "TripoleCapacitancePerWinding": o([
        { json: "C1", js: "C1", typ: 3.14 },
        { json: "C2", js: "C2", typ: 3.14 },
        { json: "C3", js: "C3", typ: 3.14 },
    ], false),
    "TemperatureOutput": o([
        { json: "bulkThermalResistance", js: "bulkThermalResistance", typ: u(undefined, 3.14) },
        { json: "initialTemperature", js: "initialTemperature", typ: u(undefined, 3.14) },
        { json: "maximumTemperature", js: "maximumTemperature", typ: 3.14 },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "temperaturePoint", js: "temperaturePoint", typ: u(undefined, r("TemperaturePoint")) },
    ], false),
    "TemperaturePoint": o([
        { json: "coordinates", js: "coordinates", typ: a(3.14) },
        { json: "value", js: "value", typ: 3.14 },
    ], false),
    "WindingLossesOutput": o([
        { json: "currentDividerPerTurn", js: "currentDividerPerTurn", typ: u(undefined, a(3.14)) },
        { json: "currentPerWinding", js: "currentPerWinding", typ: u(undefined, r("OperatingPoint")) },
        { json: "dcResistancePerTurn", js: "dcResistancePerTurn", typ: u(undefined, a(3.14)) },
        { json: "dcResistancePerWinding", js: "dcResistancePerWinding", typ: u(undefined, a(3.14)) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "resistanceMatrix", js: "resistanceMatrix", typ: u(undefined, a(r("ScalarMatrixAtFrequency"))) },
        { json: "temperature", js: "temperature", typ: u(undefined, 3.14) },
        { json: "windingLosses", js: "windingLosses", typ: 3.14 },
        { json: "windingLossesPerLayer", js: "windingLossesPerLayer", typ: u(undefined, a(r("WindingLossesPerElement"))) },
        { json: "windingLossesPerSection", js: "windingLossesPerSection", typ: u(undefined, a(r("WindingLossesPerElement"))) },
        { json: "windingLossesPerTurn", js: "windingLossesPerTurn", typ: u(undefined, a(r("WindingLossesPerElement"))) },
        { json: "windingLossesPerWinding", js: "windingLossesPerWinding", typ: u(undefined, a(r("WindingLossesPerElement"))) },
    ], false),
    "WindingLossesPerElement": o([
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "ohmicLosses", js: "ohmicLosses", typ: u(undefined, r("OhmicLosses")) },
        { json: "proximityEffectLosses", js: "proximityEffectLosses", typ: u(undefined, r("LossElementPerHarmonic")) },
        { json: "skinEffectLosses", js: "skinEffectLosses", typ: u(undefined, r("LossElementPerHarmonic")) },
    ], false),
    "OhmicLosses": o([
        { json: "losses", js: "losses", typ: 3.14 },
        { json: "methodUsed", js: "methodUsed", typ: u(undefined, "") },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
    ], false),
    "LossElementPerHarmonic": o([
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "harmonicFrequencies", js: "harmonicFrequencies", typ: a(3.14) },
        { json: "lossesPerHarmonic", js: "lossesPerHarmonic", typ: a(3.14) },
    ], "any"),
    "WindingWindowCurrentDensityFieldOutput": o([
        { json: "fieldPerFrequency", js: "fieldPerFrequency", typ: a(r("Field")) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "wires", js: "wires", typ: a(u(r("Wire"), "")) },
    ], false),
    "Field": o([
        { json: "data", js: "data", typ: a(r("FieldPoint")) },
        { json: "frequency", js: "frequency", typ: 3.14 },
    ], false),
    "FieldPoint": o([
        { json: "label", js: "label", typ: u(undefined, "") },
        { json: "point", js: "point", typ: a(3.14) },
        { json: "rotation", js: "rotation", typ: u(undefined, 3.14) },
        { json: "turnIndex", js: "turnIndex", typ: u(undefined, 0) },
        { json: "turnLength", js: "turnLength", typ: u(undefined, 3.14) },
        { json: "value", js: "value", typ: 3.14 },
    ], false),
    "WindingWindowCurrentFieldOutput": o([
        { json: "fieldPerFrequency", js: "fieldPerFrequency", typ: a(r("Field")) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
    ], false),
    "WindingWindowMagneticStrengthFieldOutput": o([
        { json: "fieldPerFrequency", js: "fieldPerFrequency", typ: a(r("ComplexField")) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
    ], false),
    "ComplexField": o([
        { json: "data", js: "data", typ: a(r("ComplexFieldPoint")) },
        { json: "frequency", js: "frequency", typ: 3.14 },
    ], false),
    "ComplexFieldPoint": o([
        { json: "imaginary", js: "imaginary", typ: 3.14 },
        { json: "label", js: "label", typ: u(undefined, "") },
        { json: "point", js: "point", typ: a(3.14) },
        { json: "real", js: "real", typ: 3.14 },
        { json: "turnIndex", js: "turnIndex", typ: u(undefined, 0) },
        { json: "turnLength", js: "turnLength", typ: u(undefined, 3.14) },
    ], false),
    "OutputSType": [
        "average",
        "dc",
        "peak",
        "peakToPeak",
        "rms",
    ],
    "AhbRectifierType": [
        "ahbFlyback",
        "centerTapped",
        "currentDoubler",
        "fullBridge",
    ],
    "LlcBridgeType": [
        "fullBridge",
        "halfBridge",
    ],
    "PowerFlowDirection": [
        "forward",
        "reverse",
    ],
    "ClllcControlStrategy": [
        "fixedFrequencyPhaseShift",
        "hybridPfmPsm",
        "psm",
        "pfm",
    ],
    "WaveformLabel": [
        "bipolarRectangular",
        "bipolarTriangular",
        "custom",
        "flybackPrimary",
        "flybackSecondary",
        "flybackSecondaryWithDeadtime",
        "rectangular",
        "rectangularDCM",
        "rectangularWithDeadtime",
        "secondaryRectangular",
        "secondaryRectangularWithDeadtime",
        "sinusoidal",
        "triangular",
        "triangularWithDeadtime",
        "unipolarRectangular",
        "unipolarTriangular",
    ],
    "Configuration": [
        "singlePhase",
        "singlePhaseBalanced",
        "threePhase",
        "threePhaseWithNeutral",
    ],
    "ModulationType": [
        "DPS",
        "EPS",
        "SPS",
        "TPS",
    ],
    "FlybackModes": [
        "boundaryModeOperation",
        "continuousConductionMode",
        "discontinuousConductionMode",
        "quasiResonantMode",
    ],
    "ControlMode": [
        "averageCurrent",
        "peakBuckPeakBoost",
        "peakCurrent",
        "voltageMode",
    ],
    "TransitionMode": [
        "simultaneous",
        "splitPwm",
    ],
    "LlcRectifierType": [
        "centerTapped",
        "currentDoubler",
        "fullBridge",
        "voltageDoubler",
    ],
    "BRectifierType": [
        "centerTapped",
        "currentDoubler",
        "fullBridge",
    ],
    "PfcModes": [
        "continuousConductionMode",
        "criticalConductionMode",
        "discontinuousConductionMode",
        "transitionMode",
    ],
    "PfcTopologyVariants": [
        "boost",
        "bridgeless",
        "buck",
        "buckBoost",
        "cuk",
        "interleavedBoost",
        "semiBridgeless",
        "sepic",
        "totemPole",
        "vienna",
    ],
    "SrcBridgeType": [
        "fullBridge",
        "fullBridgePhaseShift",
        "halfBridge",
    ],
    "SrcRectifierType": [
        "centerTappedDiode",
        "currentDoubler",
        "fullBridgeDiode",
    ],
    "ViennaSamplingStrategy": [
        "fullLineCycle",
        "peakOfLineOnly",
        "peakOfLinePlusSectors",
    ],
    "ViennaSwitchType": [
        "backToBackMosfet",
        "singleMosfetIn4DiodeBridge",
        "tType",
    ],
    "ViennaVariant": [
        "viennaI",
        "viennaII",
    ],
    "Variant": [
        "bridge",
        "classic",
    ],
    "CTI": [
        "groupI",
        "groupII",
        "groupIIIA",
        "groupIIIB",
    ],
    "IsolationClass": [
        "basic",
        "double",
        "functional",
        "reinforced",
        "supplementary",
    ],
    "OvervoltageCategory": [
        "I",
        "II",
        "III",
        "IV",
    ],
    "PollutionDegree": [
        "PD1",
        "PD2",
        "PD3",
        "PD4",
    ],
    "InsulationStandards": [
        "IEC 60335-1",
        "IEC 60664-1",
        "IEC 61558-1",
        "IEC 62368-1",
    ],
    "IsolationSide": [
        "denary",
        "duodenary",
        "nonary",
        "octonary",
        "primary",
        "quaternary",
        "quinary",
        "secondary",
        "senary",
        "septenary",
        "tertiary",
        "undenary",
    ],
    "Market": [
        "automotive",
        "commercial",
        "industrial",
        "medical",
        "military",
        "space",
    ],
    "ConnectionType": [
        "chassis",
        "flyingLead",
        "pcbPad",
        "pin",
        "smt",
        "screw",
        "tht",
    ],
    "Topology": [
        "activeClampForwardConverter",
        "asymmetricHalfBridgeConverter",
        "boostConverter",
        "buckConverter",
        "cllcResonantConverter",
        "clllcResonantConverter",
        "commonModeChoke",
        "cukConverter",
        "currentTransformer",
        "differentialModeChoke",
        "dualActiveBridgeConverter",
        "flybackConverter",
        "fourSwitchBuckBoostConverter",
        "isolatedBuckBoostConverter",
        "isolatedBuckConverter",
        "llcResonantConverter",
        "phaseShiftedFullBridgeConverter",
        "phaseShiftedHalfBridgeConverter",
        "powerFactorCorrection",
        "pushPullConverter",
        "sepicConverter",
        "seriesResonantConverter",
        "singleSwitchForwardConverter",
        "twoSwitchForwardConverter",
        "viennaRectifierConverter",
        "weinbergConverter",
        "zetaConverter",
    ],
    "WiringTechnology": [
        "deposition",
        "printed",
        "stamped",
        "wound",
    ],
    "BobbinFamily": [
        "e",
        "ec",
        "efd",
        "el",
        "ep",
        "er",
        "etd",
        "p",
        "pm",
        "pq",
        "rm",
        "t",
        "u",
    ],
    "Status": [
        "nrnd",
        "obsolete",
        "preview",
        "production",
        "prototype",
    ],
    "TemperatureClassEnum": [
        "A",
        "B",
        "E",
        "F",
        "H",
        "N",
        "R",
        "200",
        "220",
        "250",
        "Y",
    ],
    "Orientation": [
        "horizontal",
        "vertical",
    ],
    "PinShape": [
        "irregular",
        "rectangular",
        "round",
    ],
    "PinDescriptionType": [
        "smd",
        "tht",
    ],
    "FunctionalDescriptionType": [
        "custom",
        "standard",
    ],
    "ColumnShape": [
        "irregular",
        "oblong",
        "rectangular",
        "round",
    ],
    "CoilAlignment": [
        "centered",
        "innerOrTop",
        "outerOrBottom",
        "spread",
    ],
    "WindingOrientation": [
        "contiguous",
        "overlapping",
    ],
    "WindingWindowShape": [
        "rectangular",
        "round",
    ],
    "WindingOrder": [
        "U",
        "Z",
    ],
    "Direction": [
        "input",
        "output",
    ],
    "InsulationWireCoatingType": [
        "bare",
        "enamelled",
        "extruded",
        "insulated",
        "served",
        "taped",
    ],
    "WireStandard": [
        "IEC 60317",
        "IPC-6012",
        "NEMA MW 1000 C",
    ],
    "WireType": [
        "foil",
        "litz",
        "planar",
        "rectangular",
        "round",
    ],
    "CoordinateSystem": [
        "cartesian",
        "cylindrical",
        "polar",
    ],
    "ElectricalType": [
        "conduction",
        "insulation",
        "shielding",
    ],
    "WindingStyle": [
        "windByConsecutiveParallels",
        "windByConsecutiveTurns",
    ],
    "TurnCrossSectionalShape": [
        "oval",
        "rectangular",
        "round",
    ],
    "TurnOrientation": [
        "clockwise",
        "counterClockwise",
    ],
    "CoatingType": [
        "epoxy",
        "glass",
        "nylon",
        "parylene",
    ],
    "GapType": [
        "additive",
        "residual",
        "subtractive",
    ],
    "MagneticApplication": [
        "interferenceSuppression",
        "power",
        "signalProcessing",
    ],
    "MassCoreLossesMethodType": [
        "magnetec",
    ],
    "MaterialType": [
        "amorphous",
        "electricalSteel",
        "ferrite",
        "nanocrystalline",
        "powder",
    ],
    "MaterialComposition": [
        "carbonylIron",
        "FeMo",
        "FeNi",
        "FeNiMo",
        "FeSi",
        "FeSiAl",
        "iron",
        "MgZn",
        "MnZn",
        "NiZn",
        "proprietary",
    ],
    "InitialPermeabilitModifierMethod": [
        "fair-rite",
        "magnetics",
        "micrometals",
        "poco",
        "tdg",
    ],
    "CoreMaterialType": [
        "commercial",
        "custom",
    ],
    "VolumetricCoreLossesMethodType": [
        "lossFactor",
        "magnetics",
        "micrometals",
        "poco",
        "roshen",
        "steinmetz",
        "tdg",
    ],
    "CoreShapeFamily": [
        "c",
        "drum",
        "e",
        "ec",
        "efd",
        "ei",
        "el",
        "elp",
        "ep",
        "epx",
        "eq",
        "er",
        "etd",
        "h",
        "lp",
        "p",
        "planarE",
        "planarEL",
        "planarER",
        "pm",
        "pq",
        "pqi",
        "rm",
        "rod",
        "t",
        "u",
        "ui",
        "ur",
        "ut",
    ],
    "MagneticCircuit": [
        "closed",
        "open",
    ],
    "CoreType": [
        "closedShape",
        "pieceAndPlate",
        "toroidal",
        "twoPieceSet",
    ],
    "CoreGeometricalDescriptionElementType": [
        "closed",
        "halfSet",
        "plate",
        "sheet",
        "spacer",
        "toroidal",
    ],
    "ColumnType": [
        "central",
        "lateral",
    ],
    "ElectricalSubtype": [
        "chipBead",
        "commonModeChoke",
        "coupledInductor",
        "inductor",
        "transformer",
    ],
    "ModelSubtype": [
        "chipBead",
    ],
    "MASConformance": [
        "A",
        "B",
        "C",
    ],
    "ResultOrigin": [
        "manufacturer",
        "measurement",
        "simulation",
    ],
    "VoltageType": [
        "AC",
        "DC",
    ],
};
