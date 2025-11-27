import { Feature, Overlay } from 'ol';
import { LineString, Point } from 'ol/geom';
import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

import { COMPONENT_TYPES, SNAPPING_TOLERANCE } from '@/constants/networkComponents';
import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';
import { FeatureType } from '@/types/network';

export class PipeDrawingManager {
    private map: Map;
    private vectorSource: VectorSource;
    private isDrawingMode: boolean = false;
    private drawingCoordinates: number[][] = [];
    private previewLine: Feature | null = null;
    private startNode: Feature | null = null;
    private endNode: Feature | null = null;
    private helpOverlay: Overlay | null = null;
    private vertexMarkers: Feature[] = [];

    private clickHandler: ((event: any) => void) | null = null;
    private pointerMoveHandler: ((event: any) => void) | null = null;
    private doubleClickHandler: ((event: any) => void) | null = null;
    private escKeyHandler: ((event: any) => void) | null = null;

    constructor(map: Map, vectorSource: VectorSource) {
        this.map = map;
        this.vectorSource = vectorSource;
        console.log("🔧 PipeDrawingManager initialized");
    }

    // ============================================
    // PUBLIC API
    // ============================================

    public startDrawing() {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🎯 startDrawing called");

        // Clean up any existing handlers first
        this.removeEventHandlers();

        this.isDrawingMode = true;
        this.drawingCoordinates = [];
        this.vertexMarkers = [];
        this.startNode = null;
        this.endNode = null;

        useMapStore.getState().setIsDrawingPipe(true);
        this.map.getViewport().style.cursor = "crosshair";

        // Setup handlers
        this.setupClickHandlers();

        this.showHelpMessage("Click nodes to draw pipes | Right-click to add junction | Double-click to finish");

        console.log("  Drawing mode active:", this.isDrawingMode);
        console.log("  Event handlers:", {
            click: !!this.clickHandler,
            pointerMove: !!this.pointerMoveHandler,
            doubleClick: !!this.doubleClickHandler,
        });
        console.log("✅ Pipe drawing activated");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }


    public stopDrawing() {
        if (!this.isDrawingMode) return;

        this.isDrawingMode = false;
        this.drawingCoordinates = [];
        this.startNode = null;
        this.endNode = null;

        this.vertexMarkers.forEach(marker => this.vectorSource.removeFeature(marker));
        this.vertexMarkers = [];

        if (this.previewLine) {
            this.vectorSource.removeFeature(this.previewLine);
            this.previewLine = null;
        }

        this.hideHelpMessage();
        this.removeEventHandlers();
        this.map.getViewport().style.cursor = "default";
        useMapStore.getState().setIsDrawingPipe(false);

        console.log("✅ Pipe drawing stopped");
    }

    public continueDrawingFromNode(node: Feature) {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔗 continueDrawingFromNode CALLED");
        console.log("  Node ID:", node.getId());
        console.log("  Node type:", node.get('type'));
        console.log("  Has geometry:", !!node.getGeometry());
        console.log("  isDrawingMode:", this.isDrawingMode);
        console.log("  Current vertices:", this.drawingCoordinates.length);

        if (!this.isDrawingMode) {
            console.log("  ⚠️ Not in drawing mode - calling startDrawing()");
            this.startDrawing();
        }

        const geometry = node.getGeometry();
        if (!geometry) {
            console.error("  ❌ Node has NO geometry!");
            return;
        }

        const coordinate = (geometry as Point).getCoordinates();
        console.log("  Node coordinate:", coordinate);

        if (this.drawingCoordinates.length === 0) {
            this.startNode = node;
            this.drawingCoordinates.push(coordinate);
            this.addVertexMarker(coordinate);
            this.showHelpMessage(`Drawing from ${node.get('label')} | Right-click to add junction`);
            console.log("  ✅ START node set");
            console.log("  Drawing coordinates:", this.drawingCoordinates);
        } else {
            console.log("  Adding as intermediate node");
            this.drawingCoordinates.push(coordinate);
            this.endNode = node;
            this.addVertexMarker(coordinate);
            this.createPipeSegment();
            this.resetForNextSegment(node);
        }

        console.log("  Final state:");
        console.log("    Drawing mode:", this.isDrawingMode);
        console.log("    Coordinates:", this.drawingCoordinates);
        console.log("    Start node:", this.startNode?.getId());
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }


