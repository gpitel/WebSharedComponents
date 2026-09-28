<script setup>
import { toTitleCase, getMultiplier, removeTrailingZeroes } from '../assets/js/utils.js'
import { displayEntries, bestEntry, toDisplay, unitSystem } from '../assets/js/units.js'
import DimensionUnit from './DimensionUnit.vue'

</script>
<script>
// Imperial readings of SI-sized quantities are small numbers (18.9 mm² is
// 0.0293 in²): keep at least three significant digits whatever the caller's
// SI-tuned decimals, or the panel shows "0 in²".
function imperialDecimals(display, numberDecimals) {
    if (display === 0 || !Number.isFinite(display)) return numberDecimals
    const significant = Math.ceil(-Math.log10(Math.abs(display))) + 2
    return Math.max(numberDecimals, significant, 0)
}

export default {
    props: {
        name: { type: String, required: true },
        replaceTitle: { type: String, default: null },
        tooltip: { type: String, default: null },
        subscriptName: { type: String, default: '' },
        unit: { type: String, required: false },
        value: { default: 0 },
        power: { type: Number, default: 1 },
        min: { type: Number, default: 1e-12 },
        max: { type: Number, default: 1e+9 },
        unitMin: { type: Number, default: null },
        unitMax: { type: Number, default: null },
        numberDecimals: { type: Number, default: 6 },
        dataTestLabel: { type: String, default: '' },
        altUnit: { type: String, default: '' },
        visualScale: { type: Number, default: 1 },
        disableShortenLabels: { type: Boolean, default: false },
        useTitleCase: { type: Boolean, default: true },
        valueFontSize: { type: [String, Object], default: () => ({ fontSize: '0.875rem' }) },
        labelWidthProportionClass: { type: String, default: '' },
        valueWidthProportionClass: { type: String, default: '' },
        inputStyleClass: { type: String, default: '' },
        labelBgColor: { type: [String, Object], default: () => ({}) },
        valueBgColor: { type: [String, Object], default: () => ({}) },
        textColor: { type: [String, Object], default: () => ({}) },
    },
    data() {
        const localData = { multiplier: null, scaledValue: null }
        const entries = displayEntries(this.unit)
        if (entries != null && this.value != null) {
            const entry = bestEntry(Number(this.value), entries)
            const display = toDisplay(Number(this.value), entry)
            localData.multiplier = entry.value
            localData.scaledValue = removeTrailingZeroes(display, imperialDecimals(display, this.numberDecimals))
            return { localData, shortenedName: this.name }
        }
        if (this.value != null) {
            let aux
            if (this.unit != null) {
                aux = getMultiplier(Number(this.value), 0.001, false, this.power)
                localData.scaledValue = removeTrailingZeroes(aux.scaledValue, this.numberDecimals)
            } else {
                localData.scaledValue = removeTrailingZeroes(Number(this.value), this.numberDecimals)
            }
            if (this.value == 0) localData.multiplier = 1
            else localData.multiplier = this.unit != null ? aux.multiplier : 1
        }
        if (localData.multiplier != null) {
            if (this.unitMin != null && localData.multiplier < this.unitMin) {
                localData.multiplier = this.unitMin
                if (this.value != null && this.unit != null) {
                    localData.scaledValue = removeTrailingZeroes(Number(this.value) / localData.multiplier, this.numberDecimals)
                }
            }
            if (this.unitMax != null && localData.multiplier > this.unitMax) {
                localData.multiplier = this.unitMax
                if (this.value != null && this.unit != null) {
                    localData.scaledValue = removeTrailingZeroes(Number(this.value) / localData.multiplier, this.numberDecimals)
                }
            }
        }
        return { localData, shortenedName: this.name }
    },
    computed: {
        activeUnitSystem() {
            return unitSystem()
        },
        displayUnitEntries() {
            return displayEntries(this.unit)
        },
        visuallyScaledValue() {
            const display = Number(this.localData.scaledValue * this.visualScale)
            const decimals = this.displayUnitEntries != null ? imperialDecimals(display, this.numberDecimals) : this.numberDecimals
            return removeTrailingZeroes(display, decimals)
        },
    },
    watch: {
        value(newValue) { if (newValue != null) this.update(newValue) },
        activeUnitSystem() { if (this.value != null) this.update(this.value) },
    },
    mounted() { this.shortenedName = this.shortenName() },
    methods: {
        shortenName() {
            const base = this.useTitleCase ? toTitleCase(this.name) : this.name
            if (this.$refs.container == undefined || this.disableShortenLabels) return base
            const w = this.$refs.container.clientWidth
            if (w < 400 && this.name.length > 10) {
                let slice = 7
                if (w < 310) slice = 6
                if (w < 250) slice = 4
                return base.split(' ').map(item => item.length < slice ? item + ' ' : item.slice(0, slice) + '. ').join('')
            }
            return base
        },
        update(actualValue) {
            if (this.displayUnitEntries != null) {
                const entry = bestEntry(Number(actualValue), this.displayUnitEntries)
                const display = toDisplay(Number(actualValue), entry)
                this.localData.multiplier = entry.value
                this.localData.scaledValue = removeTrailingZeroes(display, imperialDecimals(display, this.numberDecimals))
                return
            }
            if (this.unit != null) {
                const aux = getMultiplier(actualValue, 0.001, false, this.power)
                let mult = aux.multiplier
                let sv = aux.scaledValue
                if (this.unitMin != null && mult < this.unitMin) { mult = this.unitMin; sv = actualValue / mult }
                if (this.unitMax != null && mult > this.unitMax) { mult = this.unitMax; sv = actualValue / mult }
                this.localData.scaledValue = sv
                this.localData.multiplier = mult
            } else {
                this.localData.scaledValue = removeTrailingZeroes(Number(actualValue), this.numberDecimals)
                this.localData.multiplier = 1
            }
        },
    },
}
</script>

