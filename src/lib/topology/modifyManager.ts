import { Feature, Map } from 'ol';
import { click } from 'ol/events/condition';
import { Modify, Select } from 'ol/interaction';
import VectorSource from 'ol/source/Vector';
import { Style } from 'ol/style';
import { LineString, Point } from 'ol/geom';
import { VertexStyles, getVertexStyle } from '@/lib/styles/vertexStyles';
import { LinkModifyManager } from './linkModifyManager';
import { getSelectedStyle } from '../styles/featureStyles';
import { useNetworkStore } from '@/store/networkStore';

export class ModifyManager {
    private map: Map;
    private vectorSource: VectorSource;
    private modifyInteraction: Modify | null = null;
    private selectInteraction: Select | null = null;
    private linkSelectInteraction: Select | null = null;
    private linkModifyManager: LinkModifyManager;
    private modifyStartCoordinates: Record<string, number[]> = {};

    constructor(map: Map, vectorSource: VectorSource) {
        this.map = map;
        this.vectorSource = vectorSource;
        this.linkModifyManager = new LinkModifyManager(map, vectorSource);
    }

    public startModifying() {
        if (this.modifyInteraction) return;

        // Select interaction for regular nodes/pipes
        this.selectInteraction = new Select({
            condition: click,
            style: (feature) => getSelectedStyle(feature as Feature),
            filter: (feature) => {
                const type = feature.get('type');
                if (feature.get('isPreview') || feature.get('isVertexMarker') || feature.get('isVisualLink')) return false;
                if (type === 'pump' || type === 'valve') return false;
                return true;
            },
        });
        this.map.addInteraction(this.selectInteraction);

        // Modify interaction (Handles dragging)
        this.modifyInteraction = new Modify({
            source: this.vectorSource,
            style: (feature) => this.getVertexStyleForFeature(feature as Feature),
            pixelTolerance: 10,
            // Allow snapping to occur during modification
        });

        this.modifyInteraction.on('modifystart', (event) => {
            window.dispatchEvent(new CustomEvent('takeSnapshot'));
            this.modifyStartCoordinates = {};
            event.features.forEach((feature) => {
                const geom = feature.getGeometry();
                if (geom instanceof Point) {
                    this.modifyStartCoordinates[feature.getId() as string] = [...geom.getCoordinates()];
                }
            });
        });

        this.modifyInteraction.on('modifyend', (event) => {
            const store = useNetworkStore.getState();
            const modifiedIds: string[] = [];

            event.features.forEach((feature) => {
                const type = feature.get('type');
                const id = feature.getId() as string;

                // 1. Mark the node itself as modified
                modifiedIds.push(id);

                // 2. Handle Connected Features (Rubber-banding)
                if (['junction', 'tank', 'reservoir'].includes(type)) {
                    this.handleJunctionModification(feature as Feature, modifiedIds);
                    this.checkForPipeSplit(feature as Feature);
                }
                if (type === 'pipe') {
                    const geom = feature.getGeometry() as LineString;
                    feature.set('length', Math.round(geom.getLength()));
                }
            });

            store.markModified(modifiedIds);
            this.modifyStartCoordinates = {};
            this.vectorSource.changed();
            store.markUnSaved();
        });

        this.map.addInteraction(this.modifyInteraction);
        this.setupLinkModification();
        this.map.getViewport().style.cursor = 'crosshair';
    }

    private checkForPipeSplit(node: Feature) {
        const nodeCoord = (node.getGeometry() as Point).getCoordinates();
        const nodeId = node.getId() as string;

        const pixel = this.map.getPixelFromCoordinate(nodeCoord);
        if (!pixel) return;

        // Robust Hit Detection
        const pipeFeature = this.map.forEachFeatureAtPixel(
            pixel,
            (feature) => {
                if (feature.getId() === nodeId) return null; // Ignore self
                return feature as Feature;
            },
            {
                hitTolerance: 10,
                layerFilter: (layer) => layer.get('name') === 'network',
            }
        );

        if (pipeFeature && pipeFeature.get('type') === 'pipe') {
            const startId = pipeFeature.get('startNodeId');
            const endId = pipeFeature.get('endNodeId');

            // Prevent splitting if already connected
            if (startId !== nodeId && endId !== nodeId) {
                const geometry = pipeFeature.getGeometry() as LineString;
                const closestPoint = geometry.getClosestPoint(nodeCoord);

                // Snap node exactly to pipe
                (node.getGeometry() as Point).setCoordinates(closestPoint);

                // Trigger Split
                this.splitPipeByNode(pipeFeature, node);
            }
        }
    }