    private createPipeSegment() {
        if (!this.startNode || !this.endNode) {
            console.error("❌ Missing start or end node");
            return;
        }

        console.log("  📦 Creating pipe segment");

        // Clear preview and markers
        if (this.previewLine) {
            this.vectorSource.removeFeature(this.previewLine);
            this.previewLine = null;
        }

        this.vertexMarkers.forEach(m => this.vectorSource.removeFeature(m));
        this.vertexMarkers = [];

        // Create the pipe
        const pipe = this.createPipe(
            this.drawingCoordinates,
            this.startNode,
            this.endNode
        );

        console.log("  ✅ Pipe segment created:", pipe.getId());
        console.log("    Length:", pipe.get('length'));
        console.log("    Vertices:", this.drawingCoordinates.length);
    }

    private resetForNextSegment(newStartNode: Feature) {
        console.log("  🔄 Preparing for next segment");

        const newStartCoord = (newStartNode.getGeometry() as Point).getCoordinates();

        // Reset for next segment
        this.startNode = newStartNode;
        this.endNode = null;
        this.drawingCoordinates = [newStartCoord];

        // Add marker for new start
        this.addVertexMarker(newStartCoord);

        this.showHelpMessage(`Continue from ${newStartNode.get('label')} | Right-click to add junction | Double-click to finish`);

        console.log("  ✅ Ready for next segment from:", newStartNode.getId());
    }


    public isDrawing(): boolean {
        return this.isDrawingMode;
    }

    public cleanup() {
        this.stopDrawing();
    }

    public registerWithContextMenu(contextMenuManager: any) {
        contextMenuManager.setComponentPlacedCallback((component: Feature) => {
            if (this.isDrawingMode) {
                console.log("🎯 Component placed callback triggered");
                this.continueDrawingFromNode(component);
            }
        });
    }

    // ============================================
    // SCENARIO 1 & 2: Insert Junction on Pipe
    // ============================================

