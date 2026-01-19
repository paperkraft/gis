import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import { Draw, Snap } from 'ol/interaction';
import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';
import { FeatureType } from '@/types/network';

import { NetworkFactory } from './networkFactory';
import Flatbush from 'flatbush';

export class PipeDrawingManager {
    private map: Map;
    private vectorSource: VectorSource;
    private drawInteraction: Draw | null = null;
    private snapInteraction: Snap | null = null;
    private isDrawingMode: boolean = false;

    // State
    private drawingCoordinates: number[][] = [];
    private startNode: Feature | null = null;
    private endNode: Feature | null = null;
    private activeType: 'pipe' | 'pump' | 'valve' = 'pipe';

    // Visuals
    private previewLine: Feature | null = null;
    private vertexMarkers: Feature[] = [];

    // Handlers
    private clickHandler: ((event: any) => void) | null = null;

    // Performance Optimization: Spatial Index
    private spatialIndex: Flatbush | null = null;
    private indexedFeatures: Feature[] = [];

    // Updated Constraint: 1 meter for pumps/valves
    private readonly MIN_PIPE_LENGTH = 1.0;

    constructor(map: Map, vectorSource: VectorSource) {
        this.map = map;
        this.vectorSource = vectorSource;
    }

    // ============================================
    // PUBLIC API
    // ============================================

    public startDrawing(type: 'pipe' | 'pump' | 'valve' = 'pipe') {

        this.rebuildSpatialIndex();

        this.stopDrawing(); // Clear previous state
        this.activeType = type;
        this.isDrawingMode = true;

        useMapStore.getState().setIsDrawingPipe(true);
        this.map.getViewport().style.cursor = "crosshair";

        // 1. Initialize Draw Interaction (For Standalone Line Drawing)
        this.drawInteraction = new Draw({
            source: this.vectorSource,
            type: 'LineString',
            // Pumps/Valves must be 2 points (Inlet -> Outlet)
            maxPoints: type === 'pipe' ? undefined : 2,
            style: {
                // Use OL's optimized sketch styling
                'stroke-color': type === 'pipe' ? '#1FB8CD' : '#F59E0B',
                'stroke-width': 2,
                'stroke-line-dash': type === 'pipe' ? [10, 6] : [5, 5],
                'circle-radius': 5,
                'circle-fill-color': type === 'pipe' ? '#1FB8CD' : '#F59E0B',
            }
        });

        // 2. Initialize Snap (Crucial for connections)
        this.snapInteraction = new Snap({
            source: this.vectorSource,
            pixelTolerance: 10,
            edge: true,
            vertex: true,
        });

        // 3. Handle Drawing Completion (Standalone)
        this.drawInteraction.on('drawend', (event) => {
            const feature = event.feature;
            const geometry = feature.getGeometry() as LineString;
            this.handleDrawEnd(geometry);
        });

        this.map.addInteraction(this.drawInteraction);
        this.map.addInteraction(this.snapInteraction);

        // 4. Setup Click Handler (For Existing Pipe Split)
        this.setupClickHandler();
    }

    public stopDrawing(fullReset: boolean = true) {
        if (!this.isDrawingMode) return;

        this.spatialIndex = null;
        this.indexedFeatures = [];

        if (fullReset) {
            this.resetState();
            this.startNode = null;
        } else {
            // Partial reset
            this.vertexMarkers.forEach(m => this.vectorSource.removeFeature(m));
            this.vertexMarkers = [];
            if (this.previewLine) {
                this.vectorSource.removeFeature(this.previewLine);
                this.previewLine = null;
            }
        }

        if (this.drawInteraction) {
            this.map.removeInteraction(this.drawInteraction);
            this.drawInteraction = null;
        }
        if (this.snapInteraction) {
            this.map.removeInteraction(this.snapInteraction);
            this.snapInteraction = null;
        }
        if (this.clickHandler) {
            this.map.un('click', this.clickHandler);
            this.clickHandler = null;
        }

        this.isDrawingMode = false;
        useMapStore.getState().setIsDrawingPipe(false);
        this.map.getViewport().style.cursor = "default";
    }

    public cleanup() {
        this.stopDrawing();
    }

