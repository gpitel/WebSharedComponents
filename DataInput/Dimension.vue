<script setup>
import { toTitleCase, getMultiplier, removeTrailingZeroes } from '../assets/js/utils.js'
import DimensionUnit from './DimensionUnit.vue'
import InputNumber from 'primevue/inputnumber'
</script>
<script>
export default {
    components: { InputNumber },
    emits: ['update'],
    props: {
        // --- Binding ---
        // The form object holding the value, plus the key within it. The value in
        // base SI units lives at modelValue[name]. (A future change may switch this
        // to a plain v-model on the value.)
        modelValue: { type: Object, required: true },
        name: { type: String, required: true },
        defaultValue: { type: Number },
        // Bump to force the component to re-read modelValue[name] after an external
        // change (the cached scaled value does not react to it on its own).
        forceUpdate: { type: Number, default: 0 },

        // --- Label ---
        // null -> Title-Cased name; '' -> no label; any other string -> that text.
        replaceTitle: { type: String },
        tooltip: { type: String, default: null },
        dataTestLabel: { type: String, default: '' },

        // --- Unit ---
        unit: { type: String, default: null },          // SI unit with a metric-prefix selector
        altUnit: { type: String, default: null },         // fixed unit shown as a static box (no selector)
        unitMin: { type: Number, default: null },
        unitMax: { type: Number, default: null },
        useMetricPrefixes: { type: Boolean, default: true },
        defaultZeroUnit: { type: Number, default: null },

        // --- Value constraints / formatting ---
        min: { type: Number, default: 1e-12 },
        max: { type: Number, default: 1e+12 },
        numberDecimals: { type: Number, default: 6 },
        allowNegative: { type: Boolean, default: false },
        allowZero: { type: Boolean, default: false },
        visualScale: { type: Number, default: 1 },       // multiply the displayed value (e.g. ratio -> %)

        // --- State ---
        disabled: { type: Boolean, default: false },
        // When true the field is allowed to hold no value: it renders an empty
        // but editable input (instead of rendering nothing), keeps the unit
        // selector visible, and clearing it writes null to modelValue[name] so
        // the consumer gets None. Default false preserves the original
        // required-value behaviour for every existing call site.
        optional: { type: Boolean, default: false },

        // --- Deprecated: accepted but ignored ---
        // Styling now comes entirely from the PrimeVue theme, and the value:unit
        // split is a fixed 2fr:1fr grid. These props remain declared only so the
        // ~40 existing call sites don't emit attribute-fallthrough warnings or
        // leak `textcolor="[object Object]"` onto the root element. Do not use
        // them in new code — remove them from a call site when you next touch it.
        valueFontSize: { type: [String, Object], default: null },
        labelFontSize: { type: [String, Object], default: null },
        labelBgColor: { type: [String, Object], default: null },
        valueBgColor: { type: [String, Object], default: null },
        textColor: { type: [String, Object], default: null },
        labelWidthProportionClass: { type: String, default: '' },
        valueWidthProportionClass: { type: String, default: '' },
        unitExtraStyleClass: { type: String, default: '' },
        justifyContent: { type: [Boolean, String], default: false },
    },
    data() {
        const localData = { multiplier: null, scaledValue: null }
        const errorMessages = ''
        const initial = this.modelValue[this.name]
        if (initial == null && this.defaultValue != null) {
            const aux = getMultiplier(this.defaultValue, 0.001)
            localData.scaledValue = removeTrailingZeroes(aux.scaledValue, this.numberDecimals)
            localData.multiplier = aux.multiplier
        }
        if (initial != null) {
            let aux
            if (this.unit != null) {
                aux = getMultiplier(initial, 0.001)
                localData.scaledValue = removeTrailingZeroes(aux.scaledValue, this.numberDecimals)
            } else {
                localData.scaledValue = removeTrailingZeroes(initial, this.numberDecimals)
            }
            if (initial === 0) {
                localData.multiplier = this.defaultZeroUnit != null ? this.defaultZeroUnit : 1
            } else {
                localData.multiplier = this.unit != null ? aux.multiplier : 1
            }
        }
        if (localData.multiplier != null) {
            if (this.unitMin != null && localData.multiplier < this.unitMin) {
                localData.multiplier = this.unitMin
                if (initial != null && this.unit != null) {
                    localData.scaledValue = removeTrailingZeroes(initial / localData.multiplier, this.numberDecimals)
                }
            }
            if (this.unitMax != null && localData.multiplier > this.unitMax) {
                localData.multiplier = this.unitMax
                if (initial != null && this.unit != null) {
                    localData.scaledValue = removeTrailingZeroes(initial / localData.multiplier, this.numberDecimals)
                }
            }
        }
        // An optional field can start empty (scaledValue null). It still shows
        // the unit selector, so give it a sensible in-range multiplier even with
        // no value, mirroring the unitMin/unitMax clamping above.
        if (this.optional && localData.multiplier == null) {
            let mult = this.defaultZeroUnit != null ? this.defaultZeroUnit : 1
            if (this.unitMin != null && mult < this.unitMin) mult = this.unitMin
            if (this.unitMax != null && mult > this.unitMax) mult = this.unitMax
            localData.multiplier = mult
        }
        return {
            localData,
            errorMessages,
            shortenedName: this.name,
        }
    },
    watch: {
        forceUpdate() {
            if (!isNaN(this.modelValue[this.name])) this.update(this.modelValue[this.name])
        },
    },
    computed: {
        displayValue() {
            if (this.localData.scaledValue == null) return null
            return Number(removeTrailingZeroes(this.localData.scaledValue * this.visualScale, this.numberDecimals))
        },
    },
    mounted() {
        this.shortenedName = this.shortenName()
    },
    methods: {
        toTitleCase,
        shortenName() {
            if (this.$refs.container == undefined) return this.name
            let shortenName = toTitleCase(this.name)
            const w = this.$refs.container.clientWidth
            if (w < 400 && this.name.length > 10) {
                let slice = 7
                if (w < 310) slice = 6
                if (w < 250) slice = 4
                shortenName = shortenName.split(' ')
                    .map(item => item.length < slice ? item + ' ' : item.slice(0, slice) + '. ')
                    .join('')
            }
            return shortenName
        },
        checkErrors() {
            let hasError = false
            this.errorMessages = ''
            // An optional field with no value is valid (it returns null/None).
            if (this.optional && this.localData.scaledValue == null) return false
            if (this.localData.scaledValue == null) {
                hasError = true
                this.errorMessages += 'Value must be set. Set it or remove the requirement from the menu.\n'
            }
            if (isNaN(this.localData.scaledValue)) {
                this.errorMessages += 'Value cannot be empty.\n'
            }
            if (this.localData.scaledValue != null) {
                const nominal = this.localData.scaledValue * this.localData.multiplier
                if ((nominal < 0 && !this.allowNegative) || (nominal === 0 && !this.allowZero)) {
                    hasError = true
                    this.errorMessages += 'Value must be greater or equal than 0.\n'
                }
            }
            return hasError
        },
        update(actualValue) {
            // Optional fields may be cleared back to "no value": write null to
            // the bound model, leave the input empty, and skip clamping.
            if (this.optional && (actualValue === null || actualValue === undefined
                || actualValue === '' || Number.isNaN(Number(actualValue)))) {
                this.localData.scaledValue = null
                this.errorMessages = ''
                this.modelValue[this.name] = null
                this.$emit('update', null, this.name)
                return
            }
            if (this.max != null) {
                if (this.allowNegative) {
                    if (Math.abs(actualValue) > this.max) actualValue = this.max * Math.sign(actualValue)
                } else if (actualValue > this.max) actualValue = this.max
            }
            if (this.min != null) {
                if (this.allowNegative) {
                    if (Math.abs(actualValue) < this.min) actualValue = this.min * Math.sign(actualValue)
                } else if (this.allowZero) {
                    if (actualValue <= 0) actualValue = 0
                    else if (actualValue < this.min) actualValue = this.min
                } else if (actualValue < this.min) actualValue = this.min
            }
            actualValue = Number(actualValue)
            if (this.unit != null) {
                const aux = getMultiplier(actualValue, 0.001)
                let mult = aux.multiplier
                let sv = aux.scaledValue
                if (this.unitMin != null && mult < this.unitMin) { mult = this.unitMin; sv = actualValue / mult }
                if (this.unitMax != null && mult > this.unitMax) { mult = this.unitMax; sv = actualValue / mult }
                this.localData.scaledValue = sv
                if (sv !== 0) this.localData.multiplier = mult
                else if (this.defaultZeroUnit != null) this.localData.multiplier = this.defaultZeroUnit
            } else {
                this.localData.scaledValue = removeTrailingZeroes(actualValue, this.numberDecimals)
                this.localData.multiplier = 1
            }
            const hasError = this.checkErrors()
            if (!hasError) {
                this.modelValue[this.name] = actualValue
                this.$emit('update', actualValue, this.name)
            }
        },
        changeMultiplier() {
            // Changing the unit on an empty optional field must not materialise a value.
            if (this.optional && this.localData.scaledValue == null) return
            this.update(this.localData.scaledValue * this.localData.multiplier)
        },
        changeScaledValue(value) {
            if (this.optional && (value === null || value === undefined || value === '')) {
                this.update(null)
                return
            }
            this.update((Number(value) || 0) * this.localData.multiplier / this.visualScale)
        },
    },
}
</script>

