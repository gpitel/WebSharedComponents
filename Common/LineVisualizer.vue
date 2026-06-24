<script setup>
import { toCamelCase, formatUnit, removeTrailingZeroes, getMultiplier, deepCopy, roundWithDecimals } from '../assets/js/utils.js'
import { use } from 'echarts/core'
import { LineChart, ScatterChart, EffectScatterChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  ToolboxComponent,
  GridComponent,
  DataZoomComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts';

use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  ToolboxComponent,
  GridComponent,
  DataZoomComponent,
  ScatterChart,
  LineChart,
  EffectScatterChart,
  CanvasRenderer
])

</script>

<script>
// ECharts renders to <canvas>, which cannot parse CSS custom properties:
// passing "var(--p-primary)" or "rgba(var(--p-x-rgb), .8)" as a fill/stroke is
// silently ignored and ECharts falls back to its default grey. Consumers pass
// theme colors as such var() strings (e.g. inputTextColor = "var(--wuerth-body-
// color, #333333)"), so resolve any CSS color string to a concrete rgb() value
// via a hidden probe element before handing it to the chart.
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
    },
    emits: [
        'click',
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
                type: this.xAxisOptions.type,
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

            let xMinimum = Number.MAX_VALUE;
            let xMaximum = Number.MIN_VALUE;

            // Calculate x limits across all data
            if (this.data && Array.isArray(this.data)) {
                this.data.forEach((datum) => {
                    if (datum && datum.data && datum.data.x && Array.isArray(datum.data.x)) {
                        datum.data.x.forEach((elem) => {
                            if (elem !== undefined && elem !== null && !Number.isNaN(elem)) {
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
                    let yMinimum = Number.MAX_VALUE;
                    let yMaximum = Number.MIN_VALUE;

                    if (datum && datum.data && datum.data.y && Array.isArray(datum.data.y)) {
                        datum.data.y.forEach((elem) => {
                            if (elem !== undefined && elem !== null && Number.isFinite(elem)) {
                                yMaximum = Math.max(yMaximum, elem);
                                if (datum.type == "log" && elem > Number.MIN_VALUE) {
                                    yMinimum = Math.min(yMinimum, elem);
                                } else if (datum.type != "log") {
                                    yMinimum = Math.min(yMinimum, elem);
                                }
                            }
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
                    type: datum.type,
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
                options.series.push(
                    {
                        data: this.processData(index),
                        type: 'line',
                        smooth: datum.smooth ?? 0.15,
                        name: this.legendLabels && this.legendLabels[index] ? this.legendLabels[index] : datum.label,
                        color: seriesColor,
                        showSymbol: showPoints,
                        symbol: 'circle',
                        symbolSize: 6,
                        sampling: 'lttb',
                        yAxisIndex: this.forceAxisUniquePerSide ? firstIndexPerSide[side] : index,
                        lineStyle: {
                            type: datum.lineStyle ?? 'solid',
                            width: 1.5,
                        },
                        emphasis: {
                            focus: 'series',
                            lineStyle: { width: 2 },
                        },
                        areaStyle: this.showArea ? {
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

            options.xAxis.min = limits.xAxis.min * (limits.xAxis.min < 0? this.linePaddings.left : 1.0 / this.linePaddings.left);
            options.xAxis.max = limits.xAxis.max * this.linePaddings.right;
            options.xAxis.type = this.xAxisOptions.type;

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

                let minimumValue = Number(removeTrailingZeroes(roundWithDecimals(elem.min * (elem.min < 0? this.linePaddings.bottom : 1.0 / this.linePaddings.bottom), 1.0 / Math.pow(10, numberDecimals)), numberDecimals));
                let maximumValue = Number(removeTrailingZeroes(roundWithDecimals(elem.max * this.linePaddings.top, 1.0 / Math.pow(10, numberDecimals)), numberDecimals));

                // Degenerate range: a constant series collapses min==max (and rounding
                // can snap a tiny padded span back to a single value). A log axis cannot
                // render that at all; a linear one draws a zero-height band. Expand around
                // the value so a flat line still draws.
                if (maximumValue <= minimumValue) {
                    if (this.data[index].type == "log" && elem.max > 0) {
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
                Object.entries(firstIndexPerSide).forEach(([_, axisIndex]) => {
                    uniqueYAxis.push(options.yAxis[axisIndex])
                })
                options.yAxis = uniqueYAxis
            }
        },
        onClick(event) {
            this.$emit('click', event);
        }
    },
}
</script>

<template>
    <div ref="chartWrapper" class="chart" :style="chartStyle">
        <v-chart v-if="chartVisible && options.yAxis.length > 0" class="chart" :option="options" autoresize :update-options="updateOpts" @click="onClick" style="width: 100%; height: 100%;"/>
    </div>
</template>