    private splitPipeByNode(pipe: Feature, node: Feature) {
        import('@/store/networkStore').then(({ useNetworkStore }) => {
            const store = useNetworkStore.getState();

            const geometry = pipe.getGeometry() as LineString;
            const coords = geometry.getCoordinates();
            const nodeCoord = (node.getGeometry() as Point).getCoordinates();

            // CRITICAL FIX: Clean properties to avoid overwriting geometry later
            const originalProps = { ...pipe.getProperties() };
            delete originalProps.geometry;
            delete originalProps.id;
            delete originalProps.startNodeId;
            delete originalProps.endNodeId;
            delete originalProps.length;
            delete originalProps.label;

            // Find segment to split
            let splitIndex = 0;
            let minDistance = Infinity;
            for (let i = 0; i < coords.length - 1; i++) {
                const seg = new LineString([coords[i], coords[i + 1]]);
                const dist = this.distance(seg.getClosestPoint(nodeCoord), nodeCoord);
                if (dist < minDistance) {
                    minDistance = dist;
                    splitIndex = i;
                }
            }

            const pipe1Id = store.generateUniqueId('pipe');
            const pipe2Id = store.generateUniqueId('pipe');
            const startId = pipe.get('startNodeId');
            const endId = pipe.get('endNodeId');
            const nodeId = node.getId() as string;

            // New Coordinates
            const coords1 = [...coords.slice(0, splitIndex + 1), nodeCoord];
            const coords2 = [nodeCoord, ...coords.slice(splitIndex + 1)];

            // Create First Segment
            const p1 = new Feature({ geometry: new LineString(coords1) });
            p1.setId(pipe1Id);
            p1.setProperties({
                ...originalProps, // Inherit diameter, roughness, etc.
                type: 'pipe',
                isNew: true,
                id: pipe1Id,
                startNodeId: startId,
                endNodeId: nodeId,
                label: `${pipe1Id}`,
                length: Math.round(new LineString(coords1).getLength())
            });

            // Create Second Segment
            const p2 = new Feature({ geometry: new LineString(coords2) });
            p2.setId(pipe2Id);
            p2.setProperties({
                ...originalProps,
                type: 'pipe',
                isNew: true,
                id: pipe2Id,
                startNodeId: nodeId,
                endNodeId: endId,
                label: `${pipe2Id}`,
                length: Math.round(new LineString(coords2).getLength())
            });

            // Update Map & Store
            this.vectorSource.removeFeature(pipe);
            store.removeFeature(pipe.getId() as string);

            this.vectorSource.addFeatures([p1, p2]);
            store.addFeature(p1);
            store.addFeature(p2);

            // Update Connectivity
            store.updateNodeConnections(startId, pipe.getId() as string, 'remove');
            store.updateNodeConnections(endId, pipe.getId() as string, 'remove');
            store.updateNodeConnections(startId, pipe1Id, 'add');
            store.updateNodeConnections(nodeId, pipe1Id, 'add');
            store.updateNodeConnections(nodeId, pipe2Id, 'add');
            store.updateNodeConnections(endId, pipe2Id, 'add');
        });
    }

    private distance(p1: number[], p2: number[]) {
        return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
    }

