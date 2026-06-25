<script setup>
import Dimension from '../DataInput/Dimension.vue'
</script>

<script>
export default {
    emits: ['update'],
    props: {
        unit:{
            type: String,
            required: false
        },
        modelValue:{
            type: Object,
            required: true
        },
        defaultValue:{
            type: Object
        },
        min:{
            type: Number,
            default: 1e-12
        },
        max:{
            type: Number,
            default: 1e+9
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        return {
            errorMessages: "",
        }
    },
    methods: {
        add(field) {
            this.modelValue[field] = this.defaultValue[field];
            this.$emit("update", field, this.modelValue[field]);
        },
        removeField(field) {
            this.modelValue[field] = null;
        },
        dimensionUpdated(value, field) {
            this.$emit("update", field, value);
        },
    }
}
</script>

<template>
    <div :data-cy="dataTestLabel + '-container'" class="container-flex border-bottom">
        <div class="grid">
            <label :data-cy="dataTestLabel + '-title'" class="max-dim-label text-lg text-left col-12">{{'Maximum Dimensions'}}</label>
        </div>
        <div v-for="field in ['width', 'height', 'depth']" :key="field" class="grid">
            <div class="text-base col-offset-1 col-11 grid flex justify-content-between">
                <Dimension
                    v-if="modelValue[field] != null"
                    :name="field"
                    :replaceTitle="field.charAt(0).toUpperCase() + field.slice(1)"
                    :unit="unit"
                    :min="min"
                    :max="max"
                    :modelValue="modelValue"
                    :dataTestLabel="dataTestLabel + '-' + field"
                    class="col-12"
                    labelWidthProportionClass="col-4"
                    valueWidthProportionClass="col-8"
                    @update="dimensionUpdated($event, field)"
                />
                <button v-if="modelValue[field] != null" class="col-12 px-xl-3 px-md-0 p-button p-button-sm btn-outline-danger mt-1" @click="removeField(field)">Remove</button>
                <button v-if="modelValue[field] == null" class="col-12 px-xl-3 px-md-0 p-button p-button-primary" @click="add(field)">{{'Add ' + field.charAt(0).toUpperCase() + field.slice(1)}}</button>
            </div>
        </div>
        <div class="grid">
            <label class="max-dim-error text-center col-12 pt-1">{{errorMessages}}</label>
        </div>
    </div>
</template>

<style scoped>
.max-dim-label {
    border-radius: var(--p-border-radius);
}

.max-dim-error {
    color: var(--p-red-400);
    font-size: 0.9em;
    white-space: pre-wrap;
}
</style>
