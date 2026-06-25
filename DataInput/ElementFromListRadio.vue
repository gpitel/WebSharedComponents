<script setup>
import { toTitleCase } from '../assets/js/utils.js'
import RadioButton from 'primevue/radiobutton'
import InputText from 'primevue/inputtext'
</script>
<script>
export default {
    components: { RadioButton, InputText },
    props: {
        name: { type: String, required: true },
        modelValue: { type: Object, required: true },
        options: { type: [Array, Object], required: true },
        dataTestLabel: { type: String, default: '' },
        replaceTitle: { type: String },
        tooltip: { type: String, default: null },
        titleSameRow: { type: Boolean, default: false },
        altText: { type: String },
        disabled: { type: Boolean, default: false },
        optionsToDisable: { type: Array, default: () => [] },
        valueFontSize: { type: [String, Object], default: () => ({ fontSize: '0.875rem' }) },
        labelFontSize: { type: [String, Object], default: () => ({ fontSize: '0.875rem' }) },
        labelWidthProportionClass: { type: String, default: '' },
        valueWidthProportionClass: { type: String, default: '' },
        labelBgColor: { type: [String, Object], default: () => ({}) },
        valueBgColor: { type: [String, Object], default: () => ({}) },
        textColor: { type: [String, Object], default: () => ({}) },
        optionLabels: { type: Object, default: null },
    },
    emits: ['update', 'changeText'],
    computed: {
        optionsIter() {
            if (Array.isArray(this.options)) {
                return this.options.map(v => [v, v])
            }
            return Object.entries(this.options)
        },
    },
    methods: {
        toTitleCase,
        onChange(value) {
            this.modelValue[this.name] = value
            this.$emit('update', value, this.name)
        },
    },
}
</script>

<template>
    <div :data-cy="dataTestLabel + '-container'" class="efr-container" v-tooltip="tooltip">
        <div class="efr-row" v-if="!titleSameRow">
            <InputText
                v-if="altText != null"
                :class="labelWidthProportionClass"
                :data-cy="dataTestLabel + '-alt-title-label'"
                :model-value="altText"
                @change="$emit('changeText', $event.target.value)" />
            <label
                v-else
                :style="[labelFontSize, labelBgColor, textColor]"
                :class="labelWidthProportionClass"
                :data-cy="dataTestLabel + '-title'"
                class="efr-label"
                v-tooltip="tooltip">
                {{ replaceTitle == null ? toTitleCase(name) : toTitleCase(replaceTitle) }}
            </label>
        </div>
        <div class="efr-options-row" :class="titleSameRow ? 'efr-options-row-inline' : ''">
            <label
                v-if="titleSameRow"
                :style="[labelFontSize, labelBgColor, textColor]"
                :class="labelWidthProportionClass"
                :data-cy="dataTestLabel + '-same-row-label'"
                class="efr-label efr-label-inline"
                v-tooltip="tooltip">
                {{ replaceTitle == null ? toTitleCase(name) : toTitleCase(replaceTitle) }}
            </label>
            <div
                v-for="[key, value] in optionsIter"
                :key="key"
                class="efr-option"
                :class="valueWidthProportionClass"
                :style="[disabled ? labelBgColor : valueBgColor, textColor, valueFontSize]">
                <label v-if="key === 'Planar'" class="efr-flame">&#128293;</label>
                <RadioButton
                    :input-id="key + '-radio-input'"
                    :data-cy="dataTestLabel + '-' + value + '-radio-input'"
                    :name="dataTestLabel + '-' + name"
                    :value="value"
                    :model-value="modelValue[name]"
                    @update:model-value="onChange"
                    :disabled="disabled || optionsToDisable.includes(value)"
                />
                <label class="efr-option-label" :for="key + '-radio-input'">
                    {{ (optionLabels && optionLabels[key]) || key }}
                </label>
                <label v-if="key === 'Planar'" class="efr-flame">&#128293;</label>
            </div>
        </div>
    </div>
</template>

<style scoped>
.efr-container { width: 100%; }
.efr-row {
    display: flex;
    align-items: center;
    width: 100%;
    margin-bottom: 0.25rem;
}
.efr-options-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    width: 100%;
}
.efr-options-row-inline {
    justify-content: space-between;
}
.efr-label {
    font-size: 0.875rem;
    overflow: hidden;
    white-space: nowrap;
    padding: 0;
    margin: 0;
    background: transparent;
    border: 0;
    color: inherit;
}
.efr-label-inline { flex: 0 0 auto; }
.efr-option {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background: transparent;
    border: 0;
    padding: 0;
    line-height: 1.2;
}
.efr-option-label {
    cursor: pointer;
    font-size: 0.875rem;
    user-select: none;
}
.efr-flame {
    font-size: 1rem;
}
</style>
