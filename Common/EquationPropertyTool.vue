<script setup>
import DimensionReadOnly from '/WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import PairOfDimensions from '/WebSharedComponents/DataInput/PairOfDimensions.vue'
import LineVisualizer from '/WebSharedComponents/Common/LineVisualizer.vue'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import { deepCopy, combinedStyle, combinedClass, removeTrailingZeroes, linearSpacedArray, logarithmicSpacedArray } from '/WebSharedComponents/assets/js/utils.js'
import { create, all } from "mathjs";
</script>

<script>
const math = create(all);

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
        equations: {
            type: Array[String],
            required: true,
        },
        baseValues: {
            type: Array[Number],
            default: [1],
        },
        coefficients: {
            type: Array[Object],
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
        addElementButtonColor: {
            type: [String, Object],
            default: "text-secondary",
        },
        removeElementButtonColor: {
            type: [String, Object],
            default: "text-danger",
        },
        labelWidthProportionClass: {
            type: String,
            default: "col-4",
        },
        selectStyleClass: {
            type: String,
            default: "col-8",
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
            default: "bg-dark",
        },
        valueBgColor: {
            type: [String, Object],
            default: "bg-light",
        },
        textColor: {
            type: [String, Object],
            default: "text-white",
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
        formulaFontSize:{
            type: Number,
            default: 14
        },
    },
    data() {
        const errorMessages = "";
        const localData = {
            propertyToEdit: 0
        };
        const propertyLabels = {};
        const selectedEquationToEdit = 0;
        const loading = false;
        const showEditor = false;
        const showConfiguration = false;
        const forceUpdate = 0;
        const availableModes = {
            'log': 'Log',
            'linear': 'Linear',
        }
        const data = [];
        const equationsLatex = [""];

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
            selectedEquationToEdit,
            errorMessages,
            loading,
            showEditor,
            showConfiguration,
            forceUpdate,
            availableModes,
            xAxisOptions,
            data,
            equationsLatex,
        }
    },
    computed: {
        showGraph() {
            return this.data.length > 0 && this.data[this.selectedEquationToEdit].data.x != null && this.data[this.selectedEquationToEdit].data.x.length > 1;
        },
    },
    watch: {
        'coefficients': {
            handler(newValue, oldValue) {
                this.extractData();
                this.forceUpdate += 1;
            },
          deep: true
        },
        'equations': {
            handler(newValue, oldValue) {
                this.extractData();
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
        },
        extractData() {
            this.data = [];
            this.equationsLatex = [];
            this.equations.forEach((equation, equationIndex) => {
                if (this.equations[equationIndex] != "") {
                    const node = math.parse(this.equations[equationIndex]);
                    this.equationsLatex.push(node.toTex());
                    const code = node.compile();
                    const scope = deepCopy(this.coefficients[equationIndex]);

                    const datum = {};
                    datum.type = this.propertiesConfiguration.yAxisMode == "linear"? "value" : this.propertiesConfiguration.yAxisMode;
                    datum.smooth = this.smoothLine;
                    if (this.equations.length > 0) {
                        datum.label = this.propertiesConfiguration.yAxisReplaceLabel[equationIndex];
                        if (this.propertiesConfiguration.seriesEquationParameterUnit != null) {
                            datum.label += ' '
                            datum.label += this.propertiesConfiguration.seriesEquationParameterUnit
                        }
                        this.propertyLabels[equationIndex] = datum.label;
                    }
                    datum.numberDecimals = this.propertiesConfiguration.yAxisNumberDecimals;

                    datum.data = {
                        x: [],
                        y: [],
                    };

                    if (this.propertiesConfiguration.additionalScope != null) {
                        Object.keys(this.propertiesConfiguration.additionalScope).forEach((key) => {
                            scope[key] = this.propertiesConfiguration.additionalScope[key];
                        })
                    }

                    let xValues;
                    if (this.propertiesConfiguration.xAxisMode == "linear") {
                        xValues = linearSpacedArray(this.propertiesConfiguration.xAxisMin, this.propertiesConfiguration.xAxisMax, this.propertiesConfiguration.xAxisNumberPoints);
                    }
                    else {
                        xValues = logarithmicSpacedArray(this.propertiesConfiguration.xAxisMin, this.propertiesConfiguration.xAxisMax, this.propertiesConfiguration.xAxisNumberPoints);
                    }

                    if (this.propertiesConfiguration.seriesEquationParameter != null) {
                        scope[this.propertiesConfiguration.seriesEquationParameter] = Number(this.propertiesConfiguration.yAxisReplaceLabel[equationIndex]);

                    }
                    xValues.forEach((xValue) => {
                        scope[this.propertiesConfiguration.xAxisEquationParameter] = xValue;
                        datum.data.x.push(xValue)
                        datum.data.y.push(code.evaluate(scope) * this.baseValues[equationIndex])
                    })

                    datum.unit = this.propertiesConfiguration.yAxisUnit;

                    datum.xMaximum = removeTrailingZeroes(Math.max(...datum.data.x), 2);
                    datum.xMinimum = removeTrailingZeroes(Math.min(...datum.data.x), 2);
                    datum.yMaximum = removeTrailingZeroes(Math.max(...datum.data.y), 2);
                    datum.yMinimum = removeTrailingZeroes(Math.min(...datum.data.y), 2);

                    this.data.push(datum);
                }
            })
        },
        axisModeChanged() {
            this.xAxisOptions.type = this.propertiesConfiguration.xAxisMode == "linear"? "value" : this.propertiesConfiguration.xAxisMode;
            this.equations.forEach((equation, equationIndex) => {
                this.data[equationIndex].type = this.propertiesConfiguration.yAxisMode == "linear"? "value" : this.propertiesConfiguration.yAxisMode;
            })
            this.forceUpdate += 1;
        },
        onEdit() {
            this.showEditor = !this.showEditor;
            
            if (!this.showEditor) {
                setTimeout(() => {this.forceUpdate += 1;}, 10);
            }
        },
        equationToEditChanged(selectedEquation) {
            this.selectedEquationToEdit = selectedEquation;
        }
    }
}
</script>