    private handleJunctionModification(junction: Feature, modifiedIdList: string[]) {
        const junctionId = junction.getId() as string;
        const newCoord = (junction.getGeometry() as Point).getCoordinates();

        // Update connected pipes (only endpoints)
        this.vectorSource.getFeatures().forEach(f => {
            if (f.get('type') !== 'pipe') return;
            const geom = f.getGeometry() as LineString;
            const coords = geom.getCoordinates();
            let isModified = false;

            if (f.get('startNodeId') === junctionId) {
                coords[0] = newCoord;
                geom.setCoordinates(coords);
            } else if (f.get('endNodeId') === junctionId) {
                coords[coords.length - 1] = newCoord;
                geom.setCoordinates(coords);
            }

            if (isModified) {
                // Add pipe ID to list so it gets saved
                modifiedIdList.push(f.getId() as string);

                // Recalculate length while we are at it
                f.set('length', Math.round(geom.getLength()));
            }
        });

        // Update connected links (pumps/valves)
        const connectedLink = this.getConnectedLink(junction);
        if (connectedLink) {
            // Update visual link line
            const linkId = connectedLink.getId();
            modifiedIdList.push(linkId as string);
            const visualLine = this.vectorSource.getFeatures().find(
                f => f.get('isVisualLink') && f.get('parentLinkId') === linkId
            );
            if (visualLine) {
                const lGeom = visualLine.getGeometry() as LineString;
                const lCoords = lGeom.getCoordinates();

                if (connectedLink.get('startNodeId') === junctionId) lCoords[0] = newCoord;
                else lCoords[1] = newCoord;
                lGeom.setCoordinates(lCoords);

                // Update link symbol position (midpoint)
                const linkGeom = connectedLink.getGeometry() as Point;
                linkGeom.setCoordinates([
                    (lCoords[0][0] + lCoords[1][0]) / 2,
                    (lCoords[0][1] + lCoords[1][1]) / 2
                ]);
            }
        }
    }

    private getConnectedLink(junction: Feature): Feature | null {
        const junctionId = junction.getId() as string;
        return this.vectorSource.getFeatures().find(f => {
            const t = f.get('type');
            return (t === 'pump' || t === 'valve') && (f.get('startNodeId') === junctionId || f.get('endNodeId') === junctionId);
        }) || null;
    }

    private setupLinkModification() {
        this.linkSelectInteraction = new Select({
            condition: click,
            style: (feature) => getSelectedStyle(feature as Feature),
            filter: (feature) => ['pump', 'valve'].includes(feature.get('type'))
        });
        this.map.addInteraction(this.linkSelectInteraction);
        this.linkSelectInteraction.on('select', (e) => {
            if (e.selected.length > 0) this.linkModifyManager.enableLinkDragging(e.selected[0]);
            else this.linkModifyManager.cleanup();
        });
    }

    private getVertexStyleForFeature(feature: Feature): Style | Style[] {
        const geometry = feature.getGeometry();
        if (!geometry) return VertexStyles.default;

        const type = geometry.getType();

        // For LineString (pipes)
        if (type === 'LineString') {
            const coords = (geometry as any).getCoordinates();

            // Return function that styles each vertex based on index
            const vertexCoordinates = (feature.getGeometry() as any).getCoordinates();
            const vertexIndex = coords.findIndex((coord: number[]) =>
                coord[0] === vertexCoordinates[0] && coord[1] === vertexCoordinates[1]
            );

            // Endpoint vertices (start and end)
            if (vertexIndex === 0 || vertexIndex === coords.length - 1) {
                return getVertexStyle({ isEndpoint: true });
            }

            // Regular vertices
            return getVertexStyle({});
        }

        // For Point (nodes)
        if (type === 'Point') {
            return getVertexStyle({ isHighlighted: true });
        }

        return VertexStyles.default;
    }

    public cleanup() {
        if (this.modifyInteraction) this.map.removeInteraction(this.modifyInteraction);
        if (this.selectInteraction) this.map.removeInteraction(this.selectInteraction);
        if (this.linkSelectInteraction) this.map.removeInteraction(this.linkSelectInteraction);
        this.modifyInteraction = null;
        this.selectInteraction = null;
        this.linkSelectInteraction = null;
        this.linkModifyManager.cleanup();
        this.map.getViewport().style.cursor = 'default';
    }
}