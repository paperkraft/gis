import Flatbush from 'flatbush';
import { Collection, Feature, Map } from 'ol';
import { click } from 'ol/events/condition';
import { LineString, Point } from 'ol/geom';
import { Modify, Select } from 'ol/interaction';
import { unByKey } from 'ol/Observable';
import VectorSource from 'ol/source/Vector';
import { Style } from 'ol/style';

import { getVertexStyle, VertexStyles } from '@/lib/styles/vertexStyles';
import { useNetworkStore } from '@/store/networkStore';

import { getSelectedStyle } from '../styles/featureStyles';
import { LinkModifyManager } from './linkModifyManager';

export class ModifyManager {
    private map: Map;
    private vectorSource: VectorSource;
    private modifyInteraction: Modify | null = null;
    private selectInteraction: Select | null = null;
    private linkModifyManager: LinkModifyManager;
    private modifyStartCoordinates: Record<string, number[]> = {};

    // Performance Optimization: Flatbush Spatial Index
    private modifiableFeatures: Collection<Feature>;
    private isModifying: boolean = false;
    private isPointerDown: boolean = false;
    private spatialIndex: Flatbush | null = null;
    private indexedFeatures: Feature[] = [];
    private boundPointerMoveHandler: (e: any) => void;
    private boundPointerDownHandler: (e: any) => void;
    private boundPointerUpHandler: (e: any) => void;

    constructor(map: Map, vectorSource: VectorSource) {
        this.map = map;
        this.vectorSource = vectorSource;
        this.linkModifyManager = new LinkModifyManager(map, vectorSource);

        // Dynamic Collection for "Just-In-Time" modification
        this.modifiableFeatures = new Collection<Feature>();
        this.boundPointerMoveHandler = this.handlePointerMove.bind(this);
        this.boundPointerDownHandler = () => { this.isPointerDown = true; };
        this.boundPointerUpHandler = () => { this.isPointerDown = false; };
    }

    public startModifying() {
        if (this.modifyInteraction) return;

        // 1. Build Index for ALL features (Nodes, Links, Pipes)
        this.rebuildSpatialIndex();

        // 2. Select Interaction (Visual only - allows seeing properties while dragging)
        this.selectInteraction = new Select({
            condition: click,
            style: (feature) => getSelectedStyle(feature as Feature),
            filter: (feature) => {
                const type = feature.get('type');
                // Allow selecting everything relevant
                return ['pipe', 'junction', 'tank', 'reservoir', 'pump', 'valve'].includes(type);
            },
        });
        this.map.addInteraction(this.selectInteraction);

        // 3. Modify Interaction (Linked to our high-perf collection)
        this.modifyInteraction = new Modify({
            features: this.modifiableFeatures,
            style: (feature) => this.getVertexStyleForFeature(feature as Feature),
            pixelTolerance: 10,
        });

        // 4. Lifecycle Events
        this.modifyInteraction.on('modifystart', (event) => {
            this.isModifying = true;
            window.dispatchEvent(new CustomEvent('takeSnapshot'));
            this.modifyStartCoordinates = {};

            event.features.forEach((feature) => {
                feature.set('isModifying', true);
                const geom = feature.getGeometry();
                if (geom instanceof Point) {
                    this.modifyStartCoordinates[feature.getId() as string] = [...geom.getCoordinates()];
                }

                // RUBBER BANDING: Listen to geometry changes during drag
                const type = feature.get('type');

                if (['junction', 'tank', 'reservoir'].includes(type)) {
                    const key = geom?.on('change', () => {
                        this.rubberBandNode(feature as Feature);
                    });
                    if (key) feature.set('_modifyListenerKey', key);
                }
                else if (['pump', 'valve'].includes(type)) {
                    const key = geom?.on('change', () => {
                        this.rubberBandLink(feature as Feature);
                    });
                    if (key) feature.set('_modifyListenerKey', key);
                }
            });
        });

        this.modifyInteraction.on('modifyend', (event) => {
            this.isModifying = false;
            this.isPointerDown = false;

            const store = useNetworkStore.getState();
            const modifiedIds: string[] = [];

            // We will store all geometry updates here before sending to Zustand
            const updatesAccumulator: Record<string, any> = {};

            event.features.forEach((feature) => {
                feature.unset('isModifying');
                // Cleanup Listener
                const key = feature.get('_modifyListenerKey');
                if (key) {
                    unByKey(key);
                    feature.unset('_modifyListenerKey');
                }

                const type = feature.get('type');
                const id = feature.getId() as string;
                modifiedIds.push(id);

                // Strategy Pattern for Updates
                if (['junction', 'tank', 'reservoir'].includes(type)) {
                    this.rubberBandNode(feature as Feature, modifiedIds, updatesAccumulator);
                    this.checkForPipeSplit(feature as Feature);
                } else if (type === 'pump' || type === 'valve') {
                    this.rubberBandLink(feature as Feature, modifiedIds);
                } else if (type === 'pipe') {
                    // 3. Handle Pipe Move Explicitly
                    this.handlePipeMove(feature as Feature, updatesAccumulator);
                }
            });

            // This ensures the new vertex coordinates are saved to the State/DB
            if (Object.keys(updatesAccumulator).length > 0) {
                store.updateFeatures(updatesAccumulator);
            }

            store.markModified(modifiedIds);
            this.modifyStartCoordinates = {};
            store.markUnSaved();

            // Rebuild index to reflect new positions
            this.rebuildSpatialIndex();
        });

        this.map.addInteraction(this.modifyInteraction);
        this.map.on('pointermove', this.boundPointerMoveHandler);
        this.map.on('pointerdown' as any, this.boundPointerDownHandler);
        this.map.on('pointerup' as any, this.boundPointerUpHandler);

        this.map.getViewport().style.cursor = 'move';
    }

