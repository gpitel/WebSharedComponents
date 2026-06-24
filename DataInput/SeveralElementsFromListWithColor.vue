<script setup>
import { toTitleCase } from '../assets/js/utils.js'
import Checkbox from 'primevue/checkbox'
import ColorPicker from 'primevue/colorpicker'
</script>
<script>
export default {
    components: { Checkbox, ColorPicker },
    emits: ['update', 'colorChange'],
    props: {
        name: { type: String, required: true },
        modelValue: { type: Object, required: true },
        colors: { type: Object, required: true },
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
    mounted() {
        Object.keys(this.options).forEach(value => {
            if (!(value in this.colors)) this.colors[value] = this.getRandomColor()
        })
    },
    computed: {
        currentSelection() {
            return this.modelValue[this.name] || []
        },
    },
    methods: {
        toTitleCase,
        getRandomColor() {
            const letters = '0123456789ABCDEF'
            let color = '#'
            for (let i = 0; i < 6; i++) color += letters[Math.floor(Math.random() * 16)]
            return color
        },
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
    <div :data-cy="dataTestLabel + '-container'" class="seflc-container">
        <label
            :style="[labelBgColor, textColor, labelFontSize]"
            :data-cy="dataTestLabel + '-title'"
            class="seflc-label">
            {{ toTitleCase(name) }}
        </label>
        <div class="seflc-row">
            <div
                v-for="[key, value] in Object.entries(options)"
                :key="key"
                class="seflc-option"
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
                    class="seflc-option-label"
                    :for="name + '-' + value + '-cb'">
                    {{ value }}
                </label>
                <ColorPicker
                    v-if="currentSelection.includes(value)"
                    v-model="colors[value]"
                    @change="$emit('colorChange')"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.seflc-container { width: 100%; }
.seflc-label {
    font-size: 0.875rem;
    overflow: hidden;
    white-space: nowrap;
    display: block;
    margin-bottom: 0.4rem;
}
.seflc-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    width: 100%;
}
.seflc-option {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}
.seflc-option-label {
    font-size: 0.875rem;
    cursor: pointer;
    user-select: none;
}
</style>