<template>
    <div class="container-flex border pt-2 pl-3">
        <div class="grid">
            <div 
                class="col-9"
            >
                {{title}}
            </div>
            <div 
                class="col-3 grid"
            >
                <button
                    v-if="enableEditing"
                    :style="showEditor? $styleStore.controlPanel.activeButton : $styleStore.controlPanel.button"
                    class="btn col-5 p-0"
                    @click="onEdit"
                >
                    <i class="pi pi-pencil"></i>
                </button>
                <button
                    v-if="showGraph"
                    :style="showConfiguration? $styleStore.controlPanel.activeButton : $styleStore.controlPanel.button"
                    class="btn col-offset-1 col-5 p-0"
                    @click="showConfiguration = !showConfiguration && ! showEditor"
                >
                    <i class="pi pi-cog"></i>
                </button>
            </div>
        </div>
        <div class="grid">
            <div
                v-if="showEditor"
                class="col-12"
            >
                <div class="grid">
                    <ElementFromList
                        v-if="Object.keys(propertyLabels).length > 1"
                        class="col-offset-1 col-10 mb-1 text-left"
                        :dataTestLabel="dataTestLabel + '-PropertySelector'"
                        :name="'propertyToEdit'"
                        :titleSameRow="true"
                        :justifyContent="false"
                        :modelValue="localData"
                        @update:modelValue="localData = $event"
                        :options="propertyLabels"
                        :labelWidthProportionClass="'col-6'"
                        :selectStyleClass="'col-6'"
                        :valueFontSize="labelFontSize"
                        :labelFontSize="scalarFontSize"
                        :labelBgColor="labelBgColor"
                        :valueBgColor="valueBgColor"
                        :textColor="textColor"
                        @update="equationToEditChanged"
                    />
                </div>

                <div class="grid">
                    <vue-latex
                        :expression="equationsLatex[selectedEquationToEdit]"
                        class="m-0 p-0"
                        :display-mode="true"
                        :fontsize="formulaFontSize"
                    />
                </div>
                <div class="grid"  v-for="value, coefficient in coefficients[selectedEquationToEdit]" :key="coefficient">
                    <Dimension 
                        v-if="value != null"
                        :name="coefficient"
                        :unit="''"
                        :useMetricPrefixes="false"
                        class="pt-1 pb-0 pr-4 mb-0 col-10"
                        :dataTestLabel="dataTestLabel + '-Coefficient-' + coefficient"
                        :justifyContent="true"
                        :allowNegative="true"
                        :allowZero="true"
                        :min="-100000"
                        :max="100000"
                        :modelValue="coefficients[selectedEquationToEdit]"
                        :forceUpdate="forceUpdate"
                        :labelWidthProportionClass="'col-12 md:col-4'"
                        :valueWidthProportionClass="'col-12 md:col-8'"
                        :valueFontSize="$styleStore.magneticBuilder.inputFontSize"
                        :labelFontSize="$styleStore.magneticBuilder.inputTitleFontSize"
                        :labelBgColor="{'background': 'transparent'}"
                        :valueBgColor="$styleStore.magneticBuilder.inputValueBgColor"
                        :textColor="$styleStore.magneticBuilder.inputTextColor"
                        @update="extractData"
                    />
                </div>
            </div>
            <div 
                v-if="showConfiguration"
                class="col-3"
            >
                <ElementFromList
                    class="col-12 mb-1 text-left"
                    :dataTestLabel="dataTestLabel + '-GraphsSelector'"
                    :name="'xAxisMode'"
                    :titleSameRow="false"
                    :justifyContent="true"
                    :modelValue="propertiesConfiguration"
                    @update:modelValue="propertiesConfiguration = $event"
                    :options="availableModes"
                    :labelWidthProportionClass="'col-12'"
                    :selectStyleClass="'col-12'"
                    :valueFontSize="valueFontSize"
                    :labelFontSize="labelFontSize"
                    :labelBgColor="labelBgColor"
                    :valueBgColor="valueBgColor"
                    :textColor="textColor"
                    @update="axisModeChanged"
                />
                <ElementFromList
                    class="col-12 mb-1 text-left"
                    :dataTestLabel="dataTestLabel + '-GraphsSelector'"
                    :name="'yAxisMode'"
                    :titleSameRow="false"
                    :justifyContent="true"
                    :modelValue="propertiesConfiguration"
                    @update:modelValue="propertiesConfiguration = $event"
                    :options="availableModes"
                    :labelWidthProportionClass="'col-12'"
                    :selectStyleClass="'col-12'"
                    :valueFontSize="valueFontSize"
                    :labelFontSize="labelFontSize"
                    :labelBgColor="labelBgColor"
                    :valueBgColor="valueBgColor"
                    :textColor="textColor"
                    @update="axisModeChanged"
                />
            </div>
            <span 
                v-if="data.length > 0 && data[selectedEquationToEdit].data.x.length == 0"
                class="col-12 my-2"
            >
                <label
                    class="text-danger pt-1 mx-3"
                    style="font-size: 1em"
                >            
                    {{'Property is missing'}}
                </label>
                <button class="p-button p-button-primary" @click="addFirstValue()">Add values</button>
            </span>
            <div 
                v-if="!showEditor"
                :class="showEditor || showConfiguration? 'col-9' : 'col-12'"
                class="pr-3"
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
                    :toolbox="false"
                    :bgColor="visualizerBgColor"
                    :lineColor="visualizerLineColor"
                    :textColor="visualizerTextColor"
                    :chartPaddings="chartPaddings"
                    :linePaddings="{top: 1.1, left: 1.1, right: 1.1, bottom: 1.1}"
                />
                <DimensionReadOnly 
                    v-else
                    v-if="data.length > 0 && data[selectedEquationToEdit].data.x.length > 0"
                    class="col-12 mt-2 px-0 mx-0"
                    :name="'Value'"
                    :replaceTitle="''"
                    :unit="propertiesConfiguration.yAxisUnit"
                    :dataTestLabel="dataTestLabel + '-ScalarValue'"
                    :numberDecimals="2"
                    :value="scalarValue"
                    :useTitleCase="false"
                    :disableShortenLabels="true"
                    :labelWidthProportionClass="'col-1'"
                    :valueWidthProportionClass="'col-12'"
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