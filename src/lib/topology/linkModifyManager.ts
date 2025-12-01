import { Map } from 'ol';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { useNetworkStore } from '@/store/networkStore';

export class LinkModifyManager {
    private map: Map;
    private vectorSource: VectorSource;
    private isDragging: boolean = false;
    private draggedLink: Feature | null = null;
    private startJunction: Feature | null = null;
    private endJunction: Feature | null = null;
    private connectedPipes: { pipe: Feature; isStart: boolean }[] = [];
    private initialCoordinate: number[] | null = null;
    private pointerMoveHandler: ((event: any) => void) | null = null;
    private pointerUpHandler: ((event: any) => void) | null = null;

    constructor(map: Map, vectorSource: VectorSource) {
        this.map = map;
        this.vectorSource = vectorSource;
    }

    public enableLinkDragging(link: Feature) {
        const linkType = link.get('type');

        if (linkType !== 'pump' && linkType !== 'valve') {
            return;
        }

        this.draggedLink = link;
        this.isDragging = false;

        // Get junctions
        const startNodeId = link.get('startNodeId');
        const endNodeId = link.get('endNodeId');

        const features = this.vectorSource.getFeatures();
        this.startJunction = features.find(f => f.getId() === startNodeId) || null;
        this.endJunction = features.find(f => f.getId() === endNodeId) || null;

        if (!this.startJunction || !this.endJunction) {
            console.error('❌ Cannot find junctions for link');
            return;
        }

        // Get all connected pipes to both junctions
        this.connectedPipes = this.getConnectedPipes(this.startJunction, this.endJunction);

        // Store initial position
        const linkGeometry = link.getGeometry() as Point;
        this.initialCoordinate = linkGeometry.getCoordinates();

        // Setup drag handlers
        this.setupDragHandlers();

        this.map.getViewport().style.cursor = 'grab';
    }

    private getConnectedPipes(startJunction: Feature, endJunction: Feature): { pipe: Feature; isStart: boolean }[] {
        const pipes: { pipe: Feature; isStart: boolean }[] = [];
        const features = this.vectorSource.getFeatures();

        const startJunctionId = startJunction.getId();
        const endJunctionId = endJunction.getId();

        features.forEach(feature => {
            if (feature.get('type') !== 'pipe') return;
            if (feature.get('isVisualLink')) return;

            const pipeStartNode = feature.get('startNodeId');
            const pipeEndNode = feature.get('endNodeId');

            // Check if pipe connects to start junction
            if (pipeEndNode === startJunctionId) {
                pipes.push({ pipe: feature, isStart: true }); // Pipe ends at start junction
            }

            // Check if pipe connects to end junction
            if (pipeStartNode === endJunctionId) {
                pipes.push({ pipe: feature, isStart: false }); // Pipe starts at end junction
            }
        });

        return pipes;
    }

    private setupDragHandlers() {
        this.pointerMoveHandler = (event: any) => {
            if (!this.draggedLink) return;

            if (!this.isDragging && event.dragging) {
                window.dispatchEvent(new CustomEvent('takeSnapshot'));

                this.isDragging = true;
                this.map.getViewport().style.cursor = 'grabbing';
            }

            if (this.isDragging) {
                this.handleDrag(event.coordinate);
            }
        };

        this.pointerUpHandler = () => {
            if (this.isDragging) {
                this.finishDrag();
            }
        };

        this.map.on('pointermove', this.pointerMoveHandler);
        this.map.on('pointerup' as any, this.pointerUpHandler);
    }

