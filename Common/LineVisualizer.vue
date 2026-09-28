<script setup>
import { toCamelCase, formatUnit, removeTrailingZeroes, getMultiplier, deepCopy } from '../assets/js/utils.js'
import { use } from 'echarts/core'
import { LineChart, ScatterChart, EffectScatterChart, CustomChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  ToolboxComponent,
  GridComponent,
  DataZoomComponent,
  MarkAreaComponent,
  MarkLineComponent,
} from 'echarts/components'
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts';

use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  ToolboxComponent,
  GridComponent,
  DataZoomComponent,
  MarkAreaComponent,
  MarkLineComponent,
  ScatterChart,
  LineChart,
  EffectScatterChart,
  CustomChart,
  BarChart,
  CanvasRenderer,
  SVGRenderer
])

</script>

<script>
// ECharts renders to <canvas>, which cannot parse CSS custom properties:
// passing "var(--p-primary)" or "rgba(var(--p-x-rgb), .8)" as a fill/stroke is
// silently ignored and ECharts falls back to its default grey. Consumers pass
// theme colors as such var() strings (e.g. inputTextColor = "var(--wuerth-body-
// color, #333333)"), so resolve any CSS color string to a concrete rgb() value
// via a hidden probe element before handing it to the chart.
// Consumers describe axis scales as 'log'/'linear' (the MeasurementSchema
// vocabulary), but ECharts axis types are 'log'/'value'/'time'/'category' —
// an unmapped 'linear' makes ECharts look up the non-existent component
// "yAxis.linear" and abort the render. Normalize at the boundary.
function toAxisType(scale) {
    if (scale === 'log' || scale === 'time' || scale === 'category' || scale === 'value') {
        return scale;
    }
    return 'value';
}

// The scale a series actually renders on, which is not always the one the caller
// asked for: a bar is baselined at zero and a log axis cannot represent zero, so
// bars are always linear. Single source of truth for that override — the axis
// construction and the degenerate-range fallback must agree, or the axis is built
// as one type and rescued as the other.
function effectiveAxisType(datum) {
    return datum.chartType === 'bar' ? 'linear' : datum.type;
}