<template>
    <div :data-cy="dataTestLabel + '-container'" class="dim-container" ref="container">
        <div class="dim-row">
            <label
                v-if="replaceTitle == null"
                :data-cy="dataTestLabel + '-title'"
                class="dim-label"
                :style="labelFontSize"
                v-tooltip="tooltip">
                {{ shortenedName }}
            </label>
            <label
                v-else-if="replaceTitle !== ''"
                :data-cy="dataTestLabel + '-title'"
                class="dim-label"
                :style="labelFontSize"
                v-tooltip="tooltip">
                {{ replaceTitle }}
            </label>
            <div v-if="optional || localData.scaledValue != null"
                class="dim-value-row"
                :class="(unit != null || (altUnit != null && altUnit !== '')) ? 'dim-value-row-has-unit' : 'dim-value-row-no-unit'">
                <InputNumber
                    :model-value="displayValue"
                    @update:model-value="changeScaledValue"
                    ref="inputRef"
                    :disabled="disabled"
                    :data-cy="dataTestLabel + '-number-input'"
                    :max-fraction-digits="numberDecimals"
                    :allow-empty="optional"
                    :placeholder="optional ? '—' : undefined"
                    show-buttons
                    button-layout="stacked"
                    :class="['dim-input', unit == null && altUnit == null ? 'dim-input-full' : 'dim-input-with-unit']"
                />
                <DimensionUnit
                    v-if="unit != null"
                    v-model="localData.multiplier"
                    :disabled="disabled"
                    :data-cy="dataTestLabel + '-DimensionUnit-input'"
                    :min="unitMin != null ? unitMin : min"
                    :max="unitMax != null ? unitMax : max"
                    :unit="unit"
                    :use-metric-prefixes="useMetricPrefixes"
                    class="dim-unit"
                    @update:model-value="changeMultiplier"
                />
                <label
                    v-if="unit == null && altUnit != null && altUnit !== ''"
                    class="dim-alt-unit"
                    :class="{ 'dim-alt-unit--disabled': disabled }"
                    :data-cy="dataTestLabel + '-DimensionUnit-text'">
                    {{ altUnit }}
                </label>
            </div>
        </div>
        <div class="dim-error-row" v-if="errorMessages">
            <label :data-cy="dataTestLabel + '-error-text'" class="dim-error">{{ errorMessages }}</label>
        </div>
    </div>
