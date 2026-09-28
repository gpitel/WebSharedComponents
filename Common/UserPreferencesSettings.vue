<script setup>
import { useSettingsStore } from '/src/stores/settings'
import { waitForMkf } from '../assets/js/mkfRuntime'
import { UNIT_SYSTEMS } from '../assets/js/units.js'
</script>

<script>
/**
 * Profile preferences (ABT #1099): unit system and preferred core
 * manufacturer. Bound to the host's settings store (`userPreferences`),
 * which roams with the account profile. Mounted in every settings dialog
 * that a user may reach (WebFrontend's tool settings, MagneticBuilder's own).
 */
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    emits: ['changed'],
    data() {
        return {
            settingsStore: useSettingsStore(),
            unitSystemOptions: UNIT_SYSTEMS,
            coreManufacturers: [],
            manufacturersError: null,
        }
    },
    computed: {
        preferences() {
            return this.settingsStore.userPreferences;
        },
        preferredManufacturerOptions() {
            const options = [{ value: '', label: 'Engine default' }];
            for (const manufacturer of this.coreManufacturers) {
                options.push({ value: manufacturer, label: manufacturer });
            }
            return options;
        },
    },
    async mounted() {
        try {
            const mkf = await waitForMkf();
            await mkf.ready;
            const manufacturers = await mkf.get_available_core_manufacturers();
            this.coreManufacturers = Array.from(manufacturers).sort();
        }
        catch (error) {
            this.manufacturersError = error.message;
            console.error('Could not list core manufacturers for the preferences:', error);
        }
    },
    methods: {
        setUnitSystem(value) {
            if (!(value in UNIT_SYSTEMS)) {
                throw new Error(`Unknown unit system "${value}"`);
            }
            this.preferences.unitSystem = value;
            this.$emit('changed', 'unitSystem');
        },
        setPreferredManufacturer(value) {
            this.preferences.preferredCoreManufacturer = value === '' ? null : value;
            this.$emit('changed', 'preferredCoreManufacturer');
        },
    },
}
</script>

<template>
    <div class="user-preferences" :data-cy="dataTestLabel + '-preferences'">
        <h6 class="text-secondary text-uppercase small font-bold mb-3">
            <i class="pi pi-user mr-2"></i>Preferences
        </h6>
        <small class="text-secondary d-block mb-3">Follow your account when you sign in on another computer</small>

        <div class="preference-row">
            <div class="preference-text">
                <div class="preference-title">Unit system</div>
                <small class="text-secondary">Lengths, areas, volumes and temperatures in the inputs and results; electrical quantities stay SI</small>
            </div>
            <select
                :data-cy="dataTestLabel + '-unit-system-select'"
                class="preference-select"
                :value="preferences.unitSystem"
                @change="setUnitSystem($event.target.value)"
            >
                <option v-for="(label, key) in unitSystemOptions" :key="key" :value="key">{{ label }}</option>
            </select>
        </div>

        <div class="preference-row">
            <div class="preference-text">
                <div class="preference-title">Preferred core manufacturer</div>
                <small class="text-secondary">The core adviser searches this maker's materials first; the pick can then be cross-referenced to other makers</small>
                <small v-if="manufacturersError" class="text-danger d-block">Manufacturer list unavailable: {{ manufacturersError }}</small>
            </div>
            <select
                :data-cy="dataTestLabel + '-preferred-manufacturer-select'"
                class="preference-select"
                :value="preferences.preferredCoreManufacturer ?? ''"
                @change="setPreferredManufacturer($event.target.value)"
            >
                <option v-for="option in preferredManufacturerOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
        </div>
    </div>
</template>

<style scoped>
.preference-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--p-gray-700);
}
.preference-text {
    min-width: 0;
}
.preference-title {
    color: var(--p-gray-100);
    font-weight: 600;
    margin-bottom: 0.15rem;
}
.preference-select {
    flex: 0 0 auto;
    max-width: 15rem;
    padding: 0.3rem 0.5rem;
    background-color: var(--p-gray-800);
    color: var(--p-gray-100);
    border: 1px solid var(--p-secondary);
    border-radius: var(--p-border-radius);
    font-size: 0.85rem;
}
.preference-select:focus {
    outline: none;
    border-color: var(--p-primary);
    box-shadow: 0 0 0 0.15rem rgba(var(--p-primary-rgb), 0.25);
}
</style>
