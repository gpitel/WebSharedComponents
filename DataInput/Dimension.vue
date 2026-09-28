<script setup>
import { toTitleCase, getMultiplier, removeTrailingZeroes } from '../assets/js/utils.js'
import { displayEntries, bestEntry, entryByValue, toDisplay, fromDisplay, unitSystem } from '../assets/js/units.js'
import DimensionUnit from './DimensionUnit.vue'
import InputNumber from 'primevue/inputnumber'
</script>
<script>
export default {
    components: { InputNumber },
    emits: ['update'],
    props: {
        // --- Binding ---
        modelValue: { type: Object, required: true },
        name: { type: String, required: true },
        defaultValue: { type: Number },
        // Bump to force the component to re-read modelValue[name] after an
        // external change (the cached scaled value does not react on its own).
        forceUpdate: { type: Number, default: 0 },

        // --- Label ---
        // null -> Title-Cased name; '' -> no label; any other string -> that text.
        replaceTitle: { type: String },
        tooltip: { type: String, default: null },
        dataTestLabel: { type: String, default: '' },

        // --- Unit ---
        unit: { type: String, default: null },
        altUnit: { type: String, default: null },
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
        showButtons: { type: Boolean, default: true },
        optional: { type: Boolean, default: false },

        // --- Deprecated: accepted but ignored ---
        // Styling now comes entirely from the PrimeVue theme, and the value:unit
        // split is a fixed flex ratio. These props remain declared only so the
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
        // Imperial mode (ABT #1099): the unit dropdown lists display units
        // (in / mil / °F …) instead of SI prefixes; the stored value stays SI.
        const entries = displayEntries(this.unit)
        if (entries != null) {
            const seed = initial != null ? initial : this.defaultValue
            if (seed != null) {
                const entry = bestEntry(seed, entries)
                localData.multiplier = entry.value
                localData.scaledValue = removeTrailingZeroes(toDisplay(seed, entry), this.numberDecimals)
            }
            else if (this.optional) {
                localData.multiplier = entries[0].value
            }
            return { localData, errorMessages, shortenedName: this.name, inputKey: 0 }
        }
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
            inputKey: 0,
        }
    },
    watch: {
        forceUpdate() {
            if (!isNaN(this.modelValue[this.name])) this.update(this.modelValue[this.name])
        },
        // Switching the unit system re-reads the SI value in the new units.
        activeUnitSystem() {
            this.localData.multiplier = null
            if (this.modelValue[this.name] != null && !isNaN(this.modelValue[this.name])) {
                this.update(this.modelValue[this.name])
            }
            this.inputKey += 1
        },
    },
    computed: {
        activeUnitSystem() {
            return unitSystem()
        },
        displayUnitEntries() {
            return displayEntries(this.unit)
        },
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
        // Shared min/max clamp honouring allowNegative/allowZero — used by both
        // typed-value updates and unit changes so the two paths cannot drift.
        clampValue(actualValue) {
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
            return actualValue
        },
        update(actualValue) {
            if (this.optional && (actualValue === null || actualValue === undefined
                || actualValue === '' || Number.isNaN(Number(actualValue)))) {
                this.localData.scaledValue = null
                this.errorMessages = ''
                this.modelValue[this.name] = null
                this.$emit('update', null, this.name)
                return
            }
            actualValue = this.clampValue(Number(actualValue))
            if (this.displayUnitEntries != null) {
                const entry = bestEntry(actualValue, this.displayUnitEntries)
                this.localData.multiplier = entry.value
                this.localData.scaledValue = removeTrailingZeroes(toDisplay(actualValue, entry), this.numberDecimals)
                const hasError = this.checkErrors()
                if (!hasError) {
                    this.modelValue[this.name] = actualValue
                    this.$emit('update', actualValue, this.name)
                }
                return
            }
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
        changeMultiplier(newMultiplier) {
            // Changing the unit on an empty optional field must not materialise a value.
            if (this.optional && this.localData.scaledValue == null) {
                this.localData.multiplier = newMultiplier
                return
            }
            if (this.displayUnitEntries != null) {
                // Same rule as below: the displayed number stays, the SI value follows.
                const entry = entryByValue(this.displayUnitEntries, newMultiplier)
                const newActualValue = this.clampValue(fromDisplay(this.localData.scaledValue ?? 0, entry))
                this.localData.multiplier = newMultiplier
                this.localData.scaledValue = removeTrailingZeroes(toDisplay(newActualValue, entry), this.numberDecimals)
                const hasError = this.checkErrors()
                if (!hasError) {
                    this.modelValue[this.name] = newActualValue
                    this.$emit('update', newActualValue, this.name)
                }
                return
            }
            // Keep the displayed number unchanged; only the unit changes so the
            // stored SI value changes (e.g. 5 displayed with M selected → switch
            // to k → still displays 5 but stores 5 kΩ = 5000 Ω, not 5000 kΩ).
            // Auto-scaling (1000 → 1k) only happens when the user types a value,
            // not when they manually pick a different prefix.
            const rawValue = (this.localData.scaledValue ?? 0) * newMultiplier
            const newActualValue = this.clampValue(rawValue)
            this.localData.multiplier = newMultiplier
            if (newActualValue !== rawValue) {
                // The clamp fired: the displayed number must reflect what is
                // actually stored, not the out-of-range wish.
                this.localData.scaledValue = removeTrailingZeroes(newActualValue / newMultiplier, this.numberDecimals)
            }
            const hasError = this.checkErrors()
            if (!hasError) {
                this.modelValue[this.name] = newActualValue
                this.$emit('update', newActualValue, this.name)
            }
        },
        changeScaledValue(value) {
            // Collapse back-to-back emissions from PrimeVue InputNumber (keydown
            // + blur can both fire for a single commit). The setTimeout(0) lock
            // outlives both emission timings while clearing before the next keystroke.
            if (this._changeScaledValueLock) return
            this._changeScaledValueLock = true
            setTimeout(() => { this._changeScaledValueLock = false }, 0)
            if (this.optional && (value === null || value === undefined || value === '')) {
                this.update(null)
                return
            }
            const prevScaled = this.localData.scaledValue
            const prevMult = this.localData.multiplier
            if (this.displayUnitEntries != null) {
                const entry = entryByValue(this.displayUnitEntries, this.localData.multiplier)
                const si = fromDisplay((Number(value) || 0) / this.visualScale, entry)
                // Keep the unit the user is typing in (no auto-rescale to a
                // "better" unit mid-typing); update() picks the best unit for
                // programmatic values, typing keeps the dropdown as chosen.
                const clamped = this.clampValue(si)
                this.localData.scaledValue = removeTrailingZeroes(toDisplay(clamped, entry), this.numberDecimals)
                const hasError = this.checkErrors()
                if (!hasError) {
                    this.modelValue[this.name] = clamped
                    this.$emit('update', clamped, this.name)
                }
                return
            }
            this.update((Number(value) || 0) * this.localData.multiplier / this.visualScale)
            // If update() left both scaledValue and multiplier unchanged (e.g. the
            // typed value was clamped to the same min/max already stored), Vue sees
            // no reactive diff on displayValue and the InputNumber keeps showing the
            // invalid typed text. Bump inputKey to force a remount with the correct value.
            if (this.localData.scaledValue === prevScaled && this.localData.multiplier === prevMult) {
                this.inputKey++
            }
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
                    :key="`${localData.multiplier}-${inputKey}`"
                    :model-value="displayValue"
                    @update:model-value="changeScaledValue"
                    ref="inputRef"
                    :disabled="disabled"
                    :data-cy="dataTestLabel + '-number-input'"
                    :max-fraction-digits="numberDecimals"
                    :allow-empty="optional"
                    :placeholder="optional ? '—' : undefined"
                    :show-buttons="showButtons"
                    button-layout="stacked"
                    :class="['dim-input', unit == null && altUnit == null ? 'dim-input-full' : 'dim-input-with-unit', showButtons ? '' : 'dim-input-no-buttons']"
                />
                <DimensionUnit
                    v-if="unit != null"
                    :model-value="localData.multiplier"
                    :disabled="disabled"
                    :data-cy="dataTestLabel + '-DimensionUnit-input'"
                    :min="unitMin != null ? unitMin : min"
                    :max="unitMax != null ? unitMax : max"
                    :unit="unit"
                    :use-metric-prefixes="useMetricPrefixes"
                    :entries="displayUnitEntries"
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

/* ── outer row: label + value area ──────────────────────────────── */
.dim-container {
    /* Lets the rules below react to how much room this field actually has,
       rather than to the viewport. The operating-point panel is ~204px wide on
       a 1680px screen, so a viewport media query would have called it "wide". */
    container-type: inline-size;
}

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
    flex: 0 1 9rem;
    /* The label used to take its full 9rem basis before the value got anything,
       because .dim-value-row's basis was 0: with 144px + 0px under a 204px row
       there is nothing to shrink, so the label kept 144px and the value was left
       with 56px -- of which the unit select took 43, leaving a 13px number box.
       That is the squeezed Temp field users reported in the operating-point panel.
       Cap the label so the value always keeps its half of a narrow row; on a wide
       row the 9rem basis still wins and nothing changes. */
    max-width: 55%;
    min-width: 0;
    padding: 0;
}

/* ── value + unit flex container ─────────────────────────────────── */
/* overflow:hidden here is the safety net: if any child still tries  */
/* to exceed its share, it is clipped at this boundary instead of    */
/* visually pushing the unit column out of view.                     */
.dim-value-row {
    display: flex;
    align-items: stretch;
    gap: 0;
    /* Basis 8rem rather than 0 so that when the row is too narrow for both, the
       shrink is shared with the label instead of falling entirely on the value.
       Flex distributes shrink in proportion to basis, so a 0-basis value row can
       never take any of it back from the label. */
    flex: 1 1 8rem;
    min-width: 0;
    padding: 0 !important;
    overflow: hidden;
}

/* No-unit: input fills everything */
.dim-value-row-no-unit  .dim-input { flex: 1 1 0; }

/* Has-unit: input gets 3 parts, unit gets 1 part (min 2.5 rem, no shrink) */
.dim-value-row-has-unit .dim-input          { flex: 4 1 0; }
.dim-value-row-has-unit .dim-unit,
.dim-value-row-has-unit .dim-alt-unit       { flex: 1 0 2.5rem; min-width: 2.5rem; }

/* In a narrow field (side panels: operating-point conditions, the builder's
   config cards) the 9rem label basis is most of the row, so let the label size
   to its text instead and give the number the space. Wide fields keep the 9rem
   basis, which is what aligns the value column across stacked rows. */
@container (max-width: 280px) {
    .dim-label {
        flex: 0 1 auto;
        max-width: 45%;
    }
}

/* ── input wrapper ───────────────────────────────────────────────── */
/* overflow:hidden forces the PrimeVue span to stay within its flex  */
/* share even when the browser's default <input> min-width fights it. */
.dim-input {
    min-width: 0;
    overflow: hidden;
    display: flex;
    align-items: stretch;
}
.dim-input :deep(.p-inputnumber) {
    min-width: 0 !important;
    width: 100%;
    overflow: hidden;
}
.dim-input :deep(.p-inputnumber-input) {
    text-align: end;
    height: 1.75rem;
    padding: 0.25rem 1.75rem 0.25rem 0.5rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    width: 100%;
    min-width: 0 !important;
}
.dim-input-no-buttons :deep(.p-inputnumber-input) { padding-right: 0.5rem; }
.dim-input :deep(.p-inputnumber-button) {
    height: 0.875rem;
    width: 1.25rem;
    padding: 0;
    font-size: 0.5rem;
}
.dim-input :deep(.p-inputnumber-button-group) {
    opacity: 0;
    transition: opacity 0.12s ease;
}
.dim-input:hover :deep(.p-inputnumber-button-group),
.dim-input:focus-within :deep(.p-inputnumber-button-group) { opacity: 1; }
.dim-input-full :deep(.p-inputnumber-input) {
    border-radius: var(--p-form-field-border-radius, 6px);
}
.dim-input-with-unit :deep(.p-inputnumber-input) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: 0;
}

/* ── unit dropdown (DimensionUnit / Select) ──────────────────────── */
.dim-unit {
    min-width: 0;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}
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

/* ── static alt-unit label (e.g. "%" "°C") ──────────────────────── */
.dim-alt-unit {
    display: flex;
    align-items: center;
    justify-content: flex-start;
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
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.dim-alt-unit--disabled {
    background: var(--p-select-disabled-background);
    color: var(--p-select-disabled-color);
}

/* ── error row ───────────────────────────────────────────────────── */
.dim-error-row { display: flex; width: 100%; }
.dim-error {
    text-align: center;
    color: var(--p-red-400);
    font-size: 0.9em;
    white-space: pre-wrap;
    width: 100%;
    padding-top: 0.25rem;
}
</style>
