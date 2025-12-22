import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';

import { COMPONENT_TYPES } from '@/constants/networkComponents';
import { useNetworkStore } from '@/store/networkStore';
import { FeatureType } from '@/types/network';

import { getVertexStyle } from '../styles/vertexStyles';

export class ContextMenuManager {
    private map: Map;
    private vectorSource: VectorSource;
    private contextMenuElement: HTMLDivElement | null = null;
    private currentCoordinate: number[] | null = null;
    private currentPipe: Feature | null = null;
    private onComponentPlaced?: (component: Feature) => void;
    private pipeDrawingManager?: any;
    private isDrawingMode: boolean = false;
    private nearestVertexIndex: number = -1;
    private vertexMarker: Feature | null = null;


    constructor(map: Map, vectorSource: VectorSource) {
        this.map = map;
        this.vectorSource = vectorSource;
        this.initContextMenu();
    }

    private initContextMenu() {
        this.contextMenuElement = document.createElement('div');
        this.contextMenuElement.className = 'ol-context-menu';
        // Updated to fixed position for easier viewport calculations
        this.contextMenuElement.style.cssText = `
            position: fixed;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 8px 0;
            z-index: 10000;
            min-width: 220px;
            display: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        // Add custom scrollbar styles
        const style = document.createElement('style');
        style.textContent = `
            .ol-context-menu::-webkit-scrollbar {
                width: 8px;
            }
            .ol-context-menu::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 4px;
            }
            .ol-context-menu::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 4px;
            }
            .ol-context-menu::-webkit-scrollbar-thumb:hover {
                background: #555;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(this.contextMenuElement);

        this.map.on('contextmenu' as any, (evt: any) => {
            evt.preventDefault();
            this.handleContextMenu(evt);
        });

        document.addEventListener('click', () => this.hideContextMenu());
    }

    private handleContextMenu(evt: any) {
        this.currentCoordinate = evt.coordinate;
        // Remove previous vertex marker if exists
        this.removeVertexMarker();

        this.currentPipe = this.findPipeAtPixel(evt.pixel);

        // Check if near vertex
        if (this.currentPipe) {
            this.nearestVertexIndex = this.findNearestVertexIndex(
                this.currentPipe,
                this.currentCoordinate as number[]
            );

            // Highlight the vertex if near one
            if (this.nearestVertexIndex >= 0) {
                this.highlightNearestVertex();
            }
        }

        const pixel = evt.pixel;
        const mapElement = this.map.getTargetElement();

        if (mapElement) {
            const rect = mapElement.getBoundingClientRect();
            // Calculate screen coordinates relative to viewport
            const screenX = rect.left + pixel[0];
            const screenY = rect.top + pixel[1];

            this.showContextMenu(screenX, screenY);
        }
    }

    private findPipeAtPixel(pixel: number[]): Feature | null {
        const feature = this.map.forEachFeatureAtPixel(pixel, f => f as Feature, {
            hitTolerance: 5,
            layerFilter: l => l.get('name') === 'network'
        });
        if (feature && feature.get('type') === 'pipe' && !feature.get('isPreview') && !feature.get('isVisualLink')) return feature;
        return null;
    }

    private showContextMenu(x: number, y: number) {
        if (!this.contextMenuElement) return;

        // 1. Reset content and prepare for measurement
        this.contextMenuElement.innerHTML = '';
        this.contextMenuElement.style.display = 'block';
        this.contextMenuElement.style.visibility = 'hidden'; // Hide while calculating
        this.contextMenuElement.style.maxHeight = ''; // Reset height constraints
        this.contextMenuElement.style.overflowY = '';

        const header = document.createElement('div');
        header.style.cssText = `
            padding: 8px 16px;
            font-size: 12px;
            color: #666;
            border-bottom: 1px solid #eee;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;

        let hasContent = false;

        if (this.isDrawingMode && !this.currentPipe) {
            // DRAWING MODE - Add components
            header.textContent = 'Add Component';
            this.contextMenuElement.appendChild(header);
            this.buildDrawingMenu();
            hasContent = true;

        } else if (this.currentPipe) {
            // ON PIPE - Insert/vertex options
            header.textContent = 'Pipe Actions';
            this.contextMenuElement.appendChild(header);
            this.buildPipeMenu();
            hasContent = true;
        }

        if (!hasContent) {
            this.contextMenuElement.style.display = 'none';
            return;
        }

        // 2. Measure Dimensions
        const menuWidth = this.contextMenuElement.offsetWidth;
        const menuHeight = this.contextMenuElement.offsetHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // 3. Calculate Position (Flip Logic)
        let left = x;
        let top = y;

        // Flip to left if it overflows right edge
        if (x + menuWidth > viewportWidth) {
            left = x - menuWidth;
        }

        // Flip up if it overflows bottom edge
        if (y + menuHeight > viewportHeight) {
            top = y - menuHeight;
        }

        // 4. Clamp (Safety Logic)
        // Ensure it doesn't go off the top/left edge
        if (left < 10) left = 10;
        if (top < 10) top = 10;

        // Ensure it doesn't go off bottom/right after clamping
        if (left + menuWidth > viewportWidth) left = viewportWidth - menuWidth - 10;

        // Handle height constraints if screen is too short
        if (top + menuHeight > viewportHeight) {
            top = 10;
            const availableHeight = viewportHeight - 20;
            this.contextMenuElement.style.maxHeight = `${availableHeight}px`;
            this.contextMenuElement.style.overflowY = 'auto';
        }

        // 5. Apply Final Position
        this.contextMenuElement.style.left = `${left}px`;
        this.contextMenuElement.style.top = `${top}px`;
        this.contextMenuElement.style.visibility = 'visible';
    }

    private buildPipeMenu() {
        // VERTEX OPERATIONS
        this.addSectionHeader('Vertex Operations');

        // Add Vertex
        this.addMenuItem('Add Vertex', '➕', 'Add a new vertex at this point', () => {
            this.addVertexToPipe();
        });

        // Delete Vertex (only if near a vertex)
        if (this.nearestVertexIndex >= 0) {
            const geometry = this.currentPipe!.getGeometry() as LineString;
            const coordinates = geometry.getCoordinates();

            // Can only delete if more than 2 vertices (need at least start and end)
            if (coordinates.length > 2) {
                this.addMenuItem('Delete Vertex', '🗑️', 'Remove this vertex', () => {
                    this.deleteVertexFromPipe();
                });
            }
        }

        this.addSectionHeader('Actions');
        this.addMenuItem('Reverse Direction', '🔁', 'Swap start and end nodes', () => {
            this.reversePipeDirection();
        });

        // INSERT COMPONENTS
        this.addSectionHeader('Nodes');
        this.addPipeInsertMenuItem('Junction', 'junction', () => this.insertNodeOnPipe('junction'));
        this.addPipeInsertMenuItem('Tank', 'tank', () => this.insertNodeOnPipe('tank'));
        this.addPipeInsertMenuItem('Reservoir', 'reservoir', () => this.insertNodeOnPipe('reservoir'));

        // LINKS
        this.addSectionHeader('Links');
        this.addPipeInsertMenuItem('Pump', 'pump', () => this.insertLinkOnPipe('pump'));
        this.addPipeInsertMenuItem('Valve', 'valve', () => this.insertLinkOnPipe('valve'));
    }

    // ============================================
    // DRAWING MENU
    // ============================================

    private buildDrawingMenu() {
        this.addSectionHeader('Nodes');
        this.addComponentMenuItem('junction', () => this.addComponentWhileDrawing('junction'));
        this.addComponentMenuItem('tank', () => this.addComponentWhileDrawing('tank'));
        this.addComponentMenuItem('reservoir', () => this.addComponentWhileDrawing('reservoir'));

        this.addSectionHeader('Links');
        this.addComponentMenuItem('pump', () => this.addLinkWhileDrawing('pump'));
        this.addComponentMenuItem('valve', () => this.addLinkWhileDrawing('valve'));
    }

    // ============================================
    // ACTIONS
    // ============================================

    private addComponentWhileDrawing(componentType: FeatureType) {
        if (!this.pipeDrawingManager || !this.currentCoordinate) return;
        // Use PipeDrawingManager's flow
        this.pipeDrawingManager.continueDrawingFromNode(
            this.createComponent(componentType, this.currentCoordinate)
        );
        this.hideContextMenu();
    }

    private addLinkWhileDrawing(linkType: 'pump' | 'valve') {
        if (!this.pipeDrawingManager) return;
        this.pipeDrawingManager.addLinkWhileDrawing(linkType, this.currentCoordinate);
        this.hideContextMenu();
    }

    private insertNodeOnPipe(nodeType: FeatureType) {
        if (!this.currentCoordinate || !this.currentPipe || !this.pipeDrawingManager) return;
        this.pipeDrawingManager.insertNodeOnPipe(
            this.currentPipe,
            this.currentCoordinate,
            nodeType
        );
        this.hideContextMenu();
    }

    private insertLinkOnPipe(linkType: 'pump' | 'valve') {
        if (!this.currentCoordinate || !this.currentPipe || !this.pipeDrawingManager) return;
        this.pipeDrawingManager.insertLinkOnPipe(
            this.currentPipe,
            this.currentCoordinate,
            linkType
        );
        this.hideContextMenu();
    }

    // --- NEW REVERSE FUNCTION ---
    private reversePipeDirection() {
        if (!this.currentPipe) return;

        const store = useNetworkStore.getState();
        const pipeId = this.currentPipe.getId() as string;

        // 1. Swap Start/End IDs
        const startNodeId = this.currentPipe.get('startNodeId');
        const endNodeId = this.currentPipe.get('endNodeId');

        // 2. Reverse Geometry Coordinates
        const geometry = this.currentPipe.getGeometry() as LineString;
        const coordinates = geometry.getCoordinates().reverse();
        geometry.setCoordinates(coordinates);

        // 3. Update Store
        // This triggers 'updateFeature', which now adds the ID to 'modifiedIds'
        store.updateFeature(pipeId, {
            startNodeId: endNodeId,
            endNodeId: startNodeId,
            // (Optional) If you track vertices in properties, update them too
        });

        // 4. Force map refresh & hide menu
        this.vectorSource.changed();
        this.hideContextMenu();

        // Safety check: Explicitly mark modified if updateFeature logic is ever bypassed
        store.markModified(pipeId);
    }

    // ============================================
    // VERTEX OPERATIONS
    // ============================================

    private addVertexToPipe() {
        if (!this.currentPipe || !this.currentCoordinate) return;

        const geometry = this.currentPipe.getGeometry() as LineString;
        const coordinates = geometry.getCoordinates();
        const closestPoint = geometry.getClosestPoint(this.currentCoordinate);

        let insertIndex = -1;
        let minDistance = Infinity;

        for (let i = 0; i < coordinates.length - 1; i++) {
            const segment = new LineString([coordinates[i], coordinates[i + 1]]);
            const dist = this.distance(segment.getClosestPoint(closestPoint), closestPoint);
            // Check if on segment (using simple distance sum)
            const d1 = Math.sqrt(Math.pow(closestPoint[0] - coordinates[i][0], 2) + Math.pow(closestPoint[1] - coordinates[i][1], 2));
            const d2 = Math.sqrt(Math.pow(closestPoint[0] - coordinates[i + 1][0], 2) + Math.pow(closestPoint[1] - coordinates[i + 1][1], 2));
            const len = Math.sqrt(Math.pow(coordinates[i][0] - coordinates[i + 1][0], 2) + Math.pow(coordinates[i][1] - coordinates[i + 1][1], 2));

            if (Math.abs((d1 + d2) - len) < 0.1) {
                insertIndex = i + 1;
                break;
            }
        }

        if (insertIndex !== -1) {
            const newCoordinates = [
                ...coordinates.slice(0, insertIndex),
                closestPoint,
                ...coordinates.slice(insertIndex),
            ];
            geometry.setCoordinates(newCoordinates);

            // Update store
            const store = useNetworkStore.getState();
            store.updateFeature(this.currentPipe.getId() as string, {
                length: Math.round(geometry.getLength())
            });
            this.vectorSource.changed();
        }
        this.hideContextMenu();
    }

    private deleteVertexFromPipe() {
        if (!this.currentPipe || this.nearestVertexIndex < 0) return;

        const geometry = this.currentPipe.getGeometry() as LineString;
        const coordinates = geometry.getCoordinates();

        if (coordinates.length <= 2) return;

        const newCoordinates = coordinates.filter((_, index) => index !== this.nearestVertexIndex);
        geometry.setCoordinates(newCoordinates);

        const store = useNetworkStore.getState();
        store.updateFeature(this.currentPipe.getId() as string, {
            length: Math.round(geometry.getLength())
        });

        this.vectorSource.changed();
        this.hideContextMenu();
    }

    private distance(p1: number[], p2: number[]) {
        return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
    }

    private findNearestVertexIndex(pipe: Feature, coordinate: number[]): number {
        const geometry = pipe.getGeometry() as LineString;
        const coordinates = geometry.getCoordinates();
        const pixel = this.map.getPixelFromCoordinate(coordinate);

        let nearestIndex = -1;
        let minDistance = Infinity;
        const VERTEX_SNAP_DISTANCE = 15; // pixels

        coordinates.forEach((coord, index) => {
            const vertexPixel = this.map.getPixelFromCoordinate(coord);
            const distance = Math.sqrt(
                Math.pow(pixel[0] - vertexPixel[0], 2) +
                Math.pow(pixel[1] - vertexPixel[1], 2)
            );

            if (distance < minDistance && distance < VERTEX_SNAP_DISTANCE) {
                minDistance = distance;
                nearestIndex = index;
            }
        });

        return nearestIndex;
    }

    private highlightNearestVertex() {
        if (!this.currentPipe || this.nearestVertexIndex < 0) return;

        const geometry = this.currentPipe.getGeometry() as LineString;
        const coordinates = geometry.getCoordinates();
        const vertexCoord = coordinates[this.nearestVertexIndex];

        import('ol/Feature').then(({ default: Feature }) => {
            import('ol/geom/Point').then(({ default: Point }) => {
                const vertexMarker = new Feature({
                    geometry: new Point(vertexCoord),
                });

                vertexMarker.setStyle(getVertexStyle({ isDeletable: true }));
                vertexMarker.set('isVertexMarker', true);

                this.vectorSource.addFeature(vertexMarker);
                this.map.set('hoveredVertexMarker', vertexMarker);
            });
        });
    }

    private removeVertexMarker() {
        if (this.vertexMarker) {
            this.vectorSource.removeFeature(this.vertexMarker);
            this.vertexMarker = null;
        }
        const marker = this.map.get('hoveredVertexMarker');
        if (marker) {
            this.vectorSource.removeFeature(marker);
            this.map.unset('hoveredVertexMarker');
        }
    }

    // ============================================
    // MENU ITEM BUILDERS
    // ============================================

    private addMenuItem(label: string, icon: string, description: string, onClick: () => void) {
        const item = document.createElement('div');
        item.style.cssText = `padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.2s;`;
        item.innerHTML = `<div style="font-size: 18px; width: 20px; text-align: center;">${icon}</div><div style="flex: 1;"><div style="font-size: 14px; color: #333; font-weight: 500;">${label}</div></div>`;
        item.addEventListener('mouseenter', () => item.style.background = '#f5f5f5');
        item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        item.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
        this.contextMenuElement!.appendChild(item);
    }

    private addSectionHeader(title: string) {
        const section = document.createElement('div');
        section.style.cssText = `padding: 6px 16px; font-size: 11px; color: #999; font-weight: 500; margin-top: 4px;`;
        section.textContent = title;
        this.contextMenuElement!.appendChild(section);
    }

    private addComponentMenuItem(type: FeatureType | 'pump' | 'valve', onClick: () => void) {
        const item = document.createElement('div');
        item.style.cssText = `padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.2s;`;
        const config = COMPONENT_TYPES[type];
        const isLink = type === 'pump' || type === 'valve';
        item.innerHTML = `<div style="width: 12px; height: 12px; border-radius: ${isLink ? '2px' : '50%'}; background: ${config.color};"></div><span style="font-size: 14px; color: #333; font-weight: 500;">${config.name}</span>`;
        item.addEventListener('mouseenter', () => item.style.background = '#f5f5f5');
        item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        item.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
        this.contextMenuElement!.appendChild(item);
    }

    private addPipeInsertMenuItem(label: string, type: string, onClick: () => void) {
        const item = document.createElement('div');
        item.style.cssText = `padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.2s;`;
        const config = COMPONENT_TYPES[type];
        const isLink = type === 'pump' || type === 'valve';
        item.innerHTML = `<div style="width: 12px; height: 12px; border-radius: ${isLink ? '2px' : '50%'}; background: ${config.color};"></div><span style="font-size: 14px; color: #333; font-weight: 500;">Insert ${label}</span>`;
        item.addEventListener('mouseenter', () => item.style.background = '#f5f5f5');
        item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        item.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
        this.contextMenuElement!.appendChild(item);
    }

    private hideContextMenu() {
        if (this.contextMenuElement) {
            this.contextMenuElement.style.display = 'none';
        }
        this.removeVertexMarker();
        this.currentPipe = null;
        this.nearestVertexIndex = -1;
    }

    // --- HELPER CREATION ---
    private createComponent(componentType: FeatureType, coordinate: number[]): Feature {
        const feature = new Feature({ geometry: new Point(coordinate) });
        const store = useNetworkStore.getState();
        const id = store.generateUniqueId(componentType);
        feature.setId(id);
        feature.setProperties({ ...COMPONENT_TYPES[componentType].defaultProperties, type: componentType, isNew: true, id: id, label: id, connectedLinks: [] });
        this.vectorSource.addFeature(feature);
        store.addFeature(feature);
        return feature;
    }

    private calculatePipeLength(geometry: LineString): number {
        return Math.round(geometry.getLength());
    }

    // PUBLIC API
    public setComponentPlacedCallback(callback: (component: Feature) => void) { this.onComponentPlaced = callback; }
    public setPipeDrawingManager(manager: any) { this.pipeDrawingManager = manager; }
    public setDrawingMode(isDrawing: boolean) { this.isDrawingMode = isDrawing; }
    public cleanup() { if (this.contextMenuElement) this.contextMenuElement.remove(); }
}