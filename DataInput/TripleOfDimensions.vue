<script setup>
import { toTitleCase } from '../assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue';
</script>

<script>
export default {
    props: {
        names:{
            type: Array[String],
            required: true
        },
        modelValue:{
            type: Object,
            required: true
        },
        units:{
            type: Array[String],
            required: false
        },
        replaceTitle:{
            type: Array[String],
            default: [null, null]
        },
        mins:{
            type: Array[Number],
            default: 1e-12
        },
        maxs:{
            type: Array[Number],
            default: 1e+9
        },
        numberDecimals:{
            type: Array[Number],
            default: 6
        },
        allowNegatives:{
            type: Boolean,
            default: false
        },
        allowZeros:{
            type: Boolean,
            default: false
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
        labelWidthProportionClass:{
            type: String,
            default: 'col-12 md:col-7'
        },
        valueWidthProportionClass:{
            type: String,
            default: 'col-8 md:col-5'
        },
        valueFontSize: {
            type: [String, Object],
            default: () => ({ fontSize: '0.875rem' })
        },
        labelFontSize: {
            type: [String, Object],
            default: () => ({ fontSize: '0.875rem' })
        },
        labelBgColor: {
            type: [String, Object],
            default: () => ({ backgroundColor: 'transparent' })
        },
        valueBgColor: {
            type: [String, Object],
            default: () => ({ backgroundColor: 'var(--p-white, var(--p-white))', border: '1px solid var(--p-border-color, #ced4da)' })
        },
        textColor: {
            type: [String, Object],
            default: () => ({ color: 'var(--p-body-color, #333333)' })
        },
        unitExtraStyleClass:{
            type: String,
            default: ''
        },
    },
    data() {
        const localData = {};
        const forceUpdate = 0;

        if (this.modelValue[this.names[0]] != null) {
            localData[this.names[0]] = this.modelValue[this.names[0]];
        }

        if (this.modelValue[this.names[1]] != null) {
            localData[this.names[1]] = this.modelValue[this.names[1]];
        }

        if (this.modelValue[this.names[2]] != null) {
            localData[this.names[2]] = this.modelValue[this.names[2]];
        }

        const errorMessages = ''

        return {
            forceUpdate,
            localData,
            errorMessages
        }
    },
    computed: {
    },
    watch: {
        modelValue(newValue, oldValue) {
            if (this.modelValue[this.names[0]] != null) {
                this.localData[this.names[0]] = this.modelValue[this.names[0]];
            }

            if (this.modelValue[this.names[1]] != null) {
                this.localData[this.names[1]] = this.modelValue[this.names[1]];
            }

            if (this.modelValue[this.names[2]] != null) {
                this.localData[this.names[2]] = this.modelValue[this.names[2]];
            }
            this.forceUpdate += 1;

        },
    },
    mounted () {
    },
    methods: {
        dimensionUpdated(value, dimension) {
            this.modelValue[this.names[dimension]] = value
            this.$emit("update", {value: value, dimension: this.names[dimension]})
        },
    }
}
</script>


<template>
    <div :data-cy="dataTestLabel + '-container'" class="container-flex">
        <div class="grid">
            <Dimension class="col-3 mb-1 text-left"
                :name="names[0]"
                :replaceTitle="replaceTitle[0] == null? toTitleCase(names[0]) : replaceTitle[0]"
                :unit="units[0]"
                :dataTestLabel="dataTestLabel + ' ' + names[0]"
                :min="mins[0]"
                :max="maxs[0]"
                :justifyContent="true"
                :forceUpdate="forceUpdate"
                :allowNegatives="allowNegatives[0]"
                :allowZeros="allowZeros[0]"
                :modelValue="localData"
                @update="dimensionUpdated($event, 0)"
                :valueFontSize='valueFontSize'
                :labelFontSize='labelFontSize'
                :labelWidthProportionClass='labelWidthProportionClass'
                :valueWidthProportionClass='valueWidthProportionClass'
                :labelBgColor='labelBgColor'
                :valueBgColor='valueBgColor'
                :textColor='textColor'
                :unitExtraStyleClass='unitExtraStyleClass'
            />
            <Dimension class="col-3 col-offset-1 mb-1 text-left"
                :name="names[1]"
                :replaceTitle="replaceTitle[1] == null? toTitleCase(names[1]) : replaceTitle[1]"
                :unit="units[1]"
                :dataTestLabel="dataTestLabel + ' ' + names[1]"
                :min="mins[1]"
                :max="maxs[1]"
                :justifyContent="true"
                :forceUpdate="forceUpdate"
                :allowNegatives="allowNegatives[1]"
                :allowZeros="allowZeros[1]"
                :modelValue="localData"
                @update="dimensionUpdated($event, 1)"
                :valueFontSize='valueFontSize'
                :labelFontSize='labelFontSize'
                :labelWidthProportionClass='labelWidthProportionClass'
                :valueWidthProportionClass='valueWidthProportionClass'
                :labelBgColor='labelBgColor'
                :valueBgColor='valueBgColor'
                :textColor='textColor'
                :unitExtraStyleClass='unitExtraStyleClass'
            />
            <Dimension class="col-3 col-offset-1 mb-1 text-left"
                :name="names[2]"
                :replaceTitle="replaceTitle[2] == null? toTitleCase(names[2]) : replaceTitle[2]"
                :unit="units[2]"
                :dataTestLabel="dataTestLabel + ' ' + names[2]"
                :min="mins[2]"
                :max="maxs[2]"
                :justifyContent="true"
                :forceUpdate="forceUpdate"
                :allowNegatives="allowNegatives[2]"
                :allowZeros="allowZeros[2]"
                :modelValue="localData"
                @update="dimensionUpdated($event, 2)"
                :valueFontSize='valueFontSize'
                :labelFontSize='labelFontSize'
                :labelWidthProportionClass='labelWidthProportionClass'
                :valueWidthProportionClass='valueWidthProportionClass'
                :labelBgColor='labelBgColor'
                :valueBgColor='valueBgColor'
                :textColor='textColor'
                :unitExtraStyleClass='unitExtraStyleClass'
            />
        </div>
    </div>
</template>


