<script setup>
import DimensionReadOnly from '/WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import PairOfDimensions from '/WebSharedComponents/DataInput/PairOfDimensions.vue'
import LineVisualizer from '/WebSharedComponents/Common/LineVisualizer.vue'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import { deepCopy, combinedStyle, combinedClass, removeTrailingZeroes } from '/WebSharedComponents/assets/js/utils.js'
</script>

<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        title: {
            type: String,
            default: 'Property',
        },
        properties: {
            type: Array,
            required: true,
        },
        propertiesConfiguration: {
            type: Object,
            required: true,
        },
        smoothLine: {
            type: Boolean,
            default: false,
        },
        chartStyle:{
            type: String,
            default: 'height: 50vh'
        },
        enableEditing:{
            type: Boolean,
            default: true
        },
        showPoints: {
            type: [Boolean, Array[Boolean]],
            default: true,
        },
        // Gradient area fill under the line(s). Forwarded to LineVisualizer.
        showArea: {
            type: Boolean,
            default: true,
        },
        // echarts tooltip trigger forwarded to LineVisualizer. 'axis' shows the
        // value at the cursor's x anywhere on the line (needed when showPoints
        // is false); 'item' (default) only fires on a data point.
        tooltipTrigger: {
            type: String,
            default: 'item',
        },
        addElementButtonColor: {
            type: [String, Object],
            default: () => ({ color: 'var(--p-text-color-secondary-color, #6c757d)' }),
        },
        removeElementButtonColor: {
            type: [String, Object],
            default: () => ({ color: 'var(--p-red-500, #dc3545)' }),
        },
        labelWidthProportionClass: {
            type: String,
            default: "",
        },
        selectStyleClass: {
            type: String,
            default: "",
        },
        valueFontSize: {
            type: [String, Object],
            default: {"font-size": '0.9rem'}
        },
        labelFontSize: {
            type: [String, Object],
            default: {"font-size": '0.9rem'}
        },
        scalarFontSize: {
            type: [String, Object],
            default: {"font-size": '1.2rem'}
        },
        labelBgColor: {
            type: [String, Object],
            default: () => ({ backgroundColor: 'var(--p-surface-800, #1d252d)' }),
        },
        valueBgColor: {
            type: [String, Object],
            default: () => ({ backgroundColor: 'var(--p-surface-100, #f8f9fa)' }),
        },
        textColor: {
            type: [String, Object],
            default: () => ({ color: 'var(--p-surface-0, var(--p-white))' }),
        },
        visualizerBgColor: {
            type: [String, Object],
            default: "var(--p-dark)",
        },
        visualizerLineColor: {
            type: [String, Object],
            default: "var(--p-light)",
        },
        visualizerTextColor: {
            type: [String, Object],
            default: "var(--p-light)",
        },
        chartPaddings:{
            type: Object,
            default: {top: 30, left: 45, right: 10, bottom: 30}
        },
        styleSection: {
            type: String,
            default: "controlPanel",
        },
    },
    data() {
        const errorMessages = "";
        const localData = {
            propertyToEdit: 0
        };
        const propertyLabels = {};
        const selectedPropertyToEdit = 0;
        const loading = false;
        const showEditor = false;
        const showConfiguration = false;
        const forceUpdate = 0;
        const availableModes = {
            'log': 'Log',
            'linear': 'Linear',
        }
        const data = [];

        const xAxisOptions = {
            label: this.propertiesConfiguration.xAxisLabel,
            colorLabel: 'var(--p-light)',
            type: this.propertiesConfiguration.xAxisMode == "linear"? "value" : this.propertiesConfiguration.xAxisMode,
            unit: this.propertiesConfiguration.xAxisUnit,
            numberDecimals: this.propertiesConfiguration.xAxisNumberDecimals,
        }

        return {
            localData,
            propertyLabels,
            selectedPropertyToEdit,
            errorMessages,
            loading,
            showEditor,
            showConfiguration,
            forceUpdate,
            availableModes,
            xAxisOptions,
            data,
        }
    },
    computed: {
        scalarValue() {
            if (this.properties.length == 0) {
                return 0;
            }
            else if (this.properties[this.selectedPropertyToEdit].length == 0) {
                return 0;
            }
            else {
                return this.properties[this.selectedPropertyToEdit][0][this.propertiesConfiguration.yAxisLabel];
            }
        },
        showGraph() {
            if (this.data.length == 0) {
                return false;
            }
            let result = false;
            this.data.forEach((elem) => {
                if (elem.data.x != null && elem.data.x.length > 1) {
                    result = true;
                }
            })
            return result;
        },
    },
    watch: {
        'properties': {
            handler(newValue, oldValue) {
                this.extractData();
                setTimeout(() => {this.checkData();}, 10);
                this.forceUpdate += 1;
            },
          deep: true
        },
    },
    created() {
        this.extractData();
    },
    mounted() {
        setTimeout(() => {this.forceUpdate += 1;}, 10);
    },
    methods: {
        checkData() {
            this.errorMessages = [];
            this.data[this.selectedPropertyToEdit].data.x.forEach((elem, index) => {
                this.errorMessages.push("");
                if (index < this.data[this.selectedPropertyToEdit].data.x.length - 1) {
                    const nextElem = this.data[this.selectedPropertyToEdit].data.x[index + 1];
                    if (elem == nextElem) {
                        this.errorMessages[index + 1] = `Value repeated for ${this.propertiesConfiguration.xAxisLabel}: ${elem}`;
                    }

                }
            })
        },
        extractData() {
            this.data = [];
            this.properties.forEach((property, propertyIndex) => {
                const datum = {};
                datum.type = this.propertiesConfiguration.yAxisMode == "linear"? "value" : this.propertiesConfiguration.yAxisMode;
                datum.smooth = this.smoothLine;
                if (this.properties.length > 0) {
                    if (this.propertiesConfiguration.yAxisLineColor != null && this.propertiesConfiguration.yAxisLineColor[propertyIndex] != null) {
                        datum.colorLabel = this.propertiesConfiguration.yAxisLineColor[propertyIndex];
                    }
                    datum.label = this.propertiesConfiguration.yAxisReplaceLabel[propertyIndex];
                    this.propertyLabels[propertyIndex] = datum.label;
                }
                datum.numberDecimals = this.propertiesConfiguration.yAxisNumberDecimals;

                datum.data = {
                    x: [],
                    y: [],
                };
                property.forEach((elem, index) => {
                    datum.data.x.push(elem[this.propertiesConfiguration.xAxisLabel])
                    datum.data.y.push(elem[this.propertiesConfiguration.yAxisLabel])

                    if ("log" in this.availableModes && elem[this.propertiesConfiguration.xAxisLabel] < 0) {
                        delete this.availableModes.log;
                    }
                })

                datum.unit = this.propertiesConfiguration.yAxisUnit;
                if (this.propertiesConfiguration.yAxisLineColor != null) {
                    datum.colorLabel = this.propertiesConfiguration.yAxisLineColor[propertyIndex];
                }

                datum.xMaximum = removeTrailingZeroes(Math.max(...datum.data.x), 2);
                datum.xMinimum = removeTrailingZeroes(Math.min(...datum.data.x), 2);
                datum.yMaximum = removeTrailingZeroes(Math.max(...datum.data.y), 2);
                datum.yMinimum = removeTrailingZeroes(Math.min(...datum.data.y), 2);

                this.data.push(datum);
            })
        },
        axisModeChanged() {
            this.xAxisOptions.type = this.propertiesConfiguration.xAxisMode == "linear"? "value" : this.propertiesConfiguration.xAxisMode;
            this.properties.forEach((property, propertyIndex) => {
                this.data[propertyIndex].type = this.propertiesConfiguration.yAxisMode == "linear"? "value" : this.propertiesConfiguration.yAxisMode;
            })
            this.forceUpdate += 1;
        },
        onAddPointBelow(index) {
            this.$emit("onAddPoint", this.selectedPropertyToEdit, index);
        },
        onRemovePoint(index) {
            if (this.data[this.selectedPropertyToEdit].data.x.length == 1) {
                this.showEditor = false;
            }
            this.$emit("onRemovePoint", this.selectedPropertyToEdit, index);
        },
        addFirstValue() {
            this.$emit("onAddPoint", this.selectedPropertyToEdit, 0);
            this.showEditor = true;
        },
        onEdit() {
            this.showEditor = !this.showEditor;
            
            if (!this.showEditor) {
                setTimeout(() => {this.forceUpdate += 1;}, 10);
            }
        },
        propertyToEditChanged(selectedProperty) {
            this.selectedPropertyToEdit = selectedProperty;
        }
    }
}
</script>

