import { Feature } from 'ol';
import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import { Point, LineString } from 'ol/geom';

import { COMPONENT_TYPES, SNAPPING_TOLERANCE } from '@/constants/networkComponents';
import { useNetworkStore } from '@/store/networkStore';
import { FeatureType } from '@/types/network';

export class ContextMenuManager {
    private map: Map;
    private vectorSource: VectorSource;
    private contextMenuElement: HTMLDivElement | null = null;
    private currentCoordinate: number[] | null = null;
    private currentPipe: Feature | null = null;
    private onComponentPlaced?: (component: Feature) => void;
    private pipeDrawingManager?: any;
    private isDrawingMode: boolean = false;


    constructor(map: Map, vectorSource: VectorSource) {
        this.map = map;
        this.vectorSource = vectorSource;
        this.initContextMenu();
        console.log('✅ ContextMenuManager initialized');
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

        document.body.appendChild(this.contextMenuElement);

        this.map.on('contextmenu' as any, (evt: any) => {
            evt.preventDefault();
            this.handleContextMenu(evt);
        });

        document.addEventListener('click', () => this.hideContextMenu());
    }

    private handleContextMenu(evt: any) {
        this.currentCoordinate = evt.coordinate;

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🖱️ Right-click');
        console.log('  Drawing mode:', this.isDrawingMode);

        this.currentPipe = this.findPipeAtCoordinate(this.currentCoordinate as number[]);
        console.log('  On pipe:', this.currentPipe?.getId() || 'none');

        const pixel = evt.pixel;
        const mapElement = this.map.getTargetElement();

        if (mapElement) {
            const rect = mapElement.getBoundingClientRect();
            const screenX = rect.left + pixel[0];
            const screenY = rect.top + pixel[1];

            this.showContextMenu(screenX, screenY);
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
            // DRAWING MODE - Add all components
            header.textContent = 'Add Component';
            this.contextMenuElement.appendChild(header);
            this.buildDrawingMenu();

        } else if (this.currentPipe) {
            // ON PIPE - Insert options
            header.textContent = 'Insert on Pipe';
            this.contextMenuElement.appendChild(header);
            this.buildPipeMenu();

        } else {
            // No menu
            return;
        }

        this.contextMenuElement.style.left = `${x}px`;
        this.contextMenuElement.style.top = `${y}px`;
        this.contextMenuElement.style.display = 'block';
    }

    // ============================================
    // DRAWING MENU - All Components
    // ============================================

    private buildDrawingMenu() {
        console.log('📋 Building drawing menu');

        // NODES
        this.addSectionHeader('Nodes');
        this.addComponentMenuItem('junction', () => this.addComponentWhileDrawing('junction'));
        this.addComponentMenuItem('tank', () => this.addComponentWhileDrawing('tank'));
        this.addComponentMenuItem('reservoir', () => this.addComponentWhileDrawing('reservoir'));

        // LINKS
        this.addSectionHeader('Links');
        this.addComponentMenuItem('pump', () => this.addComponentWhileDrawing('pump'));
        this.addComponentMenuItem('valve', () => this.addComponentWhileDrawing('valve'));
    }

    // ============================================
    // PIPE MENU - Insert Options
    // ============================================

    private buildPipeMenu() {
        console.log('📋 Building pipe menu');

        this.addSectionHeader('Insert Component');

        // Nodes
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

        // Links
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
    // MENU ITEMS
    // ============================================

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
        }
        this.currentPipe = null;
    }

    // ============================================
    // ADD COMPONENT WHILE DRAWING
    // ============================================

    private addComponentWhileDrawing(componentType: FeatureType | 'pump' | 'valve') {
        if (!this.currentCoordinate) return;

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🔵 Adding ${componentType} while drawing`);

        const existingPipe = this.findPipeAtCoordinate(this.currentCoordinate);

        let component: Feature;

        if (componentType === 'pump' || componentType === 'valve') {
            // LINK component
            component = this.createLinkWithJunctions(componentType, existingPipe);
        } else {
            // NODE component
            if (existingPipe && this.pipeDrawingManager) {
                console.log('  On existing pipe - will split');
                component = this.pipeDrawingManager.insertNodeOnPipe(
                    existingPipe,
                    this.currentCoordinate,
                    componentType
                );
            } else {
                console.log('  Standalone component');
                component = this.createComponent(componentType, this.currentCoordinate);
            }
        }

        this.hideContextMenu();

        // Connect to drawing
        if (this.onComponentPlaced && component) {
            console.log('  🔗 Connecting to drawing');
            requestAnimationFrame(() => {
                if (this.onComponentPlaced) {
                    this.onComponentPlaced(component);
                    console.log('  ✅ Connected');
                }
            });
        }

        console.log('✅ Component added');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    // ============================================
    // INSERT ON PIPE
    // ============================================

    private insertNodeOnPipe(nodeType: FeatureType) {
        if (!this.currentCoordinate || !this.currentPipe || !this.pipeDrawingManager) {
            console.error('❌ Missing data');
            return;
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🔵 Inserting ${nodeType} on pipe`);

        this.pipeDrawingManager.insertNodeOnPipe(
            this.currentPipe,
            this.currentCoordinate,
            nodeType
        );

        console.log('✅ Node inserted');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        this.hideContextMenu();
    }

    private insertLinkOnPipe(linkType: 'pump' | 'valve') {
        if (!this.currentCoordinate || !this.currentPipe || !this.pipeDrawingManager) {
            console.error('❌ Missing data');
            return;
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🔵 Inserting ${linkType} on pipe`);

        this.pipeDrawingManager.insertLinkOnPipe(
            this.currentPipe,
            this.currentCoordinate,
            linkType
        );

        console.log('✅ Link inserted');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        this.hideContextMenu();
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

        console.log(`  ✓ ${componentType} created:`, id);
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

            console.log(`  ✓ Link with junctions created:`, linkId);

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