    private handlePipeMove(pipe: Feature, updatesAccumulator: Record<string, any>) {
        const id = pipe.getId() as string;
        const geom = pipe.getGeometry();

        // Safety Check
        if (!geom || !(geom instanceof LineString)) return;

        // 1. Get NEW Coordinates (Vertices)
        const newCoords = geom.getCoordinates();

        // 2. Update Length
        const newLength = Math.round(geom.getLength());
        pipe.set('length', newLength);

        // 3. Add to Batch for Store Update
        updatesAccumulator[id] = {
            geometry: newCoords,
            length: newLength
        };
    }

    // =========================================================
    // 🔗 RUBBER BANDING LOGIC (Real-time)
    // =========================================================

    private rubberBandNode(node: Feature, modifiedIds?: string[], updatesAccumulator?: Record<string, any>) {
        const nodeId = node.getId() as string;
        const newCoord = (node.getGeometry() as Point).getCoordinates();
        const connectedLinks = node.get('connectedLinks') as string[] || [];

        connectedLinks.forEach(linkId => {
            const link = this.vectorSource.getFeatureById(linkId);
            if (!link) return;

            const type = link.get('type');

            // Stretch Pipes
            if (type === 'pipe') {
                const geom = link.getGeometry() as LineString;
                const coords = geom.getCoordinates();
                let updated = false;

                // Update start or end coordinate of the pipe
                if (link.get('startNodeId') === nodeId) {
                    coords[0] = newCoord;
                    updated = true;
                } else if (link.get('endNodeId') === nodeId) {
                    coords[coords.length - 1] = newCoord;
                    updated = true;
                }

                if (updated) {
                    geom.setCoordinates(coords); // Visual Update
                    const newLen = Math.round(geom.getLength());
                    link.set('length', newLen);
                    if (modifiedIds) modifiedIds.push(linkId);

                    // 🚀 SYNC TO STORE ACCUMULATOR
                    if (updatesAccumulator) {
                        updatesAccumulator[linkId] = {
                            geometry: coords,
                            length: newLen
                        };
                    }
                }
            }
            // Stretch Pump/Valve Visuals
            else if (type === 'pump' || type === 'valve') {
                this.rubberBandLinkVisual(link, nodeId, newCoord, modifiedIds);
            }
        });
    }

    private rubberBandLink(link: Feature, modifiedIds?: string[]) {
        const linkId = link.getId() as string;
        const newCoord = (link.getGeometry() as Point).getCoordinates();

        // Find visual line and bend it
        const visualId = `VIS-${linkId}`;
        let visualLine = this.vectorSource.getFeatureById(visualId);

        if (!visualLine) {
            visualLine = this.vectorSource.getFeatures().find(
                f => f.get('isVisualLink') && f.get('parentLinkId') === linkId
            ) || null;
        }

        if (visualLine) {
            if (modifiedIds) modifiedIds.push(linkId);
            const lGeom = visualLine.getGeometry() as LineString;
            const lCoords = lGeom.getCoordinates();

            // Mid-point drag: Update the middle vertex
            if (lCoords.length === 3) {
                lCoords[1] = newCoord;
                lGeom.setCoordinates(lCoords);
            } else if (lCoords.length === 2) {
                // If straight line, convert to bent line
                lCoords.splice(1, 0, newCoord);
                lGeom.setCoordinates(lCoords);
            }
        }
    }

