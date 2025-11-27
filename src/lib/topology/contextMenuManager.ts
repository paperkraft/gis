import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';

import { COMPONENT_TYPES, SNAPPING_TOLERANCE } from '@/constants/networkComponents';
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
        this.contextMenuElement.style.cssText = `
            position: absolute;
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

        this.currentPipe = this.findPipeAtCoordinate(this.currentCoordinate as number[]);

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
            const screenX = rect.left + pixel[0];
            const screenY = rect.top + pixel[1];

            this.showContextMenu(screenX, screenY);
        }
    }

    private showContextMenu(x: number, y: number) {
        if (!this.contextMenuElement) return;

        this.contextMenuElement.innerHTML = '';

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

        if (this.isDrawingMode && !this.currentPipe) {
            // DRAWING MODE - Add components
            header.textContent = 'Add Component';
            this.contextMenuElement.appendChild(header);
            this.buildDrawingMenu();

        } else if (this.currentPipe) {
            // ON PIPE - Insert/vertex options
            header.textContent = 'Pipe Actions';
            this.contextMenuElement.appendChild(header);
            this.buildPipeMenu();

        } else {
            return;
        }

        this.contextMenuElement.style.left = `${x}px`;
        this.contextMenuElement.style.top = `${y}px`;
        this.contextMenuElement.style.display = 'block';

        // Get menu dimensions
        const menuRect = this.contextMenuElement.getBoundingClientRect();
        const menuWidth = menuRect.width;
        const menuHeight = menuRect.height;

        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Calculate available space
        const spaceRight = viewportWidth - x;
        const spaceBottom = viewportHeight - y;
        const spaceLeft = x;
        const spaceTop = y;

        let finalX = x;
        let finalY = y;

        // Adjust horizontal position
        if (spaceRight < menuWidth && spaceLeft > menuWidth) {
            // Not enough space on right, but enough on left
            finalX = x - menuWidth;
        } else if (spaceRight < menuWidth && spaceLeft < menuWidth) {
            // Not enough space on either side, align to viewport edge
            finalX = Math.max(10, viewportWidth - menuWidth - 10);
        }

        // Adjust vertical position
        if (spaceBottom < menuHeight && spaceTop > menuHeight) {
            // Not enough space below, but enough above
            finalY = y - menuHeight;
        } else if (spaceBottom < menuHeight && spaceTop < menuHeight) {
            // Not enough space above or below
            // Position to fit in viewport with max height
            if (spaceBottom > spaceTop) {
                // More space below
                finalY = y;
                this.contextMenuElement.style.maxHeight = `${spaceBottom - 10}px`;
                this.contextMenuElement.style.overflowY = 'auto';
            } else {
                // More space above
                finalY = 10;
                this.contextMenuElement.style.maxHeight = `${spaceTop - 10}px`;
                this.contextMenuElement.style.overflowY = 'auto';
            }
        }

        // Apply final position
        this.contextMenuElement.style.left = `${finalX}px`;
        this.contextMenuElement.style.top = `${finalY}px`;
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

        // INSERT COMPONENTS
        this.addSectionHeader('Insert Component');

        this.addPipeInsertMenuItem('Junction', 'junction', () => {
            if (this.currentPipe && this.currentCoordinate) {
                this.insertNodeOnPipe('junction');
            }
        });

        this.addPipeInsertMenuItem('Tank', 'tank', () => {
            if (this.currentPipe && this.currentCoordinate) {
                this.insertNodeOnPipe('tank');
            }
        });

        this.addPipeInsertMenuItem('Reservoir', 'reservoir', () => {
            if (this.currentPipe && this.currentCoordinate) {
                this.insertNodeOnPipe('reservoir');
            }
        });

        // LINKS
        this.addSectionHeader('Insert Link');

        this.addPipeInsertMenuItem('Pump', 'pump', () => {
            if (this.currentPipe && this.currentCoordinate) {
                this.insertLinkOnPipe('pump');
            }
        });

        this.addPipeInsertMenuItem('Valve', 'valve', () => {
            if (this.currentPipe && this.currentCoordinate) {
                this.insertLinkOnPipe('valve');
            }
        });
    }

    // ============================================
    // ADD COMPONENT WHILE DRAWING
    // ============================================

    private addComponentWhileDrawing(componentType: FeatureType) {
        if (!this.pipeDrawingManager || !this.currentCoordinate) return;

        const component = this.createComponent(componentType, this.currentCoordinate);


        // const existingPipe = this.findPipeAtCoordinate(this.currentCoordinate);

        // let component: Feature;

        // if (existingPipe && this.pipeDrawingManager) {
        //     component = this.pipeDrawingManager.insertNodeOnPipe(
        //         existingPipe,
        //         this.currentCoordinate,
        //         componentType
        //     );
        // } else {
        //     component = this.createComponent(componentType, this.currentCoordinate);
        // }

        this.hideContextMenu();

        // Connect to drawing
        if (this.onComponentPlaced && component) {
            this.onComponentPlaced(component);
        }
    }

    private addLinkWhileDrawing(linkType: 'pump' | 'valve') {
        if (!this.pipeDrawingManager) return;
        this.pipeDrawingManager.addLinkWhileDrawing(linkType);
        this.hideContextMenu();
    }

    // ============================================
    // INSERT ON PIPE
    // ============================================

    private insertNodeOnPipe(nodeType: FeatureType) {
        if (!this.currentCoordinate || !this.currentPipe || !this.pipeDrawingManager) {
            console.error('❌ Missing data');
            return;
        }

        this.pipeDrawingManager.insertNodeOnPipe(
            this.currentPipe,
            this.currentCoordinate,
            nodeType
        );

        this.hideContextMenu();
    }

    private insertLinkOnPipe(linkType: 'pump' | 'valve') {
        if (!this.currentCoordinate || !this.currentPipe || !this.pipeDrawingManager) {
            console.error('❌ Missing data');
            return;
        }

        this.pipeDrawingManager.insertLinkOnPipe(
            this.currentPipe,
            this.currentCoordinate,
            linkType
        );

        this.hideContextMenu();
    }

    // ============================================
    // VERTEX OPERATIONS
    // ============================================

    private addVertexToPipe() {
        if (!this.currentPipe || !this.currentCoordinate) return;

        const geometry = this.currentPipe.getGeometry() as LineString;
        const coordinates = geometry.getCoordinates();

        // Find the closest point on the line and the segment it belongs to
        const closestPoint = geometry.getClosestPoint(this.currentCoordinate);
        let insertIndex = -1;
        let minDistance = Infinity;

        // Find which segment to insert into
        for (let i = 0; i < coordinates.length - 1; i++) {
            const segment = new LineString([coordinates[i], coordinates[i + 1]]);
            const pointOnSegment = segment.getClosestPoint(closestPoint);
            const distance = this.distance(pointOnSegment, closestPoint);

            if (distance < minDistance) {
                minDistance = distance;
                insertIndex = i + 1; // Insert after point i
            }
        }

        if (insertIndex === -1) {
            console.error('❌ Could not find insertion point');
            this.hideContextMenu();
            return;
        }

        // Insert the new vertex
        const newCoordinates = [
            ...coordinates.slice(0, insertIndex),
            closestPoint,
            ...coordinates.slice(insertIndex),
        ];

        geometry.setCoordinates(newCoordinates);

        // Update feature
        const store = useNetworkStore.getState();
        store.updateFeature(this.currentPipe.getId() as string, this.currentPipe);

        // Recalculate length
        this.currentPipe.set('length', this.calculatePipeLength(geometry));

        // Refresh
        this.vectorSource.changed();

        this.hideContextMenu();
    }

    private deleteVertexFromPipe() {
        if (!this.currentPipe || this.nearestVertexIndex < 0) return;

        const geometry = this.currentPipe.getGeometry() as LineString;
        const coordinates = geometry.getCoordinates();

        if (coordinates.length <= 2) {
            console.error('❌ Cannot delete - pipe needs at least 2 vertices');
            this.hideContextMenu();
            return;
        }

        // Remove the vertex
        const newCoordinates = coordinates.filter((_, index) => index !== this.nearestVertexIndex);

        geometry.setCoordinates(newCoordinates);

        // Update feature
        const store = useNetworkStore.getState();
        // store.updateFeature(this.currentPipe);

        // Recalculate length
        this.currentPipe.set('length', this.calculatePipeLength(geometry));

        // Refresh
        this.vectorSource.changed();

        this.hideContextMenu();
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

        // Create temporary vertex marker
        import('ol/Feature').then(({ default: Feature }) => {
            import('ol/geom/Point').then(({ default: Point }) => {
                const vertexMarker = new Feature({
                    geometry: new Point(vertexCoord),
                });

                vertexMarker.setStyle(getVertexStyle({ isDeletable: true }));
                vertexMarker.set('isVertexMarker', true);

                this.vectorSource.addFeature(vertexMarker);

                // Store reference to remove later
                this.map.set('hoveredVertexMarker', vertexMarker);
            });
        });
    }

    private removeVertexMarker() {
        if (this.vertexMarker) {
            this.vectorSource.removeFeature(this.vertexMarker);
            this.vertexMarker = null;
        }
    }

    // ============================================
    // DRAWING MENU - All Components
    // ============================================

    private buildDrawingMenu() {
        // NODES
        this.addSectionHeader('Nodes');
        this.addComponentMenuItem('junction', () => this.addComponentWhileDrawing('junction'));
        this.addComponentMenuItem('tank', () => this.addComponentWhileDrawing('tank'));
        this.addComponentMenuItem('reservoir', () => this.addComponentWhileDrawing('reservoir'));

        // LINKS
        // this.addSectionHeader('Links');
        // this.addComponentMenuItem('pump', () => this.addComponentWhileDrawing('pump'));
        // this.addComponentMenuItem('valve', () => this.addComponentWhileDrawing('valve'));

        this.addSectionHeader('Links');
        this.addComponentMenuItem('pump', () => this.addLinkWhileDrawing('pump'));
        this.addComponentMenuItem('valve', () => this.addLinkWhileDrawing('valve'));

    }

    // ============================================
    // MENU ITEMS
    // ============================================

    private addMenuItem(label: string, icon: string, description: string, onClick: () => void) {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 10px 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: background 0.2s;
        `;

        item.innerHTML = `
            <div style="font-size: 18px; width: 20px; text-align: center;">${icon}</div>
            <div style="flex: 1;">
                <div style="font-size: 14px; color: #333; font-weight: 500;">${label}</div>
                <div style="font-size: 11px; color: #666; margin-top: 2px;">${description}</div>
            </div>
        `;

        item.addEventListener('mouseenter', () => item.style.background = '#f5f5f5');
        item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });

        this.contextMenuElement!.appendChild(item);
    }

    private addSectionHeader(title: string) {
        const section = document.createElement('div');
        section.style.cssText = `
            padding: 6px 16px;
            font-size: 11px;
            color: #999;
            font-weight: 500;
            margin-top: 4px;
        `;
        section.textContent = title;
        this.contextMenuElement!.appendChild(section);
    }

    private addComponentMenuItem(type: FeatureType | 'pump' | 'valve', onClick: () => void) {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 10px 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: background 0.2s;
        `;

        const config = COMPONENT_TYPES[type];
        const isLink = type === 'pump' || type === 'valve';

        item.innerHTML = `
            <div style="
                width: 12px; 
                height: 12px; 
                border-radius: ${isLink ? '2px' : '50%'}; 
                background: ${config.color};
            "></div>
            <span style="font-size: 14px; color: #333; font-weight: 500;">${config.name}</span>
        `;

        item.addEventListener('mouseenter', () => item.style.background = '#f5f5f5');
        item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });

        this.contextMenuElement!.appendChild(item);
    }

    private addPipeInsertMenuItem(label: string, type: string, onClick: () => void) {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 10px 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: background 0.2s;
        `;

        const config = COMPONENT_TYPES[type];
        const isLink = type === 'pump' || type === 'valve';

        item.innerHTML = `
            <div style="
                width: 12px; 
                height: 12px; 
                border-radius: ${isLink ? '2px' : '50%'}; 
                background: ${config.color};
            "></div>
            <span style="font-size: 14px; color: #333; font-weight: 500;">Insert ${label}</span>
            <span style="margin-left: auto; font-size: 11px; color: #999;">Split pipe</span>
        `;

        item.addEventListener('mouseenter', () => item.style.background = '#f5f5f5');
        item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });

        this.contextMenuElement!.appendChild(item);
    }

    private hideContextMenu() {
        if (this.contextMenuElement) {
            this.contextMenuElement.style.display = 'none';
            this.contextMenuElement.style.maxHeight = '';
            this.contextMenuElement.style.overflowY = '';

        }
        // Remove vertex marker
        const marker = this.map.get('hoveredVertexMarker');
        if (marker) {
            this.vectorSource.removeFeature(marker);
            this.map.unset('hoveredVertexMarker');
        }

        this.removeVertexMarker();

        this.currentPipe = null;
        this.nearestVertexIndex = -1;
    }

    // ============================================
    // COMPONENT CREATION
    // ============================================

    private createComponent(componentType: FeatureType, coordinate: number[]): Feature {
        const feature = new Feature({
            geometry: new Point(coordinate),
        });

        const store = useNetworkStore.getState();
        const id = store.generateUniqueId(componentType);

        feature.setId(id);
        feature.set('type', componentType);
        feature.set('isNew', true);
        feature.setProperties({
            ...COMPONENT_TYPES[componentType].defaultProperties,
            label: `${COMPONENT_TYPES[componentType].name}-${id}`,
        });
        feature.set('connectedLinks', []);

        this.vectorSource.addFeature(feature);
        store.addFeature(feature);

        return feature;
    }

    private createLinkWithJunctions(
        linkType: 'pump' | 'valve',
        existingPipe: Feature | null
    ): Feature {
        const store = useNetworkStore.getState();

        if (existingPipe && this.pipeDrawingManager) {
            // Insert on pipe - split and create link
            const result = this.pipeDrawingManager.insertLinkOnPipe(
                existingPipe,
                this.currentCoordinate!,
                linkType
            );
            return result.link;
        } else {
            // Standalone link with 2 junctions
            const linkLength = 50;
            const startCoord = [
                this.currentCoordinate![0] - linkLength / 2,
                this.currentCoordinate![1]
            ];
            const endCoord = [
                this.currentCoordinate![0] + linkLength / 2,
                this.currentCoordinate![1]
            ];

            // Create junctions
            const startJunction = this.createComponent('junction', startCoord);
            const endJunction = this.createComponent('junction', endCoord);

            // Create link
            const link = new Feature({
                geometry: new Point(this.currentCoordinate!),
            });
            const linkId = store.generateUniqueId(linkType);
            link.setId(linkId);
            link.set('type', linkType);
            link.set('isNew', true);
            link.setProperties({
                ...COMPONENT_TYPES[linkType].defaultProperties,
                label: `${COMPONENT_TYPES[linkType].name}-${linkId}`,
                startNodeId: startJunction.getId(),
                endNodeId: endJunction.getId(),
            });

            this.vectorSource.addFeature(link);
            store.addFeature(link);

            store.updateNodeConnections(startJunction.getId() as string, linkId, 'add');
            store.updateNodeConnections(endJunction.getId() as string, linkId, 'add');

            // Return start junction for drawing continuation
            return startJunction;
        }
    }

    // ============================================
    // UTILITIES
    // ============================================

    private findPipeAtCoordinate(coordinate: number[]): Feature | null {
        const pixel = this.map.getPixelFromCoordinate(coordinate);
        const features = this.vectorSource.getFeatures();

        for (const f of features) {
            if (f.get("type") !== "pipe") continue;

            const geom = f.getGeometry() as LineString;
            if (!geom) continue;

            const closestPoint = geom.getClosestPoint(coordinate);
            const closestPixel = this.map.getPixelFromCoordinate(closestPoint);
            const dist = Math.sqrt(
                (pixel[0] - closestPixel[0]) ** 2 +
                (pixel[1] - closestPixel[1]) ** 2
            );

            if (dist <= SNAPPING_TOLERANCE) {
                return f;
            }
        }

        return null;
    }

    private calculatePipeLength(geometry: LineString): number {
        const coords = geometry.getCoordinates();
        let length = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            length += this.distance(coords[i], coords[i + 1]);
        }
        return Math.round(length);
    }

    private distance(p1: number[], p2: number[]): number {
        return Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2);
    }

    // ============================================
    // PUBLIC API
    // ============================================

    public setComponentPlacedCallback(callback: (component: Feature) => void) {
        this.onComponentPlaced = callback;
    }

    public setPipeDrawingManager(manager: any) {
        this.pipeDrawingManager = manager;
    }

    public setDrawingMode(isDrawing: boolean) {
        this.isDrawingMode = isDrawing;
    }

    public cleanup() {
        if (this.contextMenuElement) {
            this.contextMenuElement.remove();
            this.contextMenuElement = null;
        }
    }
}
