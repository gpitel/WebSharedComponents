<script>
import { waitForMkf } from '../assets/js/mkfRuntime.js';
import { sanitizeSvg } from '../assets/js/sanitize.js';

// Constants
const ASPECT_RATIO_THRESHOLD = 0.85;
const OPTIONS_HEIGHT_MULTIPLIER = 0.90;
const DEBOUNCE_DELAY_MS = 20;
const WARNING_CHECK_DELAY_MS = 500;
const PLOT_DELAY_MS = 10;

// Plot modes - exported for external use
export const PLOT_MODES = {
    BASIC: 'basic',                         // Basic view with cores and wires
    MAGNETIC_FIELD: 'magnetic_field',       // Magnetic field plot
    ELECTRIC_FIELD: 'electric_field',       // Electric field plot
    TEMPERATURE_FIELD: 'temperature_field', // Temperature field plot
    WIRES_LOSSES: 'wires_losses',           // Wire losses plot (TBD)
    COLORED_BY_WINDING: 'colored_by_winding', // Turns colored by same winding (TBD)
    COLORED_BY_PARALLEL: 'colored_by_parallel', // Turns colored by same parallel (TBD)
    COLORED_BY_TURN: 'colored_by_turn',     // Turns colored by same turn (TBD)
    // Connection-face (YZ) projection: the view where the terminal leads are seen end-on,
    // alongside the inter-layer links and dragbacks. Only meaningful with real winding on,
    // so it is offered only then (see effectiveAvailablePlotModes).
    CONNECTIONS_YZ: 'connections_yz',
};

// Human-readable labels for plot modes
const PLOT_MODE_LABELS = {
    [PLOT_MODES.BASIC]: 'Basic',
    [PLOT_MODES.MAGNETIC_FIELD]: 'H Field',
    [PLOT_MODES.ELECTRIC_FIELD]: 'E Field',
    [PLOT_MODES.TEMPERATURE_FIELD]: 'Temperature',
    [PLOT_MODES.WIRES_LOSSES]: 'Wire Losses',
    [PLOT_MODES.COLORED_BY_WINDING]: 'By Winding',
    [PLOT_MODES.COLORED_BY_PARALLEL]: 'By Parallel',
    [PLOT_MODES.COLORED_BY_TURN]: 'By Turn',
    [PLOT_MODES.CONNECTIONS_YZ]: 'Connections',
};

// Utility function to extract dimension from SVG string
function extractSvgDimension(svgHtml, dimension) {
    const regex = new RegExp(`${dimension}="(\\d*\\.)?\\d+"`, 'i');
    const match = svgHtml.match(regex);
    if (match && match.length > 0) {
        const numberMatch = match[0].match(/(\d*\.)?\d+/g);
        if (numberMatch) {
            return parseFloat(numberMatch[0]);
        }
    }
    return 0;
}