</template>

<style scoped>
.dim-container:not([class*="col-"]) { width: 100%; }
.dim-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-wrap: nowrap;
    width: 100%;
    min-width: 0;
}
.dim-label {
    font-size: 0.875rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    /* Give the label a consistent basis so rows align (inputs start at the same
       x) and the filling value row can't squeeze the text to an ellipsis. It
       still shrinks if the container is genuinely too narrow. Panels that need a
       different width override .dim-label. */
    flex: 0 1 9rem;
    min-width: 0;
    padding: 0;
}
.dim-value-row {
    /* Grid gives a deterministic value:unit split regardless of the value length
       or the unit-string width, instead of each field sizing to its content.
       min-width: 0 on the cells lets the columns honour the ratio. */
    display: grid;
    align-items: center;
    gap: 0;
    min-width: 7rem;
    /* Fill the width left after the label so every value control — input+unit
       OR a unit-less input — right-aligns with the others (and with the
       dropdowns), instead of sizing to its content. flex-basis 0 (not auto) so
       the value row grows into the free space WITHOUT first claiming its content
       width, which would otherwise overflow the row and squeeze the label. */
    flex: 1 1 0;
    /* PrimeFlex .col-N applies padding: 0.5rem; cancel it so the inputs sit
       flush with the row baseline (label) instead of being pushed down. */
    padding: 0 !important;
}
/* Value 2/3, unit 1/3 when a unit (dropdown or fixed) is shown; full-width value otherwise. */
.dim-value-row-has-unit {
    grid-template-columns: 2fr 1fr;
}
.dim-value-row-no-unit {
    /* No unit column — the input fills the full value-row width. */
    grid-template-columns: 1fr;
}
.dim-input {
    min-width: 0;
    width: 100%;
    display: flex;
    align-items: stretch;
}
.dim-input :deep(.p-inputnumber-input) {
    text-align: end;
    height: 1.75rem;
    /* Right padding leaves room for the absolutely-positioned spinner
       button column (1.5rem wide), so digits don't sit under the arrows. */
    padding: 0.25rem 1.75rem 0.25rem 0.5rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    width: 100%;
}
.dim-input :deep(.p-inputnumber-button) {
    height: 0.875rem;
    width: 1.25rem;
    padding: 0;
    font-size: 0.5rem;
}
/* Spinner arrows are hidden by default and only revealed while hovering or
   editing the field, so the value reads cleanly until you interact with it.
   They are absolutely positioned, so fading them in causes no layout shift. */