    private handleDrag(newCoordinate: number[]) {
        if (!this.draggedLink || !this.startJunction || !this.endJunction || !this.initialCoordinate) {
            return;
        }

        // Calculate offset
        const dx = newCoordinate[0] - this.initialCoordinate[0];
        const dy = newCoordinate[1] - this.initialCoordinate[1];

        // Move link
        const linkGeometry = this.draggedLink.getGeometry() as Point;
        linkGeometry.setCoordinates(newCoordinate);

        // Get current junction positions
        const startJunctionGeometry = this.startJunction.getGeometry() as Point;
        const endJunctionGeometry = this.endJunction.getGeometry() as Point;

        const oldStartCoord = startJunctionGeometry.getCoordinates();
        const oldEndCoord = endJunctionGeometry.getCoordinates();

        // Calculate new junction positions
        const newStartCoord = [oldStartCoord[0] + dx, oldStartCoord[1] + dy];
        const newEndCoord = [oldEndCoord[0] + dx, oldEndCoord[1] + dy];

        // Move junctions
        startJunctionGeometry.setCoordinates(newStartCoord);
        endJunctionGeometry.setCoordinates(newEndCoord);

        // Update connected pipes
        this.updateConnectedPipes(newStartCoord, newEndCoord);

        // Update visual link line
        this.updateVisualLinkLine(newStartCoord, newEndCoord);

        // Update initial coordinate for next move
        this.initialCoordinate = newCoordinate;

        // Trigger redraw
        this.vectorSource.changed();
    }

    private updateConnectedPipes(newStartJunctionCoord: number[], newEndJunctionCoord: number[]) {
        this.connectedPipes.forEach(({ pipe, isStart }) => {
            const pipeGeometry = pipe.getGeometry() as LineString;
            const coords = pipeGeometry.getCoordinates();

            if (isStart) {
                // Pipe ends at start junction - update last coordinate
                coords[coords.length - 1] = newStartJunctionCoord;
            } else {
                // Pipe starts at end junction - update first coordinate
                coords[0] = newEndJunctionCoord;
            }

            pipeGeometry.setCoordinates(coords);

            // Recalculate pipe length
            pipe.set('length', this.calculatePipeLength(pipeGeometry));
        });
    }

    private updateVisualLinkLine(startCoord: number[], endCoord: number[]) {
        if (!this.draggedLink) return;

        const linkId = this.draggedLink.getId();
        const features = this.vectorSource.getFeatures();

        // Find visual link line
        const visualLine = features.find(
            f => f.get('isVisualLink') && f.get('parentLinkId') === linkId
        );

        if (visualLine) {
            const lineGeometry = visualLine.getGeometry() as LineString;
            lineGeometry.setCoordinates([startCoord, endCoord]);
        }
    }

    private finishDrag() {
        this.isDragging = false;
        this.map.getViewport().style.cursor = 'default';

        // Update in store
        if (this.draggedLink) {
            const store = useNetworkStore.getState();
            store.updateFeature(this.draggedLink.getId() as string, this.draggedLink);

            if (this.startJunction) {
                store.updateFeature(this.startJunction.getId() as string, this.startJunction);
            }

            if (this.endJunction) {
                store.updateFeature(this.endJunction.getId() as string, this.endJunction);
            }

            // Update all connected pipes
            this.connectedPipes.forEach(({ pipe }) => {
                store.updateFeature(pipe.getId() as string, pipe);
            });
        }

        this.cleanup();
    }

    private calculatePipeLength(geometry: LineString): number {
        const coords = geometry.getCoordinates();
        let length = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            const dx = coords[i + 1][0] - coords[i][0];
            const dy = coords[i + 1][1] - coords[i][1];
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return Math.round(length * 100) / 100;
    }

    public cleanup() {
        if (this.pointerMoveHandler) {
            this.map.un('pointermove', this.pointerMoveHandler);
            this.pointerMoveHandler = null;
        }

        if (this.pointerUpHandler) {
            this.map.un('pointerup' as any, this.pointerUpHandler);
            this.pointerUpHandler = null;
        }

        this.draggedLink = null;
        this.startJunction = null;
        this.endJunction = null;
        this.connectedPipes = [];
        this.initialCoordinate = null;
        this.isDragging = false;
    }
}
