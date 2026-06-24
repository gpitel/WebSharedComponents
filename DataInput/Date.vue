<script setup>
import { toTitleCase } from '../assets/js/utils.js'
import DatePicker from 'primevue/datepicker'
</script>
<script>
export default {
    components: { DatePicker },
    emits: ['hasError'],
    props: {
        name: { type: String, required: true },
        modelValue: { type: Object, required: true },
        defaultValue: { type: String, default: '' },
        dataTestLabel: { type: String, default: '' },
        labelBgColor: { type: [String, Object], default: () => ({}) },
        valueBgColor: { type: [String, Object], default: () => ({}) },
        textColor: { type: [String, Object], default: () => ({}) },
        labelWidthProportionClass: { type: String, default: '' },
        inputStyleClass: { type: String, default: '' },
    },
    computed: {
        boundDate: {
            get() {
                const v = this.modelValue[this.name] || this.defaultValue || null
                return v ? new Date(v) : null
            },
            set(val) {
                this.modelValue[this.name] = val ? val.toISOString().slice(0, 10) : ''
            },
        },
    },
    methods: { toTitleCase },
}
</script>

<template>
    <div :data-cy="dataTestLabel + '-container'" class="date-input-container">
        <label
            :class="labelWidthProportionClass"
            :style="[labelBgColor, textColor]"
            :data-cy="dataTestLabel + '-title'"
            :for="name + '-date-input'"
            class="date-input-label">
            {{ toTitleCase(name) }}
        </label>
        <DatePicker
            v-model="boundDate"
            :input-id="name + '-date-input'"
            :class="inputStyleClass"
            class="date-input-picker"
            date-format="dd/mm/yy"
            show-icon
            fluid />
    </div>
</template>

<style scoped>
.date-input-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
}
.date-input-label {
    font-size: 0.875rem;
    white-space: nowrap;
}
.date-input-picker {
    flex: 1 1 auto;
    min-width: 0;
}
</style>