<template>
    <div :data-cy="dataTestLabel + '-container'" class="dim-ro-container" ref="container">
        <div class="dim-ro-row">
            <label
                :style="[valueFontSize, textColor]"
                :class="labelWidthProportionClass"
                :data-cy="dataTestLabel + '-title'"
                class="dim-ro-label"
                v-tooltip="tooltip">
                {{ replaceTitle == null ? shortenedName : replaceTitle }}<sub>{{ subscriptName }}</sub>
            </label>
            <div v-show="localData.scaledValue != null" :class="valueWidthProportionClass" class="dim-ro-value-wrap">
                <div class="dim-ro-value-row">
                    <span
                        :style="[valueFontSize, textColor]"
                        :data-cy="dataTestLabel + '-number-label'"
                        class="dim-ro-value">
                        {{ visuallyScaledValue }}
                    </span>
                    <DimensionUnit
                        v-if="unit != null"
                        v-model="localData.multiplier"
                        :disabled="true"
                        :read-only="true"
                        :data-cy="dataTestLabel + '-DimensionUnit-input'"
                        :min="unitMin != null ? unitMin : min"
                        :max="unitMax != null ? unitMax : max"
                        :value-font-size="valueFontSize"
                        :text-color="textColor"
                        :unit="unit"
                        :entries="displayUnitEntries"
                        class="dim-ro-unit"
                    />
                    <label
                        v-else
                        :style="[textColor, valueFontSize]"
                        :data-cy="dataTestLabel + '-DimensionUnit-text'"
                        class="dim-ro-alt-unit">
                        {{ altUnit }}
                    </label>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.dim-ro-container:not([class*="col-"]) { width: 100%; }
.dim-ro-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-wrap: nowrap;
    width: 100%;
    min-width: 0;
}
.dim-ro-value-wrap {
    flex: 1 1 auto;
    min-width: 0;
}
.dim-ro-value-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    justify-content: flex-end;
    width: 100%;
    min-width: 0;
}
.dim-ro-label {
    font-size: 0.875rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    /* Same basis as the refactored Dimension's label so read-only rows and
       editable rows align their value columns in mixed panels. */
    flex: 0 1 9rem;
    min-width: 0;
    padding: 0;
}
.dim-ro-value {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-size: 0.875rem;
    line-height: 1.25rem;
}
.dim-ro-unit { flex: 0 0 auto; }
.dim-ro-unit :deep(.p-select) {
    border: 0 !important;
    background: transparent !important;
}
.dim-ro-alt-unit { margin-left: 0.25rem; font-size: 0.875rem; }
</style>