export default {
    emits: ["zoomIn", "zoomOut", "plotModeChange", "swapIncludeFringing", "errorInImage"],
    props: {
        modelValue: {
            type: Object,
            required: true,
        },
        forceUpdate: {
            type: Number,
            default: 0,
        },
        enableZoom: {
            type: Boolean,
            default: true,
        },
        enableOptions: {
            type: Boolean,
            default: true,
        },
        enableFringingOption: {
            type: Boolean,
            default: false,
        },
        enableHideOnFitting: {
            type: Boolean,
            default: true,
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
        plotModeInit: {
            type: String,
            default: PLOT_MODES.BASIC,
            validator: (value) => Object.values(PLOT_MODES).includes(value),
        },
        availablePlotModes: {
            type: Array,
            default: () => [
                PLOT_MODES.BASIC,
                PLOT_MODES.MAGNETIC_FIELD,
                PLOT_MODES.ELECTRIC_FIELD,
            ],
        },
        includeFringingInit: {
            type: Boolean,
            default: true,
        },
        coilFits: {
            type: Boolean,
            default: true,
        },
        backgroundColor: {
            type: String,
            default: "var(--p-dark)",
        },
        textColor: {
            type: String,
            default: "var(--p-white)",
        },
        buttonStyle: {
            type: [Object, String],
            default: "",
        },
        operatingPointIndex: {
            type: Number,
            default: 0,
        },
        loadingGif: {
            type: String,
            default: "/images/loading.gif",
        },
        zoomedInit: {
            type: Boolean,
            default: false,
        },
        insulationColor: {
            type: String,
            default: "0xfff05b",  // original yellow
        },
        marginColor: {
            type: String,
            default: "0xfff05b",  // original yellow
        },
        spacerColor: {
            type: String,
            default: "0x3b3b3b",  // original dark gray
        },
        // Core/ferrite fill and wire/copper fill for plot_turns. MKF's own
        // defaults pick up the host's primary color (e.g. brand red in Asgard),
        // which is wrong for a magnetic core. Default to the same neutral ferrite
        // gray and copper tone the 3D visualizer uses so 2D and 3D agree.
        ferriteColor: {
            type: String,
            default: "0x7b7c7d",  // neutral ferrite gray (matches 3D ferrite)
        },
        copperColor: {
            type: String,
            default: "0xb87333",  // copper (matches 3D copper)
        },
        drawSpacer: {
            type: Boolean,
            default: true,
        },
        enableTemperaturePlot: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        const initialMode = (!this.enableTemperaturePlot && this.plotModeInit === PLOT_MODES.TEMPERATURE_FIELD)
            ? PLOT_MODES.BASIC
            : this.plotModeInit;
        return {
            posting: false,
            zoomingPlot: this.zoomedInit,
            currentPlotMode: initialMode,
            includeFringing: this.includeFringingInit,
            blockingRebounds: false,
            recentChange: false,
            tryingToPlot: false,
            showWarning: false,
            lastSimulatedInputs: "",
            lastSimulatedMagnetics: "",
            lastPlotMode: null,
            lastForceUpdate: 0,
            errorMessage: "",
            width: "75%",
            isMounted: false,
            PLOT_MODES,
            PLOT_MODE_LABELS,
        };
    },
    computed: {
        // Real winding: the coil drawn as it is actually wound (leads, pitch, dragbacks)
        // instead of idealised per-turn rings. Owned by the "Real winding" switch in
        // Tool menu > Settings > Display, and read straight from the global settings store
        // so this view and the 3D one always draw the same thing.
        realWinding() {
            return this.$settingsStore?.magneticBuilderSettings?.useRealWindingGeometry ?? false;
        },
        showFringingOption() {
            return this.currentPlotMode === PLOT_MODES.MAGNETIC_FIELD && (this.enableOptions || this.enableFringingOption);
        },
        currentModeLabel() {
            return PLOT_MODE_LABELS[this.currentPlotMode] || 'Basic';
        },
        effectiveAvailablePlotModes() {
            let modes = this.availablePlotModes;
            if (!this.enableTemperaturePlot) {
                modes = modes.filter(m => m !== PLOT_MODES.TEMPERATURE_FIELD);
            }
            // The connection face only exists as a view once the winding is drawn with its
            // real connections; with real winding off there is nothing in it to see.
            if (this.realWinding) {
                if (!modes.includes(PLOT_MODES.CONNECTIONS_YZ)) {
                    modes = [...modes, PLOT_MODES.CONNECTIONS_YZ];
                }
            }
            else {
                modes = modes.filter(m => m !== PLOT_MODES.CONNECTIONS_YZ);
            }
            return modes;
        },
    },
    watch: {
        // Changing it changes the GEOMETRY MKF paints, so the plot has to be redrawn.
        realWinding(newValue) {
            // The connection view disappears with the setting; don't leave the component
            // showing a mode it no longer offers.
            if (!newValue && this.currentPlotMode === PLOT_MODES.CONNECTIONS_YZ) {
                this.currentPlotMode = PLOT_MODES.BASIC;
            }
            this.handleModelChange(true);
        },
        forceUpdate: {
            handler() {
                this.handleModelChange(true);
            },
            deep: true,
        },
        operatingPointIndex: {
            handler() {
                this.handleModelChange(false);
            },
            deep: true,
        },
        plotModeInit(newValue) {
            if (!this.enableTemperaturePlot && newValue === PLOT_MODES.TEMPERATURE_FIELD) {
                this.currentPlotMode = PLOT_MODES.BASIC;
                return;
            }
            this.currentPlotMode = newValue;
        },
        includeFringingInit(newValue) {
            this.includeFringing = newValue;
        },
    },
    methods: {
        handleModelChange(checkWarning = false) {
            if (this.blockingRebounds || !this.isMounted) {
                return;
            }
            if (this.modelValue.magnetic == null || this.modelValue.inputs == null) {
                return;
            }

            const inputsString = JSON.stringify(this.modelValue.inputs);
            const magneticsString = JSON.stringify(this.modelValue.magnetic);
            const currentPlotMode = this.plotModeInit;

            // Check if anything has changed: inputs, magnetics, plot mode, or forceUpdate (models)
            const inputsChanged = inputsString !== this.lastSimulatedInputs;
            const magneticsChanged = magneticsString !== this.lastSimulatedMagnetics;
            const plotModeChanged = currentPlotMode !== this.lastPlotMode;
            const forceUpdateChanged = this.forceUpdate !== this.lastForceUpdate;

            if (!inputsChanged && !magneticsChanged && !plotModeChanged && !forceUpdateChanged) {
                return;
            }

            // Set posting immediately to dim the old image
            this.posting = true;
            this.blockingRebounds = true;
            this.zoomingPlot = false;
            this.currentPlotMode = this.plotModeInit;
            this.includeFringing = this.includeFringingInit;
            this.zoomOut();
            this.recentChange = true;
            this.tryToPlot();

            setTimeout(() => { this.blockingRebounds = false; }, DEBOUNCE_DELAY_MS);
            if (checkWarning) {
                setTimeout(() => this.checkShowWarning(), WARNING_CHECK_DELAY_MS);
            }

            this.lastSimulatedInputs = inputsString;
            this.lastSimulatedMagnetics = magneticsString;
            this.lastPlotMode = currentPlotMode;
            this.lastForceUpdate = this.forceUpdate;
        },
        checkShowWarning() {
            this.showWarning = !this.coilFits && !(this.posting || this.tryingToPlot || this.recentChange);
        },
        tryToPlot() {
            if (this.tryingToPlot || !this.isMounted) {
                return;
            }
            this.recentChange = false;
            this.tryingToPlot = true;
            setTimeout(() => {
                if (!this.isMounted) {
                    this.tryingToPlot = false;
                    return;
                }
                if (this.recentChange) {
                    this.tryingToPlot = false;
                    this.tryToPlot();
                } else {
                    setTimeout(() => {
                        if (this.isMounted) {
                            this.posting = true;
                            this.plot();
                        }
                    }, PLOT_DELAY_MS);
                }
            }, this.$settingsStore.waitingTimeForPlottingAfterChange);
        },
        processSvgResult(result) {
            // Check if component is still mounted
            if (!this.isMounted) {
                return;
            }

            const isValidSvg = result.startsWith("<svg");
            if (!isValidSvg) {
                // The engine answers "Exception: ..." when it cannot draw. Show why, and hand the
                // reason up: a failure with a reason is not retried (BasicCoilBuilder.errorInImage).
                console.error('[Magnetic2DVisualizer] plot failed:', result);
                this.handlePlotError(String(result));
                return;
            }

            // Check refs are available
            if (!this.$refs.plotView) {
                this.posting = false;
                return;
            }

            this.$refs.plotView.innerHTML = sanitizeSvg(result);

            if (this.$refs.Magnetic2DVisualizerContainer == null) {
                this.posting = false;
                return;
            }

            // Fit the SVG's viewBox to its actual content. MKF's
            // plot_temperature_field occasionally emits a viewBox that is
            // narrower on Y than the paths it draws (toroid rendered sideways
            // with a colorbar extending X), which clips the top/bottom of the
            // toroid in the browser. Recompute the content bbox and widen the
            // viewBox to match, preserving aspect by letting the browser
            // apply preserveAspectRatio (default xMidYMid meet).
            try {
                const svgEl = this.$refs.plotView.querySelector('svg');
                if (svgEl) {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    for (const el of svgEl.querySelectorAll('*')) {
                        try {
                            const b = el.getBBox?.();
                            if (b && isFinite(b.x) && (b.width > 0 || b.height > 0)) {
                                minX = Math.min(minX, b.x);
                                minY = Math.min(minY, b.y);
                                maxX = Math.max(maxX, b.x + b.width);
                                maxY = Math.max(maxY, b.y + b.height);
                            }
                        } catch { /* some elements don't support getBBox */ }
                    }
                    if (isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
                        // For toroidal SVGs (identified by the scale(1,-1) Y-flip group added
                        // by MKF's export_svg), getBBox() reports coordinates in pre-flip local
                        // space and ignores stroke-width, producing a portrait bbox even though
                        // the physical core is circular. Force a symmetric square viewBox so the
                        // full toroid ring (including its stroke) is always visible.
                        const isToroid = !!svgEl.querySelector('g[transform="scale(1,-1)"]');
                        let vbX, vbY, vbW, vbH;
                        if (isToroid) {
                            const half = Math.max(
                                Math.abs(minX), Math.abs(maxX),
                                Math.abs(minY), Math.abs(maxY)
                            ) * 1.04; // 4% padding for strokes
                            vbX = -half; vbY = -half; vbW = 2 * half; vbH = 2 * half;
                        } else {
                            // Small padding so strokes at the edges aren't cut.
                            const padX = (maxX - minX) * 0.02;
                            const padY = (maxY - minY) * 0.02;
                            vbX = minX - padX;
                            vbY = minY - padY;
                            vbW = (maxX - minX) + padX * 2;
                            vbH = (maxY - minY) + padY * 2;
                        }
                        svgEl.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
                        // Aspect-preserving fit is the viewBox's job, so say so explicitly
                        // rather than relying on the default: the drawing then scales UP to
                        // fill the panel instead of sitting at its intrinsic pixel size (a
                        // drum core rendered 50 x 83 in a 524 x 260 box).
                        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                        // Update the intrinsic width/height attributes so the
                        // downstream `extractSvgDimension` + scaling math sees
                        // the corrected aspect ratio. Keep them as numeric
                        // strings so the existing regex in calculateSvgWidth
                        // still matches.
                        svgEl.setAttribute('width', vbW.toFixed(1));
                        svgEl.setAttribute('height', vbH.toFixed(1));
                    }
                }
            } catch (e) {
                console.warn('[processSvgResult] viewBox recalculation skipped:', e);
            }

            // Re-read the corrected HTML/dims for the scaling calculation.
            const correctedHtml = this.$refs.plotView.innerHTML;
            const clientWidth = this.$refs.Magnetic2DVisualizerContainer.clientWidth;
            const clientHeight = this.$refs.Magnetic2DVisualizerContainer.clientHeight * (this.enableOptions ? OPTIONS_HEIGHT_MULTIPLIER : 1);

            const originalWidth = extractSvgDimension(correctedHtml, 'width');
            const originalHeight = extractSvgDimension(correctedHtml, 'height');

            this.width = this.calculateSvgWidth(originalWidth, originalHeight, clientWidth, clientHeight);
            this.$refs.plotView.innerHTML = this.$refs.plotView.innerHTML.replace('width=', 'class="scaling-svg" width=');

            // Apply the fitted size to the svg ELEMENT, in pixels.
            //
            // Percentages were the problem, not the solution: `width:100%;height:100%` has to
            // resolve through .scaling-svg-container and .Magnetic2DVisualizer, and any
            // auto-height link in that chain makes the height fall back to intrinsic — which
            // let the drawing grow to 524 x 870 inside a 260-tall panel. The container is
            // already measured here, so scale against those numbers directly and there is
            // nothing left to resolve.
            const fittedSvg = this.$refs.plotView.querySelector('svg');
            if (fittedSvg && originalWidth > 0 && originalHeight > 0 && clientWidth > 0 && clientHeight > 0) {
                const proportion = Math.min(clientWidth / originalWidth, clientHeight / originalHeight);
                if (isFinite(proportion) && proportion > 0) {
                    fittedSvg.setAttribute('width', `${(originalWidth * proportion).toFixed(1)}`);
                    fittedSvg.setAttribute('height', `${(originalHeight * proportion).toFixed(1)}`);
                    fittedSvg.style.width = `${(originalWidth * proportion).toFixed(1)}px`;
                    fittedSvg.style.height = `${(originalHeight * proportion).toFixed(1)}px`;
                }
            }

            this.errorMessage = "";
            this.posting = false;
        },
        calculateSvgWidth(originalWidth, originalHeight, clientWidth, clientHeight) {
            if (originalWidth > originalHeight * ASPECT_RATIO_THRESHOLD) {
                return "100%";
            }
            // Fit to whichever dimension binds FIRST, not to height alone.
            //
            // Height-only scaling assumes the container has a height worth filling. It does
            // not always: the container is height:100% inside a content-sized parent, so for a
            // portrait drawing it collapses to roughly the image's own height and the image is
            // then "scaled" to the size it already was. Measured on a drum core: a 50 x 83 SVG
            // in a 524 x 91 box, rendered at 50 x 83 — unscaled, and tiny beside the panel it
            // sits in. Landscape cores never showed it because they take the 100% branch above.
            //
            // Taking the smaller of the two ratios keeps the aspect and guarantees the drawing
            // fits both ways, so a portrait core fills the space a landscape one already does.
            // A non-positive or unknown client dimension falls back to the other one rather
            // than producing a zero or NaN width.
            const heightProportion = clientHeight > 0 ? clientHeight / originalHeight : Infinity;
            const widthProportion = clientWidth > 0 ? clientWidth / originalWidth : Infinity;
            const proportion = Math.min(heightProportion, widthProportion);
            if (!isFinite(proportion) || proportion <= 0) {
                return "100%";
            }
            return `${originalWidth * proportion}px`;
        },
        handlePlotError(message) {
            this.posting = false;
            if (message) {
                this.errorMessage = message;
            }
            this.$emit("errorInImage", message);
            this.lastSimulatedInputs = "";
            this.lastSimulatedMagnetics = "";
            this.lastForceUpdate = 0;
        },
        clearPlotViews() {
            if (!this.isMounted) {
                return;
            }
            if (this.$refs.plotView) {
                this.$refs.plotView.innerHTML = "";
            }
            if (this.$refs.zoomPlotView) {
                this.$refs.zoomPlotView.innerHTML = "";
            }
        },
        async calculateBasicPlot() {
            if (this.modelValue.magnetic == null) {
                this.posting = false;
                this.tryingToPlot = false;
                return;
            }
            if (this.modelValue.magnetic.coil.turnsDescription == null) {
                this.clearPlotViews();
                this.posting = false;
                this.tryingToPlot = false;
                // Reset cache so next plot will definitely execute when turns are populated
                this.lastSimulatedInputs = "";
                this.lastSimulatedMagnetics = "";
                this.lastForceUpdate = 0;
                return;
            }

            try {
                const mkf = await waitForMkf();
                // Apply insulation/margin colors before plotting
                const settings = JSON.parse(await mkf.get_settings());
                settings.painterColorInsulation = this.insulationColor;
                settings.painterColorMargin = this.marginColor;
                settings.painterColorSpacer = this.spacerColor;
                settings.painterColorFerrite = this.ferriteColor;
                settings.painterColorCopper = this.copperColor;
                settings.painterDrawSpacer = this.drawSpacer;
                // Real winding: MKF lays the turns out as they are actually wound
                // (leads, pitch, dragbacks) rather than as idealised rings. One flag
                // for the whole app, so the 2D and 3D views never disagree about what
                // they are drawing. Tool menu > Settings > Display > Real winding.
                settings.coilUseRealWindingGeometry = this.realWinding;
                await mkf.set_settings(JSON.stringify(settings));
                // plot_turns draws core + bobbin + turns and stops there — it never draws how
                // the turns are CONNECTED. With real winding on that is exactly what is being
                // asked for, so paint the magnetic instead: the XY projection adds the
                // inter-layer links, dragbacks and terminal leads on top of the same view.
                const magneticJson = JSON.stringify(this.modelValue.magnetic);
                const result = this.realWinding
                    ? await mkf.plot_magnetic(magneticJson, 'XY')
                    : await mkf.plot_turns(magneticJson);
                this.processSvgResult(result);
            } catch (error) {
                console.error('Error in calculateBasicPlot:', error);
                this.posting = false;
                this.tryingToPlot = false;
            }
        },
        // Connection face (YZ): the projection where the terminal leads are seen end-on,
        // together with the inter-layer links and dragbacks. Real winding only — see
        // effectiveAvailablePlotModes, which is what puts this mode in the picker.
        async calculateConnectionsPlot() {
            if (this.modelValue.magnetic == null) {
                return;
            }
            try {
                const mkf = await waitForMkf();
                const settings = JSON.parse(await mkf.get_settings());
                settings.painterColorInsulation = this.insulationColor;
                settings.painterColorMargin = this.marginColor;
                settings.painterColorSpacer = this.spacerColor;
                settings.painterColorFerrite = this.ferriteColor;
                settings.painterColorCopper = this.copperColor;
                settings.painterDrawSpacer = this.drawSpacer;
                settings.coilUseRealWindingGeometry = this.realWinding;
                await mkf.set_settings(JSON.stringify(settings));
                const result = await mkf.plot_magnetic(JSON.stringify(this.modelValue.magnetic), 'YZ');
                this.processSvgResult(result);
            } catch (error) {
                console.error('Error in calculateConnectionsPlot:', error);
                this.posting = false;
                this.tryingToPlot = false;
            }
        },
        async calculateMagneticFieldPlot() {
            if (this.modelValue.magnetic == null) {
                this.posting = false;
                this.tryingToPlot = false;
                return;
            }
            if (this.modelValue.magnetic.coil.turnsDescription == null) {
                this.clearPlotViews();
                this.posting = false;
                this.tryingToPlot = false;
                // Reset cache so next plot will definitely execute when turns are populated
                this.lastSimulatedInputs = "";
                this.lastSimulatedMagnetics = "";
                this.lastForceUpdate = 0;
                return;
            }

            try {
                const mkf = await waitForMkf();
                const settings = JSON.parse(await mkf.get_settings());
                settings.painterSimpleLitz = true;
                settings.painterAdvancedLitz = false;
                settings.painterColorFerrite = this.ferriteColor;
                settings.painterIncludeFringing = this.includeFringing;
                // Real winding: MKF lays the turns out as they are actually wound
                // (leads, pitch, dragbacks) rather than as idealised rings. One flag
                // for the whole app, so the 2D and 3D views never disagree about what
                // they are drawing. Tool menu > Settings > Display > Real winding.
                settings.coilUseRealWindingGeometry = this.realWinding;
                await mkf.set_settings(JSON.stringify(settings));

                const result = await mkf.plot_magnetic_field(
                    JSON.stringify(this.modelValue.magnetic),
                    JSON.stringify(this.modelValue.inputs.operatingPoints[this.operatingPointIndex])
                );
                this.processSvgResult(result);
            } catch (error) {
                console.error('Error in calculateMagneticFieldPlot:', error);
                this.posting = false;
                this.tryingToPlot = false;
            }
        },
        async calculateElectricFieldPlot() {
            if (this.modelValue.magnetic == null) {
                this.posting = false;
                this.tryingToPlot = false;
                return;
            }
            if (this.modelValue.magnetic.coil.turnsDescription == null) {
                this.clearPlotViews();
                this.posting = false;
                this.tryingToPlot = false;
                // Reset cache so next plot will definitely execute when turns are populated
                this.lastSimulatedInputs = "";
                this.lastSimulatedMagnetics = "";
                this.lastForceUpdate = 0;
                return;
            }

            try {
                const mkf = await waitForMkf();
                const settings = JSON.parse(await mkf.get_settings());
                settings.painterSimpleLitz = true;
                settings.painterAdvancedLitz = false;
                settings.painterColorFerrite = this.ferriteColor;
                // Real winding: MKF lays the turns out as they are actually wound
                // (leads, pitch, dragbacks) rather than as idealised rings. One flag
                // for the whole app, so the 2D and 3D views never disagree about what
                // they are drawing. Tool menu > Settings > Display > Real winding.
                settings.coilUseRealWindingGeometry = this.realWinding;
                await mkf.set_settings(JSON.stringify(settings));

                const result = await mkf.plot_electric_field(
                    JSON.stringify(this.modelValue.magnetic),
                    JSON.stringify(this.modelValue.inputs.operatingPoints[this.operatingPointIndex])
                );
                this.processSvgResult(result);
            } catch (error) {
                console.error('Error in calculateElectricFieldPlot:', error);
                this.posting = false;
                this.tryingToPlot = false;
            }
        },
        // Validate that wire data is complete for temperature plot
        validateWiresForTemperaturePlot() {
            const coil = this.modelValue.magnetic?.coil;
            if (!coil?.functionalDescription?.length) {
                return { valid: false, error: 'No windings defined' };
            }

            for (let i = 0; i < coil.functionalDescription.length; i++) {
                const winding = coil.functionalDescription[i];
                const wire = winding?.wire;
                if (!wire) {
                    return { valid: false, error: `Winding ${i} has no wire defined` };
                }

                // Check wire type and required dimensions
                const wireType = wire.type;
                if (wireType === 'round') {
                    if (!wire.conductingDiameter?.nominal) {
                        return {
                            valid: false,
                            error: `Winding ${i} (${wire.name || 'unnamed'}): Round wire missing conductingDiameter. Please load a wire from the catalog or define the wire dimensions.`
                        };
                    }
                } else if (wireType === 'litz') {
                    if (!wire.strand?.conductingDiameter) {
                        return {
                            valid: false,
                            error: `Winding ${i} (${wire.name || 'unnamed'}): Litz wire missing strand conductingDiameter. Please load a wire from the catalog or define the wire dimensions.`
                        };
                    }
                } else if (wireType === 'rectangular' || wireType === 'foil' || wireType === 'planar') {
                    if (!wire.conductingWidth?.nominal || !wire.conductingHeight?.nominal) {
                        return { 
                            valid: false, 
                            error: `Winding ${i} (${wire.name || 'unnamed'}): Rectangular/foil/planar wire missing conductingWidth/Height. Please load a wire from the catalog or define the wire dimensions.` 
                        };
                    }
                }
            }

            return { valid: true };
        },

        // Temperature field plot - uses existing WASM function
        async calculateTemperatureFieldPlot() {
            if (this.modelValue.magnetic == null) {
                this.posting = false;
                this.tryingToPlot = false;
                return;
            }
            if (this.modelValue.magnetic.coil.turnsDescription == null) {
                this.clearPlotViews();
                this.posting = false;
                this.tryingToPlot = false;
                // Reset cache so next plot will definitely execute when turns are populated
                this.lastSimulatedInputs = "";
                this.lastSimulatedMagnetics = "";
                this.lastForceUpdate = 0;
                return;
            }

            // Validate wire data before calling temperature plot
            const validation = this.validateWiresForTemperaturePlot();
            if (!validation.valid) {
                // Web bug reports #165 and #167: two users independently reported that
                // temperature estimation "does not work" / "is lagy". It was neither. The
                // reason was computed correctly right here and then thrown away -- the
                // parents re-emit errorInImage with no payload and the builder answers a
                // deterministic failure with a 1 s retry timer, which is what reads as lag.
                // The component already renders this.errorMessage; it was simply never set.
                console.error('[Temperature Plot] Validation failed:', validation.error);
                this.errorMessage = validation.error;
                this.$emit('errorInImage', `Temperature plot error: ${validation.error}`);
                this.posting = false;
                this.tryingToPlot = false;
                return;
            }

            try {
                const mkf = await waitForMkf();
                const settings = JSON.parse(await mkf.get_settings());
                settings.painterSimpleLitz = true;
                settings.painterAdvancedLitz = false;
                settings.painterColorFerrite = this.ferriteColor;
                // Real winding: MKF lays the turns out as they are actually wound
                // (leads, pitch, dragbacks) rather than as idealised rings. One flag
                // for the whole app, so the 2D and 3D views never disagree about what
                // they are drawing. Tool menu > Settings > Display > Real winding.
                settings.coilUseRealWindingGeometry = this.realWinding;
                await mkf.set_settings(JSON.stringify(settings));
                // Ensure color values are plain strings (not reactive objects)
                const textColorStr = String(this.textColor || 'var(--p-white)');
                const bgColorStr = String(this.backgroundColor || 'var(--p-dark)');
                const result = await mkf.plot_temperature_field(
                    JSON.stringify(this.modelValue.magnetic),
                    JSON.stringify(this.modelValue.inputs.operatingPoints[this.operatingPointIndex]),
                    textColorStr,
                    bgColorStr
                );
                // Check if result is an error message (doesn't start with <svg)
                if (!result?.startsWith('<svg')) {
                    // Same swallow as the validation path above: the engine says exactly
                    // what is wrong (e.g. "[INVALID_WIRE_DATA] Coating is missing material
                    // information" for a served litz bundle) and the user was shown nothing.
                    console.error('[Temperature Plot] ERROR - Result is not an SVG:', result);
                    this.errorMessage = String(result);
                    this.$emit('errorInImage', 'Temperature plot error: ' + result);
                    this.posting = false;
                    this.tryingToPlot = false;
                    return;
                }
                this.processSvgResult(result);
            } catch (error) {
                console.error('[Temperature Plot] Error:', error);
                this.errorMessage = String(error?.message ?? error);
                this.$emit('errorInImage', 'Temperature plot error: ' + this.errorMessage);
                this.posting = false;
                this.tryingToPlot = false;
            }
        },
        // Wire losses plot - uses existing WASM function
        async calculateWiresLossesPlot() {
            if (this.modelValue.magnetic == null) {
                this.posting = false;
                this.tryingToPlot = false;
                return;
            }
            if (this.modelValue.magnetic.coil.turnsDescription == null) {
                this.clearPlotViews();
                this.posting = false;
                this.tryingToPlot = false;
                // Reset cache so next plot will definitely execute when turns are populated
                this.lastSimulatedInputs = "";
                this.lastSimulatedMagnetics = "";
                this.lastForceUpdate = 0;
                return;
            }

            try {
                const mkf = await waitForMkf();
                const settings = JSON.parse(await mkf.get_settings());
                settings.painterSimpleLitz = true;
                settings.painterAdvancedLitz = false;
                settings.painterColorFerrite = this.ferriteColor;
                // Real winding: MKF lays the turns out as they are actually wound
                // (leads, pitch, dragbacks) rather than as idealised rings. One flag
                // for the whole app, so the 2D and 3D views never disagree about what
                // they are drawing. Tool menu > Settings > Display > Real winding.
                settings.coilUseRealWindingGeometry = this.realWinding;
                await mkf.set_settings(JSON.stringify(settings));

                const result = await mkf.plot_wire_losses(
                    JSON.stringify(this.modelValue.magnetic),
                    JSON.stringify(this.modelValue.inputs.operatingPoints[this.operatingPointIndex])
                );

                this.processSvgResult(result);
            } catch (error) {
                console.error('Error in calculateWiresLossesPlot:', error);
                this.posting = false;
                this.tryingToPlot = false;
            }
        },
        // Placeholder for turns colored by winding - TBD in WASM
        calculateColoredByWindingPlot() {
            if (this.modelValue.magnetic == null) {
                return;
            }
            if (this.modelValue.magnetic.coil.turnsDescription == null) {
                this.clearPlotViews();
                return;
            }

            // TODO: Implement when WASM function is available
            // this.$mkf.ready.then(() => {
            //     const result = this.$mkf.plot_turns_colored_by_winding(JSON.stringify(this.modelValue.magnetic));
            //     this.processSvgResult(result);
            // });
            console.warn('Colored by winding plot not yet implemented in WASM');
            this.calculateBasicPlot(); // Fallback to basic plot
        },
        // Placeholder for turns colored by parallel - TBD in WASM
        calculateColoredByParallelPlot() {
            if (this.modelValue.magnetic == null) {
                return;
            }
            if (this.modelValue.magnetic.coil.turnsDescription == null) {
                this.clearPlotViews();
                return;
            }

            // TODO: Implement when WASM function is available
            // this.$mkf.ready.then(() => {
            //     const result = this.$mkf.plot_turns_colored_by_parallel(JSON.stringify(this.modelValue.magnetic));
            //     this.processSvgResult(result);
            // });
            console.warn('Colored by parallel plot not yet implemented in WASM');
            this.calculateBasicPlot(); // Fallback to basic plot
        },
        // Placeholder for turns colored by turn - TBD in WASM
        calculateColoredByTurnPlot() {
            if (this.modelValue.magnetic == null) {
                return;
            }
            if (this.modelValue.magnetic.coil.turnsDescription == null) {
                this.clearPlotViews();
                return;
            }

            // TODO: Implement when WASM function is available
            // this.$mkf.ready.then(() => {
            //     const result = this.$mkf.plot_turns_colored_by_turn(JSON.stringify(this.modelValue.magnetic));
            //     this.processSvgResult(result);
            // });
            console.warn('Colored by turn plot not yet implemented in WASM');
            this.calculateBasicPlot(); // Fallback to basic plot
        },
        zoomIn() {
            this.zoomingPlot = true;
            // Wait for Vue to render the modal before copying the content
            this.$nextTick(() => {
                if (this.$refs.plotView && this.$refs.zoomPlotView) {
                    this.$refs.zoomPlotView.innerHTML = this.$refs.plotView.innerHTML;
                    // Make the SVG fill the modal
                    const svg = this.$refs.zoomPlotView.querySelector('svg');
                    if (svg) {
                        svg.style.width = '100%';
                        svg.style.height = '100%';
                        svg.style.maxWidth = '100%';
                        svg.style.maxHeight = '100%';
                    }
                }
            });
            this.$emit("zoomIn");
        },
        zoomOut() {
            this.zoomingPlot = false;
            this.$emit("zoomOut");
        },
        setPlotMode(mode) {
            if (mode === PLOT_MODES.TEMPERATURE_FIELD && !this.enableTemperaturePlot) {
                return;
            }
            if (this.currentPlotMode === mode) {
                // Toggle back to basic if clicking the same mode
                this.currentPlotMode = PLOT_MODES.BASIC;
            } else {
                this.currentPlotMode = mode;
            }
            setTimeout(() => {
                if (this.isMounted) {
                    this.posting = true;
                    this.plot();
                }
            }, PLOT_DELAY_MS);
            this.$emit("plotModeChange", this.currentPlotMode);
        },
        swapIncludeFringing() {
            this.includeFringing = !this.includeFringing;
            setTimeout(() => {
                if (this.isMounted) {
                    this.posting = true;
                    this.plot();
                }
            }, PLOT_DELAY_MS);
            this.$emit("swapIncludeFringing", this.includeFringing);
        },
        plot() {
            if (!this.isMounted) {
                return;
            }
            this.errorMessage = "";
            this.tryingToPlot = false;
            switch (this.currentPlotMode) {
                case PLOT_MODES.MAGNETIC_FIELD:
                    this.calculateMagneticFieldPlot();
                    break;
                case PLOT_MODES.ELECTRIC_FIELD:
                    this.calculateElectricFieldPlot();
                    break;
                case PLOT_MODES.TEMPERATURE_FIELD:
                    if (!this.enableTemperaturePlot) {
                        this.currentPlotMode = PLOT_MODES.BASIC;
                        this.calculateBasicPlot();
                        break;
                    }
                    this.calculateTemperatureFieldPlot();
                    break;
                case PLOT_MODES.WIRES_LOSSES:
                    this.calculateWiresLossesPlot();
                    break;
                case PLOT_MODES.COLORED_BY_WINDING:
                    this.calculateColoredByWindingPlot();
                    break;
                case PLOT_MODES.COLORED_BY_PARALLEL:
                    this.calculateColoredByParallelPlot();
                    break;
                case PLOT_MODES.COLORED_BY_TURN:
                    this.calculateColoredByTurnPlot();
                    break;
                case PLOT_MODES.CONNECTIONS_YZ:
                    this.calculateConnectionsPlot();
                    break;
                case PLOT_MODES.BASIC:
                default:
                    this.calculateBasicPlot();
            }
        },
        showCoilAnyway() {
            this.$stateStore.wire2DVisualizerState.showAnyway = true;
        },
        getModeLabel(mode) {
            return PLOT_MODE_LABELS[mode] || mode;
        },
        isModeActive(mode) {
            return this.currentPlotMode === mode;
        },
    },
    mounted() {
        this.isMounted = true;
        this.lastPlotMode = this.plotModeInit;
        setTimeout(() => {
            if (this.isMounted) {
                this.posting = true;
                this.plot();
            }
        }, PLOT_DELAY_MS);
    },
    beforeUnmount() {
        this.isMounted = false;
        // Reset loading state to prevent stuck loading when component is destroyed
        this.posting = false;
        this.tryingToPlot = false;
        this.blockingRebounds = false;
    },
}

</script>

<template>
    <div v-if="modelValue.magnetic != null && showWarning && modelValue.magnetic.coil.turnsDescription == null" class="container">
        <div class="grid">
            <i class="col-12 pi pi-exclamation-triangle display-1"></i>
            <label class="text-danger col-12 pt-1 text-lg" style="font-size: 1em">Winding turns not possible</label>
        </div>
    </div>
    <div v-if="showWarning && !$stateStore.wire2DVisualizerState.showAnyway" class="container">
        <div class="grid">
            <i class="col-12 pi pi-exclamation-triangle display-1"></i>
            <label class="text-danger col-12 pt-1 text-lg" style="font-size: 1em">Turns don't fit in winding window</label>
            <button class="p-button p-button-danger col-offset-3 col-6 text-lg" @click="showCoilAnyway()">Show me anyway</button>
        </div>
    </div>

    <div v-else class="m-0 p-0 Magnetic2DVisualizer text-center mx-auto" ref="Magnetic2DVisualizerContainer" style="height: 100%; width: 100%;">
        <!-- Zoom Modal -->
        <div v-if="enableZoom && zoomingPlot" class="zoom-modal-overlay" @click.self="zoomOut()">
            <div class="zoom-modal-overlay-bg" :style="{ backgroundColor: backgroundColor }">
            </div>
            <div class="zoom-modal-content" :style="{ backgroundColor: backgroundColor }">
                <button class="zoom-modal-close" :style="{ color: textColor }" @click="zoomOut()">
                    <i class="pi pi-times"></i>
                </button>
                <div class="zoom-modal-image" ref="zoomPlotView"></div>
            </div>
        </div>

        <div v-show="!zoomingPlot">
            <div class="position-relative">
                <!-- Loading overlay -->
                <div v-if="posting" class="loading-overlay">
                    <img data-cy="CorePublish-loading" class="loading-spinner" alt="loading" :src="loadingGif">
                </div>
                <!-- Plot content with dimmed effect when loading -->
                <div :class="{ 'plot-loading': posting }">
                    <div data-cy="MagneticAdvise-core-field-plot-image" ref="plotView" class="mt-2 scaling-svg-container"/>
                    <div v-if="enableZoom" class="text-center mt-1">
                        <button class="p-button p-button-sm btn-outline-secondary" @click="zoomIn()">
                            <i class="pi pi-window-maximize"></i> Expand
                        </button>
                    </div>
                    <div v-if="modelValue.magnetic != null && enableOptions && modelValue.magnetic.coil.turnsDescription != null" class="text-center">
                        <template v-for="mode in effectiveAvailablePlotModes" :key="mode">
                            <button
                                v-if="mode !== PLOT_MODES.BASIC"
                                :style="buttonStyle"
                                class="btn mt-1 ml-1"
                                :class="isModeActive(mode) ? 'btn-success' : 'btn-primary'"
                                @click="setPlotMode(mode)"
                            >
                                {{ isModeActive(mode) ? 'Hide ' : 'Show ' }}{{ getModeLabel(mode) }}
                            </button>
                        </template>
                    </div>
                    <div v-if="modelValue.magnetic != null && showFringingOption && modelValue.magnetic.coil.turnsDescription != null" class="text-center">
                        <button
                            :style="buttonStyle"
                            class="p-button p-button-primary ml-1 mt-1"
                            @click="swapIncludeFringing()"
                        >
                            {{ includeFringing ? 'Exclude Fringing' : 'Include Fringing' }}
                        </button>
                    </div>
                </div>
            </div>
            <label :data-cy="dataTestLabel + '-ErrorMessage'" class="text-danger m-0" style="font-size: 0.9em"> {{errorMessage}}</label>
        </div>
    </div>

</template>

<style>

    .Magnetic2DVisualizer {
/*        overflow-y: auto; */
        overflow: visible;
        width: auto;
        height: auto;
    }

/* Fill the box, preserving aspect — do not merely CAP the drawing at its intrinsic size.
   width/height:auto plus max-width/max-height can only ever shrink an SVG, so a small
   drawing rendered at its intrinsic pixel size no matter how much room it had: a drum core
   came out 50 x 83 in a 524 x 260 panel. Every plot MKF emits carries a viewBox, so
   width/height 100% with the default preserveAspectRatio (xMidYMid meet) scales it to fit
   and centres it, which is what the old rule was reaching for with object-fit — a property
   that does nothing for an INLINE svg, only for replaced elements like <img>. */
/* The pixel size is set on the element in processSvgResult, from the measured container;
   these are only guard rails so a drawing can never overflow its panel. */
.scaling-svg {
    max-width: 100%;
    max-height: 100%;
    left: 0;
    top: 0;
}

.scaling-svg-container {
    display: flex;
    justify-content: center;
    align-items: center;
    /* A definite height for .scaling-svg's percentage to resolve against; without it the
       container is content-sized and 100% falls back to auto. */
    height: 100%;
    max-height: 50vh;
}

.plot-loading {
    opacity: 0.3;
    filter: brightness(0.5);
    transition: opacity 0.2s ease, filter 0.2s ease;
}

.loading-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
    pointer-events: none;
}

.loading-spinner {
    height: auto;
    max-width: 100px;
}

/* Zoom Modal Styles */
.zoom-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.zoom-modal-overlay-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0.5;
    pointer-events: none;
}

.zoom-modal-content {
    border-radius: 8px;
    padding: 20px;
    width: 90vw;
    height: 90vh;
    position: relative;
    display: flex;
    flex-direction: column;
}

.zoom-modal-close {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    z-index: 1;
}

.zoom-modal-close:hover {
    opacity: 0.7;
}

.zoom-modal-image {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 0;
    overflow: hidden;
}

.zoom-modal-image svg {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}
</style>