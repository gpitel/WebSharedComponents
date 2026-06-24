<script setup>
import { toTitleCase } from '../assets/js/utils.js'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
</script>
<script>
export default {
    components: { Select, InputText },
    props: {
        name: { required: true },
        modelValue: { type: Object, required: true },
        options: { required: true },
        optionLabels: { type: Object, default: null },
        replaceTitle: { type: String },
        tooltip: { type: String, default: null },
        titleSameRow: { type: Boolean, default: false },
        altText: { type: String },
        dataTestLabel: { type: String, default: '' },
        optionsToDisable: { type: Array, default: () => [] },
        justifyContent: { type: Boolean, default: false },
        disabled: { type: Boolean, default: false },
        labelWidthProportionClass: { type: String, default: '' },
        selectStyleClass: { type: String, default: '' },
        valueFontSize: { type: [String, Object], default: () => ({ fontSize: '0.875rem' }) },
        labelFontSize: { type: [String, Object], default: () => ({ fontSize: '0.875rem' }) },
        labelBgColor: { type: [String, Object], default: () => ({}) },
        valueBgColor: { type: [String, Object], default: () => ({}) },
        textColor: { type: [String, Object], default: () => ({}) },
    },
    emits: ['update', 'model-changed', 'changeText'],
    computed: {
        isArrayOptions() {
            return Array.isArray(this.options)
        },
        // Normalised list for PrimeVue's <Select>:
        //   [{ label, value, disabled }]
        // For Array options, the stored value === the option string.
        // For Object options, the stored value is the OBJECT KEY, and the
        // displayed text is `optionLabels[value] || value`.
        primeOptions() {
            if (this.isArrayOptions) {
                return this.options.map(v => ({
                    label: (this.optionLabels && this.optionLabels[v] != null) ? this.optionLabels[v] : v,
                    value: v,
                    disabled: this.optionsToDisable.includes(v),
                }))
            }
            return Object.entries(this.options).map(([key, value]) => ({
                label: (this.optionLabels && this.optionLabels[value] != null) ? this.optionLabels[value] : value,
                value: key,
                disabled: this.optionsToDisable.includes(value),
            }))
        },
        currentValue() {
            if (!this.modelValue) return null
            return this.modelValue[this.name]
        },
    },
    methods: {
        toTitleCase,
        onChange(newVal) {
            this.modelValue[this.name] = newVal
            this.$emit('update', newVal, this.name)
            this.$emit('model-changed', newVal, this.name)
        },
    },
}
</script>

<template>
    <div :data-cy="dataTestLabel + '-container'" class="efl-container">
        <div class="efl-row" v-if="!titleSameRow">
            <InputText
                v-if="altText != null"
                :class="['efl-alt-input', labelWidthProportionClass]"
                :data-cy="dataTestLabel + '-alt-title-label'"
                :model-value="altText"
                @change="$emit('changeText', $event.target.value)" />
            <label
                v-else
                :style="[labelFontSize, labelBgColor, textColor]"
                :class="labelWidthProportionClass"
                :data-cy="dataTestLabel + '-title'"
                v-tooltip="tooltip"
                class="efl-label">
                {{ replaceTitle == null ? toTitleCase(name) : replaceTitle }}
            </label>
        </div>
        <div class="efl-row" :class="justifyContent ? 'efl-row-between' : ''">
            <label
                v-if="titleSameRow"
                :style="[labelFontSize, labelBgColor, textColor]"
                :class="labelWidthProportionClass"
                :data-cy="dataTestLabel + '-same-row-label'"
                v-tooltip="tooltip"
                class="efl-label efl-label-inline">
                {{ replaceTitle == null ? toTitleCase(name) : replaceTitle }}
            </label>
            <Select
                :data-cy="dataTestLabel + '-select'"
                :class="['efl-select', selectStyleClass]"
                :style="[valueFontSize, disabled ? labelBgColor : valueBgColor, textColor]"
                :options="primeOptions"
                option-label="label"
                option-value="value"
                option-disabled="disabled"
                :model-value="currentValue"
                @update:model-value="onChange"
                :disabled="disabled"
            />
        </div>
    </div>
</template>

<style scoped>
.efl-container:not([class*="col-"]) {
    width: 100%;
}
.efl-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-wrap: nowrap;
    width: 100%;
    min-width: 0;
    padding: 0 !important;
}
.efl-row-between {
    justify-content: space-between;
}
.efl-label {
    font-size: 0.875rem;
    overflow: hidden;
    white-space: nowrap;
    padding: 0;
    margin: 0;
}
.efl-label-inline {
    flex: 0 0 auto;
}
.efl-alt-input {
    margin-left: 1rem;
    margin-bottom: 0.5rem;
    border: 0;
    padding: 0;
    flex: 1 1 auto;
    background: transparent;
    color: inherit;
}
.efl-select {
    height: 1.75rem;
    line-height: 1.25rem;
    font-size: 0.875rem;
    flex: 1 1 auto;
    min-width: 0;
    padding: 0 !important;
}
.efl-select :deep(.p-select-label) {
    padding: 0.25rem 0.5rem;
    line-height: 1.25rem;
    font-size: 0.875rem;
    height: 1.75rem;
    display: flex;
    align-items: center;
}
.efl-select :deep(.p-select-dropdown) {
    width: 1.75rem;
}
</style>