function resolveCssColor(color) {
    if (typeof color !== 'string' || color === '' || !color.includes('var(')) {
        return color;
    }
    const probe = document.createElement('span');
    probe.style.color = color;
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    document.body.removeChild(probe);
    return resolved || color;
}

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        data: {
            type: Array,
        },
        points: {
            type: Array,
            default: () => []
        },
        xAxisOptions: {
            type: Object,
        },
        title: {
            type: String,
        },
        titleFontSize: {
            type: Number,
            default: 25,
        },
        axisLabelFontSize: {
            type: Number,
            default: 13,
        },
        legendLabels: {
            type: Array,
            default: null,
        },
        showLegend: {
            type: Boolean,
            default: true,
        },
        textColor: {
            type: String,
        },
        bgColor: {
            type: String,
        },
        lineColor: {
            type: String,
        },
        pointsColor: {
            type: String,
        },
        // Y-axis tick labels + axis name default to the series colour (so a red
        // series gives a red, bold-ish left edge). Pass yAxisLabelColor to decouple
        // them (e.g. a neutral textColor) and yAxisLabelFontWeight to un-bold them.
        // Defaults preserve the original series-coloured, weight-500 look.
        yAxisLabelColor: {
            type: String,
            default: null,
        },
        yAxisLabelFontWeight: {
            type: [String, Number],
            default: 500,
        },
        showPoints: {
            type: [Boolean, Array[Boolean]],
            default: true,
        },
        // echarts tooltip trigger. 'item' (default) only shows on hover over a
        // data point — poor for lines drawn with showPoints:false. 'axis' shows
        // the value(s) at the cursor's x-position anywhere along the line.
        tooltipTrigger: {
            type: String,
            default: 'item',
        },
        forceUpdate:{
            type: Number,
            default: 0
        },
        chartStyle:{
            type: String,
            default: 'height: 50vh'
        },
        chartPaddings:{
            type: Object,
            default: {top: 60, left: 60, right: '5%', bottom: 30}
        },
        linePaddings:{
            type: Object,
            default: {top: 1.2, left: 1, right: 1, bottom: 1.2}
        },
        toolbox:{
            type: Boolean,
            default: true
        },
        showGrid:{
            type: Boolean,
            default: true
        },
        showYAxisName:{
            type: Boolean,
            default: false
        },
        forceAxisMin:{
            type: Array,
            default: null
        },
        forceAxisMax:{
            type: Array,
            default: null
        },
        // X-axis counterparts of forceAxisMin/forceAxisMax (which are y-only). Null
        // keeps the data-derived, padded bounds.
        forceXAxisMin:{
            type: Number,
            default: null
        },
        forceXAxisMax:{
            type: Number,
            default: null
        },
        // Explicit tick step. Null lets ECharts choose. Ignored on log axes, where a
        // linear step is meaningless — decades are the only sensible tick there.
        xAxisInterval:{
            type: Number,
            default: null
        },
        yAxisInterval:{
            type: Number,
            default: null
        },
        forceAxisUniquePerSide:{
            type: Boolean,
            default: false
        },
        forceAxisIndependentLimits:{
            type: Boolean,
            default: false
        },
        showArea:{
            type: Boolean,
            default: true
        },
        markArea: {
            type: Object,
            default: null,
        },
        markLine: {
            type: Object,
            default: null,
        },
        // 'canvas' (default) or 'svg'. SVG renders the chart as a <svg> DOM tree,
        // which callers can serialize for scalable exports. Switching re-creates
        // the chart (the instance is keyed on the renderer).
        renderer: {
            type: String,
            default: 'canvas',
        },
    },
    emits: [
        'click',
        'datazoom',
        'restore',
    ],
    data() {
        const limits = this.processLimits()
        const textColor = resolveCssColor(this.textColor)

        const options = {
            title: {
                left: 'center',
                top: 6,
                text: this.title,
                textStyle: {
                    fontSize: this.titleFontSize,
                    color: textColor,
                },
                subtextStyle: {
                    fontSize: Math.round(this.titleFontSize * 0.68),
                    color: textColor,
                }
            },
            tooltip: {
                trigger: this.tooltipTrigger,
                // Resolve var() to concrete rgb() the way the axis/crosshair labels
                // do. Text must use --p-white (the readable foreground, ~#d4d4d4),
                // NOT --p-light: in the dark theme --p-light is a dark surface grey
                // (#2a2a2a), which rendered as dark text on the dark tooltip box.
                backgroundColor: resolveCssColor('rgba(var(--p-dark-rgb), 0.92)'),
                borderColor: resolveCssColor('rgba(var(--p-white-rgb), 0.2)'),
                borderWidth: 1,
                padding: 8,
                textStyle: { color: resolveCssColor('var(--p-white)'), fontSize: 11, fontWeight: 400 },
                extraCssText: 'border-radius: 6px; box-shadow: 0 4px 12px rgba(var(--p-black-rgb), 0.5);',
                axisPointer: {
                    type: 'cross',
                    lineStyle: { color: 'rgba(var(--p-white-rgb), 0.25)', type: 'dashed' },
                    crossStyle: { color: 'rgba(var(--p-white-rgb), 0.25)' },
                    label: {
                        precision: 2,
                        // Drawn on the canvas axes (unlike the HTML tooltip above),
                        // so resolve the var() colors or they render as grey boxes.
                        backgroundColor: resolveCssColor('rgba(var(--p-primary-rgb), 0.85)'),
                        color: resolveCssColor('var(--p-white)'),
                        // Show the crosshair read-out with the SI-prefixed unit
                        // (e.g. "4.86 MHz", "15.83 dB") instead of the raw value,
                        // matching the axis tick labels.
                        formatter: (params) => {
                            const isX = params.axisDimension === 'x';
                            const unit = isX
                                ? this.xAxisOptions.unit
                                : (this.data[params.axisIndex]?.unit ?? this.data[0]?.unit);
                            if (unit == null) return `${removeTrailingZeroes(params.value, 2)}`;
                            const aux = formatUnit(params.value, unit);
                            return `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                        },
                    }
                },
                formatter: (params) => {
                    // 'item' trigger passes a single param; 'axis' trigger passes
                    // an array (one per series at the hovered x). Handle both.
                    const formatOne = (param) => {
                        if (param.seriesIndex < this.data.length) {
                            const xDatum = this.data[param.seriesIndex].data.x[param.dataIndex];
                            const yDatum = this.data[param.seriesIndex].data.y[param.dataIndex];
                            const xAux = formatUnit(xDatum, this.xAxisOptions.unit);
                            const yAux = formatUnit(yDatum, this.data[param.seriesIndex].unit);
                            const xText = this.xAxisOptions.unit == null? removeTrailingZeroes(xDatum, 2) : `${removeTrailingZeroes(xAux.label, 2)} ${xAux.unit}`;
                            const yText = this.data[param.seriesIndex].unit == null? removeTrailingZeroes(yDatum, 2) : `${removeTrailingZeroes(yAux.label, 2)} ${yAux.unit}`;

                            return `${yText} @ ${xText}`;
                        }
                        else {
                            const newIndex = param.seriesIndex - this.data.length;
                            // Band (custom polygon) series sit after the points and
                            // carry no hoverable data — skip them.
                            if (!this.points[newIndex]) return '';
                            const xDatum = this.points[newIndex].data.x;
                            const yDatum = this.points[newIndex].data.y;
                            const xAux = formatUnit(xDatum, this.xAxisOptions.unit);
                            const yAux = formatUnit(yDatum, this.points[newIndex].unit);
                            const xText = this.xAxisOptions.unit == null? removeTrailingZeroes(xDatum, 2) : `${removeTrailingZeroes(xAux.label, 2)} ${xAux.unit}`;
                            const yText = this.points[newIndex].unit == null? removeTrailingZeroes(yDatum, 2) : `${removeTrailingZeroes(yAux.label, 2)} ${yAux.unit}`;

                            return `Requirement: ${yText} @ ${xText}`;
                        }
                    };

                    if (Array.isArray(params)) {
                        return params.map(formatOne).join('<br/>');
                    }
                    return formatOne(params);
                },
            },
            toolbox: !this.toolbox? null : {
                    right: 20,
                    feature: {
                        dataZoom: {}
                    }
                },
            legend: {
                show: this.showLegend,
                orient: 'horizontal',
                left: 'center',
                top: this.title ? Math.round(this.titleFontSize * 1.5) + 6 : 6,
                icon: 'circle',
                itemWidth: 8,
                itemHeight: 8,
                itemGap: 14,
                textStyle: {
                    color: textColor,
                    fontSize: 11,
                    fontWeight: 400,
                }
            },
            xAxis: {
                min: limits.xAxis.min,
                max: limits.xAxis.max,
                type: toAxisType(this.xAxisOptions.type),
                splitLine: {
                    show: this.showGrid,
                    // Theme-agnostic gridline: visible on both light and dark
                    // backgrounds (the old white was invisible on light surfaces).
                    lineStyle: { color: 'rgba(128, 128, 128, 0.35)' },
                },
                axisLine: { lineStyle: { color: textColor || 'rgba(128, 128, 128, 0.55)' } },
                axisTick: { show: false },
                axisLabel: {
                    fontSize: this.axisLabelFontSize,
                    color: textColor,
                    fontWeight: 500,
                    margin: 8,
                    hideOverlap: true,

                    formatter: (value) => {
                        const aux = formatUnit(value, this.xAxisOptions.unit);
                        const text = this.xAxisOptions.unit == null? value : `${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
                        return `${text}`;
                    },
                }
            },
            yAxis: [],

            grid: this.chartPaddings,

            animation: false,
            backgroundColor: this.bgColor,
            series: [
                {
                  data: [
                    [20, 120],
                    [50, 200],
                    [40, 50]
                  ],
                  type: 'line'
                }
            ]
        };

        const updateOpts = {
            notMerge: true,
        }

        return {
            options,
            updateOpts,
            chartVisible: false,
            _visibilityObserver: null,
        }
    },
    watch: {
        'forceUpdate': {
            handler(newValue, oldValue) {
                this.processOptions(this.options);
            },
          deep: true
        },
        'data': {
            handler(newValue, oldValue) {
                this.processOptions(this.options);
            },
            deep: true
        },
    },
    mounted() {
        // Initialize series and yAxis from data prop
        if (this.data && this.data.length > 0) {
            this.processOptions(this.options);
        }

        // Defer ECharts init until the chart wrapper actually has dimensions.
        // Without this, mounting the chart inside a hidden tab/collapse triggers
        // a "Can't get DOM width or height" warning from ECharts.
        const el = this.$refs.chartWrapper;
        if (el && typeof IntersectionObserver !== 'undefined') {
            const checkSize = () => {
                if (el.clientWidth > 0 && el.clientHeight > 0) {
                    this.chartVisible = true;
                    if (this._visibilityObserver) {
                        this._visibilityObserver.disconnect();
                        this._visibilityObserver = null;
                    }
                    return true;
                }
                return false;
            };
            if (!checkSize()) {
                this._visibilityObserver = new IntersectionObserver(() => { checkSize(); });
                this._visibilityObserver.observe(el);
            }
        } else {
            this.chartVisible = true;
        }
    },
    beforeUnmount() {
        if (this._visibilityObserver) {
            this._visibilityObserver.disconnect();
            this._visibilityObserver = null;
        }
    },
    created() {
    },
    computed: {
    },
    methods: {
        processData(index) {
            const data = [];
            if (!this.data || !Array.isArray(this.data) || index < 0 || index >= this.data.length) {
                return data;
            }
            const datum = this.data[index];
            if (!datum || !datum.data || !datum.data.x || !Array.isArray(datum.data.x) || 
                !datum.data.y || !Array.isArray(datum.data.y)) {
                return data;
            }
            const minLength = Math.min(datum.data.x.length, datum.data.y.length);
            for (let pointIndex = 0; pointIndex < minLength; pointIndex++) {
                const xVal = datum.data.x[pointIndex];
                const yVal = datum.data.y[pointIndex];
                if (xVal !== undefined && xVal !== null && Number.isFinite(xVal) &&
                    yVal !== undefined && yVal !== null && Number.isFinite(yVal)) {
                    const aux = [xVal, yVal];
                    data.push(aux);
                }
            }
            return data;
        },
        processLimits() {
            const limits = []
            const isLogX = this.xAxisOptions && this.xAxisOptions.type === 'log';

            let xMinimum = Number.MAX_VALUE;
            // NOT Number.MIN_VALUE: that is 5e-324, a POSITIVE number, so a max
            // accumulator seeded with it never drops below it and an all-negative
            // (or empty) x set yields max < min — a degenerate axis that renders
            // as a lone "0" tick.
            let xMaximum = -Number.MAX_VALUE;

            // Calculate x limits across all data
            if (this.data && Array.isArray(this.data)) {
                this.data.forEach((datum) => {
                    if (datum && datum.data && datum.data.x && Array.isArray(datum.data.x)) {
                        datum.data.x.forEach((elem) => {
                            // A log x-axis cannot place x <= 0; including it drags the
                            // axis minimum to 0 and flattens the plot (the y-axis loop
                            // below already guards this for log series).
                            if (elem !== undefined && elem !== null && Number.isFinite(elem) && !(isLogX && elem <= 0)) {
                                xMaximum = Math.max(xMaximum, elem);
                                xMinimum = Math.min(xMinimum, elem);
                            }
                        })
                    }
                })
            }

            // Include points that belong to this axis
            if (this.points && Array.isArray(this.points)) {
                this.points.forEach((elem) => {
                    if (elem && elem.data && elem.data.x !== undefined && elem.data.x !== null && !Number.isNaN(elem.data.x)) {
                        xMaximum = Math.max(xMaximum, elem.data.x);
                        xMinimum = Math.min(xMinimum, elem.data.x);
                    }
                })
            }

            // Calculate separate y limits for each data series (each yAxis)
            limits.yAxis = []
            if (this.data && Array.isArray(this.data)) {
                this.data.forEach((datum, index) => {
                    // Number.MIN_VALUE is the smallest POSITIVE double (5e-324), not the
                    // most negative one — seeding the max tracker with it means an
                    // all-negative series never updates yMaximum, so the axis top lands
                    // at ~0 and the data is squashed against it. -Number.MAX_VALUE is the
                    // real lower bound.
                    let yMinimum = Number.MAX_VALUE;
                    let yMaximum = -Number.MAX_VALUE;

                    const updateWithValue = (elem) => {
                        if (elem !== undefined && elem !== null && Number.isFinite(elem)) {
                            yMaximum = Math.max(yMaximum, elem);
                            if (effectiveAxisType(datum) == "log" && elem > Number.MIN_VALUE) {
                                yMinimum = Math.min(yMinimum, elem);
                            } else if (effectiveAxisType(datum) != "log") {
                                yMinimum = Math.min(yMinimum, elem);
                            }
                        }
                    };
                    if (datum && datum.data && datum.data.y && Array.isArray(datum.data.y)) {
                        datum.data.y.forEach(updateWithValue)
                    }
                    // A tolerance band extends beyond the series itself — include
                    // its envelope so the band is never clipped by the axis.
                    if (datum && datum.band) {
                        [datum.band.upper, datum.band.lower].forEach((edge) => {
                            if (Array.isArray(edge)) edge.forEach(updateWithValue)
                        })
                    }

                    // Include points that belong to this axis
                    if (this.points && Array.isArray(this.points)) {
                        this.points.forEach((point) => {
                            if (point && point.unit === datum.unit && point.data && point.data.y !== undefined && point.data.y !== null && !Number.isNaN(point.data.y)) {
                                yMaximum = Math.max(yMaximum, point.data.y);
                                yMinimum = Math.min(yMinimum, point.data.y);
                            }
                        })
                    }

                    // A bar encodes its magnitude as a length measured from zero, so its
                    // axis MUST contain zero. Every other type wants the axis framed on
                    // the data instead, which is why the bounds above are data-derived —
                    // but applied to bars that makes the baseline the data minimum, so a
                    // 1 Ω floor renders every bar as "value − 1 Ω" and a half-height bar
                    // means nothing. Explicit forceAxisMin/Max still win: a caller that
                    // states its bounds has already decided.
                    if (datum.chartType === 'bar') {
                        yMinimum = Math.min(yMinimum, 0);
                        yMaximum = Math.max(yMaximum, 0);
                    }

                    limits.yAxis.push({
                        min: (this.forceAxisMin && this.forceAxisMin[index] !== null && this.forceAxisMin[index] !== undefined) ? this.forceAxisMin[index] : yMinimum,
                        max: (this.forceAxisMax && this.forceAxisMax[index] !== null && this.forceAxisMax[index] !== undefined) ? this.forceAxisMax[index] : yMaximum,
                    });
                })
            }

            limits.xAxis = {
                min: xMinimum,
                max: xMaximum,
            };

            return limits;
        },
        processOptions(options) {
            const limits = this.processLimits()

            options.series = []
            options.yAxis = []

            const firstIndexPerSide = {}
            this.data.forEach((datum, index) => {

                const side = datum.position || (index === 0 ? 'left' : 'right');
                if (firstIndexPerSide[side] === undefined) {
                    firstIndexPerSide[side] = index;
                }
                
                const axisColor = resolveCssColor(datum.colorLabel || this.lineColor)
                const labelColor = this.yAxisLabelColor ? resolveCssColor(this.yAxisLabelColor) : axisColor
                options.yAxis.push({
                    // Bars are baselined at zero (see processLimits), and a log axis
                    // cannot represent zero at all — so a bar series forces its axis
                    // linear regardless of the type the caller asked for.
                    type: toAxisType(effectiveAxisType(datum)),
                    name: this.showYAxisName ? (datum.unit || '') : '',
                    nameLocation: 'middle',
                    nameGap: 25,
                    nameTextStyle: {
                        color: labelColor,
                        fontSize: this.axisLabelFontSize,
                    },
                    position: side,
                    splitLine: {
                        show: index === 0 ? this.showGrid : false,
                        // Theme-agnostic gridline (see xAxis note).
                        lineStyle: { color: 'rgba(128, 128, 128, 0.35)' },
                    },
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        fontSize: this.axisLabelFontSize,
                        color: labelColor,
                        fontWeight: this.yAxisLabelFontWeight,
                        margin: 8,
                        formatter: (value) => {
                            // Hide right axis labels only if same unit AND similar scale (unless forceAxisMin/Max which indicates dual display)
                            const hasForceAxis = (this.forceAxisMin && this.forceAxisMin.some(v => v !== null && v !== undefined)) || (this.forceAxisMax && this.forceAxisMax.some(v => v !== null && v !== undefined));
                            if (!hasForceAxis && this.data.length > 1 && this.data[0].unit == this.data[1].unit && index == 1) {
                                // Check if scales are similar (within 10x of each other)
                                const scale0 = Math.max(...this.data[0].data.y) - Math.min(...this.data[0].data.y);
                                const scale1 = Math.max(...this.data[1].data.y) - Math.min(...this.data[1].data.y);
                                const scaleRatio = scale0 > 0 && scale1 > 0 ? Math.max(scale0/scale1, scale1/scale0) : 1;
                                if (scaleRatio < 10) {
                                    return '';
                                }
                            }
                            const aux = formatUnit(value, datum.unit);
                            // Smart decimal limiting based on value magnitude
                            let decimals = 0;
                            const absLabel = Math.abs(aux.label);
                            if (absLabel === 0) {
                                decimals = 0;
                            } else if (absLabel < 0.01) {
                                decimals = 3;
                            } else if (absLabel < 0.1) {
                                decimals = 2;
                            } else if (absLabel < 10) {
                                decimals = 1;
                            } else {
                                decimals = 0;
                            }
                            const formattedLabel = Number(aux.label).toFixed(decimals);
                            const text = datum.unit == null ? formattedLabel : `${formattedLabel} ${aux.unit}`;
                            return text;
                        },
                    },
                })

                let showPoints;
                if (typeof(this.showPoints) == "boolean") {
                    showPoints = this.showPoints;
                }
                else {
                    showPoints = this.showPoints[index];
                }

                const seriesColor = axisColor;
                // Per-series chart type. Defaults to 'line', so every existing consumer
                // and every series that does not ask for a type behaves exactly as
                // before. 'scatter' plots the points without joining them (measured
                // samples that should not imply interpolation between them) and 'bar'
                // compares discrete values. Only the properties that differ per type are
                // varied; axes, tolerance bands, zoom and the dual-axis logic are shared.
                const chartType = datum.chartType ?? 'line';
                const isLine = chartType === 'line';
                const isScatter = chartType === 'scatter';
                options.series.push(
                    {
                        data: this.processData(index),
                        type: chartType,
                        smooth: isLine ? (datum.smooth ?? 0.15) : undefined,
                        name: this.legendLabels && this.legendLabels[index] ? this.legendLabels[index] : datum.label,
                        color: seriesColor,
                        showSymbol: isLine ? showPoints : undefined,
                        symbol: 'circle',
                        symbolSize: isScatter ? 8 : 6,
                        sampling: isLine ? 'lttb' : undefined,
                        yAxisIndex: this.forceAxisUniquePerSide ? firstIndexPerSide[side] : index,
                        lineStyle: isLine ? {
                            type: datum.lineStyle ?? 'solid',
                            width: 1.5,
                        } : undefined,
                        itemStyle: isLine ? undefined : { color: seriesColor },
                        emphasis: {
                            focus: 'series',
                            lineStyle: { width: 2 },
                        },
                        areaStyle: this.showArea && isLine ? {
                            color: {
                                type: 'linear',
                                x: 0, y: 0, x2: 0, y2: 1,
                                colorStops: [
                                    { offset: 0, color: seriesColor + '33' },
                                    { offset: 1, color: seriesColor + '00' },
                                ],
                            },
                            opacity: 1,
                        } : null,
                    }
                );

            })

            if (options.series.length > 0) {
                if (this.markArea || this.markLine) {
                    const overlay = {}
                    if (this.markArea) overlay.markArea = this.markArea
                    if (this.markLine) overlay.markLine = this.markLine
                    options.series[0] = { ...options.series[0], ...overlay }
                }
            }

            this.points.forEach((point) => {
                options.series.push(
                    {
                        symbolSize: 14,
                        symbol: 'circle',
                        data: [[point.data.x, point.data.y]],
                        type: 'effectScatter',
                        rippleEffect: { brushType: 'stroke', scale: 2.5 },
                        color: resolveCssColor(this.pointsColor),
                        itemStyle: {
                            borderColor: 'var(--p-white)',
                            borderWidth: 1.5,
                        },
                        showSymbol: true,
                        z: 10,
                    }
                );
            })

            // Tolerance bands: a series may carry band = {upper: [...], lower: [...]}
            // (same length as its x array). Rendered as a single custom polygon so it
            // works on log axes too (stacked-area bands don't). Appended AFTER the
            // data and points series so their index-based tooltip mapping holds.
            this.data.forEach((datum, index) => {
                const band = datum.band
                if (!band || !Array.isArray(band.upper) || !Array.isArray(band.lower)) return
                if (!datum.data || !Array.isArray(datum.data.x)) return

                const bandColor = resolveCssColor(datum.colorLabel || this.lineColor)
                const isLog = datum.type == 'log'
                const usable = (value) => value !== undefined && value !== null && Number.isFinite(value) && (!isLog || value > 0)
                const upperPoints = []
                const lowerPoints = []
                const pointCount = Math.min(datum.data.x.length, band.upper.length, band.lower.length)
                for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
                    const xVal = datum.data.x[pointIndex]
                    if (!usable(xVal) || !usable(band.upper[pointIndex]) || !usable(band.lower[pointIndex])) continue
                    upperPoints.push([xVal, band.upper[pointIndex]])
                    lowerPoints.push([xVal, band.lower[pointIndex]])
                }
                if (upperPoints.length < 2) return

                const side = datum.position || (index === 0 ? 'left' : 'right');
                options.series.push({
                    type: 'custom',
                    name: `${datum.label} tolerance`,
                    color: bandColor,
                    yAxisIndex: this.forceAxisUniquePerSide ? firstIndexPerSide[side] : index,
                    silent: true,
                    tooltip: { show: false },
                    z: 1,
                    // The single datum must be a VALID point on both axes — a
                    // scalar 0 gets filtered by log scales and renderItem would
                    // never run. Any real band point works; the polygon itself
                    // is built from the closure.
                    data: [upperPoints[0]],
                    renderItem: (params, api) => ({
                        type: 'polygon',
                        shape: { points: upperPoints.map((p) => api.coord(p)).concat(lowerPoints.map((p) => api.coord(p)).reverse()) },
                        style: {
                            fill: bandColor + '26',
                            stroke: bandColor + '99',
                            lineDash: [4, 4],
                            lineWidth: 1,
                        },
                    }),
                })
            })

            options.xAxis.min = limits.xAxis.min * (limits.xAxis.min < 0? this.linePaddings.left : 1.0 / this.linePaddings.left);
            options.xAxis.max = limits.xAxis.max * this.linePaddings.right;
            options.xAxis.type = toAxisType(this.xAxisOptions.type);
            // An explicit range replaces the padded, data-derived one outright: the
            // caller asked for these bounds, so padding them would silently show a
            // different window than the one requested.
            if (this.forceXAxisMin !== null && this.forceXAxisMin !== undefined) options.xAxis.min = this.forceXAxisMin;
            if (this.forceXAxisMax !== null && this.forceXAxisMax !== undefined) options.xAxis.max = this.forceXAxisMax;
            if (this.xAxisInterval !== null && this.xAxisInterval !== undefined && options.xAxis.type !== 'log') {
                options.xAxis.interval = this.xAxisInterval;
            }

            // Store individual axis limits
            const individualAxisLimits = [];
            var yAxisLimits = {
                min: Number.MAX_VALUE,
                max: Number.MIN_VALUE,
            };
            limits.yAxis.forEach((elem, index) => {
                let numberDecimals = 2;
                let numberDecimalsPointer = numberDecimals
                if (elem.min < 1) {
                    if (this.data[index].type == "log") {
                        numberDecimals = Math.abs(Math.floor(Math.log10(elem.min)));
                        numberDecimalsPointer += numberDecimals
                    }
                    else {
                        // elem.min = 0;
                    }
                }
                if (this.data[index].numberDecimals != null) {
                    numberDecimals = this.data[index].numberDecimals;
                }

                if (numberDecimalsPointer > options.tooltip.axisPointer.label.precision) {
                    options.tooltip.axisPointer.label.precision = numberDecimalsPointer;
                }

                // Snap the padded bounds OUTWARD (floor the min, ceil the max) so the
                // axis always contains every sample. The previous round-to-nearest snap
                // (via removeTrailingZeroes, which additionally caps at toFixed(5)) could
                // move the axis minimum ABOVE the smallest samples — e.g. an 18.5 µH data
                // minimum became a 2e-5 H axis floor — and ECharts silently clips points
                // outside the axis range, so the curve tail just vanished. Skip snapping
                // when the precision step is coarser than the value itself: snapping
                // would distort the bound by orders of magnitude (and a log axis cannot
                // survive a minimum floored to 0).
                const precision = 1.0 / Math.pow(10, numberDecimals);
                const snapOutward = (value, roundFn) => {
                    if (!Number.isFinite(value) || value === 0 || precision > Math.abs(value)) {
                        return value;
                    }
                    return roundFn(value / precision) * precision;
                };
                const paddedMin = elem.min * (elem.min < 0? this.linePaddings.bottom : 1.0 / this.linePaddings.bottom);
                const paddedMax = elem.max * (elem.max < 0? 1.0 / this.linePaddings.top : this.linePaddings.top);
                let minimumValue = snapOutward(paddedMin, Math.floor);
                let maximumValue = snapOutward(paddedMax, Math.ceil);

                // Degenerate range: a constant series collapses min==max (and rounding
                // can snap a tiny padded span back to a single value). A log axis cannot
                // render that at all; a linear one draws a zero-height band. Expand around
                // the value so a flat line still draws.
                if (maximumValue <= minimumValue) {
                    if (effectiveAxisType(this.data[index]) == "log" && elem.max > 0) {
                        minimumValue = elem.max / 10;
                        maximumValue = elem.max * 10;
                    } else {
                        const delta = Math.abs(elem.max) > 0 ? Math.abs(elem.max) * 0.5 : 1;
                        minimumValue = elem.max - delta;
                        maximumValue = elem.max + delta;
                    }
                }
                yAxisLimits.min = Math.min(yAxisLimits.min, minimumValue);
                yAxisLimits.max = Math.max(yAxisLimits.max, maximumValue);
                
                // Store individual limits
                individualAxisLimits.push({
                    min: minimumValue,
                    max: maximumValue
                });
            })

            // Apply limits to Y-axes
            options.yAxis.forEach((_, index) => {
                if (this.forceAxisIndependentLimits && individualAxisLimits[index]) {
                    // Use individual limits for each axis
                    options.yAxis[index].min = individualAxisLimits[index].min;
                    options.yAxis[index].max = individualAxisLimits[index].max;
                } else {
                    // Use shared limits (original behavior)
                    options.yAxis[index].min = yAxisLimits.min;
                    options.yAxis[index].max = yAxisLimits.max;
                }
            })

            if (this.forceAxisUniquePerSide) {
                const uniqueYAxis = []
                const sideToNewIndex = {}
                Object.entries(firstIndexPerSide).forEach(([side, axisIndex], newIndex) => {
                    sideToNewIndex[side] = newIndex
                    uniqueYAxis.push(options.yAxis[axisIndex])
                })
                // The compressed axis inherits its TYPE from the side's first series,
                // but it has to carry every series on that side. A caller that demoted
                // one series to linear did so because it has values a log axis cannot
                // represent (<= 0) — e.g. an absolute tolerance band whose lower edge
                // dips below zero. Rendering it on the first series' log axis clips
                // exactly the region the demotion existed to preserve, and the band
                // silently vanishes there. So one linear series demotes the shared
                // axis for its whole side, mirroring how the limits are merged below.
                Object.keys(sideToNewIndex).forEach((side) => {
                    const needsLinear = this.data.some((datum, index) => {
                        const datumSide = datum.position || (index === 0 ? 'left' : 'right')
                        return datumSide === side && toAxisType(effectiveAxisType(datum)) !== 'log'
                    })
                    if (needsLinear) uniqueYAxis[sideToNewIndex[side]].type = 'value'
                })
                // Each compressed axis spans only ITS side's series. The shared
                // limits above merged every series (a linear/negative right-side
                // series would poison a log left axis into a collapsed range).
                Object.keys(sideToNewIndex).forEach((side) => {
                    let sideMin = Number.MAX_VALUE
                    let sideMax = -Number.MAX_VALUE
                    this.data.forEach((datum, index) => {
                        const datumSide = datum.position || (index === 0 ? 'left' : 'right')
                        if (datumSide !== side || !individualAxisLimits[index]) return
                        sideMin = Math.min(sideMin, individualAxisLimits[index].min)
                        sideMax = Math.max(sideMax, individualAxisLimits[index].max)
                    })
                    if (sideMin <= sideMax) {
                        uniqueYAxis[sideToNewIndex[side]].min = sideMin
                        uniqueYAxis[sideToNewIndex[side]].max = sideMax
                    }
                })
                options.yAxis = uniqueYAxis
                // Series still point at the ORIGINAL axis index of their side's
                // first series; remap them onto the compressed axis array (data
                // series and band polygons alike) or right-side series would
                // reference an out-of-bounds axis.
                options.series.forEach((series) => {
                    if (series.yAxisIndex === undefined) return
                    const side = Object.keys(firstIndexPerSide).find((key) => firstIndexPerSide[key] === series.yAxisIndex)
                    if (side !== undefined) series.yAxisIndex = sideToNewIndex[side]
                })
            }

            // Applied last, so it covers the compressed per-side axes as well as the
            // per-series ones. Log axes are skipped: a linear tick step there produces
            // either two ticks or thousands.
            if (this.yAxisInterval !== null && this.yAxisInterval !== undefined) {
                options.yAxis.forEach((axis) => {
                    if (axis.type !== 'log') axis.interval = this.yAxisInterval;
                })
            }
        },
        onClick(event) {
            this.$emit('click', event);
        },
        onDataZoom(event) {
            // Toolbox dataZoom fires with a batch carrying the selected value
            // range. Forwarded so consumers can track the viewed x-window (the
            // component is closed to template refs — script setup — so events
            // are the supported channel).
            this.$emit('datazoom', event);
        },
        onRestore() {
            this.$emit('restore');
        },
    },
}
</script>

<template>
    <div ref="chartWrapper" class="chart" :style="chartStyle">
        <v-chart v-if="chartVisible && options.yAxis.length > 0" ref="vchart" :key="renderer" class="chart" :option="options" :init-options="{ renderer }" autoresize :update-options="updateOpts" @click="onClick" @datazoom="onDataZoom" @restore="onRestore" style="width: 100%; height: 100%;"/>
    </div>
</template>
