<script setup>
import { MeshPhysicalMaterial, Object3D, Mesh, Box3, Vector3} from 'three';
import {Camera, EffectComposer, InstancedMesh, PhongMaterial, Renderer, RenderPass, SphereGeometry, SpotLight, Scene, AmbientLight} from 'troisjs';
import { deepCopy, hexToRgb } from '../assets/js/utils.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { initMvbWorker, buildCoreSTL, buildCorePieceSTL } from '../assets/js/mvbRuntime.js'
</script>

<script>

export default {
    emits: ["errorInDimensions", "renderSuccess"],
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        core: {
            type: Object,
            required: true,
        },
        forceUpdate:{
            type: Number,
            default: 0
        },
        fullCoreModel: {
            type: Boolean,
            default: true,
        },
        offset: {
            type: Number,
            default: 1,
        },
        loadingGif: {
            type: String,
            default: `${import.meta.env.BASE_URL}/images/loading.gif`,
        },
        backgroundColor: {
            type: String,
            default: "var(--p-dark)",
        },
        // For the shape customizer: render a single piece regardless of the
        // core's declared numberStacks.
        ignoreStacks: {
            type: Boolean,
            default: false,
        },
    },
    components: {
        Camera,
        EffectComposer,
        InstancedMesh,
        PhongMaterial,
        Renderer,
        RenderPass,
        SphereGeometry,
        SpotLight,
        Scene,
        AmbientLight,
    },
    data() {
        const current3dObject = null
        const posting = false
        const updating = false
        const recentChange = false
        const tryingToSend = false
        const style = getComputedStyle(document.body);
        const currentCore = null;

        const theme = {
          primary: style.getPropertyValue('--p-primary'),
          secondary: style.getPropertyValue('--p-secondary'),
          success: style.getPropertyValue('--p-success'),
          info: style.getPropertyValue('--p-info'),
          warning: style.getPropertyValue('--p-warning'),
          danger: style.getPropertyValue('--p-danger'),
          light: style.getPropertyValue('--p-light'),
          dark: style.getPropertyValue('--p-dark'),
          white: style.getPropertyValue('--p-white'),
        };
        return {
            current3dObject,
            posting,
            updating,
            recentChange,
            tryingToSend,
            theme,
            currentCore,
        }
    },
    watch: {
        'forceUpdate': {
            handler(newValue, oldValue) {
                if (JSON.stringify(this.core) !== JSON.stringify(this.currentCore)) {
                    this.tryToSend();
                    this.updating = true;
                    this.removeObject3D(this.current3dObject);
                    this.currentCore = deepCopy(this.core);
                }
            },
          deep: true
        },
        // Re-render when the full-core / one-piece toggle flips (the core
        // itself is unchanged, so the forceUpdate watcher above won't fire).
        'fullCoreModel'() {
            this.removeObject3D(this.current3dObject);
            this.computeShape();
        },
    },
    methods: {
        removeObject3D(object3D) {
            if (!(object3D instanceof Object3D)) return false;

            // for better memory management and performance
            if (object3D.geometry) object3D.geometry.dispose();

            if (object3D.material) {
                if (object3D.material instanceof Array) {
                    // for better memory management and performance
                    object3D.material.forEach(material => material.dispose());
                } else {
                    // for better memory management and performance
                    object3D.material.dispose();
                }
            }
            object3D.removeFromParent(); // the parent might be the scene or another Object3D, but it is sure to be removed this way
            return true;
        },
        getPiece(arrayBuffer) {
            const scene = this.$refs.scene.scene;
            const camera = this.$refs.camera.camera;
            const loader = new STLLoader();
            const geometry = loader.parse(arrayBuffer);
            // Recenter the geometry on the origin. fitCameraToCenteredObject aims
            // the camera at (0,0,0); a single piece (drawCorePiece) is offset along
            // its stacking axis, so without this it renders low/clipped. No-op for
            // the full core, which MVB++ already centers.
            geometry.computeBoundingBox();
            const geoCenter = new Vector3();
            geometry.boundingBox.getCenter(geoCenter);
            geometry.translate(-geoCenter.x, -geoCenter.y, -geoCenter.z);
            const color = hexToRgb('#7b7c7d');
            const material = new MeshPhysicalMaterial();
            material.color.r = color.r / 255;
            material.color.g = color.g / 255;
            material.color.b = color.b / 255;
            material.specularColor.r = 0.2;
            material.specularColor.g = 0.2;
            material.specularColor.b = 0.2;
            const mesh = new Mesh(geometry, material);
            const isToroidal = this.core?.functionalDescription?.shape?.family?.toLowerCase() === 't';
            mesh.rotation.x = isToroidal ? -Math.PI / 2 : 0;
            scene.add(mesh);
            this.current3dObject = mesh;
            this.fitCameraToCenteredObject(camera, mesh, this.offset, isToroidal ? 1.5 : 0);
        },
        fitCameraToCenteredObject(camera, object, offset, offsetY, orbitControls) {
            const boundingBox = new Box3();
            boundingBox.setFromObject( object );

            const middle = new Vector3();
            const size = new Vector3();
            boundingBox.getSize(size);

            // figure out how to fit the box in the view:
            // 1. figure out horizontal FOV (on non-1.0 aspects)
            // 2. figure out distance from the object in X and Y planes
            // 3. select the max distance (to fit both sides in)
            //
            // The reason is as follows:
            //
            // Imagine a bounding box (BB) is centered at (0,0,0).
            // Camera has vertical FOV (camera.fov) and horizontal FOV
            // (camera.fov scaled by aspect, see fovh below)
            //
            // Therefore if you want to put the entire object into the field of view,
            // you have to compute the distance as: z/2 (half of Z size of the BB
            // protruding towards us) plus for both X and Y size of BB you have to
            // figure out the distance created by the appropriate FOV.
            //
            // The FOV is always a triangle:
            //
            //  (size/2)
            // +--------+
            // |       /
            // |      /
            // |     /
            // | F° /
            // |   /
            // |  /
            // | /
            // |/
            //
            // F° is half of respective FOV, so to compute the distance (the length
            // of the straight line) one has to: `size/2 / Math.tan(F)`.
            //
            // FTR, from https://threejs.org/docs/#api/en/cameras/PerspectiveCamera
            // the camera.fov is the vertical FOV.

            const fov = camera.fov * ( Math.PI / 180 );
            const fovh = 2*Math.atan(Math.tan(fov/2) * camera.aspect);
            let dx = size.z / 2 + Math.abs( size.x / 2 / Math.tan( fovh / 2 ) );
            let dy = size.z / 2 + Math.abs( size.y / 2 / Math.tan( fov / 2 ) );
            let cameraZ = Math.max(dx, dy);
            let cameraY = 0;

            // offset the camera, if desired (to avoid filling the whole canvas)
            if( offset !== undefined && offset !== 0 ) cameraZ *= offset;
            if( offsetY !== undefined && offsetY !== 0 ) cameraY = size.y * offsetY;

            camera.position.set( 0, cameraY, cameraZ );

            // set the far plane of the camera so that it easily encompasses the whole object
            const minZ = boundingBox.min.z;
            const cameraToFarEdge = ( minZ < 0 ) ? -minZ + cameraZ : cameraZ - minZ;

            camera.near = cameraToFarEdge * 0.001;
            camera.far = cameraToFarEdge * 30;
            camera.updateProjectionMatrix();

            if ( orbitControls !== undefined ) {
                // set camera to rotate around the center
                orbitControls.target = new THREE.Vector3(0, 0, 0);

                // prevent camera from zooming out far enough to create far plane cutoff
                orbitControls.maxDistance = cameraToFarEdge * 20;
            }
        },
        async computeShape() {
            if (this.posting) return;
            const shape = this.core?.functionalDescription?.shape;
            const material = this.core?.functionalDescription?.material;
            if (!shape || !material || shape === '') return;

            try {
                this.posting = true;
                await initMvbWorker();

                const coreAux = deepCopy(this.core);
                coreAux.geometricalDescription = null;
                coreAux.processedDescription = null;
                if (coreAux.functionalDescription?.shape?.familySubtype != null) {
                    coreAux.functionalDescription.shape.familySubtype =
                        String(coreAux.functionalDescription.shape.familySubtype);
                }
                if (this.ignoreStacks && coreAux.functionalDescription) {
                    coreAux.functionalDescription.numberStacks = 1;
                }

                // Build core STL via MVB++ WASM (no backend needed).
                // Full core, or a single physical piece when fullCoreModel is off:
                // drawCorePiece builds one piece from the CoreShape — one half-set
                // of a two-piece concentric core, or the whole ring for a toroid.
                // Falls back to the full core when the shape isn't an object with
                // dimensions (e.g. a bare named shape, which drawCorePiece can't parse).
                const stlOpts = { tolMm: 0.5, angTol: 0.5, binary: true };
                const shape = coreAux.functionalDescription?.shape;
                const family = (shape?.family ?? shape ?? '').toString().toLowerCase();
                const isToroid = family === 'toroidal' || family === 't';
                // One piece only applies to two-piece concentric sets. Toroids are a
                // single continuous piece, so they always render whole. Also need an
                // object shape with dimensions (drawCorePiece can't parse a bare name).
                const canDrawPiece = shape && typeof shape === 'object' && !isToroid;
                let arrayBuffer;
                if (!this.fullCoreModel && canDrawPiece) {
                    arrayBuffer = await buildCorePieceSTL(shape, stlOpts);
                } else {
                    arrayBuffer = await buildCoreSTL({ core: coreAux }, stlOpts);
                }

                this.removeObject3D(this.current3dObject);
                if (arrayBuffer && this.$refs.scene?.scene) {
                    this.getPiece(arrayBuffer);
                }
                this.$emit('renderSuccess');
            } catch (error) {
                console.error('[Core3DVisualizer]', error);
                this.$emit('errorInDimensions');
            } finally {
                this.posting = false;
                this.updating = false;
            }
        },

        tryToSend() {
            if (!this.tryingToSend) {
                this.recentChange = false
                this.tryingToSend = true
                setTimeout(() => {
                    if (!this.hasError) {
                        if (this.recentChange) {
                            this.tryingToSend = false
                            this.tryToSend()
                        }
                        else {
                            this.tryingToSend = false
                            this.computeShape()
                        }
                    }
                }
                , this.$settingsStore.waitingTimeForPlottingAfterChange);
            }
        },

    },
    mounted() {
        this.tryToSend();
    },
    computed: {
    },
};
</script>

