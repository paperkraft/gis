import { Map } from 'ol';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { getVertexStyle } from '../styles/vertexStyles';

export class VertexLayerManager {
    private map: Map;
    private networkSource: VectorSource;
    private vertexSource: VectorSource;
    private vertexLayer: VectorLayer<VectorSource>;
    private debounceTimeout: any = null;

    constructor(map: Map, networkSource: VectorSource) {
        this.map = map;
        this.networkSource = networkSource;
        this.vertexSource = new VectorSource();


        // Create vertex layer with custom style
        this.vertexLayer = new VectorLayer({
            source: this.vertexSource,
            properties: {
                name: 'vertex-layer',
                title: 'Pipe Vertices',
            },
            style: (feature) => {
                return getVertexStyle({
                    isEndpoint: feature.get('isEndpoint'),
                });
            },
            zIndex: 150,
            updateWhileAnimating: false,
            updateWhileInteracting: false,
        });

        this.map.addLayer(this.vertexLayer);

        // Initial vertex generation
        this.updateVertices();

        // Listen for changes in network source
        this.setupListeners();
    }

    private setupListeners() {
        // Debounce update function to prevent massive lag during bulk imports
        const debouncedUpdate = () => {
            if (this.debounceTimeout) {
                clearTimeout(this.debounceTimeout);
            }
            this.debounceTimeout = setTimeout(() => {
                this.updateVertices();
            }, 50); // 50ms delay
        };
        // Update vertices when features are added/removed/changed
        this.networkSource.on('addfeature', debouncedUpdate);
        this.networkSource.on('removefeature', debouncedUpdate);
        this.networkSource.on('changefeature', debouncedUpdate);
    }

    private updateVertices() {
        // Clear existing vertices
        this.vertexSource.clear();

        const features = this.networkSource.getFeatures();

        // Batch creating features
        const vertexFeatures: Feature[] = [];

        features.forEach((feature) => {
            // Only process pipes (LineString geometries)
            if (feature.get('type') !== 'pipe') return;
            if (feature.get('isPreview')) return;

            const geometry = feature.getGeometry();
            if (!geometry || geometry.getType() !== 'LineString') return;

            const lineGeometry = geometry as LineString;
            const coordinates = lineGeometry.getCoordinates();

            // Skip if pipe is just a straight line (2 points) - no internal vertices
            if (coordinates.length <= 2) return;

            // Create vertex feature for internal coordinates only
            // We skip index 0 (Start Node) and index length-1 (End Node)
            for (let i = 1; i < coordinates.length - 1; i++) {
                const coord = coordinates[i];
                const vertexFeature = new Feature({
                    geometry: new Point(coord),
                });

                // Store metadata
                vertexFeature.set('isVertex', true);
                vertexFeature.set('parentPipeId', feature.getId());
                vertexFeature.set('vertexIndex', i);
                vertexFeature.set('isEndpoint', false); // Always false for internal vertices

                vertexFeatures.push(vertexFeature);
            }
        });

        if (vertexFeatures.length > 0) {
            this.vertexSource.addFeatures(vertexFeatures);
        }
    }

    public setVisible(visible: boolean) {
        this.vertexLayer.setVisible(visible);
    }

    public cleanup() {
        if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
        this.map.removeLayer(this.vertexLayer);
        this.vertexSource.clear();
    }
}