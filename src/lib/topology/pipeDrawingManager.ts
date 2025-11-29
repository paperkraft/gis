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
    private clickTimeout: any = null;
    private helpMessageTimeout: any = null;

    private readonly MAX_VERTICES = 100;
    private readonly MIN_PIPE_LENGTH = 0.5;

    constructor(map: Map, vectorSource: VectorSource) {
        this.map = map;
        this.vectorSource = vectorSource;
    }

    // ============================================
    // PUBLIC API
    // ============================================

    public startDrawing() {
        this.removeEventHandlers();

        this.isDrawingMode = true;
        this.drawingCoordinates = [];
        this.vertexMarkers = [];
        this.startNode = null;
        this.endNode = null;

        useMapStore.getState().setIsDrawingPipe(true);
        this.map.getViewport().style.cursor = "crosshair";

        this.setupClickHandlers();
        this.showHelpMessage("Click nodes to draw pipes | Right-click to add junction | Double-click to finish");
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
    }

    public continueDrawingFromNode(node: Feature) {
        if (!this.isDrawingMode) {
            this.startDrawing();
        }

        const geometry = node.getGeometry();
        if (!geometry) return;

        const coordinate = (geometry as Point).getCoordinates();

        if (this.drawingCoordinates.length === 0) {
            // Starting new pipe segment
            this.startNode = node;
            this.drawingCoordinates.push(coordinate);
            this.addVertexMarker(coordinate);
            this.showHelpMessage(`Drawing from ${node.get('label')} | Right-click to add junction`);
            return;
        } else {
            // Ending current pipe segment
            this.drawingCoordinates.push(coordinate);
            this.endNode = node;
            // Don't add vertex marker here - createPipeSegment will clear all markers
            // and resetForNextSegment will add the marker for the next segment
            this.createPipeSegment();
            this.resetForNextSegment(node);
        }
    }

    public isDrawing(): boolean {
        return this.isDrawingMode;
    }

    public cleanup() {
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = null;
        }

        if (this.helpMessageTimeout) {
            clearTimeout(this.helpMessageTimeout);
            this.helpMessageTimeout = null;
        }

        this.stopDrawing();
    }

    public registerWithContextMenu(contextMenuManager: any) {
        contextMenuManager.setComponentPlacedCallback((component: Feature) => {
            if (this.isDrawingMode) {
                this.continueDrawingFromNode(component);
            }
        });
    }

    // ============================================
    // NODE/LINK INSERTION
    // ============================================

    public insertNodeOnPipe(
        pipe: Feature,
        coordinate: number[],
        nodeType: FeatureType = 'junction'
    ): Feature {
        const store = useNetworkStore.getState();

        const tempNode = new Feature({
            geometry: new Point(coordinate),
        });

        const result = this.splitPipe(pipe, tempNode);

        if (!result || result.splitedPipes.length !== 2) {
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

        return node;
    }

    public insertLinkOnPipe(
        pipe: Feature,
        coordinate: number[],
        linkType: 'pump' | 'valve'
    ): { link: Feature; startJunction: Feature; endJunction: Feature } {
        const store = useNetworkStore.getState();

        const geometry = pipe.getGeometry() as LineString;
        const originalCoords = geometry.getCoordinates();
        const closestPoint = geometry.getClosestPoint(coordinate);

        const { angle, segmentIndex, pointOnSegment } = this.findPipeSegmentAtPoint(
            geometry,
            closestPoint
        );

        const LINK_LENGTH = 1;

        const startJunctionCoord = [
            pointOnSegment[0] - Math.cos(angle) * (LINK_LENGTH / 2),
            pointOnSegment[1] - Math.sin(angle) * (LINK_LENGTH / 2),
        ];

        const endJunctionCoord = [
            pointOnSegment[0] + Math.cos(angle) * (LINK_LENGTH / 2),
            pointOnSegment[1] + Math.sin(angle) * (LINK_LENGTH / 2),
        ];

        const startJunction = this.createJunction(startJunctionCoord);
        const endJunction = this.createJunction(endJunctionCoord);

        const linkMidpoint = pointOnSegment;

        const link = new Feature({
            geometry: new Point(linkMidpoint)
        });

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

        this.createVisualLinkLine(startJunctionCoord, endJunctionCoord, linkId, linkType);

        store.updateNodeConnections(startJunction.getId() as string, linkId, "add");
        store.updateNodeConnections(endJunction.getId() as string, linkId, "add");

        const originalStartNodeId = pipe.get('startNodeId');
        const originalEndNodeId = pipe.get('endNodeId');

        const { firstPipeCoords, secondPipeCoords } = this.insertPointsInPipe(
            originalCoords,
            segmentIndex,
            startJunctionCoord,
            endJunctionCoord
        );

        this.vectorSource.removeFeature(pipe);
        store.removeFeature(pipe.getId() as string);

        if (firstPipeCoords.length >= 2) {
            const pipe1 = new Feature({
                geometry: new LineString(firstPipeCoords)
            });
            const pipe1Id = store.generateUniqueId("pipe");
            pipe1.setId(pipe1Id);
            pipe1.set("type", "pipe");
            pipe1.set("isNew", true);
            pipe1.set("startNodeId", originalStartNodeId);
            pipe1.set("endNodeId", startJunction.getId());
            pipe1.setProperties({
                ...COMPONENT_TYPES.pipe.defaultProperties,
                label: `P-${pipe1Id}`,
                diameter: pipe.get('diameter') || 300,
                roughness: pipe.get('roughness') || 100,
                length: this.calculatePipeLength(pipe1.getGeometry() as LineString),
            });

            this.vectorSource.addFeature(pipe1);
            store.addFeature(pipe1);
            store.updateNodeConnections(startJunction.getId() as string, pipe1Id, "add");
        }

        if (secondPipeCoords.length >= 2) {
            const pipe2 = new Feature({
                geometry: new LineString(secondPipeCoords)
            });
            const pipe2Id = store.generateUniqueId("pipe");
            pipe2.setId(pipe2Id);
            pipe2.set("type", "pipe");
            pipe2.set("isNew", true);
            pipe2.set("startNodeId", endJunction.getId());
            pipe2.set("endNodeId", originalEndNodeId);
            pipe2.setProperties({
                ...COMPONENT_TYPES.pipe.defaultProperties,
                label: `P-${pipe2Id}`,
                diameter: pipe.get('diameter') || 300,
                roughness: pipe.get('roughness') || 100,
                length: this.calculatePipeLength(pipe2.getGeometry() as LineString),
            });

            this.vectorSource.addFeature(pipe2);
            store.addFeature(pipe2);
            store.updateNodeConnections(endJunction.getId() as string, pipe2Id, "add");
        }

        return { link, startJunction, endJunction };
    }

    public addLinkWhileDrawingO(linkType: 'pump' | 'valve'): Feature {
        if (!this.isDrawingMode || this.drawingCoordinates.length === 0) {
            throw new Error("Cannot add link - not drawing");
        }

        const lastCoord = this.drawingCoordinates[this.drawingCoordinates.length - 1];
        const startJunction = this.createJunction(lastCoord);

        const LINK_LENGTH = 1;
        let angle = 0;

        if (this.drawingCoordinates.length >= 2) {
            const prevCoord = this.drawingCoordinates[this.drawingCoordinates.length - 2];
            angle = Math.atan2(
                lastCoord[1] - prevCoord[1],
                lastCoord[0] - prevCoord[0]
            );
        }

        const endJunctionCoord = [
            lastCoord[0] + Math.cos(angle) * LINK_LENGTH,
            lastCoord[1] + Math.sin(angle) * LINK_LENGTH,
        ];

        const endJunction = this.createJunction(endJunctionCoord);

        const midPoint = [
            (lastCoord[0] + endJunctionCoord[0]) / 2,
            (lastCoord[1] + endJunctionCoord[1]) / 2,
        ];

        const link = new Feature({
            geometry: new Point(midPoint)
        });

        const store = useNetworkStore.getState();
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

        this.createVisualLinkLine(lastCoord, endJunctionCoord, linkId, linkType);

        store.updateNodeConnections(startJunction.getId() as string, linkId, "add");
        store.updateNodeConnections(endJunction.getId() as string, linkId, "add");

        if (this.startNode) {
            this.endNode = startJunction;
            this.createPipeSegment();
        }

        this.resetForNextSegment(endJunction);

        return endJunction;
    }

    public addLinkWhileDrawing(linkType: 'pump' | 'valve'): Feature {
        if (!this.isDrawingMode || this.drawingCoordinates.length === 0) {
            throw new Error("Cannot add link - not drawing");
        }

        const store = useNetworkStore.getState();
        const lastCoord = this.drawingCoordinates[this.drawingCoordinates.length - 1];

        // First, complete the current pipe segment if we have a start node
        let actualStartJunction: Feature;

        if (this.startNode && this.drawingCoordinates.length >= 2) {
            // Create junction at the last drawing coordinate
            actualStartJunction = this.createJunction(lastCoord);

            // Create pipe from startNode to this junction
            const pipe = this.createPipe(
                this.drawingCoordinates,
                this.startNode,
                actualStartJunction
            );

            // Clear preview
            if (this.previewLine) {
                this.vectorSource.removeFeature(this.previewLine);
                this.previewLine = null;
            }

            this.vertexMarkers.forEach(m => this.vectorSource.removeFeature(m));
            this.vertexMarkers = [];
        } else {
            // No previous pipe, just create start junction at current position
            actualStartJunction = this.createJunction(lastCoord);
        }

        // Calculate link direction
        const LINK_LENGTH = 1;
        let angle = 0;

        if (this.drawingCoordinates.length >= 2) {
            const prevCoord = this.drawingCoordinates[this.drawingCoordinates.length - 2];
            angle = Math.atan2(
                lastCoord[1] - prevCoord[1],
                lastCoord[0] - prevCoord[0]
            );
        }

        // Create end junction (1 meter away)
        const endJunctionCoord = [
            lastCoord[0] + Math.cos(angle) * LINK_LENGTH,
            lastCoord[1] + Math.sin(angle) * LINK_LENGTH,
        ];

        const endJunction = this.createJunction(endJunctionCoord);

        // Create the link at midpoint
        const midPoint = [
            (lastCoord[0] + endJunctionCoord[0]) / 2,
            (lastCoord[1] + endJunctionCoord[1]) / 2,
        ];

        const link = new Feature({
            geometry: new Point(midPoint)
        });

        const linkId = store.generateUniqueId(linkType);

        link.setId(linkId);
        link.set("type", linkType);
        link.set("isNew", true);
        link.setProperties({
            ...COMPONENT_TYPES[linkType].defaultProperties,
            label: `${COMPONENT_TYPES[linkType].name}-${linkId}`,
            startNodeId: actualStartJunction.getId(),
            endNodeId: endJunction.getId(),
        });

        this.vectorSource.addFeature(link);
        store.addFeature(link);

        // Create visual link line
        this.createVisualLinkLine(lastCoord, endJunctionCoord, linkId, linkType);

        // Update connections
        store.updateNodeConnections(actualStartJunction.getId() as string, linkId, "add");
        store.updateNodeConnections(endJunction.getId() as string, linkId, "add");

        // Reset for next segment from end junction
        this.startNode = endJunction;
        this.endNode = null;
        this.drawingCoordinates = [endJunctionCoord];
        this.addVertexMarker(endJunctionCoord);

        this.showHelpMessage(`${linkType.toUpperCase()} added | Continue drawing from end junction`);

        return endJunction;
    }


    // ============================================
    // PRIVATE METHODS
    // ============================================

    private createPipeSegment() {
        if (!this.startNode || !this.endNode) return;

        // Validate pipe length
        const pipeLength = this.calculatePipeLength(new LineString(this.drawingCoordinates));

        if (pipeLength < this.MIN_PIPE_LENGTH) {
            console.warn(`⚠️ Pipe too short: ${pipeLength.toFixed(2)}m (min: ${this.MIN_PIPE_LENGTH}m)`);
            this.showHelpMessage(`⚠️ Pipe too short. Minimum ${this.MIN_PIPE_LENGTH}m.`);

            // Reset without creating pipe
            this.drawingCoordinates = [];
            this.startNode = null;
            this.endNode = null;
            this.vertexMarkers.forEach(m => this.vectorSource.removeFeature(m));
            this.vertexMarkers = [];
            if (this.previewLine) {
                this.vectorSource.removeFeature(this.previewLine);
                this.previewLine = null;
            }
            return;
        }

        // Validate coordinates
        if (this.drawingCoordinates.length < 2) {
            console.error("❌ Not enough coordinates");
            return;
        }

        // Check for duplicate coordinates
        const uniqueCoords = this.drawingCoordinates.filter((coord, index, self) => {
            return index === 0 || this.distance(coord, self[index - 1]) > 0.01;
        });

        if (uniqueCoords.length < 2) {
            console.error("❌ All coordinates are the same");
            return;
        }

        // Clear preview and markers
        if (this.previewLine) {
            this.vectorSource.removeFeature(this.previewLine);
            this.previewLine = null;
        }

        this.vertexMarkers.forEach(m => this.vectorSource.removeFeature(m));
        this.vertexMarkers = [];

        this.createPipe(
            // this.drawingCoordinates,
            uniqueCoords,
            this.startNode,
            this.endNode
        );
    }

    private resetForNextSegment(newStartNode: Feature) {
        const newStartCoord = (newStartNode.getGeometry() as Point).getCoordinates();

        this.startNode = newStartNode;
        this.endNode = null;
        this.drawingCoordinates = [newStartCoord];

        this.addVertexMarker(newStartCoord);
        this.showHelpMessage(`Continue from ${newStartNode.get('label')} | Right-click to add junction | Double-click to finish`);
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
            label: `J-${id}`,
        });
        feature.set("connectedLinks", []);

        this.vectorSource.addFeature(feature);
        store.addFeature(feature);

        return feature;
    }

    private createVisualLinkLine(
        startCoord: number[],
        endCoord: number[],
        linkId: string,
        linkType: 'pump' | 'valve'
    ) {
        const visualLine = new Feature({
            geometry: new LineString([startCoord, endCoord]),
        });

        visualLine.set('isVisualLink', true);
        visualLine.set('parentLinkId', linkId);
        visualLine.set('linkType', linkType);

        const color = linkType === 'pump' ? '#F59E0B' : '#EC4899';

        visualLine.setStyle(new Style({
            stroke: new Stroke({
                color: color,
                width: 3,
                lineDash: [8, 4],
            }),
            zIndex: 99,
        }));

        this.vectorSource.addFeature(visualLine);
    }

    private findPipeSegmentAtPoint(
        geometry: LineString,
        point: number[]
    ): { angle: number; segmentIndex: number; pointOnSegment: number[] } {
        const coords = geometry.getCoordinates();

        let closestSegmentIndex = 0;
        let minDistance = Infinity;
        let closestPointOnSegment: number[] = point;

        for (let i = 0; i < coords.length - 1; i++) {
            const segment = new LineString([coords[i], coords[i + 1]]);
            const pointOnSegment = segment.getClosestPoint(point);
            const distance = this.distance(pointOnSegment, point);

            if (distance < minDistance) {
                minDistance = distance;
                closestSegmentIndex = i;
                closestPointOnSegment = pointOnSegment;
            }
        }

        const p1 = coords[closestSegmentIndex];
        const p2 = coords[closestSegmentIndex + 1];
        const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);

        return {
            angle,
            segmentIndex: closestSegmentIndex,
            pointOnSegment: closestPointOnSegment
        };
    }

    private insertPointsInPipe(
        originalCoords: number[][],
        segmentIndex: number,
        point1: number[],
        point2: number[]
    ): { firstPipeCoords: number[][]; secondPipeCoords: number[][] } {
        const firstPipeCoords = [
            ...originalCoords.slice(0, segmentIndex + 1),
            point1,
        ];

        const secondPipeCoords = [
            point2,
            ...originalCoords.slice(segmentIndex + 1),
        ];

        return { firstPipeCoords, secondPipeCoords };
    }

    private splitPipe(
        pipeFeature: Feature,
        splitPointFeature: Feature
    ): {
        splitedPipes: Feature[];
    } | null {
        const pipeCoordinates = (pipeFeature.getGeometry() as LineString).getCoordinates();
        const splitCoord = (splitPointFeature.getGeometry() as Point).getCoordinates();

        const pipeGeometry = pipeFeature.getGeometry() as LineString;
        const closestPoint = pipeGeometry.getClosestPoint(splitCoord);

        (splitPointFeature.getGeometry() as Point).setCoordinates(closestPoint);

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
            return null;
        }

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
            return null;
        }

        const line1 = new Feature({ geometry: new LineString(firstLineCoords) });
        const line2 = new Feature({ geometry: new LineString(secondLineCoords) });

        return {
            splitedPipes: [line1, line2],
        };
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

        return feature;
    }

    private setupClickHandlers() {
        this.clickHandler = this.handleClick.bind(this);
        this.pointerMoveHandler = this.handlePointerMove.bind(this);
        this.doubleClickHandler = this.handleDoubleClick.bind(this);

        this.map.on("singleclick", this.clickHandler);
        this.map.on("pointermove", this.pointerMoveHandler);
        this.map.on("dblclick", this.doubleClickHandler);

        this.escKeyHandler = (e: KeyboardEvent) => {
            if (e.key === "Escape" && this.isDrawingMode) {
                this.cancelCurrentPipe();
                this.stopDrawing();
            }
        };
        document.addEventListener("keydown", this.escKeyHandler);

        this.map.getInteractions().forEach(interaction => {
            if (interaction.constructor.name === 'DoubleClickZoom') {
                interaction.setActive(false);
            }
        });
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

        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
        }

        this.clickTimeout = setTimeout(() => {
            this.processClick(event);
        }, 250);
    }

    private processClick(event: any) {
        const coordinate = event.coordinate;
        const existingNode = this.findNodeAtCoordinate(coordinate);

        // FIRST CLICK
        if (this.drawingCoordinates.length === 0) {
            if (existingNode) {
                this.startNode = existingNode;
                this.drawingCoordinates.push((existingNode.getGeometry() as Point).getCoordinates());
                this.addVertexMarker(this.drawingCoordinates[0]);
                this.showHelpMessage(`Drawing from ${existingNode.get('label')} | Click to add vertices | Double-click to finish`);
            } else {
                this.showHelpMessage("⚠️ Click on a node to start");
            }
            return;
        }

        // SUBSEQUENT CLICKS
        if (this.drawingCoordinates.length >= this.MAX_VERTICES) {
            this.showHelpMessage(`⚠️ Maximum ${this.MAX_VERTICES} vertices reached. Double-click to finish.`);
            return;
        }

        // Check if clicking on the same node as start (prevent zero-length pipe)
        if (existingNode && existingNode.getId() === this.startNode?.getId()) {
            this.showHelpMessage("⚠️ Cannot create pipe to the same node");
            return;
        }

        if (existingNode) {
            const nodeCoord = (existingNode.getGeometry() as Point).getCoordinates();
            // Check if it's too close to last coordinate
            const lastCoord = this.drawingCoordinates[this.drawingCoordinates.length - 1];

            const distance = this.distance(lastCoord, nodeCoord);

            if (distance < this.MIN_PIPE_LENGTH) {
                this.showHelpMessage(`⚠️ Distance too short (${distance.toFixed(2)}m). Minimum ${this.MIN_PIPE_LENGTH}m.`);
                return;
            }

            this.drawingCoordinates.push(nodeCoord);
            this.endNode = existingNode;
            this.addVertexMarker(nodeCoord);

        } else {
            // Adding intermediate vertex
            const lastCoord = this.drawingCoordinates[this.drawingCoordinates.length - 1];
            const distance = this.distance(lastCoord, coordinate);

            // Prevent very short segments
            if (distance < 0.1) { // 0.1 meter minimum for vertices
                return; // Ignore very small movements
            }

            this.drawingCoordinates.push(coordinate);
            this.addVertexMarker(coordinate);
        }
    }

    private handlePointerMove(event: any) {
        if (!this.isDrawingMode || this.drawingCoordinates.length === 0) {
            return;
        }

        if (this.previewLine) {
            this.vectorSource.removeFeature(this.previewLine);
        }

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
            zIndex: 150,
        }));

        this.previewLine.set("isPreview", true);
        this.vectorSource.addFeature(this.previewLine);
    }

    private handleDoubleClick(event: any) {
        if (!this.isDrawingMode) return;

        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = null;
        }

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

        const totalLength = this.calculatePipeLength(
            new LineString(this.drawingCoordinates)
        );

        if (totalLength < this.MIN_PIPE_LENGTH) {
            this.showHelpMessage(`⚠️ Pipe too short (${totalLength.toFixed(2)}m). Minimum ${this.MIN_PIPE_LENGTH}m.`);
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
                stroke: new Stroke({ color: "#FFFFFF", width: 2 }),
            }),
        }));
        marker.set("isVertexMarker", true);
        this.vectorSource.addFeature(marker);
        this.vertexMarkers.push(marker);
    }

    private showHelpMessage(message: string) {
        if (this.helpMessageTimeout) {
            clearTimeout(this.helpMessageTimeout);
        }

        this.hideHelpMessage();

        const el = document.createElement("div");
        el.style.cssText = `
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: linear-gradient(135deg, #1FB8CD, #0891A6);
            color: white; padding: 12px 24px; border-radius: 8px;
            font-size: 14px; font-weight: 500; z-index: 10000;
            box-shadow: 0 4px 16px rgba(31,184,205,0.4);
            transition: opacity 0.3s;
        `;
        el.textContent = message;
        document.body.appendChild(el);
        this.helpOverlay = new Overlay({ element: el, stopEvent: false });

        this.helpMessageTimeout = setTimeout(() => {
            if (el) {
                el.style.opacity = '0';
                setTimeout(() => this.hideHelpMessage(), 300);
            }
        }, 3000);
    }

    private hideHelpMessage() {
        if (this.helpMessageTimeout) {
            clearTimeout(this.helpMessageTimeout);
            this.helpMessageTimeout = null;
        }

        if (this.helpOverlay?.getElement()) {
            this.helpOverlay.getElement()?.remove();
            this.helpOverlay = null;
        }
    }
}