<template>
    <img data-cy="CoreShapeArtisanVisualizer-loading" v-if="updating" class="mx-auto block col-12" alt="loading" style="height: auto;" :src="loadingGif">
    <Renderer  data-cy="CoreShapeArtisanVisualizer-canvas" ref="renderer" resize=true :orbit-ctrl="{ enableDamping: true, dampingFactor: 0.05, autoRotate : false }" shadow class="p-0 m-0">
        <Camera ref="camera" />
        <Scene ref="scene" :background="backgroundColor">
            <SpotLight :color="'white'" :intensity="50" :position="{ y: 150, z: 100 }" :cast-shadow="true" :shadow-map-size="{ width: 1024, height: 1024 }" />
            <SpotLight :color="'white'" :intensity="50" :position="{ y: -150, z: 100 }" :cast-shadow="true" :shadow-map-size="{ width: 1024, height: 1024 }" />
            <SpotLight :color="'white'" :intensity="50" :position="{ x: 150, z: 100 }" :cast-shadow="true" :shadow-map-size="{ width: 1024, height: 1024 }" />
            <SpotLight :color="'white'" :intensity="50" :position="{ x: -150, z: 100 }" :cast-shadow="true" :shadow-map-size="{ width: 1024, height: 1024 }" />
        </Scene>
    </Renderer>
</template>
