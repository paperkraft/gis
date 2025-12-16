import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
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
    private isDrawingMode: boolean = false;

    // State
    private drawingCoordinates: number[][] = [];
    private startNode: Feature | null = null;
    private endNode: Feature | null = null;
    private activeType: 'pipe' | 'pump' | 'valve' = 'pipe';

    // Visuals
    private previewLine: Feature | null = null;
    private vertexMarkers: Feature[] = [];
    private helpTooltipElement: HTMLElement | null = null;
    private helpMessageTimeout: any = null;

    // Handlers
    private clickHandler: ((event: any) => void) | null = null;
    private pointerMoveHandler: ((event: any) => void) | null = null;
    private doubleClickHandler: ((event: any) => void) | null = null;
    private escKeyHandler: ((event: any) => void) | null = null;

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
        const previousStartNode = this.startNode;
        const wasDrawing = this.isDrawingMode;

        if (this.isDrawingMode) {
            this.stopDrawing(false);
        }

        this.activeType = type;
        this.removeEventHandlers();

        this.isDrawingMode = true;
        this.drawingCoordinates = [];
        this.vertexMarkers = [];
        this.endNode = null;

        // Restore start node if chaining
        if (wasDrawing && previousStartNode) {
            this.startNode = previousStartNode;
            const startCoord = (this.startNode.getGeometry() as Point).getCoordinates();
            this.drawingCoordinates.push(startCoord);
            this.addVertexMarker(startCoord);
        } else {
            this.startNode = null;
        }

        useMapStore.getState().setIsDrawingPipe(true);
        this.map.getViewport().style.cursor = "crosshair";

        this.setupClickHandlers();

        const helpText = this.startNode
            ? `Select End Node for ${type}`
            : (type === 'pipe' ? "Click start node/pipe | Dbl-click finish" : `Click 2 nodes for ${type}`);
        this.showHelpMessage(helpText);
    }

    public stopDrawing(fullReset: boolean = true) {
        if (!this.isDrawingMode) return;

        this.isDrawingMode = false;
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

        this.hideHelpMessage();
        this.removeEventHandlers();

        this.map.getViewport().style.cursor = "default";
        useMapStore.getState().setIsDrawingPipe(false);
    }

    public cleanup() {
        this.stopDrawing();
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
            this.showHelpMessage(`${linkType} added. Continue drawing...`);
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

        return newNode;
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    private setupClickHandlers() {
        this.clickHandler = this.handleClick.bind(this);
        this.pointerMoveHandler = this.handlePointerMove.bind(this);
        this.doubleClickHandler = this.handleDoubleClick.bind(this);

        this.map.on("click", this.clickHandler);
        this.map.on("pointermove", this.pointerMoveHandler);
        this.map.on("dblclick", this.doubleClickHandler);

        this.escKeyHandler = (e: KeyboardEvent) => {
            if (e.key === "Backspace" && this.isDrawingMode) {
                if (this.drawingCoordinates.length > 1) { // Need at least start node
                    // Remove last coordinate
                    this.drawingCoordinates.pop();

                    // Remove last marker
                    const lastMarker = this.vertexMarkers.pop();
                    if (lastMarker) {
                        this.vectorSource.removeFeature(lastMarker);
                    }

                    // Update preview
                    // We need a synthetic event or just call update with last known
                    // Since we can't easily get mouse position here without tracking it globally,
                    // we'll wait for next mouse move to update preview line destination.
                    // But we should at least refresh the source to remove the old line.
                    if (this.previewLine) {
                        this.vectorSource.removeFeature(this.previewLine);
                        this.previewLine = null;
                    }
                    this.showHelpMessage("Vertex removed");
                }
            }

            if (e.key === "Escape" && this.isDrawingMode) {
                if (this.drawingCoordinates.length > 0) {
                    this.resetState();
                    this.showHelpMessage("Drawing cancelled");
                } else {
                    this.stopDrawing();
                }
            }
        };
        document.addEventListener("keydown", this.escKeyHandler);
        this.map.getInteractions().forEach(i => {
            if (i.constructor.name === 'DoubleClickZoom') i.setActive(false);
        });
    }

    private removeEventHandlers() {
        if (this.clickHandler) this.map.un("click", this.clickHandler);
        if (this.pointerMoveHandler) this.map.un("pointermove", this.pointerMoveHandler);
        if (this.doubleClickHandler) this.map.un("dblclick", this.doubleClickHandler);
        if (this.escKeyHandler) document.removeEventListener("keydown", this.escKeyHandler);
        this.map.getInteractions().forEach(i => {
            if (i.constructor.name === 'DoubleClickZoom') i.setActive(true);
        });
        this.clickHandler = null;
    }

    private handleClick(event: any) {
        if (!this.isDrawingMode) return;
        const coordinate = event.coordinate;
        const existingNode = this.findNodeAtCoordinate(coordinate);

        // 1. STARTING
        if (!this.startNode) {
            if (existingNode) {
                this.startNode = existingNode;
            } else {
                const pipeUnderCursor = this.findPipeAtCoordinate(coordinate);
                if (pipeUnderCursor) {
                    if (this.activeType !== 'pipe') {
                        this.insertLinkOnPipe(pipeUnderCursor, coordinate, this.activeType);
                        this.resetState();
                        this.startNode = null;
                        return;
                    }
                    else {
                        this.startNode = this.insertNodeOnPipe(pipeUnderCursor, coordinate, 'junction');
                    }
                } else {
                    this.startNode = this.createNode(coordinate, 'junction');
                }
            }

            const startCoord = (this.startNode.getGeometry() as Point).getCoordinates();
            this.drawingCoordinates = [startCoord];
            this.addVertexMarker(startCoord);
            this.updatePreviewLine(event.coordinate);
            return;
        }

        // 2. CONTINUING
        const lastCoord = this.drawingCoordinates[this.drawingCoordinates.length - 1];
        if (this.distance(lastCoord, coordinate) < 0.1) return;

        if (existingNode) {
            if (existingNode.getId() === this.startNode.getId()) return;
            this.endNode = existingNode;
            this.drawingCoordinates.push((existingNode.getGeometry() as Point).getCoordinates());
            this.finishSegment(true);
            return;
        }

        // FIX: Check for pipe snap on continuation/finish
        const pipeUnderCursor = this.findPipeAtCoordinate(coordinate);
        if (pipeUnderCursor) {
            const splitNode = this.insertNodeOnPipe(pipeUnderCursor, coordinate, 'junction');
            this.endNode = splitNode;
            this.drawingCoordinates.push((splitNode.getGeometry() as Point).getCoordinates());
            this.finishSegment(true);
            return;
        }

        if (this.activeType !== 'pipe') {
            this.endNode = this.createNode(coordinate, 'junction');
            this.drawingCoordinates.push(coordinate);
            this.finishSegment(false);
            return;
        }

        this.drawingCoordinates.push(coordinate);
        this.addVertexMarker(coordinate);
        this.updatePreviewLine(event.coordinate);
    }

    private handleDoubleClick(event: any) {
        if (!this.isDrawingMode) return;
        event.preventDefault();
        event.stopPropagation();

        if (this.drawingCoordinates.length > 0) {
            const lastCoord = this.drawingCoordinates[this.drawingCoordinates.length - 1];

            let targetNode = this.findNodeAtCoordinate(lastCoord);
            if (!targetNode) {
                const pipeUnderCursor = this.findPipeAtCoordinate(lastCoord);
                if (pipeUnderCursor) {
                    targetNode = this.insertNodeOnPipe(pipeUnderCursor, lastCoord, 'junction');
                } else {
                    targetNode = this.createNode(lastCoord, 'junction');
                }
            }

            this.endNode = targetNode;
            this.finishSegment(false);
        }
    }

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

        const nextStartNode = continueChain ? this.endNode : null;
        this.resetState();
        this.startNode = null;

        if (this.activeType === 'pipe' && nextStartNode) {
            this.startNode = nextStartNode;
            const startCoord = (this.startNode.getGeometry() as Point).getCoordinates();
            this.drawingCoordinates = [startCoord];
            this.addVertexMarker(startCoord);
            this.endNode = null;
            this.showHelpMessage("Continue drawing or Dbl-Click to finish");
        }
    }

    private createPumpOrValveSegment() {
        if (!this.startNode || !this.endNode) return;
        this.createLinkBetweenNodes(this.startNode, this.endNode, this.activeType as 'pump' | 'valve');
        this.showHelpMessage(`${this.activeType} Created`);
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

    private handlePointerMove(event: any) {
        if (!this.isDrawingMode) return;
        this.updatePreviewLine(event.coordinate);
    }

    private updatePreviewLine(currentCursor: number[]) {
        if (this.previewLine) {
            this.vectorSource.removeFeature(this.previewLine);
            this.previewLine = null;
        }

        let startPoint: number[] | null = null;
        if (this.drawingCoordinates.length > 0) {
            startPoint = this.drawingCoordinates[this.drawingCoordinates.length - 1];
        } else if (this.startNode) {
            startPoint = (this.startNode.getGeometry() as Point).getCoordinates();
        }

        if (!startPoint) return;

        let targetCoord = currentCursor;
        if (this.activeType === 'pipe' && window.event && (window.event as any).shiftKey) {
            targetCoord = this.getOrthogonalCoordinate(startPoint, currentCursor);
        }

        const previewCoords = this.activeType === 'pipe'
            ? [...this.drawingCoordinates, targetCoord]
            : [startPoint, targetCoord];

        this.previewLine = new Feature({ geometry: new LineString(previewCoords) });
        const color = this.activeType === 'pipe' ? '#1FB8CD' : '#F59E0B';
        const dash = this.activeType === 'pipe' ? [10, 6] : [5, 5];

        this.previewLine.setStyle(new Style({
            stroke: new Stroke({ color: color, width: 2, lineDash: dash }),
            zIndex: 150,
        }));
        this.previewLine.set("isPreview", true);
        this.vectorSource.addFeature(this.previewLine);
    }

    // --- UTILS ---

    public findPipeAtCoordinate(coordinate: number[]): Feature | null {
        const pixel = this.map.getPixelFromCoordinate(coordinate);
        if (!pixel) return null;

        // FIX: Use iteration to ignore previews and markers, finding the real pipe
        return this.map.forEachFeatureAtPixel(
            pixel,
            (feature) => {
                if (feature.get('type') === 'pipe' && !feature.get('isPreview') && !feature.get('isVisualLink')) {
                    return feature as Feature;
                }
                return null;
            },
            {
                hitTolerance: 5,
                layerFilter: (layer) => layer.get('name') === 'network',
            }
        ) || null;
    }

    private findNodeAtCoordinate(coordinate: number[]): Feature | null {
        const pixel = this.map.getPixelFromCoordinate(coordinate);
        if (!pixel) return null;
        // Same fix for nodes
        return this.map.forEachFeatureAtPixel(
            pixel,
            (feature) => {
                if (['junction', 'tank', 'reservoir'].includes(feature.get('type'))) {
                    return feature as Feature;
                }
                return null;
            },
            {
                hitTolerance: 5,
                layerFilter: (layer) => layer.get('name') === 'network',
            }
        ) || null;
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
    private getOrthogonalCoordinate(start: number[], current: number[]): number[] {
        const dx = Math.abs(current[0] - start[0]);
        const dy = Math.abs(current[1] - start[1]);
        return dy > dx ? [start[0], current[1]] : [current[0], start[1]];
    }

    private showHelpMessage(msg: string) {
        if (this.helpMessageTimeout) clearTimeout(this.helpMessageTimeout);
        this.hideHelpMessage();
        const el = document.createElement("div");
        el.className = "drawing-help-tooltip";
        el.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#0f172a;color:white;padding:8px 16px;border-radius:20px;font-size:12px;z-index:9999;opacity:0.9;pointer-events:none;box-shadow: 0 4px 6px rgba(0,0,0,0.1);`;
        el.textContent = msg;
        document.body.appendChild(el);
        this.helpTooltipElement = el;
        this.helpMessageTimeout = setTimeout(() => this.hideHelpMessage(), 4000);
    }

    private hideHelpMessage() {
        if (this.helpTooltipElement) {
            this.helpTooltipElement.remove();
            this.helpTooltipElement = null;
        }
    }

    public registerWithContextMenu(contextMenuManager: any) {
        contextMenuManager.setComponentPlacedCallback((component: Feature) => {
            if (this.isDrawingMode && this.activeType === 'pipe') {
                this.continueDrawingFromNode(component);
            }
        });
    }

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