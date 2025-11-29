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
            // Use the shared style function to ensure consistent sizing (radius: 4)
            style: (feature) => {
                return getVertexStyle({
                    isEndpoint: feature.get('isEndpoint'),
                });
            },
            updateWhileAnimating: true,
            updateWhileInteracting: true,
        });

        this.map.addLayer(this.vertexLayer);

        // Initial vertex generation
        this.updateVertices();

        // Listen for changes in network source
        this.setupListeners();
    }

    private setupListeners() {
        // Update vertices when features are added/removed/changed
        this.networkSource.on('addfeature', () => this.updateVertices());
        this.networkSource.on('removefeature', () => this.updateVertices());
        this.networkSource.on('changefeature', () => this.updateVertices());
    }

    private updateVertices() {
        // Clear existing vertices
        this.vertexSource.clear();

        const features = this.networkSource.getFeatures();
        let vertexCount = 0;

        features.forEach((feature) => {
            // Only process pipes (LineString geometries)
            if (feature.get('type') !== 'pipe') return;
            if (feature.get('isPreview')) return;

            const geometry = feature.getGeometry();
            if (!geometry || geometry.getType() !== 'LineString') return;

            const lineGeometry = geometry as LineString;
            const coordinates = lineGeometry.getCoordinates();

            // Create vertex feature for each coordinate
            coordinates.forEach((coord, index) => {
                const vertexFeature = new Feature({
                    geometry: new Point(coord),
                });

                // Store metadata
                vertexFeature.set('isVertex', true);
                vertexFeature.set('parentPipeId', feature.getId());
                vertexFeature.set('vertexIndex', index);
                vertexFeature.set('isEndpoint', index === 0 || index === coordinates.length - 1);

                this.vertexSource.addFeature(vertexFeature);
                vertexCount++;
            });
        });
    }

    public setVisible(visible: boolean) {
        this.vertexLayer.setVisible(visible);
    }

    public cleanup() {
        this.map.removeLayer(this.vertexLayer);
        this.vertexSource.clear();
    }
}