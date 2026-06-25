<script setup>
import { toTitleCase } from '../assets/js/utils.js'
import Checkbox from 'primevue/checkbox'
</script>
<script>
export default {
    components: { Checkbox },
    emits: ['update'],
    props: {
        name: { type: String, required: true },
        modelValue: { type: Object, required: true },
        options: { type: Object, required: true },
        dataTestLabel: { type: String, default: '' },
        optionsToDisable: { type: Array, default: () => [] },
        classInput: { type: String, default: '' },
        justifyContent: { type: Boolean, default: false },
        disabled: { type: Boolean, default: false },
        valueFontSize: { type: [String, Object], default: () => ({}) },
        labelFontSize: { type: [String, Object], default: () => ({}) },
        labelBgColor: { type: [String, Object], default: () => ({}) },
        valueBgColor: { type: [String, Object], default: () => ({}) },
        textColor: { type: [String, Object], default: () => ({}) },
    },
    computed: {
        currentSelection() {
            return this.modelValue[this.name] || []
        },
    },
    methods: {
        toTitleCase,
        onToggle(value) {
            const cur = this.modelValue[this.name] || []
            const idx = cur.indexOf(value)
            if (idx >= 0) this.modelValue[this.name] = cur.filter(v => v !== value)
            else this.modelValue[this.name] = [...cur, value]
            this.$emit('update', value, this.name)
        },
    },
}
</script>

<template>
    <div :data-cy="dataTestLabel + '-container'" class="sefl-container">
        <div class="sefl-row">
            <label
                :style="[labelBgColor, textColor, labelFontSize]"
                :data-cy="dataTestLabel + '-title'"
                class="sefl-label">
                {{ toTitleCase(name) }}
            </label>
            <div
                v-for="[key, value] in Object.entries(options)"
                :key="key"
                class="sefl-option"
                :class="classInput">
                <Checkbox
                    :input-id="name + '-' + value + '-cb'"
                    :data-cy="dataTestLabel + '-' + value + '-checkbox-input'"
                    binary
                    :model-value="currentSelection.includes(value)"
                    @update:model-value="onToggle(value)"
                    :disabled="optionsToDisable.includes(value) || disabled"
                />
                <label
                    :style="[labelBgColor, textColor, valueFontSize]"
                    class="sefl-option-label"
                    :for="name + '-' + value + '-cb'">
                    {{ value }}
                </label>
            </div>
        </div>
    </div>
</template>

<style scoped>
.sefl-container { width: 100%; }
.sefl-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem 1rem;
    width: 100%;
}
.sefl-label {
    font-size: 0.875rem;
    overflow: hidden;
    white-space: nowrap;
}
.sefl-option {
    display: flex;
    align-items: center;
    gap: 0.35rem;
}
.sefl-option-label {
    font-size: 0.875rem;
    cursor: pointer;
    user-select: none;
}
</style>
