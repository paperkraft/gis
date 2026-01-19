import { Map as OLMap } from 'ol'; // Renamed Import
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Feature } from 'ol';
import { Point, LineString, Geometry } from 'ol/geom';
import { getVertexStyle } from '../styles/vertexStyles';

export class VertexLayerManager {
    private map: OLMap;
    private networkSource: VectorSource;
    private vertexSource: VectorSource;
    private vertexLayer: VectorLayer<VectorSource>;

    constructor(map: OLMap, networkSource: VectorSource) {
        this.map = map;
        this.networkSource = networkSource;
        this.vertexSource = new VectorSource(); // Dedicated Source for Blue Dots

        this.vertexLayer = new VectorLayer({
            source: this.vertexSource,
            zIndex: 150, // Above pipes
            style: (feature) => getVertexStyle({ isEndpoint: false }),
            properties: { title: 'Vertex Layer' }
        });

        this.map.addLayer(this.vertexLayer);
        this.setupListeners();
        this.rebuildAllVertices();
    }

    private setupListeners() {
        // 1. Feature Changed/Added
        this.networkSource.on(['addfeature', 'changefeature'], (evt: any) => {
            const feature = evt.feature as Feature;
            if (feature && feature.get('type') === 'pipe') {
                this.updateVerticesForPipe(feature);
            }
        });

        // 2. Feature Removed
        this.networkSource.on('removefeature', (evt: any) => {
            const feature = evt.feature as Feature;
            if (feature) this.removeVerticesForPipe(feature.getId() as string);
        });

        // 3. Clear All
        this.networkSource.on('clear', () => this.vertexSource.clear());
    }

    // =========================================================
    // 🛡️ ROBUST UPDATE LOGIC
    // =========================================================

    private updateVerticesForPipe(pipeFeature: Feature) {
        const pipeId = pipeFeature.getId() as string;
        if (!pipeId) return;

        // 1. NUCLEAR CLEANUP: Remove ANY existing vertices for this pipe
        // We do not trust a cache map. We check the source of truth.
        this.removeVerticesForPipe(pipeId);

        // 2. Check: Is user dragging? (If so, abort drawing)
        if (pipeFeature.get('isModifying')) return;

        // 3. Validate Geometry
        const geometry = this.getSafeGeometry(pipeFeature);
        if (!geometry || geometry.getType() !== 'LineString') return;

        const coordinates = (geometry as LineString).getCoordinates();

        // 4. Need at least 3 points to have a "middle" vertex
        if (coordinates.length <= 2) return;

        const newVertices: Feature[] = [];

        // 5. Create Vertices (Skipping Start [0] and End [length-1])
        for (let i = 1; i < coordinates.length - 1; i++) {
            const vertexFeature = new Feature({
                geometry: new Point(coordinates[i]),
            });

            // Tag the vertex so we can find it later
            vertexFeature.setProperties({
                isVertex: true,
                parentPipeId: pipeId, // <--- CRITICAL LINK
                vertexIndex: i
            });

            newVertices.push(vertexFeature);
        }

        if (newVertices.length > 0) {
            this.vertexSource.addFeatures(newVertices);
        }
    }

    // 🗑️ CLEANUP BY ID
    private removeVerticesForPipe(pipeId: string) {
        // Filter the ACTUAL source to find related vertices
        const featuresToRemove: Feature[] = [];

        this.vertexSource.getFeatures().forEach(f => {
            if (f.get('parentPipeId') === pipeId) {
                featuresToRemove.push(f);
            }
        });

        // Batch remove
        featuresToRemove.forEach(f => this.vertexSource.removeFeature(f));
    }

    // =========================================================
    // 🛠️ HELPERS
    // =========================================================

    private getSafeGeometry(feature: any): Geometry | null {
        if (typeof feature.getGeometry === 'function') return feature.getGeometry();
        if (feature.geometry?.coordinates && feature.geometry.type === 'LineString') {
            return new LineString(feature.geometry.coordinates);
        }
        return null;
    }

    private rebuildAllVertices() {
        this.vertexSource.clear();
        this.networkSource.getFeatures().forEach(f => {
            if (f.get('type') === 'pipe') this.updateVerticesForPipe(f);
        });
    }

    public cleanup() {
        this.map.removeLayer(this.vertexLayer);
        this.vertexSource.clear();
    }
}