import Flatbush from 'flatbush';
import { Feature, MapBrowserEvent } from 'ol';
import { LineString, Point } from 'ol/geom';
import { Draw, Snap } from 'ol/interaction';
import VectorLayer from 'ol/layer/Vector';
import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';
import { FeatureType } from '@/types/network';

import { NetworkFactory } from './networkFactory';

export class PipeDrawingManager {
    private map: Map;
    private vectorSource: VectorSource;
    private drawInteraction: Draw | null = null;
    private snapInteraction: Snap | null = null;

    // Visual Snapping State
    private highlightLayer: VectorLayer<VectorSource> | null = null;
    private highlightSource: VectorSource | null = null;
    private highlightListener: ((e: MapBrowserEvent<any>) => void) | null = null;

    private _isDrawingMode: boolean = false;

    public get isDrawingMode(): boolean {
        return this._isDrawingMode;
    }

    // State
    private drawingCoordinates: number[][] = [];
    private startNode: Feature | null = null;
    private endNode: Feature | null = null;
    private activeType: 'pipe' | 'pump' | 'valve' = 'pipe';

    // Track temp start node
    private tempStartNode: Feature | null = null;

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
        this._isDrawingMode = true;

        useMapStore.getState().setIsDrawingPipe(true);
        this.map.getViewport().style.cursor = "crosshair";

        this.setupHighlightLayer();