.dim-input :deep(.p-inputnumber-button-group) {
    opacity: 0;
    transition: opacity 0.12s ease;
}
.dim-input:hover :deep(.p-inputnumber-button-group),
.dim-input:focus-within :deep(.p-inputnumber-button-group) {
    opacity: 1;
}
.dim-input-full :deep(.p-inputnumber-input) {
    border-radius: var(--p-form-field-border-radius, 6px);
}
/* Fixed value:unit proportion — 2/3 value, 1/3 unit — instead of letting each
   field size to its content. flex-basis 0 makes the split depend only on the
   grow factors (2:1); the value keeps its min-width floor for the spinner
   buttons, so on a wide-enough row the split is a clean 2:1. */
.dim-input-with-unit :deep(.p-inputnumber-input) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: 0;
}
/* The unit cell (dropdown or fixed-unit box) fills its 1/3 grid column. The
   DimensionUnit's PrimeVue Select root carries the .dim-unit class itself, so the
   square left corners (flush seam with the value input, like the fixed-unit box)
   must be set on .dim-unit directly — a :deep(.p-select) descendant never matches. */
.dim-unit {
    width: 100%;
    min-width: 0;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}
/* PrimeFlex utility classes like .py-1/.pl-1 passed in via
   `unitExtraStyleClass` come with !important and beat single-class
   selectors. Use a 2-class compound selector to outrank them so the
   Select wrapper has no padding (its inner .p-select-label carries
   the visible padding instead). */
.dim-row .dim-unit {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
}
.dim-row .dim-unit :deep(.p-select-label) {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    padding-left: 0.5rem !important;
}
/* Fixed unit label (altUnit, e.g. ºC / % / years): render the same bordered box
   as the metric-prefix dropdown, just without the chevron, so single-unit fields
   match the multi-option ones. The adjacent input carries border-right:0, so this
   box's left border is the seam between them. */
.dim-alt-unit {
    display: flex;
    align-items: center;
    justify-content: flex-start;  /* left-align the unit text */
    /* Fills the same 1/3 grid column as the unit dropdown, so a static fixed unit
       (e.g. "years") lines up with units that have a selector. */
    width: 100%;
    min-width: 0;
    height: 1.75rem;
    padding: 0 0.5rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    border: 1px solid var(--p-inputtext-border-color);
    background: var(--p-inputtext-background);
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-top-right-radius: var(--p-form-field-border-radius, 6px);
    border-bottom-right-radius: var(--p-form-field-border-radius, 6px);
}
.dim-alt-unit--disabled {
    background: var(--p-select-disabled-background);
    color: var(--p-select-disabled-color);
}
.dim-error-row {
    display: flex;
    width: 100%;
}
.dim-error {
    text-align: center;
    color: var(--p-red-400);
    font-size: 0.9em;
    white-space: pre-wrap;
    width: 100%;
    padding-top: 0.25rem;
}
</style>
