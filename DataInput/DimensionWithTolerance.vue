<script setup>
import { toTitleCase, getMultiplier } from '../assets/js/utils.js'
import DimensionUnit from './DimensionUnit.vue'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'
</script>
<script>
const FIELDS = ['minimum', 'nominal', 'maximum']
const SHORT = { minimum: 'Min.', nominal: 'Nom.', maximum: 'Max.' }
const LONG = { minimum: 'Add minimum', nominal: 'Add nominal', maximum: 'Add maximum' }

export default {
    components: { DimensionUnit, InputNumber, Button, InputText, InputGroup, InputGroupAddon },
    emits: ['update', 'changeText', 'hasError'],
    props: {
        name: { type: String, required: true },
        unit: { type: String, required: false },
        modelValue: { type: Object, required: true },
        defaultField: { type: String, default: 'nominal' },
        defaultValue: { type: Object, default: () => ({}) },
        halfSize: { type: Boolean, default: false },
        severalRows: { type: Boolean, default: false },
        varText: { type: Boolean, default: false },
        min: { type: Number, default: 1e-12 },
        max: { type: Number, default: 1e+9 },
        disabledScaling: { type: Boolean, default: false },
        disabled: { type: Boolean, default: false },
        allowNegative: { type: Boolean, default: false },
        allowAllNull: { type: Boolean, default: false },
        allowUnsorted: { type: Boolean, default: false },
        dataTestLabel: { type: String, default: '' },
        addButtonStyle: { type: Object, default: () => ({}) },
        removeButtonBgColor: { type: [String, Object], default: () => ({}) },
        valueFontSize: { type: [String, Object], default: () => ({ fontSize: '0.875rem' }) },
        titleFontSize: { type: [String, Object], default: () => ({ fontSize: '0.875rem' }) },
        labelBgColor: { type: [String, Object], default: () => ({}) },
        valueBgColor: { type: [String, Object], default: () => ({}) },
        textColor: { type: [String, Object], default: () => ({}) },
        unitExtraStyleClass: { type: String, default: '' },
    },
    data() {
        const blank = () => ({ multiplier: null, scaledValue: null })
        const localData = { minimum: blank(), nominal: blank(), maximum: blank() }

        const allNull = this.modelValue.minimum == null && this.modelValue.nominal == null && this.modelValue.maximum == null
        if (allNull && this.defaultField != null && this.defaultValue != null && this.defaultValue[this.defaultField] != null) {
            const aux = getMultiplier(this.defaultValue[this.defaultField], 0.001, this.disabledScaling)
            localData[this.defaultField].scaledValue = aux.scaledValue
            localData[this.defaultField].multiplier = aux.multiplier
        }
        for (const f of FIELDS) {
            if (this.modelValue[f] != null) {
                const aux = getMultiplier(this.modelValue[f], 0.001, this.disabledScaling)
                localData[f].scaledValue = aux.scaledValue
                localData[f].multiplier = aux.multiplier
            }
        }
        return { localData, errorMessages: '', FIELDS, SHORT, LONG }
    },
    mounted() { this.checkErrors() },
    methods: {
        toTitleCase,
        checkErrors() {
            let hasError = false
            this.errorMessages = ''
            const allNull = FIELDS.every(f => this.localData[f].scaledValue == null)
            if (allNull && !this.allowAllNull) {
                hasError = true
                this.errorMessages += 'At least one value must be set. Set one or remove the requirement from the menu.\n'
            }
            for (const f of FIELDS) {
                if (isNaN(this.localData[f].scaledValue)) this.errorMessages += `${f.charAt(0).toUpperCase()+f.slice(1)} value cannot be empty.\n`
                if (this.localData[f].scaledValue != null) {
                    const v = this.localData[f].scaledValue * this.localData[f].multiplier
                    if (v <= 0 && !this.allowNegative) {
                        hasError = true
                        this.errorMessages += `${f.charAt(0).toUpperCase()+f.slice(1)} value must be greater than 0.\n`
                    }
                }
            }
            if (!this.allowUnsorted) {
                const vNom = this.localData.nominal.scaledValue != null ? this.localData.nominal.scaledValue * this.localData.nominal.multiplier : null
                const vMin = this.localData.minimum.scaledValue != null ? this.localData.minimum.scaledValue * this.localData.minimum.multiplier : null
                const vMax = this.localData.maximum.scaledValue != null ? this.localData.maximum.scaledValue * this.localData.maximum.multiplier : null
                if (vMax != null && vNom != null && vNom >= vMax) { hasError = true; this.errorMessages += 'Nominal value must be smaller than maximum value. Change or delete one of the fields.\n' }
                if (vMin != null && vNom != null && vNom <= vMin) { hasError = true; this.errorMessages += 'Nominal value must be greater than minimum value. Change or delete one of the fields.\n' }
                if (vMin != null && vMax != null && vMax <= vMin) { hasError = true; this.errorMessages += 'Maximum value must be greater than minimum value. Change or delete one of the fields.\n' }
            }
            return hasError
        },
        update(field, actualValue) {
            const aux = getMultiplier(actualValue, 0.001, this.disabledScaling)
            this.localData[field].scaledValue = aux.scaledValue
            this.localData[field].multiplier = aux.multiplier
            if (!this.checkErrors()) {
                this.modelValue[field] = actualValue
                this.$emit('update', field, actualValue)
            }
        },
        changeMultiplier(field) {
            if (isNaN(this.localData[field].scaledValue)) {
                const aux = getMultiplier(this.defaultValue[this.defaultField], 0.001, this.disabledScaling)
                this.localData[field].scaledValue = aux.scaledValue
            }
            this.update(field, this.localData[field].scaledValue * this.localData[field].multiplier)
        },
        add(field) {
            let newValue = this.defaultValue[field]
            const ld = this.localData
            if (field === 'minimum') {
                if (ld.nominal.scaledValue != null) newValue = (ld.nominal.scaledValue / 2) * ld.nominal.multiplier
                else if (ld.maximum.scaledValue != null) newValue = (ld.maximum.scaledValue / 2) * ld.maximum.multiplier
            } else if (field === 'nominal') {
                if (ld.minimum.scaledValue != null && ld.maximum.scaledValue != null) {
                    newValue = ((ld.minimum.scaledValue * ld.minimum.multiplier) + (ld.maximum.scaledValue * ld.maximum.multiplier)) / 2
                } else if (ld.minimum.scaledValue != null) newValue = (ld.minimum.scaledValue * 2) * ld.minimum.multiplier
                else if (ld.maximum.scaledValue != null) newValue = (ld.maximum.scaledValue / 2) * ld.maximum.multiplier
            } else if (field === 'maximum') {
                if (ld.nominal.scaledValue != null) newValue = (ld.nominal.scaledValue * 2) * ld.nominal.multiplier
                else if (ld.minimum.scaledValue != null) newValue = (ld.minimum.scaledValue * 2) * ld.minimum.multiplier
            }
            this.update(field, newValue)
        },
        removeField(field) {
            this.localData[field].scaledValue = null
            this.localData[field].multiplier = null
            if (!this.checkErrors()) this.modelValue[field] = null
            else this.$emit('hasError')
        },
        changeScaledValue(value, field) {
            if (isNaN(this.localData[field].multiplier)) {
                const aux = getMultiplier(this.defaultValue[this.defaultField], 0.001, this.disabledScaling)
                this.localData[field].multiplier = aux.multiplier
            }
            const v = Number(value)
            if (value == null || value === '' || (v < 0 && !this.allowNegative)) {
                this.removeField(field)
            } else {
                this.update(field, v * this.localData[field].multiplier)
            }
        },
    },
}
</script>