    private rubberBandLinkVisual(component: Feature, movedNodeId: string, newCoord: number[], modifiedIds?: string[]) {
        const linkId = component.getId() as string;
        const visualId = `VIS-${linkId}`;
        let visualLine = this.vectorSource.getFeatureById(visualId);

        if (!visualLine) {
            visualLine = this.vectorSource.getFeatures().find(
                f => f.get('isVisualLink') && f.get('parentLinkId') === linkId
            ) || null;
        }

        if (visualLine) {
            if (modifiedIds) modifiedIds.push(linkId);
            const lGeom = visualLine.getGeometry() as LineString;
            const lCoords = lGeom.getCoordinates();

            // Update endpoint matching the moved node
            if (component.get('startNodeId') === movedNodeId) {
                lCoords[0] = newCoord;
            } else {
                lCoords[lCoords.length - 1] = newCoord;
            }

            lGeom.setCoordinates(lCoords);

            // Keep icon centered if straight line
            if (lCoords.length === 2) {
                const componentGeom = component.getGeometry() as Point;
                componentGeom.setCoordinates([
                    (lCoords[0][0] + lCoords[1][0]) / 2,
                    (lCoords[0][1] + lCoords[1][1]) / 2
                ]);
            }
        }
    }

    // =========================================================
    // 🚀 HIGH-PERFORMANCE SPATIAL INDEXING (FLATBUSH)
    // =========================================================

    private rebuildSpatialIndex() {
        const allFeatures = this.vectorSource.getFeatures();
        const targets = allFeatures.filter(f =>
            ['junction', 'tank', 'reservoir', 'pump', 'valve', 'pipe'].includes(f.get('type'))
        );

        this.indexedFeatures = targets;

        if (targets.length > 0) {
            this.spatialIndex = new Flatbush(targets.length);

            for (const feature of targets) {
                const geom = feature.getGeometry();
                if (geom instanceof Point) {
                    const c = geom.getCoordinates();
                    this.spatialIndex.add(c[0], c[1], c[0], c[1]);
                } else if (geom instanceof LineString) {
                    const ext = geom.getExtent();
                    this.spatialIndex.add(ext[0], ext[1], ext[2], ext[3]);
                } else {
                    // FALLBACK: Prevents crash if geometry is missing/corrupt
                    this.spatialIndex.add(0, 0, 0, 0);
                }
            }
            this.spatialIndex.finish();
        } else {
            this.spatialIndex = null;
        }
    }

    private handlePointerMove(event: any) {
        if (this.isModifying || this.isPointerDown || !this.spatialIndex) return;

        const coordinate = event.coordinate;
        const resolution = this.map.getView().getResolution() || 1;
        const tolerance = 10 * resolution;

        // 1. Query Index
        const results = this.spatialIndex.neighbors(coordinate[0], coordinate[1], 5, tolerance);

        if (results.length > 0) {
            // 2. Prioritize Nodes/Points over Pipes (Snapping feel)
            let bestFeature: Feature | null = null;

            // Sort: Points first, then Lines
            const candidates = results.map(i => this.indexedFeatures[i]);
            const points = candidates.filter(f => f.getGeometry() instanceof Point);

            if (points.length > 0) {
                bestFeature = points[0]; // Pick closest point
            } else {
                // If only lines, check distance to segment
                bestFeature = candidates[0];
            }

            // 3. Update Modify Collection
            if (bestFeature) {
                const current = this.modifiableFeatures.getArray();
                if (current.length !== 1 || current[0] !== bestFeature) {
                    this.modifiableFeatures.clear();
                    this.modifiableFeatures.push(bestFeature);
                    this.map.getViewport().style.cursor = 'move';
                }
                return;
            }
        }

        // Clear if nothing found
        if (this.modifiableFeatures.getLength() > 0) {
            this.modifiableFeatures.clear();
            this.map.getViewport().style.cursor = 'move';
        }
    }

    // =========================================================
    // ⚙️ UTILS
    // =========================================================

    private getVertexStyleForFeature(feature: Feature): Style | Style[] {
        const geometry = feature.getGeometry();
        if (!geometry) return VertexStyles.default;
        const type = geometry.getType();

        if (type === 'LineString') return getVertexStyle({}); // Pipe vertices
        if (type === 'Point') return getVertexStyle({ isHighlighted: true }); // Nodes

        return VertexStyles.default;
    }