        // Initialize Draw Interaction (For Standalone Line Drawing)
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
            },
            condition: (e: MapBrowserEvent<any>) => {
                return e.type === 'pointerdown' && (e.originalEvent as PointerEvent).button === 0;
            },
        });

        // Handle Start - Robust Pipe Split
        this.drawInteraction.on('drawstart', (evt) => {
            const geometry = evt.feature.getGeometry() as LineString;
            const startCoord = geometry.getCoordinates()[0];

            this.startNode = null;
            this.tempStartNode = null;

            // Check Index for Existing NODE
            const existingNode = this.findNodeAtCoordinate(startCoord);
            if (existingNode) {
                this.startNode = existingNode;
                return;
            }

            // Check Index for Existing PIPE -> SPLIT IT
            const existingPipe = this.findPipeAtCoordinate(startCoord);

            if (existingPipe) {
                // Split immediately, Only if we are drawing a PIPE.
                if (this.activeType === 'pipe') {
                    const newNode = this.insertNodeOnPipe(existingPipe, startCoord, 'junction');
                    this.startNode = newNode;
                    this.tempStartNode = newNode;
                }
            } else {
                // Empty Space -> Create fresh node
                const newNode = this.createNode(startCoord, 'junction');
                this.startNode = newNode;
                this.tempStartNode = newNode;
            }
        });

        // Initialize Snap
        this.snapInteraction = new Snap({
            source: this.vectorSource,
            pixelTolerance: 10,
            edge: true,
            vertex: true,
        });

        // Handle End
        this.drawInteraction.on('drawend', (event) => {
            const feature = event.feature;
            const geometry = feature.getGeometry() as LineString;
            this.handleDrawEnd(geometry);
        });

        this.map.addInteraction(this.drawInteraction);
        this.map.addInteraction(this.snapInteraction);

        this.setupClickHandler();
    }

    public stopDrawing(fullReset: boolean = true) {
        if (!this._isDrawingMode) return;

        this.removeHighlightLayer();

        this.spatialIndex = null;
        this.indexedFeatures = [];
        this.tempStartNode = null;

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

        this._isDrawingMode = false;
        useMapStore.getState().setIsDrawingPipe(false);
        this.map.getViewport().style.cursor = "default";
    }

    public cleanup() {
        this.stopDrawing();
    }

    // ============================================
    // MID-DRAW ACTION HANDLERS
    // ============================================

    public addNodeWhileDrawing(type: FeatureType, coordinate: number[]) {
        if (!this._isDrawingMode) return;
        if (this.drawInteraction) this.drawInteraction.abortDrawing();

        const newNode = this.createNode(coordinate, type);
        let previousNode = this.startNode || this.tempStartNode;

        if (previousNode) {
            const startCoord = (previousNode.getGeometry() as Point).getCoordinates();
            this.createPipe([startCoord, coordinate], previousNode, newNode);
        }
        this.continueDrawingFromNode(newNode);
    }

    public addLinkWhileDrawing(linkType: 'pump' | 'valve', coordinate?: number[]) {
        if (!coordinate) { this.startDrawing(linkType); return; }

        if (this._isDrawingMode && (this.startNode || this.tempStartNode)) {
            const startNode = this.startNode || this.tempStartNode as Feature;
            const startCoord = (startNode.getGeometry() as Point).getCoordinates();

            // Create Mid Node (Inlet)
            const midNode = this.createNode(coordinate, 'junction');

            // Complete pipe up to inlet
            this.createPipe([startCoord, coordinate], startNode, midNode);

            // Smart Offset Calculation
            const dx = coordinate[0] - startCoord[0];
            const dy = coordinate[1] - startCoord[1];
            const len = Math.sqrt(dx * dx + dy * dy);

            const GAP = this.MIN_PIPE_LENGTH;
            const safeOffset = (len > 0) ? Math.min(GAP, len * 0.4) : 0.1;
            const offsetX = (len > 0) ? (dx / len) * safeOffset : 0.1;
            const offsetY = (len > 0) ? (dy / len) * safeOffset : 0;
            const outletCoord = [coordinate[0] + offsetX, coordinate[1] + offsetY];

            const endNode = this.createNode(outletCoord, 'junction');

            // Create the PUMP/VALVE
            const savedType = this.activeType;
            this.activeType = linkType;
            this.createLinkBetweenNodes(midNode, endNode, linkType);
            this.activeType = savedType;

            this.continueDrawingFromNode(endNode);
        }
    }

    public continueDrawingFromNode(node: Feature) {
        if (!this._isDrawingMode) this.startDrawing('pipe');
        this.resetState();
        this.startNode = node;
        const coord = (node.getGeometry() as Point).getCoordinates();
        this.drawingCoordinates = [coord];
        this.addVertexMarker(coord);
        this.spatialIndex = null; // Invalidate
    }

    // ============================================
    // VISUAL SNAPPING LOGIC
    // ============================================

    private setupHighlightLayer() {
        if (this.highlightLayer) return;
        this.highlightSource = new VectorSource();

        // 1. Node Snap Style (Glow + Target)
        const nodeHighlightStyle = [
            // Outer Glow (Soft Halo)
            new Style({
                image: new CircleStyle({
                    radius: 14,
                    fill: new Fill({ color: 'rgba(6, 182, 212, 0.2)' }) // Cyan-500 low opacity
                }),
                zIndex: 999
            }),
            // Inner Target (Sharp Ring)
            new Style({
                image: new CircleStyle({
                    radius: 6,
                    stroke: new Stroke({ color: '#06b6d4', width: 3 }), // Cyan-500 Solid
                    fill: new Fill({ color: 'rgba(255, 255, 255, 0.9)' }) // White center for precision focus
                }),
                zIndex: 1000
            })
        ];

        // 2. Pipe Split Style (Glow + Dashed Core)
        const pipeHighlightStyle = [
            // Wide Glow Path
            new Style({
                stroke: new Stroke({
                    color: 'rgba(6, 182, 212, 0.25)', // Cyan Glow
                    width: 14,
                    lineCap: 'round'
                }),
                zIndex: 999
            }),
            // Core Action Line
            new Style({
                stroke: new Stroke({
                    color: '#06b6d4', // Cyan Solid
                    width: 3,
                    lineDash: [10, 10] // Dashed to indicate "Modification/Split"
                }),
                zIndex: 1000
            })
        ];

        this.highlightLayer = new VectorLayer({
            source: this.highlightSource,
            zIndex: 10000, // Ensure it's on top of everything
            style: (feature) => {
                const type = feature.get('type');
                if (['junction', 'tank', 'reservoir'].includes(type)) return nodeHighlightStyle;
                if (type === 'pipe') return pipeHighlightStyle;
                return undefined;
            }
        });

        this.map.addLayer(this.highlightLayer);

        // Listen to mouse moves
        this.highlightListener = (evt: MapBrowserEvent<any>) => {
            if (!this._isDrawingMode || !this.highlightSource) return;

            // 1. Clear previous highlight
            this.highlightSource.clear();
            const coordinate = evt.coordinate;

            // 2. Check for Nodes (Priority)
            const node = this.findNodeAtCoordinate(coordinate);
            if (node) {
                // Show "Connect" feedback
                const clone = node.clone();
                clone.setId(`highlight-${node.getId()}`); // Avoid ID conflict
                this.highlightSource.addFeature(clone);
                this.map.getViewport().style.cursor = 'copy'; // Cursor: Copy (aka Connect)
                return;
            }

            // 3. Check for Pipes
            const pipe = this.findPipeAtCoordinate(coordinate);
            if (pipe) {
                // Show "Split" feedback
                const clone = pipe.clone();
                clone.setId(`highlight-${pipe.getId()}`);
                this.highlightSource.addFeature(clone);
                this.map.getViewport().style.cursor = 'crosshair'; // Cursor: Cell (aka Split)
                return;
            }

            // 4. Nothing nearby
            this.map.getViewport().style.cursor = 'crosshair';
        };

        this.map.on('pointermove', this.highlightListener);
    }

    private removeHighlightLayer() {
        if (this.highlightListener) {
            this.map.un('pointermove', this.highlightListener);
            this.highlightListener = null;
        }
        if (this.highlightLayer) {
            this.map.removeLayer(this.highlightLayer);
            this.highlightLayer = null;
            this.highlightSource = null;
        }
    }

    // ============================================
    // INTERNAL HELPERS
    // ============================================

    private setupClickHandler() {
        this.clickHandler = (event: any) => {
            if (!this._isDrawingMode) return;
            const pipeUnderCursor = this.findPipeAtCoordinate(event.coordinate);
            if (pipeUnderCursor) {
                // If we are trying to place a Pump/Valve on a pipe
                if (this.activeType === 'pump' || this.activeType === 'valve') {
                    if (this.drawInteraction) this.drawInteraction.abortDrawing();
                    this.insertLinkOnPipe(pipeUnderCursor, event.coordinate, this.activeType);
                    this.stopDrawing();
                }
            }
        };
        this.map.on('click', this.clickHandler);
    }

    private handleDrawEnd(geometry: LineString) {
        const coords = geometry.getCoordinates();
        if (coords.length < 2) return;

        const endCoord = coords[coords.length - 1];
        // This enables "Standalone" drawing in empty space
        const startNode = this.startNode || this.tempStartNode;
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

        setTimeout(() => {
            const rawFeatures = this.vectorSource.getFeatures().filter(f => !f.get('type'));
            rawFeatures.forEach(f => this.vectorSource.removeFeature(f));
        }, 0);

        // If 'pump' or 'valve', we usually stop after one.
        if (this.activeType !== 'pipe') {
            this.stopDrawing();
        }
    }

    private getOrCreateNodeAt(coordinate: number[]): Feature {
        const existingNode = this.findNodeAtCoordinate(coordinate);
        if (existingNode) return existingNode;

        const existingPipe = this.findPipeAtCoordinate(coordinate);
        if (existingPipe) {
            return this.insertNodeOnPipe(existingPipe, coordinate, 'junction');
        }
        // Create new Junction
        return this.createNode(coordinate, 'junction');
    }

    private rebuildSpatialIndex() {
        const allFeatures = this.vectorSource.getFeatures();
        const targets = allFeatures.filter(f =>
            ['pipe', 'junction', 'tank', 'reservoir'].includes(f.get('type')) &&
            !f.get('isPreview') && !f.get('isVisualLink')
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

    public findPipeAtCoordinate(coordinate: number[]): Feature | null {
        if (!this.spatialIndex) this.rebuildSpatialIndex();
        if (!this.spatialIndex) return null;

        const resolution = this.map.getView().getResolution() || 1;
        const tolerance = 10 * resolution;

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
        this.vectorSource.addFeature(feature);
        useNetworkStore.getState().addFeature(feature);
        if (!this.tempStartNode && this._isDrawingMode) {
            this.tempStartNode = feature;
        }
        this.startNode = feature;
        this.spatialIndex = null;
        return feature;
    }

    private createPipe(coords: number[][], startNode: Feature, endNode: Feature) {
        const feature = NetworkFactory.createPipe(coords, startNode, endNode);
        this.vectorSource.addFeature(feature);

        const store = useNetworkStore.getState();
        store.addFeature(feature);
        store.updateFeature(feature.getId() as string, { geometry: coords });
        // Update Topology
        store.updateNodeConnections(startNode.getId() as string, feature.getId() as string, "add");
        store.updateNodeConnections(endNode.getId() as string, feature.getId() as string, "add");

        this.spatialIndex = null;
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
        this.spatialIndex = null;
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

    // ============================================
    // CONTEXT MENU / EXTERNAL ACTIONS
    // ============================================

    public insertLinkOnPipe(pipe: Feature, coordinate: number[], type: 'pump' | 'valve') {
        const store = useNetworkStore.getState();
        // 1. Start Transaction
        store.startTransaction();

        try {
            const geometry = pipe.getGeometry() as LineString;
            const coords = geometry.getCoordinates();
            const startNodeId = pipe.get('startNodeId');
            const endNodeId = pipe.get('endNodeId');
            const originalId = pipe.getId() as string;

            const pipeProps = { ...pipe.getProperties() };
            // Clean up props to avoid carrying over old ID/topology
            delete pipeProps.geometry; delete pipeProps.id; delete pipeProps.length;
            delete pipeProps.startNodeId; delete pipeProps.endNodeId;
            delete pipeProps.source; delete pipeProps.target;
            delete pipeProps.fromNode; delete pipeProps.toNode; delete pipeProps.label;

            const point1 = geometry.getClosestPoint(coordinate);
            let splitIndex = 0;

            for (let i = 0; i < coords.length - 1; i++) {
                const dist = this.distance(coords[i], point1) + this.distance(point1, coords[i + 1]);
                const segLen = this.distance(coords[i], coords[i + 1]);
                if (Math.abs(dist - segLen) < 0.01) { splitIndex = i; break; }
            }

            const pStart = coords[splitIndex];
            const pEnd = coords[splitIndex + 1];
            const dx = pEnd[0] - pStart[0];
            const dy = pEnd[1] - pStart[1];
            const len = Math.sqrt(dx * dx + dy * dy);

            const GAP = this.MIN_PIPE_LENGTH;
            const safeOffset = (len > 0) ? Math.min(GAP, len * 0.4) : 0.1;
            const offsetX = (len > 0) ? (dx / len) * safeOffset : 0.1;
            const offsetY = (len > 0) ? (dy / len) * safeOffset : 0;
            const point2 = [point1[0] + offsetX, point1[1] + offsetY];

            const j1 = this.createNode(point1, 'junction');
            const j2 = this.createNode(point2, 'junction');
            const j1Id = j1.getId() as string;
            const j2Id = j2.getId() as string;

            const coords1 = [...coords.slice(0, splitIndex + 1), point1];
            const p1Id = store.generateUniqueId('pipe');
            const p1 = new Feature({ geometry: new LineString(coords1) });
            p1.setId(p1Id);
            p1.setProperties({ ...pipeProps, type: 'pipe', isNew: true, id: p1Id, startNodeId: startNodeId, endNodeId: j1Id, source: startNodeId, target: j1Id, label: p1Id, length: this.calculatePipeLength(p1.getGeometry() as LineString) });

            const coords2 = [point2, ...coords.slice(splitIndex + 1)];
            const p2Id = store.generateUniqueId('pipe');
            const p2 = new Feature({ geometry: new LineString(coords2) });
            p2.setId(p2Id);
            p2.setProperties({ ...pipeProps, type: 'pipe', isNew: true, id: p2Id, startNodeId: j2Id, endNodeId: endNodeId, source: j2Id, target: endNodeId, label: p2Id, length: this.calculatePipeLength(p2.getGeometry() as LineString) });

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

            // 2. Commit Transaction
            store.commitTransaction();

            return { link: null, startJunction: j1, endJunction: j2 };
        } catch (e) {
            console.error("Split Failed", e);
            store.commitTransaction();
            return { link: null, startJunction: null, endJunction: null };
        }
    }

    public insertNodeOnPipe(pipe: Feature, coordinate: number[], type: FeatureType): Feature {
        const store = useNetworkStore.getState();

        // 1. Start Transaction
        store.startTransaction();
        try {
            const geometry = pipe.getGeometry() as LineString;
            const coords = geometry.getCoordinates();
            const startNodeId = pipe.get('startNodeId');
            const endNodeId = pipe.get('endNodeId');
            const originalId = pipe.getId() as string;

            const pipeProps = { ...pipe.getProperties() };
            delete pipeProps.geometry; delete pipeProps.id; delete pipeProps.length;
            delete pipeProps.startNodeId; delete pipeProps.endNodeId;
            delete pipeProps.source; delete pipeProps.target;
            delete pipeProps.fromNode; delete pipeProps.toNode; delete pipeProps.label;

            const closestPoint = geometry.getClosestPoint(coordinate);
            let splitIndex = 0;
            for (let i = 0; i < coords.length - 1; i++) {
                const dist = this.distance(coords[i], closestPoint) + this.distance(closestPoint, coords[i + 1]);
                const segLen = this.distance(coords[i], coords[i + 1]);
                if (Math.abs(dist - segLen) < 0.01) { splitIndex = i; break; }
            }

            const newNode = this.createNode(closestPoint, type);
            const newNodeId = newNode.getId() as string;

            const coords1 = [...coords.slice(0, splitIndex + 1), closestPoint];
            const p1Id = store.generateUniqueId('pipe');
            const p1 = new Feature({ geometry: new LineString(coords1) });
            p1.setId(p1Id);
            p1.setProperties({ ...pipeProps, type: 'pipe', isNew: true, id: p1Id, startNodeId: startNodeId, endNodeId: newNodeId, source: startNodeId, target: newNodeId, label: `${p1Id}`, length: this.calculatePipeLength(p1.getGeometry() as LineString) });

            const coords2 = [closestPoint, ...coords.slice(splitIndex + 1)];
            const p2Id = store.generateUniqueId('pipe');
            const p2 = new Feature({ geometry: new LineString(coords2) });
            p2.setId(p2Id);
            p2.setProperties({ ...pipeProps, type: 'pipe', isNew: true, id: p2Id, startNodeId: newNodeId, endNodeId: endNodeId, source: newNodeId, target: endNodeId, label: `${p2Id}`, length: this.calculatePipeLength(p2.getGeometry() as LineString) });

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

            // 2. Commit Transaction
            store.commitTransaction();

            return newNode;

        } catch (e) {
            console.error("Node Split Failed", e);
            store.commitTransaction();
            throw e;
        }
    }

    public reversePipeDirection(pipe: Feature) {
        const store = useNetworkStore.getState();
        store.startTransaction();

        try {
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
            const id = pipe.getId() as string;
            store.markModified([id]);
            store.markUnSaved();
            store.commitTransaction();
        } catch (error) {
            store.commitTransaction();
        }
    }

    public convertNode(node: Feature, newType: 'tank' | 'reservoir' | 'junction') {
        const store = useNetworkStore.getState();
        const vectorSource = this.vectorSource;

        // 1. Validation
        if (!node) return;
        const oldId = node.getId() as string;
        const oldType = node.get('type');

        if (oldType === newType) return; // No change needed

        // 2. Start Transaction
        store.startTransaction();

        try {
            // Create New Node at same location
            const coords = (node.getGeometry() as Point).getCoordinates();
            const newNode = NetworkFactory.createNode(newType, coords);
            const newId = newNode.getId() as string;

            // Transfer Properties? 
            // Usually we DON'T transfer props between different types (e.g. Tank level vs Junction demand).
            // But we MUST transfer topology.

            // ADD TO STORE & MAP FIRST
            // We must do this before updating connections so the store can find 'newId'
            vectorSource.addFeature(newNode);
            store.addFeature(newNode);

            // Update Connected Links
            // We need to look at the store to find who connects to us
            const storeNode = store.features.get(oldId);
            const connectedLinks = storeNode?.get('connectedLinks') || [];

            connectedLinks.forEach((linkId: string) => {
                const link = vectorSource.getFeatureById(linkId) || store.features.get(linkId);
                if (link) {
                    // A. Update Link Endpoints (Point to new Node ID)
                    let modified = false;
                    if (link.get('startNodeId') === oldId) {
                        link.set('startNodeId', newId);
                        store.updateFeature(linkId, { startNodeId: newId });
                        modified = true;
                    }
                    if (link.get('endNodeId') === oldId) {
                        link.set('endNodeId', newId);
                        store.updateFeature(linkId, { endNodeId: newId });
                        modified = true;
                    }

                    // B. Update Topology Arrays (if link was actually connected)
                    if (modified) {
                        store.updateNodeConnections(oldId, linkId, 'remove');
                        store.updateNodeConnections(newId, linkId, 'add');
                    }
                }
            });

            // Delete Old Node
            vectorSource.removeFeature(node);
            store.removeFeature(oldId);

            // Select New Node
            store.selectFeature(newId);

            store.commitTransaction();

        } catch (e) {
            console.error("Conversion failed", e);
            store.commitTransaction();
        }
    }

}