<template>
    <div class="pt-container">
        <div class="pt-header">
            <div class="pt-title">
                {{title}}
            </div>
            <div class="pt-header-actions">
                <button
                    v-if="enableEditing"
                    :style="showEditor? $styleStore?.[styleSection]?.activeButton : $styleStore?.[styleSection]?.button"
                    class="pt-icon-btn"
                    :class="showEditor? 'pt-icon-btn-active' : ''"
                    @click="onEdit"
                >
                    <i class="pi pi-pencil"></i>
                </button>
                <button
                    v-if="showGraph"
                    :style="showConfiguration? $styleStore?.[styleSection]?.activeButton : $styleStore?.[styleSection]?.button"
                    class="pt-icon-btn"
                    :class="showConfiguration? 'pt-icon-btn-active' : ''"
                    @click="showConfiguration = !showConfiguration && ! showEditor"
                >
                    <i class="pi pi-cog"></i>
                </button>
            </div>
        </div>
        <div class="pt-body">
            <div
                v-if="showEditor"
                class="pt-editor"
            >
                <div class="pt-property-selector">
                    <ElementFromList
                        v-if="Object.keys(propertyLabels).length > 1"
                        :dataTestLabel="dataTestLabel + '-PropertySelector'"
                        :name="'propertyToEdit'"
                        :titleSameRow="true"
                        :justifyContent="false"
                        :modelValue="localData"
                        @update:modelValue="localData = $event"
                        :options="propertyLabels"
                        :valueFontSize="labelFontSize"
                        :labelFontSize="scalarFontSize"
                        :labelBgColor="labelBgColor"
                        :valueBgColor="valueBgColor"
                        :textColor="textColor"
                        @update="propertyToEditChanged"
                    />
                </div>
                <div
                    class="pt-point-row"
                    :class="index < properties[selectedPropertyToEdit].length - 1? 'pt-point-row-divider' : ''"
                    v-for="row, index in properties[selectedPropertyToEdit]"
                    :key="index"
                >
                    <PairOfDimensions
                        class="pt-point-pair"
                        :names="[propertiesConfiguration.xAxisLabel, propertiesConfiguration.yAxisLabel]"
                        :replaceTitle="[propertiesConfiguration.xAxisReplaceLabel, propertiesConfiguration.yAxisReplaceLabel[selectedPropertyToEdit]]"
                        :units="[propertiesConfiguration.xAxisUnit, propertiesConfiguration.yAxisUnit]"
                        :allowNegatives="[propertiesConfiguration.xAxisAllowNegative, propertiesConfiguration.yAxisAllowNegative]"
                        :allowZeros="[propertiesConfiguration.xAxisAllowNegative, propertiesConfiguration.yAxisAllowNegative]"
                        :mins="[propertiesConfiguration.xAxisMin, propertiesConfiguration.yAxisMin]"
                        :maxs="[propertiesConfiguration.xAxisMax, propertiesConfiguration.yAxisMax]"
                        :dataTestLabel="dataTestLabel + '-Property-' + index"
                        v-model="properties[selectedPropertyToEdit][index]"
                        :valueFontSize='valueFontSize'
                        :labelFontSize='valueFontSize'
                        :labelBgColor='labelBgColor'
                        :valueBgColor='valueBgColor'
                        :textColor='textColor'
                        @update="$emit('onDimensionUpdate', $event, selectedPropertyToEdit, index)"
                    />
                    <div class="pt-point-actions">
                        <button
                            :data-cy="dataTestLabel + '-remove-point-button'"
                            type="button"
                            class="pt-circle-btn"
                            @click="onRemovePoint(index)">
                            <i
                                :style="combinedStyle([removeElementButtonColor])"
                                :class="combinedClass([removeElementButtonColor])"
                                class="pi pi-minus-circle"
                            />
                        </button>
                        <button
                            :data-cy="dataTestLabel + '-add-point-below-button'"
                            type="button"
                            class="pt-circle-btn"
                            @click="onAddPointBelow(index)"
                            >
                            <i
                                :style="combinedStyle([addElementButtonColor])"
                                :class="combinedClass([addElementButtonColor])"
                                class="pi pi-plus-circle"
                            />
                        </button>
                    </div>
                    <label :data-cy="dataTestLabel + '-' + index + '-error-text'" class="pt-error">{{errorMessages[index]}}</label>
                </div>
            </div>
            <div
                v-if="showConfiguration"
                class="pt-config"
            >
                <ElementFromList
                    class="pt-config-row"
                    :dataTestLabel="dataTestLabel + '-GraphsSelector'"
                    :name="'xAxisMode'"
                    :titleSameRow="false"
                    :justifyContent="true"
                    :modelValue="propertiesConfiguration"
                    @update:modelValue="propertiesConfiguration = $event"
                    :options="availableModes"
                    :valueFontSize="valueFontSize"
                    :labelFontSize="labelFontSize"
                    :labelBgColor="labelBgColor"
                    :valueBgColor="valueBgColor"
                    :textColor="textColor"
                    @update="axisModeChanged"
                />
                <ElementFromList
                    class="pt-config-row"
                    :dataTestLabel="dataTestLabel + '-GraphsSelector'"
                    :name="'yAxisMode'"
                    :titleSameRow="false"
                    :justifyContent="true"
                    :modelValue="propertiesConfiguration"
                    @update:modelValue="propertiesConfiguration = $event"
                    :options="availableModes"
                    :valueFontSize="valueFontSize"
                    :labelFontSize="labelFontSize"
                    :labelBgColor="labelBgColor"
                    :valueBgColor="valueBgColor"
                    :textColor="textColor"
                    @update="axisModeChanged"
                />
            </div>
            <span
                v-if="data.length > 0 && data[selectedPropertyToEdit].data.x.length == 0"
                class="pt-missing"
            >
                <label class="pt-missing-label">
                    {{'Property is missing'}}
                </label>
                <button class="pt-add-btn" @click="addFirstValue()">Add values</button>
            </span>
            <div
                v-if="!showEditor"
                class="pt-graph-area"
                :class="showEditor || showConfiguration? 'pt-graph-area-narrow' : ''"
            >
                <LineVisualizer
                    v-if="showGraph"
                    v-show="!loading"
                    :data="data"
                    :points="[]"
                    :xAxisOptions="xAxisOptions"
                    :title="''"
                    :forceUpdate="forceUpdate"
                    :chartStyle="chartStyle"
                    :showPoints="showPoints"
                    :showArea="showArea"
                    :tooltipTrigger="tooltipTrigger"
                    :toolbox="false"
                    :bgColor="visualizerBgColor"
                    :lineColor="visualizerLineColor"
                    :textColor="visualizerTextColor"
                    :chartPaddings="chartPaddings"
                    :linePaddings="{top: 1.1, left: 1.1, right: 1.1, bottom: 1.1}"
                />
                <DimensionReadOnly
                    v-else
                    v-if="data.length > 0 && data[selectedPropertyToEdit].data.x.length > 0"
                    class="pt-scalar"
                    :name="'Value'"
                    :replaceTitle="''"
                    :unit="propertiesConfiguration.yAxisUnit"
                    :dataTestLabel="dataTestLabel + '-ScalarValue'"
                    :numberDecimals="2"
                    :value="scalarValue"
                    :useTitleCase="false"
                    :disableShortenLabels="true"
                    :valueFontSize="scalarFontSize"
                    :labelFontSize="scalarFontSize"
                    :labelBgColor="labelBgColor"
                    :valueBgColor="valueBgColor"
                    :textColor="textColor"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.pt-container {
    width: 100%;
    border: 1px solid var(--p-surface-300, #dee2e6);
    border-radius: var(--p-border-radius, 4px);
    padding: 0.5rem 0.5rem 0.5rem 1rem;
    box-sizing: border-box;
}

.pt-header {
    display: flex;
    align-items: center;
    width: 100%;
}

.pt-title {
    flex: 1 1 auto;
}

.pt-header-actions {
    display: flex;
    gap: 0.5rem;
    flex: 0 0 auto;
}

.pt-icon-btn {
    border: 0;
    background: transparent;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: var(--p-border-radius);
    color: var(--p-text-color);
    transition: background-color 0.2s;
}

.pt-icon-btn:hover {
    background-color: color-mix(in srgb, var(--p-primary-color) 10%, transparent);
}

.pt-icon-btn-active {
    background-color: color-mix(in srgb, var(--p-primary-color) 20%, transparent);
}

.pt-body {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    margin-top: 0.5rem;
}

.pt-editor {
    flex: 1 1 100%;
    min-width: 0;
}

.pt-property-selector {
    display: flex;
    justify-content: center;
    margin-bottom: 0.25rem;
}

.pt-property-selector > * {
    flex: 0 1 80%;
    text-align: start;
}

.pt-point-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 1rem 0 0;
    flex-wrap: wrap;
}

