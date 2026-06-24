<script setup>
import { toTitleCase } from '../assets/js/utils.js'
import InputText from 'primevue/inputtext'
</script>
<script>
export default {
    components: { InputText },
    emits: ['hasError', 'updateModelValue', 'update'],
    props: {
        name: { type: String, required: true },
        replaceTitle: { type: String, default: null },
        modelValue: { type: String, required: true },
        dataTestLabel: { type: String, default: '' },
        allowedCharacters: { type: String, required: true },
        allowConsecutive: { type: Boolean, default: false },
        allowMissing: { type: Boolean, default: false },
        valueFontSize: { type: [String, Object], default: () => ({}) },
        labelFontSize: { type: [String, Object], default: () => ({}) },
        labelBgColor: { type: [String, Object], default: () => ({}) },
        valueBgColor: { type: [String, Object], default: () => ({}) },
        textColor: { type: [String, Object], default: () => ({}) },
        disabled: { type: Boolean, default: false },
    },
    data() {
        return { localData: this.modelValue || '', errorMessages: '' }
    },
    watch: {
        modelValue: {
            handler(newValue) { this.changeText(newValue) },
            deep: true,
        },
    },
    methods: {
        toTitleCase,
        changeText(newValue) {
            const newValueArray = String(newValue).split('')
            const allowedCharactersArray = this.allowedCharacters.split('')
            this.localData = newValueArray.filter(c => allowedCharactersArray.includes(c)).join('')

            let missingValue = ''
            const missingValues = !this.allowMissing && allowedCharactersArray.some(allowedChar => {
                if (!newValueArray.includes(allowedChar)) { missingValue = allowedChar; return true }
                return false
            })
            const consecutiveValues = !this.allowConsecutive && newValueArray.some((c, i) => i > 0 && c === newValueArray[i - 1])

            if (this.localData === '') {
                this.errorMessages = 'Field cannot be empty'
                this.$emit('hasError')
            } else if (consecutiveValues) {
                this.errorMessages = 'Field cannot have repeated consecutive values'
                this.$emit('hasError')
            } else if (missingValues) {
                this.errorMessages = 'Field cannot have missing values. Missing ' + missingValue
                this.$emit('hasError')
            } else {
                this.errorMessages = ''
                this.$emit('updateModelValue', this.localData)
                this.$emit('update')
            }
        },
    },
}
</script>

<template>
    <div :data-cy="dataTestLabel + '-container'" class="loc-container">
        <div class="loc-row">
            <label
                :style="[labelBgColor, textColor, labelFontSize]"
                :data-cy="dataTestLabel + '-title'"
                :for="name + '-text-input'"
                class="loc-label">
                {{ replaceTitle == null ? toTitleCase(name) : replaceTitle }}
            </label>
            <InputText
                :data-cy="dataTestLabel + '-text-input'"
                :disabled="disabled"
                class="loc-input"
                :id="name + '-text-input'"
                @change="changeText($event.target.value)"
                :model-value="localData" />
        </div>
        <label v-if="errorMessages" class="loc-error">{{ errorMessages }}</label>
    </div>
</template>

<style scoped>
.loc-container { width: 100%; }
.loc-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
}
.loc-label {
    font-size: 0.875rem;
    white-space: nowrap;
    flex: 0 0 auto;
}
.loc-input {
    flex: 1 1 auto;
    min-width: 0;
    text-align: center;
}
.loc-error {
    color: var(--p-red-400);
    text-align: center;
    font-size: 0.85rem;
    display: block;
    width: 100%;
    padding-top: 0.25rem;
    white-space: pre-wrap;
}
</style>