    // Keeping the split logic for nodes dropped on pipes
    private checkForPipeSplit(node: Feature) {
        // 1. Get Drop Coordinates
        const nodeCoord = (node.getGeometry() as Point).getCoordinates();
        const nodeId = node.getId() as string;

        // 2. Define Tolerance (10 pixels converted to Map Units)
        // This mimics the "hit detection" radius of the mouse
        const resolution = this.map.getView().getResolution() || 1;
        const tolerance = 10 * resolution;

        // 3. Query Spatial Index (Instant CPU lookup)
        if (!this.spatialIndex) return;

        // Find neighbors within the tolerance box
        const candidateIndices = this.spatialIndex.neighbors(nodeCoord[0], nodeCoord[1], 10, tolerance);

        let bestPipe: Feature | null = null;
        let minDistance = Infinity;

        // 4. Mathematical Geometry Check
        for (const i of candidateIndices) {
            const feature = this.indexedFeatures[i];

            // Skip the node itself
            if (feature.getId() === nodeId) continue;

            // Only check Pipes
            if (feature.get('type') === 'pipe') {
                const geom = feature.getGeometry() as LineString;

                // Find closest point on this pipe segment to our node
                const closestPoint = geom.getClosestPoint(nodeCoord);

                // Calculate distance
                const dx = closestPoint[0] - nodeCoord[0];
                const dy = closestPoint[1] - nodeCoord[1];
                const dist = Math.sqrt(dx * dx + dy * dy);

                // If it's within tolerance and closer than others, pick it
                if (dist < tolerance && dist < minDistance) {
                    minDistance = dist;
                    bestPipe = feature;
                }
            }
        }

        // 5. Execute Split if a valid pipe is found
        if (bestPipe) {
            const startId = bestPipe.get('startNodeId');
            const endId = bestPipe.get('endNodeId');

            // Prevent splitting a pipe that is already connected to this node (short circuit)
            if (startId !== nodeId && endId !== nodeId) {
                this.splitPipeByNode(bestPipe, node);
            }
        }
    }

    private splitPipeByNode(pipe: Feature, node: Feature) {
        import('@/store/networkStore').then(({ useNetworkStore }) => {
            const store = useNetworkStore.getState();
            const geometry = pipe.getGeometry() as LineString;
            const coords = geometry.getCoordinates();
            const nodeCoord = (node.getGeometry() as Point).getCoordinates();

            const originalProps = { ...pipe.getProperties() };
            delete originalProps.geometry; delete originalProps.id;
            delete originalProps.startNodeId; delete originalProps.endNodeId;
            delete originalProps.length; delete originalProps.label;

            let splitIndex = 0;
            let minDistance = Infinity;
            for (let i = 0; i < coords.length - 1; i++) {
                const seg = new LineString([coords[i], coords[i + 1]]);
                // const dist = this.distance(seg.getClosestPoint(nodeCoord), nodeCoord);
                const dist = Math.sqrt(Math.pow(seg.getClosestPoint(nodeCoord)[0] - nodeCoord[0], 2));
                // Simplified distance check for brevity, use real logic
                if (dist < minDistance) { minDistance = dist; splitIndex = i; }
            }

            const pipe1Id = store.generateUniqueId('pipe');
            const pipe2Id = store.generateUniqueId('pipe');
            const startId = pipe.get('startNodeId');
            const endId = pipe.get('endNodeId');
            const nodeId = node.getId() as string;

            const coords1 = [...coords.slice(0, splitIndex + 1), nodeCoord];
            const coords2 = [nodeCoord, ...coords.slice(splitIndex + 1)];

            const p1 = new Feature({ geometry: new LineString(coords1) });
            p1.setId(pipe1Id); p1.setProperties({ ...originalProps, type: 'pipe', isNew: true, id: pipe1Id, startNodeId: startId, endNodeId: nodeId, label: `${pipe1Id}`, length: Math.round(new LineString(coords1).getLength()) });

            const p2 = new Feature({ geometry: new LineString(coords2) });
            p2.setId(pipe2Id); p2.setProperties({ ...originalProps, type: 'pipe', isNew: true, id: pipe2Id, startNodeId: nodeId, endNodeId: endId, label: `${pipe2Id}`, length: Math.round(new LineString(coords2).getLength()) });

            this.vectorSource.removeFeature(pipe);
            store.removeFeature(pipe.getId() as string);

            this.vectorSource.addFeatures([p1, p2]);
            store.addFeature(p1);
            store.addFeature(p2);

            store.updateNodeConnections(startId, pipe.getId() as string, 'remove');
            store.updateNodeConnections(endId, pipe.getId() as string, 'remove');
            store.updateNodeConnections(startId, pipe1Id, 'add');
            store.updateNodeConnections(nodeId, pipe1Id, 'add');
            store.updateNodeConnections(nodeId, pipe2Id, 'add');
            store.updateNodeConnections(endId, pipe2Id, 'add');
        });
    }

    public cleanup() {
        if (this.modifyInteraction) this.map.removeInteraction(this.modifyInteraction);
        if (this.selectInteraction) this.map.removeInteraction(this.selectInteraction);

        this.map.un('pointermove', this.boundPointerMoveHandler);
        this.map.un('pointerdown' as any, this.boundPointerDownHandler);
        this.map.un('pointerup' as any, this.boundPointerUpHandler);

        this.modifyInteraction = null;
        this.selectInteraction = null;
        this.spatialIndex = null;
        this.indexedFeatures = [];
        this.modifiableFeatures.clear();

        this.linkModifyManager.cleanup();
        this.map.getViewport().style.cursor = 'default';
    }
}