    public insertNodeOnPipe(
        pipe: Feature,
        coordinate: number[],
        nodeType: FeatureType = 'junction'
    ): Feature {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(`🔀 Inserting ${nodeType} on pipe`);
        console.log("  Pipe:", pipe.getId());

        const store = useNetworkStore.getState();

        const tempNode = new Feature({
            geometry: new Point(coordinate),
        });

        const result = this.splitPipe(pipe, tempNode);

        if (!result || result.splitedPipes.length !== 2) {
            console.error("❌ Split failed");
            const node = this.createNodeOfType(nodeType, coordinate);
            return node;
        }

        const { splitedPipes } = result;
        const snappedCoordinate = (tempNode.getGeometry() as Point).getCoordinates();

        const node = this.createNodeOfType(nodeType, snappedCoordinate);
        const nodeId = node.getId() as string;

        const originalStartNodeId = pipe.get('startNodeId');
        const originalEndNodeId = pipe.get('endNodeId');

        this.vectorSource.removeFeature(pipe);
        store.removeFeature(pipe.getId() as string);

        const pipe1Id = store.generateUniqueId("pipe");
        const pipe1 = splitedPipes[0];
        pipe1.setId(pipe1Id);
        pipe1.set("type", "pipe");
        pipe1.set("isNew", true);
        pipe1.set("startNodeId", originalStartNodeId);
        pipe1.set("endNodeId", nodeId);
        pipe1.setProperties({
            ...COMPONENT_TYPES.pipe.defaultProperties,
            length: this.calculatePipeLength(pipe1.getGeometry() as LineString),
        });

        this.vectorSource.addFeature(pipe1);
        store.addFeature(pipe1);

        const pipe2Id = store.generateUniqueId("pipe");
        const pipe2 = splitedPipes[1];
        pipe2.setId(pipe2Id);
        pipe2.set("type", "pipe");
        pipe2.set("isNew", true);
        pipe2.set("startNodeId", nodeId);
        pipe2.set("endNodeId", originalEndNodeId);
        pipe2.setProperties({
            ...COMPONENT_TYPES.pipe.defaultProperties,
            length: this.calculatePipeLength(pipe2.getGeometry() as LineString),
        });

        this.vectorSource.addFeature(pipe2);
        store.addFeature(pipe2);

        store.updateNodeConnections(nodeId, pipe1Id, "add");
        store.updateNodeConnections(nodeId, pipe2Id, "add");

        this.vectorSource.changed();

        console.log(`✅ ${nodeType} inserted and pipe split`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        return node;
    }

    private createNodeOfType(nodeType: FeatureType, coordinate: number[]): Feature {
        const feature = new Feature({
            geometry: new Point(coordinate),
        });

        const store = useNetworkStore.getState();
        const id = store.generateUniqueId(nodeType);

        feature.setId(id);
        feature.set("type", nodeType);
        feature.set("isNew", true);
        feature.setProperties({
            ...COMPONENT_TYPES[nodeType].defaultProperties,
            label: `${COMPONENT_TYPES[nodeType].name}-${id}`,
        });
        feature.set("connectedLinks", []);

        this.vectorSource.addFeature(feature);
        store.addFeature(feature);

        return feature;
    }

    /**
 * Insert pump or valve on pipe
 */
    public insertLinkOnPipe(
        pipe: Feature,
        coordinate: number[],
        linkType: 'pump' | 'valve'
    ): { link: Feature; startJunction: Feature; endJunction: Feature } {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(`🔀 Inserting ${linkType} on pipe`);

        const store = useNetworkStore.getState();
        const tempPoint = new Feature({ geometry: new Point(coordinate) });
        const result = this.splitPipe(pipe, tempPoint);

        if (!result || result.splitedPipes.length !== 2) {
            throw new Error("Failed to split pipe");
        }

        const { splitedPipes } = result;
        const closestPoint = (tempPoint.getGeometry() as Point).getCoordinates();

        const LINK_LENGTH = 20;
        const geometry = pipe.getGeometry() as LineString;
        const coords = geometry.getCoordinates();

        // Calculate direction
        let angle = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            const segment = new LineString([coords[i], coords[i + 1]]);
            const pointOnSegment = segment.getClosestPoint(closestPoint);
            const dist = this.distance(pointOnSegment, closestPoint);
            if (dist < 1) {
                angle = this.calculateAngle(coords[i], coords[i + 1]);
                break;
            }
        }

        const startJunctionCoord = [
            closestPoint[0] - Math.cos(angle) * LINK_LENGTH,
            closestPoint[1] - Math.sin(angle) * LINK_LENGTH,
        ];

        const endJunctionCoord = [
            closestPoint[0] + Math.cos(angle) * LINK_LENGTH,
            closestPoint[1] + Math.sin(angle) * LINK_LENGTH,
        ];

        const startJunction = this.createNodeOfType('junction', startJunctionCoord);
        const endJunction = this.createNodeOfType('junction', endJunctionCoord);

        const link = new Feature({ geometry: new Point(closestPoint) });
        const linkId = store.generateUniqueId(linkType);
        link.setId(linkId);
        link.set("type", linkType);
        link.set("isNew", true);
        link.setProperties({
            ...COMPONENT_TYPES[linkType].defaultProperties,
            label: `${COMPONENT_TYPES[linkType].name}-${linkId}`,
            startNodeId: startJunction.getId(),
            endNodeId: endJunction.getId(),
        });

        this.vectorSource.addFeature(link);
        store.addFeature(link);

        store.updateNodeConnections(startJunction.getId() as string, linkId, "add");
        store.updateNodeConnections(endJunction.getId() as string, linkId, "add");

        const originalStartNodeId = pipe.get('startNodeId');
        const originalEndNodeId = pipe.get('endNodeId');

        this.vectorSource.removeFeature(pipe);
        store.removeFeature(pipe.getId() as string);

        // First pipe segment
        const firstPipeCoords = [...splitedPipes[0].getGeometry()!.getCoordinates().slice(0, -1), startJunctionCoord];
        const pipe1 = new Feature({ geometry: new LineString(firstPipeCoords) });
        const pipe1Id = store.generateUniqueId("pipe");
        pipe1.setId(pipe1Id);
        pipe1.set("type", "pipe");
        pipe1.set("startNodeId", originalStartNodeId);
        pipe1.set("endNodeId", startJunction.getId());
        pipe1.setProperties({
            ...COMPONENT_TYPES.pipe.defaultProperties,
            length: this.calculatePipeLength(pipe1.getGeometry() as LineString),
        });
        this.vectorSource.addFeature(pipe1);
        store.addFeature(pipe1);

        // Second pipe segment
        const secondPipeCoords = [endJunctionCoord, ...splitedPipes[1].getGeometry()!.getCoordinates().slice(1)];
        const pipe2 = new Feature({ geometry: new LineString(secondPipeCoords) });
        const pipe2Id = store.generateUniqueId("pipe");
        pipe2.setId(pipe2Id);
        pipe2.set("type", "pipe");
        pipe2.set("startNodeId", endJunction.getId());
        pipe2.set("endNodeId", originalEndNodeId);
        pipe2.setProperties({
            ...COMPONENT_TYPES.pipe.defaultProperties,
            length: this.calculatePipeLength(pipe2.getGeometry() as LineString),
        });
        this.vectorSource.addFeature(pipe2);
        store.addFeature(pipe2);

        console.log(`✅ ${linkType} inserted`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        return { link, startJunction, endJunction };
    }

    private calculateAngle(point1: number[], point2: number[]): number {
        const dx = point2[0] - point1[0];
        const dy = point2[1] - point1[1];
        return Math.atan2(dy, dx);
    }

    // ============================================
    // PIPE SPLITTING LOGIC
    // ============================================

    private splitPipe(
        pipeFeature: Feature,
        splitPointFeature: Feature
    ): {
        splitedPipes: Feature[];
    } | null {

        const pipeCoordinates = (pipeFeature.getGeometry() as LineString).getCoordinates();
        const splitCoord = (splitPointFeature.getGeometry() as Point).getCoordinates();

        console.log("  🔍 Analyzing pipe...");

        const pipeGeometry = pipeFeature.getGeometry() as LineString;
        const closestPoint = pipeGeometry.getClosestPoint(splitCoord);

        // Update split point to exact closest point on pipe
        (splitPointFeature.getGeometry() as Point).setCoordinates(closestPoint);

        // Find which segment
        let splitSegmentIndex = -1;
        let minDistance = Infinity;

        for (let i = 0; i < pipeCoordinates.length - 1; i++) {
            const segment = new LineString([pipeCoordinates[i], pipeCoordinates[i + 1]]);
            const pointOnSegment = segment.getClosestPoint(closestPoint);
            const distance = this.distance(pointOnSegment, closestPoint);

            if (distance < minDistance) {
                minDistance = distance;
                splitSegmentIndex = i;
            }
        }

        if (splitSegmentIndex === -1) {
            console.log("    ❌ No valid segment found");
            return null;
        }

        console.log("    ✓ Split at segment:", splitSegmentIndex);

        // Check if on vertex
        const VERTEX_TOLERANCE = 0.1;
        let isOnVertex = false;
        let vertexIndex = -1;

        for (let i = 0; i < pipeCoordinates.length; i++) {
            if (this.distance(pipeCoordinates[i], closestPoint) < VERTEX_TOLERANCE) {
                isOnVertex = true;
                vertexIndex = i;
                break;
            }
        }

        let firstLineCoords: number[][];
        let secondLineCoords: number[][];

        if (isOnVertex && vertexIndex > 0 && vertexIndex < pipeCoordinates.length - 1) {
            firstLineCoords = pipeCoordinates.slice(0, vertexIndex + 1);
            secondLineCoords = pipeCoordinates.slice(vertexIndex);
        } else {
            firstLineCoords = [...pipeCoordinates.slice(0, splitSegmentIndex + 1), closestPoint];
            secondLineCoords = [closestPoint, ...pipeCoordinates.slice(splitSegmentIndex + 1)];
        }

        if (firstLineCoords.length < 2 || secondLineCoords.length < 2) {
            console.log("    ❌ Invalid split");
            return null;
        }

        console.log("    ✓ Segments:", firstLineCoords.length, "and", secondLineCoords.length, "coords");

        const line1 = new Feature({ geometry: new LineString(firstLineCoords) });
        const line2 = new Feature({ geometry: new LineString(secondLineCoords) });

        return {
            splitedPipes: [line1, line2],
        };
    }

    // ============================================
    // FEATURE CREATION
    // ============================================

    private createJunction(coordinate: number[]): Feature {
        const feature = new Feature({
            geometry: new Point(coordinate),
        });

        const store = useNetworkStore.getState();
        const id = store.generateUniqueId('junction');

        feature.setId(id);
        feature.set("type", 'junction');
        feature.set("isNew", true);
        feature.setProperties({
            ...COMPONENT_TYPES.junction.defaultProperties,
            label: `J-${id.split('-')[1]}`,
        });
        feature.set("connectedLinks", []);

        this.vectorSource.addFeature(feature);
        store.addFeature(feature);

        return feature;
    }

    private createPipe(coords: number[][], startNode: Feature, endNode: Feature): Feature {
        const feature = new Feature({ geometry: new LineString(coords) });
        const store = useNetworkStore.getState();
        const id = store.generateUniqueId("pipe");

        feature.setId(id);
        feature.set("type", "pipe");
        feature.set("isNew", true);
        feature.setProperties({
            ...COMPONENT_TYPES.pipe.defaultProperties,
            startNodeId: startNode.getId(),
            endNodeId: endNode.getId(),
            length: this.calculatePipeLength(feature.getGeometry() as LineString),
            vertices: coords.length,
        });

        this.vectorSource.addFeature(feature);
        store.addFeature(feature);

        store.updateNodeConnections(startNode.getId() as string, id, "add");
        store.updateNodeConnections(endNode.getId() as string, id, "add");

        console.log("✅ Pipe created:", id);
        return feature;
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    private setupClickHandlers() {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📌 Setting up click handlers");

        this.clickHandler = this.handleClick.bind(this);
        this.pointerMoveHandler = this.handlePointerMove.bind(this);
        this.doubleClickHandler = this.handleDoubleClick.bind(this);

        // Add listeners
        this.map.on("singleclick", this.clickHandler);
        this.map.on("pointermove", this.pointerMoveHandler);
        this.map.on("dblclick", this.doubleClickHandler);

        console.log("  ✓ Click handler attached");
        console.log("  ✓ PointerMove handler attached");
        console.log("  ✓ DoubleClick handler attached");

        // ESC key
        this.escKeyHandler = (e: KeyboardEvent) => {
            if (e.key === "Escape" && this.isDrawingMode) {
                console.log("⌨️ ESC pressed - canceling");
                this.cancelCurrentPipe();
                this.stopDrawing();
            }
        };
        document.addEventListener("keydown", this.escKeyHandler);
        console.log("  ✓ ESC key handler attached");

        // Disable double-click zoom
        this.map.getInteractions().forEach(interaction => {
            if (interaction.constructor.name === 'DoubleClickZoom') {
                interaction.setActive(false);
                console.log("  ✓ Double-click zoom disabled");
            }
        });

        // TEST: Verify handlers are working
        console.log("  Testing pointer move listener...");
        const testCoord = this.map.getView().getCenter();
        if (testCoord) {
            console.log("  Current map center:", testCoord);
        }

        console.log("✅ All handlers attached");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }


    private removeEventHandlers() {
        if (this.clickHandler) this.map.un("singleclick", this.clickHandler);
        if (this.pointerMoveHandler) this.map.un("pointermove", this.pointerMoveHandler);
        if (this.doubleClickHandler) this.map.un("dblclick", this.doubleClickHandler);
        if (this.escKeyHandler) document.removeEventListener("keydown", this.escKeyHandler);

        this.map.getInteractions().forEach(interaction => {
            if (interaction.constructor.name === 'DoubleClickZoom') {
                interaction.setActive(true);
            }
        });

        this.clickHandler = null;
        this.pointerMoveHandler = null;
        this.doubleClickHandler = null;
        this.escKeyHandler = null;
    }

    private handleClick(event: any) {
        if (!this.isDrawingMode) return;

        const coordinate = event.coordinate;
        const existingNode = this.findNodeAtCoordinate(coordinate);

        if (this.drawingCoordinates.length === 0) {
            if (existingNode) {
                this.startNode = existingNode;
                this.drawingCoordinates.push((existingNode.getGeometry() as Point).getCoordinates());
                this.addVertexMarker(this.drawingCoordinates[0]);
                this.showHelpMessage(`Drawing from ${existingNode.get('label')}`);
            } else {
                this.showHelpMessage("⚠️ Click on a node to start");
            }
            return;
        }

        if (existingNode) {
            const nodeCoord = (existingNode.getGeometry() as Point).getCoordinates();
            this.drawingCoordinates.push(nodeCoord);
            this.endNode = existingNode;
            this.addVertexMarker(nodeCoord);
        } else {
            this.drawingCoordinates.push(coordinate);
            this.addVertexMarker(coordinate);
        }
    }

    private handlePointerMove(event: any) {
        // Debug every move
        const isDrawing = this.isDrawingMode;
        const hasCoords = this.drawingCoordinates.length > 0;

        console.log("🖱️ Mouse move:", {
            isDrawingMode: isDrawing,
            hasCoordinates: hasCoords,
            coordinateCount: this.drawingCoordinates.length
        });

        if (!isDrawing) {
            console.log("  ❌ Not in drawing mode");
            return;
        }

        if (!hasCoords) {
            console.log("  ❌ No coordinates yet");
            return;
        }

        console.log("  ✅ Drawing preview line");

        // Remove old preview
        if (this.previewLine) {
            this.vectorSource.removeFeature(this.previewLine);
        }

        // Create new preview
        const previewCoords = [...this.drawingCoordinates, event.coordinate];
        this.previewLine = new Feature({
            geometry: new LineString(previewCoords)
        });

        this.previewLine.setStyle(new Style({
            stroke: new Stroke({
                color: "#1FB8CD",
                width: 3,
                lineDash: [10, 5],
            }),
        }));

        this.previewLine.set("isPreview", true);
        this.vectorSource.addFeature(this.previewLine);

        console.log("  Preview line added");
    }


    private handleDoubleClick(event: any) {
        if (!this.isDrawingMode) return;

        event.preventDefault();
        event.stopPropagation();

        if (this.drawingCoordinates.length < 2) {
            this.showHelpMessage("⚠️ Need at least 2 points");
            return;
        }

        this.finishCurrentPipe();
        this.stopDrawing();
        return false;
    }

    private finishCurrentPipe() {
        if (!this.startNode || !this.endNode) {
            this.showHelpMessage("⚠️ Pipe must connect two nodes");
            return;
        }

        if (this.previewLine) {
            this.vectorSource.removeFeature(this.previewLine);
            this.previewLine = null;
        }

        this.vertexMarkers.forEach(m => this.vectorSource.removeFeature(m));
        this.vertexMarkers = [];

        this.createPipe(this.drawingCoordinates, this.startNode, this.endNode);

        this.drawingCoordinates = [];
        this.startNode = null;
        this.endNode = null;

        this.showHelpMessage("✅ Pipe created!");
    }

    private cancelCurrentPipe() {
        this.drawingCoordinates = [];
        this.startNode = null;
        this.endNode = null;

        this.vertexMarkers.forEach(m => this.vectorSource.removeFeature(m));
        this.vertexMarkers = [];

        if (this.previewLine) {
            this.vectorSource.removeFeature(this.previewLine);
            this.previewLine = null;
        }
    }

    // ============================================
    // UTILITIES
    // ============================================

    private distance(p1: number[], p2: number[]): number {
        return Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2);
    }

    private findNodeAtCoordinate(coordinate: number[]): Feature | null {
        const pixel = this.map.getPixelFromCoordinate(coordinate);
        const features = this.vectorSource.getFeatures();

        return features.find((f) => {
            if (!["junction", "tank", "reservoir"].includes(f.get("type"))) return false;

            const geom = f.getGeometry();
            if (geom instanceof Point) {
                const fPixel = this.map.getPixelFromCoordinate(geom.getCoordinates());
                const dist = Math.sqrt(
                    (pixel[0] - fPixel[0]) ** 2 +
                    (pixel[1] - fPixel[1]) ** 2
                );
                return dist <= SNAPPING_TOLERANCE;
            }
            return false;
        }) || null;
    }

    private calculatePipeLength(geometry: LineString): number {
        const coords = geometry.getCoordinates();
        let length = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            length += this.distance(coords[i], coords[i + 1]);
        }
        return Math.round(length);
    }

