<script>
/**
 * The card chrome of a builder panel (ABT #1121): rounded body, a header with
 * an icon and a title on the left and actions on the right.
 *
 * The Core, Wire and Coil panels each carried their own copy of these rules —
 * identical but for the class prefix — so a new panel meant a fourth copy. This
 * is that chrome, once. The existing panels keep their own markup for now; a
 * panel written from here on uses this and looks the same.
 *
 *   <PanelFrame title="Core info" icon="pi-info-circle">
 *       <template #actions><button …>…</button></template>
 *       …body…
 *   </PanelFrame>
 */
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        title: {
            type: String,
            required: true,
        },
        /** A PrimeIcons class, without the leading `pi`. */
        icon: {
            type: String,
            default: 'pi-box',
        },
        /**
         * Colour of the header title and the accent, as a CSS colour. Defaults
         * to the theme primary; a panel that belongs to a part of the design
         * passes that part's colour so a band reads at a glance.
         */
        accent: {
            type: String,
            default: null,
        },
        /** Body fills the panel and scrolls inside it rather than growing it. */
        scrollBody: {
            type: Boolean,
            default: false,
        },
        /** Removes the body padding, for a panel whose body is one canvas. */
        flushBody: {
            type: Boolean,
            default: false,
        },
    },
    computed: {
        accentStyle() {
            return this.accent == null ? {} : { '--panel-frame-accent': this.accent };
        },
    },
}
</script>

<template>
    <div class="panel-frame" :style="accentStyle" :data-cy="dataTestLabel + '-Panel'">
        <div class="panel-frame-header">
            <span class="panel-frame-title">
                <i class="pi" :class="icon"></i>
                <span>{{ title }}</span>
            </span>
            <span v-if="$slots.actions" class="panel-frame-actions">
                <slot name="actions" />
            </span>
        </div>
        <div
            class="panel-frame-body"
            :class="{ 'panel-frame-body-scroll': scrollBody, 'panel-frame-body-flush': flushBody }"
        >
            <slot />
        </div>
    </div>
</template>

<style scoped>
.panel-frame {
    --panel-frame-accent: var(--p-primary);
    background: linear-gradient(145deg, color-mix(in srgb, var(--p-gray-600) 6%, transparent) 0%, color-mix(in srgb, var(--p-gray-600) 2%, transparent) 100%);
    border: 1px solid color-mix(in srgb, var(--p-gray-600) 20%, transparent);
    border-radius: 14px;
    margin: 0.15rem 0 0.25rem 0;
    box-shadow: 0 4px 20px rgba(var(--p-black-rgb), 0.12), inset 0 1px 0 rgba(var(--p-white-rgb), 0.04);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    height: 100%;
}

.panel-frame-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    row-gap: 0.35rem;
    padding: 0.6rem 0.9rem;
    background: color-mix(in srgb, var(--p-gray-600) 10%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--p-gray-600) 15%, transparent);
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--panel-frame-accent);
    letter-spacing: 0.02em;
}

.panel-frame-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
    min-width: 0;
}

.panel-frame-title span {
    overflow: hidden;
    text-overflow: ellipsis;
}

.panel-frame-title i {
    filter: drop-shadow(0 0 4px rgba(var(--p-primary-rgb), 0.45));
}

.panel-frame-actions {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-left: auto;
}

.panel-frame-body {
    padding: 0.6rem 0.75rem 0.75rem 0.75rem;
    flex: 1;
    min-height: 0;
    min-width: 0;
}

.panel-frame-body-scroll {
    overflow-y: auto;
}

.panel-frame-body-flush {
    padding: 0;
}
</style>
