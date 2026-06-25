<script setup>
import { deepCopy } from '../assets/js/utils.js'
import { waitForMkf } from '../assets/js/mkfRuntime.js'

</script>

<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        wire: {
            type: Object,
            required: true,
        },
        forceUpdate:{
            type: Number,
            default: 0
        },
        operatingPoint: {
            type: Object,
            required: false,
        },
        includeCurrentDensity: {
            type: Boolean,
            default: true,
        },
        windingIndex: {
            type: Number,
            default: 0,
        },
        loadingGif: {
            type: String,
            default: "/images/loading.gif",
        },
        backgroundColor: {
            type: String,
            default: "var(--p-dark)",
        },
    },
    data() {
        const posting = false
        const recentChange = false
        const tryingToSend = false
        const lastUsedWire = "";
        const style = getComputedStyle(document.body);
        return {
            posting,
            recentChange,
            tryingToSend,
            lastUsedWire,
            isMounted: false,
        }
    },
    watch: {
        'forceUpdate': {
            handler(newValue, oldValue) {
                const wiresString = JSON.stringify(this.wire);
                if (wiresString != this.lastUsedWire) {
                    this.$stateStore.wire2DVisualizerState.plotCurrentViews[this.windingIndex] = null;
                    this.tryToSend();
                    this.lastUsedWire = wiresString;
                }
            },
            deep: true
        },
    },
    methods: {
        async computeWireLocally() {
            if (!this.posting && this.wire != null) {
                try {
                    const mkf = await waitForMkf();
                    const aux = deepCopy(this.wire);
                    this.posting = true;
                    const result = await mkf.plot_wire(JSON.stringify(this.wire));
                    if (!this.isMounted) return;
                    if (!result || !result.startsWith("<svg")) {
                        this.posting = false;
                        console.error("Invalid SVG result from plot_wire");
                        return;
                    }
                    this.$refs.wire2DPlotView.innerHTML = result;
                    this.posting = false;

                    const clientWidth = this.$refs.wire2DPlotViewContainer.clientWidth;
                    const clientHeight = this.$refs.wire2DPlotViewContainer.clientHeight * 0.90;
                    let originalWidth = 0;
                    let originalHeight = 0;
                    {
                        const regex = /width="(\d*\.)?\d+"/i;
                        const matchResult = this.$refs.wire2DPlotView.innerHTML.match(regex);
                        if (matchResult) {
                            const aux = matchResult[0];
                            const regex2 = /(\d*\.)?\d+/g;
                            const match = aux.match(regex2);
                            originalWidth = Array.from(match)[0];
                        }
                    }
                    {
                        const regex = /height="(\d*\.)?\d+"/i;
                        const matchResult = this.$refs.wire2DPlotView.innerHTML.match(regex);
                        if (matchResult) {
                            const aux = matchResult[0];
                            const regex2 = /(\d*\.)?\d+/g;
                            const match = aux.match(regex2);
                            originalHeight = Array.from(match)[0];
                        }
                    }

                    if (originalWidth > originalHeight * 0.85) {
                        this.widthProportion = "100%";
                    }
                    else {
                        const originalProportion = originalWidth / (originalHeight * 0.85)
                        this.widthProportion = `${originalProportion * 100}%`;
                    }

                    this.$refs.wire2DPlotView.innerHTML = this.$refs.wire2DPlotView.innerHTML.replace(`<svg`, `<svg class="scaling-wire-svg"`);
                    this.$stateStore.wire2DVisualizerState.plotCurrentViews[this.windingIndex] = this.$refs.wire2DPlotView.innerHTML;
                } catch(error) {
                    console.error(error);
                }
            }
        },

        tryToSend() {
            if (this.$stateStore.wire2DVisualizerState.plotCurrentViews[this.windingIndex] == null) {
                if (!this.tryingToSend) {
                    this.recentChange = false;
                    this.tryingToSend = true;
                    setTimeout(() => {
                        if (!this.isMounted) {
                            this.tryingToSend = false;
                            return;
                        }
                        if (!this.hasError) {
                            if (this.recentChange) {
                                this.tryingToSend = false;
                                this.tryToSend();
                            }
                            else {
                                this.tryingToSend = false;
                                // All wire rendering is done client-side via WASM.
                                this.computeWireLocally();
                            }
                        }
                    }
                    , this.$settingsStore.waitingTimeForPlottingAfterChange);
                }
            }
            else {
                if (!this.isMounted) return;
                this.$refs.wire2DPlotView.innerHTML = this.$stateStore.wire2DVisualizerState.plotCurrentViews[this.windingIndex];
            }
        },

    },
    mounted() {
        this.isMounted = true;
        this.tryToSend();
    },
    beforeUnmount() {
        this.isMounted = false;
    },
    computed: {
    },
};
</script>

<template>
    <div class="mt-2 wire2DPlotViewer text-center mx-auto" ref="wire2DPlotViewContainer">
        <img :data-cy="dataTestLabel + 'Wire2DVisualizer-loading'" v-if="posting" class="mx-auto block col-12" alt="loading" style="width: auto; height: 20vh;" :src="loadingGif">
        <div :data-cy="dataTestLabel + 'Wire2DVisualizer-core-field-plot-image'" v-show="!posting" ref="wire2DPlotView" style="width: auto; height: 20vh;" />
    </div>
</template>

<style>

    .wire2DPlotViewer {
/*        resize: horizontal;*/
        overflow: hidden;
        width: auto;
        height: auto;
    }
.scaling-wire-svg {
    object-fit: contain;
    height: 100%; 
    width: v-bind(widthProportion);
    left: 0; 
    top: 0;
}
</style>