    private addVertexMarker(coord: number[]) {
        const marker = new Feature({ geometry: new Point(coord) });
        marker.setStyle(new Style({
            image: new CircleStyle({
                radius: 4,
                fill: new Fill({ color: "#1FB8CD" }),
                stroke: new Stroke({ color: "#fff", width: 2 }),
            }),
        }));
        marker.set("isVertexMarker", true);
        this.vectorSource.addFeature(marker);
        this.vertexMarkers.push(marker);
    }

    private showHelpMessage(message: string) {
        this.hideHelpMessage();
        const el = document.createElement("div");
        el.style.cssText = `
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: linear-gradient(135deg, #1FB8CD, #0891A6);
            color: white; padding: 12px 24px; border-radius: 8px;
            font-size: 14px; font-weight: 500; z-index: 10000;
            box-shadow: 0 4px 16px rgba(31,184,205,0.4);
        `;
        el.textContent = message;
        document.body.appendChild(el);
        this.helpOverlay = new Overlay({ element: el, stopEvent: false });
        setTimeout(() => this.hideHelpMessage(), 3000);
    }

    private hideHelpMessage() {
        if (this.helpOverlay?.getElement()) {
            this.helpOverlay.getElement()?.remove();
            this.helpOverlay = null;
        }
    }
}