.pt-point-row-divider {
    border-bottom: 1px solid var(--p-surface-200, #e9ecef);
}

.pt-point-pair {
    flex: 1 1 auto;
    min-width: 0;
}

.pt-point-actions {
    flex: 0 0 auto;
    display: flex;
    gap: 0.25rem;
}

.pt-circle-btn {
    border: 0;
    background: transparent;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 50%;
    width: 1.75rem;
    height: 1.75rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.pt-circle-btn:hover {
    background-color: color-mix(in srgb, var(--p-primary-color) 10%, transparent);
}

.pt-error {
    flex: 1 1 100%;
    text-align: center;
    color: var(--p-red-400, #dc3545);
    font-size: 0.9em;
    padding-top: 0.25rem;
    white-space: pre-wrap;
}

.pt-config {
    flex: 0 0 25%;
    min-width: 0;
    text-align: start;
}

.pt-config-row {
    margin-bottom: 0.25rem;
}

.pt-missing {
    flex: 1 1 100%;
    margin: 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: center;
}

.pt-missing-label {
    color: var(--p-red-400, #dc3545);
    padding-top: 0.25rem;
    margin: 0 1rem;
    font-size: 1em;
}

.pt-add-btn {
    background-color: var(--p-primary-color);
    color: var(--p-primary-contrast-color);
    border: 0;
    padding: 0.5rem 1rem;
    border-radius: var(--p-border-radius);
    cursor: pointer;
    font-family: var(--p-font-family);
}

.pt-add-btn:hover {
    background-color: var(--p-primary-hover-color);
}

.pt-graph-area {
    flex: 1 1 100%;
    min-width: 0;
    padding-right: 1rem;
}

.pt-graph-area-narrow {
    flex: 1 1 75%;
}

.pt-scalar {
    margin: 0.5rem 0 0 0;
    padding: 0;
}
</style>