    private rebuildSpatialIndex() {
        const allFeatures = this.vectorSource.getFeatures();

        // Index only Pipes and Nodes (targets for snapping/splitting)
        const targets = allFeatures.filter(f =>
            ['pipe', 'junction', 'tank', 'reservoir'].includes(f.get('type')) &&
            !f.get('isPreview') &&
            !f.get('isVisualLink')
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
                }
            }
            this.spatialIndex.finish();
        } else {
            this.spatialIndex = null;
        }
    }

    // --- Click Handler for "Insert on Pipe" ---
    private setupClickHandler() {
        this.clickHandler = (event: any) => {
            if (!this.isDrawingMode) return;

            // Check if we clicked on a pipe
            const pipeUnderCursor = this.findPipeAtCoordinate(event.coordinate);

            if (pipeUnderCursor) {
                // If we are trying to place a Pump/Valve on a pipe
                if (this.activeType === 'pump' || this.activeType === 'valve') {
                    // 1. Abort the Draw interaction (Stop the line start)
                    if (this.drawInteraction) {
                        this.drawInteraction.abortDrawing();
                    }

                    // 2. Execute Split Logic
                    this.insertLinkOnPipe(pipeUnderCursor, event.coordinate, this.activeType);

                    // 3. Stop Tool (Standard behavior: one click = one component)
                    // If you want to keep placing, remove this line.
                    this.stopDrawing();
                }
                // If Pipe tool, we might want to start drawing FROM this pipe (handled by Snap/Draw)
                // so we do nothing here for 'pipe' type.
            }
        };
        // Listen to click. Note: OL interactions might fire first, 
        // but since we call abortDrawing(), we cancel any sketch started by Draw interaction.
        this.map.on('click', this.clickHandler);
    }

    private handleDrawEnd(geometry: LineString) {
        const coords = geometry.getCoordinates();
        if (coords.length < 2) return;

        const startCoord = coords[0];
        const endCoord = coords[coords.length - 1];

        // 1. Auto-Create Inlet/Outlet Nodes if they don't exist
        // This enables "Standalone" drawing in empty space
        const startNode = this.getOrCreateNodeAt(startCoord);
        const endNode = this.getOrCreateNodeAt(endCoord);

        if (!startNode || !endNode || startNode === endNode) {
            // Invalid topology (self-loop or failed node creation)
            // The Draw interaction adds the raw line to the source automatically. 
            setTimeout(() => {
                const rawFeatures = this.vectorSource.getFeatures().filter(f => !f.get('type'));
                rawFeatures.forEach(f => this.vectorSource.removeFeature(f));
            }, 0);
        } else {
            // 2. Create Domain Feature (Pipe/Pump/Valve)
            if (this.activeType === 'pipe') {
                this.createPipe(coords, startNode, endNode);
            } else {
                this.createLinkBetweenNodes(startNode, endNode, this.activeType);
            }
        }

        // 3. Cleanup: The Draw interaction put a "dumb" feature on the map. 
        setTimeout(() => {
            // Find features without a 'type' property (the one just drawn) and remove it
            const rawFeatures = this.vectorSource.getFeatures().filter(f => !f.get('type'));
            rawFeatures.forEach(f => this.vectorSource.removeFeature(f));
        }, 0);

        // If 'pump' or 'valve', we usually stop after one.
        if (this.activeType !== 'pipe') {
            this.stopDrawing();
        }
    }

    private getOrCreateNodeAt(coordinate: number[]): Feature {
        // Check for existing node
        const existingNode = this.findNodeAtCoordinate(coordinate);
        if (existingNode) return existingNode;

        // Check for split pipe
        const pipeUnderCursor = this.findPipeAtCoordinate(coordinate);
        if (pipeUnderCursor) {
            return this.insertNodeOnPipe(pipeUnderCursor, coordinate, 'junction');
        }

        // Create new Junction
        return this.createNode(coordinate, 'junction');
    }

    // ============================================
    // CONTEXT MENU / EXTERNAL ACTIONS
    // ============================================

    public addLinkWhileDrawing(linkType: 'pump' | 'valve', coordinate?: number[]) {
        if (!coordinate) {
            this.startDrawing(linkType);
            return;
        }

        if (this.isDrawingMode && this.startNode) {
            // 1. Create INTERMEDIATE Junction at click location
            const midNode = this.createNode(coordinate, 'junction');

            // 2. Complete pending pipe
            const pipePath = [...this.drawingCoordinates, coordinate];
            const uniquePath = pipePath.filter((c, i, a) => i === 0 || this.distance(c, a[i - 1]) > 0.01);

            if (uniquePath.length >= 2) {
                this.createPipe(uniquePath, this.startNode, midNode);
            }

            // 3. Create END NODE for the Pump
            const offset = [coordinate[0] + this.MIN_PIPE_LENGTH, coordinate[1]];
            const endNode = this.createNode(offset, 'junction');

            // 4. Create the PUMP/VALVE
            const savedType = this.activeType;
            this.activeType = linkType;
            this.createLinkBetweenNodes(midNode, endNode, linkType);
            this.activeType = savedType;

            // 5. Continue Drawing
            const nextStart = endNode;
            this.resetState();

            this.startNode = nextStart;
            const startCoord = (nextStart.getGeometry() as Point).getCoordinates();
            this.drawingCoordinates = [startCoord];
            this.addVertexMarker(startCoord);
            this.endNode = null;

            this.rebuildSpatialIndex();
        }
    }

    public insertLinkOnPipe(pipe: Feature, coordinate: number[], type: 'pump' | 'valve') {
        const store = useNetworkStore.getState();
        window.dispatchEvent(new CustomEvent('takeSnapshot'));

        const geometry = pipe.getGeometry() as LineString;
        const coords = geometry.getCoordinates();
        const startNodeId = pipe.get('startNodeId');
        const endNodeId = pipe.get('endNodeId');
        const originalId = pipe.getId() as string;

        const pipeProps = { ...pipe.getProperties() };
        // Clean up props to avoid carrying over old ID/topology
        delete pipeProps.geometry;
        delete pipeProps.id;
        delete pipeProps.length;
        delete pipeProps.startNodeId;
        delete pipeProps.endNodeId;
        delete pipeProps.source;   // <--- CRITICAL
        delete pipeProps.target;   // <--- CRITICAL
        delete pipeProps.fromNode; // <--- Just in case
        delete pipeProps.toNode;   // <--- Just in case
        delete pipeProps.label;

        const point1 = geometry.getClosestPoint(coordinate);
        let splitIndex = 0;

        for (let i = 0; i < coords.length - 1; i++) {
            const dist = this.distance(coords[i], point1) + this.distance(point1, coords[i + 1]);
            const segLen = this.distance(coords[i], coords[i + 1]);
            if (Math.abs(dist - segLen) < 0.01) {
                splitIndex = i;
                break;
            }
        }

        const pStart = coords[splitIndex];
        const pEnd = coords[splitIndex + 1];
        const dx = pEnd[0] - pStart[0];
        const dy = pEnd[1] - pStart[1];
        const len = Math.sqrt(dx * dx + dy * dy);

        const GAP = this.MIN_PIPE_LENGTH;
        const safeOffset = Math.min(GAP, len * 0.4);

        const offsetX = (dx / len) * safeOffset;
        const offsetY = (dy / len) * safeOffset;
        const point2 = [point1[0] + offsetX, point1[1] + offsetY];

        const j1 = this.createNode(point1, 'junction');
        const j2 = this.createNode(point2, 'junction');
        const j1Id = j1.getId() as string;
        const j2Id = j2.getId() as string;

        const coords1 = [...coords.slice(0, splitIndex + 1), point1];
        const p1Id = store.generateUniqueId('pipe');
        const p1 = new Feature({ geometry: new LineString(coords1) });
        p1.setId(p1Id);
        p1.setProperties({
            ...pipeProps,
            type: 'pipe',
            isNew: true,
            id: p1Id,
            startNodeId: startNodeId,
            endNodeId: j1Id,
            source: startNodeId,
            target: j1Id,
            label: p1Id,
            length: this.calculatePipeLength(p1.getGeometry() as LineString)
        });

        const coords2 = [point2, ...coords.slice(splitIndex + 1)];
        const p2Id = store.generateUniqueId('pipe');
        const p2 = new Feature({ geometry: new LineString(coords2) });
        p2.setId(p2Id);
        p2.setProperties({
            ...pipeProps,
            type: 'pipe',
            isNew: true,
            id: p2Id,
            startNodeId: j2Id,
            endNodeId: endNodeId,
            source: j2Id,
            target: endNodeId,
            label: p2Id,
            length: this.calculatePipeLength(p2.getGeometry() as LineString)
        });

        this.createLinkBetweenNodes(j1, j2, type);

        this.vectorSource.removeFeature(pipe);
        store.removeFeature(originalId);

        this.vectorSource.addFeatures([p1, p2]);
        store.addFeature(p1);
        store.addFeature(p2);

        store.updateNodeConnections(startNodeId, originalId, "remove");
        store.updateNodeConnections(endNodeId, originalId, "remove");

        store.updateNodeConnections(startNodeId, p1Id, "add");
        store.updateNodeConnections(j1Id, p1Id, "add");

        store.updateNodeConnections(j2Id, p2Id, "add");
        store.updateNodeConnections(endNodeId, p2Id, "add");

        this.vectorSource.changed();
        this.spatialIndex = null;

        return { link: null, startJunction: j1, endJunction: j2 };
    }

    public insertNodeOnPipe(pipe: Feature, coordinate: number[], type: FeatureType): Feature {
        const store = useNetworkStore.getState();
        window.dispatchEvent(new CustomEvent('takeSnapshot'));
        const geometry = pipe.getGeometry() as LineString;
        const coords = geometry.getCoordinates();
        const startNodeId = pipe.get('startNodeId');
        const endNodeId = pipe.get('endNodeId');
        const originalId = pipe.getId() as string;

        const pipeProps = { ...pipe.getProperties() };
        delete pipeProps.geometry;
        delete pipeProps.id;
        delete pipeProps.length;
        delete pipeProps.startNodeId;
        delete pipeProps.endNodeId;
        delete pipeProps.source;
        delete pipeProps.target;
        delete pipeProps.fromNode;
        delete pipeProps.toNode;
        delete pipeProps.label;

        const closestPoint = geometry.getClosestPoint(coordinate);
        let splitIndex = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            const dist = this.distance(coords[i], closestPoint) + this.distance(closestPoint, coords[i + 1]);
            const segLen = this.distance(coords[i], coords[i + 1]);
            if (Math.abs(dist - segLen) < 0.01) {
                splitIndex = i;
                break;
            }
        }

        const newNode = this.createNode(closestPoint, type);
        const newNodeId = newNode.getId() as string;

        const coords1 = [...coords.slice(0, splitIndex + 1), closestPoint];
        const coords2 = [closestPoint, ...coords.slice(splitIndex + 1)];

        const p1Id = store.generateUniqueId('pipe');
        const p1 = new Feature({ geometry: new LineString(coords1) });
        p1.setId(p1Id);
        p1.setProperties({
            ...pipeProps,
            type: 'pipe',
            isNew: true,
            id: p1Id,
            startNodeId: startNodeId,
            endNodeId: newNodeId,
            source: startNodeId, // Sync topology
            target: newNodeId,
            label: `${p1Id}`,
            length: this.calculatePipeLength(p1.getGeometry() as LineString)
        });

        const p2Id = store.generateUniqueId('pipe');
        const p2 = new Feature({ geometry: new LineString(coords2) });
        p2.setId(p2Id);
        p2.setProperties({
            ...pipeProps,
            type: 'pipe',
            isNew: true,
            id: p2Id,
            startNodeId: newNodeId,
            endNodeId: endNodeId,
            source: newNodeId, // Sync topology
            target: endNodeId,
            label: `${p2Id}`,
            length: this.calculatePipeLength(p2.getGeometry() as LineString)
        });

        this.vectorSource.removeFeature(pipe);
        store.removeFeature(originalId);
        this.vectorSource.addFeatures([p1, p2]);
        store.addFeature(p1);
        store.addFeature(p2);

        store.updateNodeConnections(startNodeId, originalId, "remove");
        store.updateNodeConnections(endNodeId, originalId, "remove");

        store.updateNodeConnections(startNodeId, p1Id, "add");
        store.updateNodeConnections(newNodeId, p1Id, "add");

        store.updateNodeConnections(newNodeId, p2Id, "add");
        store.updateNodeConnections(endNodeId, p2Id, "add");

        this.spatialIndex = null;

        return newNode;
    }

    public reversePipeDirection(pipe: Feature) {
        const store = useNetworkStore.getState();
        const geometry = pipe.getGeometry() as LineString;
        const coords = geometry.getCoordinates();

        // 1. Reverse Coordinates
        const reversedCoords = coords.reverse();
        geometry.setCoordinates(reversedCoords);

        // 2. Swap Start/End Node IDs in Properties
        const startNodeId = pipe.get('startNodeId');
        const endNodeId = pipe.get('endNodeId');

        pipe.set('startNodeId', endNodeId);
        pipe.set('endNodeId', startNodeId);

        // 3. Update Store State
        // Mark as modified to trigger save logic and history
        const id = pipe.getId() as string;
        store.markModified([id]);
        store.markUnSaved();

        console.log(`[PipeDrawingManager] Reversed pipe ${id}: ${endNodeId} -> ${startNodeId}`);
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    private finishSegment(continueChain: boolean = true) {
        if (!this.startNode || !this.endNode) return;

        if (this.activeType === 'pipe') {
            const uniqueCoords = this.drawingCoordinates.filter((c, i, a) => i === 0 || this.distance(c, a[i - 1]) > 0.01);
            if (uniqueCoords.length >= 2) {
                this.createPipe(uniqueCoords, this.startNode, this.endNode);
            }
        } else {
            this.createPumpOrValveSegment();
        }

        this.spatialIndex = null;

        const nextStartNode = continueChain ? this.endNode : null;
        this.resetState();
        this.startNode = null;

        if (this.activeType === 'pipe' && nextStartNode) {
            this.startNode = nextStartNode;
            const startCoord = (this.startNode.getGeometry() as Point).getCoordinates();
            this.drawingCoordinates = [startCoord];
            this.addVertexMarker(startCoord);
            this.endNode = null;
        }
    }

    private createPumpOrValveSegment() {
        if (!this.startNode || !this.endNode) return;
        this.createLinkBetweenNodes(this.startNode, this.endNode, this.activeType as 'pump' | 'valve');
    }

    // ============================================
    // VISUALS & UTILS
    // ============================================

    private resetState() {
        this.drawingCoordinates = [];
        this.endNode = null;
        this.vertexMarkers.forEach(m => this.vectorSource.removeFeature(m));
        this.vertexMarkers = [];
        if (this.previewLine) {
            this.vectorSource.removeFeature(this.previewLine);
            this.previewLine = null;
        }
    }

    // public findPipeAtCoordinate(coordinate: number[]): Feature | null {
    //     const pixel = this.map.getPixelFromCoordinate(coordinate);
    //     if (!pixel) return null;

    //     return this.map.forEachFeatureAtPixel(pixel, (feature) => {
    //         if (feature.get('type') === 'pipe' && !feature.get('isPreview') && !feature.get('isVisualLink')) return feature as Feature;
    //         return null;
    //     }, { hitTolerance: 5, layerFilter: (l) => l.get('name') === 'network' }) || null;
    // }

    // private findNodeAtCoordinate(coordinate: number[]): Feature | null {
    //     const pixel = this.map.getPixelFromCoordinate(coordinate);
    //     if (!pixel) return null;
    //     return this.map.forEachFeatureAtPixel(pixel, (feature) => {
    //         if (['junction', 'tank', 'reservoir'].includes(feature.get('type'))) return feature as Feature;
    //         return null;
    //     }, { hitTolerance: 10, layerFilter: (l) => l.get('name') === 'network' }) || null;
    // }

    public findPipeAtCoordinate(coordinate: number[]): Feature | null {
        // Fallback: Build index lazily if missing (e.g., called from placeComponent)
        if (!this.spatialIndex) {
            this.rebuildSpatialIndex();
        }

        if (!this.spatialIndex) return null;

        const resolution = this.map.getView().getResolution() || 1;
        const tolerance = 10 * resolution; // 10px tolerance

        const results = this.spatialIndex.neighbors(coordinate[0], coordinate[1], 10, tolerance);

        let bestPipe: Feature | null = null;
        let minDist = Infinity;

        for (const i of results) {
            const feature = this.indexedFeatures[i];
            if (feature.get('type') === 'pipe') {
                const geom = feature.getGeometry() as LineString;
                const closest = geom.getClosestPoint(coordinate);
                const dx = closest[0] - coordinate[0];
                const dy = closest[1] - coordinate[1];
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < tolerance && dist < minDist) {
                    minDist = dist;
                    bestPipe = feature;
                }
            }
        }

        return bestPipe;
    }

    private findNodeAtCoordinate(coordinate: number[]): Feature | null {
        if (!this.spatialIndex) this.rebuildSpatialIndex();
        if (!this.spatialIndex) return null;

        const resolution = this.map.getView().getResolution() || 1;
        const tolerance = 10 * resolution;

        const results = this.spatialIndex.neighbors(coordinate[0], coordinate[1], 10, tolerance);

        for (const i of results) {
            const feature = this.indexedFeatures[i];
            const type = feature.get('type');
            if (['junction', 'tank', 'reservoir'].includes(type)) {
                // For points, Flatbush distance is sufficient check, but we can verify exact distance
                const geom = feature.getGeometry() as Point;
                const c = geom.getCoordinates();
                const dist = Math.sqrt(Math.pow(c[0] - coordinate[0], 2) + Math.pow(c[1] - coordinate[1], 2));

                if (dist < tolerance) return feature;
            }
        }
        return null;
    }

    private createNode(coordinate: number[], type: FeatureType): Feature {
        const feature = NetworkFactory.createNode(type, coordinate);

        // Add to OL Source (View)
        this.vectorSource.addFeature(feature);

        // Add to Store (Data)
        useNetworkStore.getState().addFeature(feature);
        return feature;
    }

    private createPipe(coords: number[][], startNode: Feature, endNode: Feature) {
        const feature = NetworkFactory.createPipe(coords, startNode, endNode);
        this.vectorSource.addFeature(feature);

        const store = useNetworkStore.getState();
        store.addFeature(feature);

        // Update Topology
        store.updateNodeConnections(startNode.getId() as string, feature.getId() as string, "add");
        store.updateNodeConnections(endNode.getId() as string, feature.getId() as string, "add");
    }

    private createLinkBetweenNodes(node1: Feature, node2: Feature, type: 'pump' | 'valve') {
        const [component, visual] = NetworkFactory.createComplexLink(type, node1, node2);

        this.vectorSource.addFeatures([component, visual]);

        const store = useNetworkStore.getState();
        store.addFeature(component);
        store.addFeature(visual);

        // Update Topology
        const id = component.getId() as string;
        store.updateNodeConnections(node1.getId() as string, id, "add");
        store.updateNodeConnections(node2.getId() as string, id, "add");
    }

    private addVertexMarker(coord: number[]) {
        const marker = new Feature({ geometry: new Point(coord) });
        marker.setStyle(new Style({ image: new CircleStyle({ radius: 3, fill: new Fill({ color: "#1FB8CD" }) }) }));
        marker.set("isVertexMarker", true);
        this.vectorSource.addFeature(marker);
        this.vertexMarkers.push(marker);
    }

    private calculatePipeLength(geometry: LineString): number { return Math.round(geometry.getLength()); }
    private distance(p1: number[], p2: number[]) { return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2)); }

    public continueDrawingFromNode(node: Feature) {
        if (!this.isDrawingMode) this.startDrawing('pipe');
        if (this.drawingCoordinates.length === 0) {
            this.startNode = node;
            const coord = (node.getGeometry() as Point).getCoordinates();
            this.drawingCoordinates.push(coord);
            this.addVertexMarker(coord);
        } else {
            this.endNode = node;
            this.drawingCoordinates.push((node.getGeometry() as Point).getCoordinates());
            this.finishSegment(true);
        }
    }
}