<template>
    <div class="dwt-container">
        <!-- Title row -->
        <div class="dwt-title-row">
            <InputText
                v-if="varText"
                :data-cy="dataTestLabel + '-title'"
                class="dwt-title-input"
                :model-value="name"
                @change="$emit('changeText', $event.target.value)" />
            <label
                v-else
                :data-cy="dataTestLabel + '-title'"
                class="dwt-title">
                {{ toTitleCase(name) }}
            </label>
        </div>

        <!-- Min / Nom / Max columns -->
        <div class="dwt-fields-row">
            <div
                v-for="field in FIELDS"
                :key="field"
                class="dwt-field">
                <InputGroup v-if="localData[field].scaledValue != null" class="dwt-group">
                    <InputGroupAddon
                        :data-cy="dataTestLabel + '-' + field + '-remove-button'"
                        class="dwt-remove-addon"
                        @click="removeField(field)">
                        <span class="dwt-remove-label">{{ SHORT[field] }}</span>
                        <i class="pi pi-times dwt-remove-icon"></i>
                    </InputGroupAddon>
                    <InputNumber
                        :data-cy="dataTestLabel + '-' + field + '-number-input'"
                        class="dwt-input"
                        :model-value="localData[field].scaledValue"
                        @update:model-value="changeScaledValue($event, field)"
                        :max-fraction-digits="6"
                        :allow-empty="false"
                        show-buttons
                        button-layout="stacked"
                        :disabled="disabled"
                    />
                    <InputGroupAddon v-if="unit != null" class="dwt-unit-addon">
                        <DimensionUnit
                            :data-cy="dataTestLabel + '-' + field + '-DimensionUnit-input'"
                            v-model="localData[field].multiplier"
                            :min="min"
                            :max="max"
                            :unit="unit"
                            :extra-style-class="unitExtraStyleClass"
                            :value-bg-color="valueBgColor"
                            :value-font-size="valueFontSize"
                            :text-color="textColor"
                            class="dwt-unit"
                            @update:model-value="changeMultiplier(field)" />
                    </InputGroupAddon>
                </InputGroup>
                <Button
                    v-else
                    :data-cy="dataTestLabel + '-' + field + '-add-button'"
                    class="dwt-add-btn"
                    severity="secondary"
                    outlined
                    @click="add(field)">
                    <i class="pi pi-plus"></i>
                    <span>{{ LONG[field] }}</span>
                </Button>
            </div>
        </div>

        <label
            v-if="errorMessages"
            :data-cy="dataTestLabel + '-error-text'"
            class="dwt-error">
            {{ errorMessages }}
        </label>
    </div>
