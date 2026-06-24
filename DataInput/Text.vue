<script setup>
import { toTitleCase } from '../assets/js/utils.js'
import InputText from 'primevue/inputtext'
</script>
<script>
export default {
    components: { InputText },
    emits: ['hasError'],
    props: {
        name: { type: String, required: true },
        modelValue: { type: Object, required: true },
        defaultValue: { type: String, default: '' },
        dataTestLabel: { type: String, default: '' },
        replaceTitle: { type: String, default: null },
        canBeEmpty: { type: Boolean, default: true },
        valueFontSize: { type: [String, Object], default: () => ({}) },
        labelFontSize: { type: [String, Object], default: () => ({}) },
        labelBgColor: { type: [String, Object], default: () => ({}) },
        valueBgColor: { type: [String, Object], default: () => ({}) },
        textColor: { type: [String, Object], default: () => ({}) },
        labelWidthProportionClass: { type: String, default: '' },
        valueWidthProportionClass: { type: String, default: '' },
        extraStyleClass: { type: String, default: '' },
    },
    data() {
        let localData = ''
        if (this.modelValue[this.name] == null && this.defaultValue != null) localData = this.defaultValue
        if (this.modelValue[this.name] != null) localData = this.modelValue[this.name]
        return { localData, errorMessages: '' }
    },
    watch: {
        modelValue(newValue) {
            this.localData = newValue[this.name]
            setTimeout(() => this.changeText(newValue[this.name]), 10)
        },
    },
    mounted() { this.changeText(this.modelValue[this.name]) },
    methods: {
        toTitleCase,
        changeText(newValue) {
            if (newValue === '' && !this.canBeEmpty) {
                this.errorMessages = toTitleCase(this.name) + ' cannot be empty. Please enter a value.'
                this.$emit('hasError')
            } else {
                this.errorMessages = ''
                this.modelValue[this.name] = newValue
            }
        },
    },
}
</script>

<template>
    <div :data-cy="dataTestLabel + '-container'" class="text-input-container">
        <div class="text-input-row">
            <label
                v-if="labelWidthProportionClass !== 'col-0'"
                :style="[labelFontSize, labelBgColor, textColor]"
                :class="labelWidthProportionClass"
                :data-cy="dataTestLabel + '-title'"
                :for="name + '-text-input'"
                class="text-input-label">
                {{ replaceTitle != null ? replaceTitle : toTitleCase(name) }}
            </label>
            <InputText
                :data-cy="dataTestLabel + '-text-input'"
                :class="[valueWidthProportionClass, extraStyleClass]"
                class="text-input-value"
                :id="name + '-text-input'"
                @change="changeText($event.target.value)"
                :model-value="localData" />
        </div>
        <label v-if="errorMessages" class="text-input-error">{{ errorMessages }}</label>
    </div>
</template>

<style scoped>
.text-input-container { width: 100%; }
.text-input-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
}
.text-input-label {
    font-size: 0.875rem;
    white-space: nowrap;
}
.text-input-value {
    flex: 1 1 auto;
    min-width: 0;
}
.text-input-error {
    color: var(--p-red-400);
    text-align: center;
    font-size: 0.85rem;
    display: block;
    width: 100%;
    padding-top: 0.25rem;
    white-space: pre-wrap;
}
</style>