</template>

<style scoped>
.dwt-container {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    width: 100%;
}
.dwt-title-row {
    text-align: center;
    width: 100%;
}
.dwt-title,
.dwt-title-input {
    font-size: 0.95rem;
    font-weight: 600;
    color: inherit;
    background: transparent;
    border: 0;
    text-align: center;
    width: 100%;
}
.dwt-fields-row {
    display: flex;
    /* Wrap to extra rows when there isn't room for all fields on one line.
       With grow enabled, fields still share a single row whenever they fit. */
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: space-between;
    width: 100%;
}
.dwt-field {
    /* Size each field to its own content: a populated field (remove addon +
       number input + unit select) reserves more than a narrow "Add …" button.
       min-content stops a field from shrinking below its content (no overlap),
       while staying as narrow as possible so the three fields share ONE row
       whenever they fit — and only wrap once they genuinely can't.
       flex-basis MUST be 0 (not auto): auto would use each field's max-content
       for the wrap calc, and a populated field's wide number input would then
       bump a sibling onto a second row even when the row had room. With basis 0
       the wrap calc uses min-width (min-content), so packing is tight. */
    flex: 1 1 0;
    min-width: min-content;
}
.dwt-group {
    width: 100%;
    height: 2.25rem;
    align-items: stretch;
}
.dwt-group :deep(.p-inputgroupaddon) {
    height: 2.25rem;
    line-height: 1.25rem;
}
.dwt-group :deep(.p-inputnumber) {
    height: 2.25rem;
    align-items: stretch;
}
.dwt-remove-addon {
    cursor: pointer;
    user-select: none;
    transition: background 0.15s, color 0.15s;
    padding: 0 0.5rem !important;
    min-width: auto;
    gap: 0.25rem;
    display: flex !important;
    align-items: center !important;
    height: 2.25rem;
}
.dwt-remove-addon:hover {
    background: rgba(var(--p-danger-rgb), 0.15) !important;
    color: var(--p-danger);
}
.dwt-remove-label {
    font-size: 0.75rem;
}
.dwt-remove-icon {
    font-size: 0.65rem;
    color: var(--p-danger);
}
.dwt-input {
    flex: 1 1 auto;
    min-width: 5rem;
    display: flex;
    align-items: stretch;
}
.dwt-input :deep(.p-inputnumber-input) {
    text-align: right;
    height: 2.25rem;
    /* Right padding clears the absolutely-positioned spinner buttons. */
    padding: 0.25rem 1.75rem 0.25rem 0.5rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    width: 100%;
    border-radius: 0;
}
.dwt-input :deep(.p-inputnumber-button) {
    height: 1.125rem;
    width: 1.25rem;
    padding: 0;
    font-size: 0.5rem;
    border-radius: 0;
}
.dwt-unit-addon {
    padding: 0 !important;
    border-left: 0 !important;
    display: flex !important;
    align-items: stretch !important;
    height: 2.25rem !important;
    /* Keep the addon's default surface fill (matches the InputNumber's
       background) — the inner Select is transparent so this addon's bg
       is what the user sees behind the "km ▽" label. */
}
.dwt-unit {
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
}
.dwt-unit :deep(.p-select) {
    /* Drop the Select's own border — the InputGroupAddon already supplies
       the visible border, otherwise we get a "box inside a box". */
    border: 0 !important;
    border-radius: 0;
    background: transparent !important;
    width: 100%;
    height: 100%;
    align-self: stretch;
    box-shadow: none !important;
}
.dwt-unit :deep(.p-select-label) {
    height: 100%;
    display: flex;
    align-items: center;
}
/* Match the .dwt-remove-addon left side too, so all 3 visible segments
   are exactly the same height and there are no 1-2px vertical offsets. */
.dwt-remove-addon {
    align-items: stretch;
}
.dwt-add-btn {
    width: 100%;
    /* Keep the label on one line so the field's min-content stays compact. */
    white-space: nowrap;
    font-size: 0.75rem;
    color: var(--p-primary) !important;
    border-color: rgba(var(--p-primary-rgb), 0.5) !important;
    background: rgba(var(--p-primary-rgb), 0.08) !important;
    transition: background 0.15s, border-color 0.15s, color 0.15s !important;
}
.dwt-add-btn:hover {
    color: var(--p-white) !important;
    background: var(--p-primary) !important;
    border-color: var(--p-primary) !important;
}
.dwt-add-btn i { color: inherit; }
.dwt-error {
    color: var(--p-red-400);
    font-size: 0.85rem;
    text-align: center;
    white-space: pre-wrap;
}
</style>
