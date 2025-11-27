import { Feature, Map } from 'ol';
import { click } from 'ol/events/condition';
import { Modify, Select } from 'ol/interaction';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

import { getVertexStyle, VertexStyles } from '@/lib/styles/vertexStyles';
import { LinkModifyManager } from './linkModifyManager';
import { LineString, Point } from 'ol/geom';

export class ModifyManager {
    private map: Map;
    private vectorSource: VectorSource;
    private modifyInteraction: Modify | null = null;
    private selectInteraction: Select | null = null;
    private vertexLayer: VectorLayer<VectorSource> | null = null;
    private linkModifyManager: LinkModifyManager;
    private linkSelectInteraction: Select | null = null;
    private modifyStartCoordinates: Record<string, number[]> = {};

    constructor(map: Map, vectorSource: VectorSource) {
        this.map = map;
        this.vectorSource = vectorSource;
        this.linkModifyManager = new LinkModifyManager(map, vectorSource);
    }

    public startModifying() {
        if (this.modifyInteraction) {
            return;
        }

        // Create select interaction
        this.selectInteraction = new Select({
            condition: click,
            style: (feature) => this.getModifySelectionStyle(feature as Feature),
            filter: (feature) => {
                const type = feature.get('type');
                // Exclude preview, markers, and visual links
                if (feature.get('isPreview') ||
                    feature.get('isVertexMarker') ||
                    feature.get('isVisualLink')) {
                    return false;
                }

                // Exclude pump and valve
                if (type === 'pump' || type === 'valve') {
                    return false;
                }

                return true;
            },
        });

        this.map.addInteraction(this.selectInteraction);

        // Create modify interaction with custom vertex style
        this.modifyInteraction = new Modify({
            source: this.vectorSource,
            style: (feature) => this.getVertexStyleForFeature(feature as Feature),
            pixelTolerance: 10,
        });

        // Track original positions when modification starts
        this.modifyInteraction.on('modifystart', (event) => {
            this.modifyStartCoordinates = {};

            const features = event.features.getArray();
            features.forEach((feature) => {
                const geometry = feature.getGeometry();
                if (geometry && geometry.getType() === 'Point') {
                    const coord = (geometry as Point).getCoordinates();
                    this.modifyStartCoordinates[feature.getId() as string] = [...coord];
                }
            });
        });

        // Handle the modification
        this.modifyInteraction.on('modifyend', (event) => {
            const features = event.features.getArray();

            features.forEach((feature) => {
                const type = feature.get('type');

                // Update pipe length
                if (type === 'pipe') {
                    const geometry = feature.getGeometry();
                    if (geometry) {
                        const length = this.calculateLength(geometry as any);
                        feature.set('length', length);
                    }
                }

                // Handle junction movement
                if (type === 'junction') {
                    this.handleJunctionModification(feature);
                }
            });

            this.modifyStartCoordinates = {};
            this.vectorSource.changed();
        });


        this.map.addInteraction(this.modifyInteraction);
        this.setupLinkModification();

        this.map.getViewport().style.cursor = 'crosshair';
    }

    private handleJunctionModification(junction: Feature) {
        const junctionId = junction.getId() as string;
        const newCoord = (junction.getGeometry() as Point).getCoordinates();
        const oldCoord = this.modifyStartCoordinates[junctionId];

        if (!oldCoord) return;

        // Calculate offset
        const dx = newCoord[0] - oldCoord[0];
        const dy = newCoord[1] - oldCoord[1];

        // Check if this junction is connected to a pump/valve
        const connectedLink = this.getConnectedLink(junction);

        if (connectedLink) {
            // Move the entire link system
            this.moveLinkSystem(connectedLink, junction, dx, dy);
        }
    }

    private getConnectedLink(junction: Feature): Feature | null {
        const junctionId = junction.getId() as string;
        const features = this.vectorSource.getFeatures();

        return features.find(feature => {
            const type = feature.get('type');
            if (type !== 'pump' && type !== 'valve') {
                return false;
            }

            const startNodeId = feature.get('startNodeId');
            const endNodeId = feature.get('endNodeId');

            return startNodeId === junctionId || endNodeId === junctionId;
        }) || null;
    }

    private moveLinkSystem(link: Feature, movedJunction: Feature, dx: number, dy: number) {
        const linkId = link.getId() as string;
        const movedJunctionId = movedJunction.getId() as string;

        // Get both junctions
        const startNodeId = link.get('startNodeId');
        const endNodeId = link.get('endNodeId');

        const features = this.vectorSource.getFeatures();
        const startJunction = features.find(f => f.getId() === startNodeId);
        const endJunction = features.find(f => f.getId() === endNodeId);

        if (!startJunction || !endJunction) return;

        // Move the link
        const linkGeometry = link.getGeometry() as Point;
        const linkCoord = linkGeometry.getCoordinates();
        linkGeometry.setCoordinates([linkCoord[0] + dx, linkCoord[1] + dy]);

        // Move both junctions (the other one needs to move too)
        const otherJunction = movedJunctionId === startNodeId ? endJunction : startJunction;
        const otherGeometry = otherJunction.getGeometry() as Point;
        const otherCoord = otherGeometry.getCoordinates();
        otherGeometry.setCoordinates([otherCoord[0] + dx, otherCoord[1] + dy]);

        // Update visual link line
        const newStartCoord = (startJunction.getGeometry() as Point).getCoordinates();
        const newEndCoord = (endJunction.getGeometry() as Point).getCoordinates();
        this.updateVisualLinkLine(linkId, newStartCoord, newEndCoord);

        // Update connected pipes
        this.updatePipesConnectedToJunction(startJunction, newStartCoord);
        this.updatePipesConnectedToJunction(endJunction, newEndCoord);

        // Update in store
        import('@/store/networkStore').then(({ useNetworkStore }) => {
            const store = useNetworkStore.getState();
            // store.updateFeature(link);
            // store.updateFeature(startJunction);
            // store.updateFeature(endJunction);
        });
    }

    private updatePipesConnectedToJunction(junction: Feature, newCoord: number[]) {
        const junctionId = junction.getId() as string;
        const features = this.vectorSource.getFeatures();

        features.forEach(feature => {
            if (feature.get('type') !== 'pipe') return;
            if (feature.get('isVisualLink')) return;

            const startNodeId = feature.get('startNodeId');
            const endNodeId = feature.get('endNodeId');

            const geometry = feature.getGeometry() as LineString;
            const coords = geometry.getCoordinates();

            if (startNodeId === junctionId) {
                // Update first coordinate
                coords[0] = newCoord;
                geometry.setCoordinates(coords);
                feature.set('length', this.calculateLength(geometry));
            } else if (endNodeId === junctionId) {
                // Update last coordinate
                coords[coords.length - 1] = newCoord;
                geometry.setCoordinates(coords);
                feature.set('length', this.calculateLength(geometry));
            }
        });
    }

    private updateVisualLinkLine(linkId: string, startCoord: number[], endCoord: number[]) {
        const features = this.vectorSource.getFeatures();
        const visualLine = features.find(
            f => f.get('isVisualLink') && f.get('parentLinkId') === linkId
        );

        if (visualLine) {
            const lineGeometry = visualLine.getGeometry() as LineString;
            lineGeometry.setCoordinates([startCoord, endCoord]);
        }
    }

    private setupLinkModification() {
        // Create separate select interaction for links
        this.linkSelectInteraction = new Select({
            condition: click,
            style: (feature) => this.getLinkSelectionStyle(feature as Feature),
            filter: (feature) => {
                const type = feature.get('type');
                return type === 'pump' || type === 'valve';
            },
        });

        this.map.addInteraction(this.linkSelectInteraction);

        // When a link is selected, enable dragging
        this.linkSelectInteraction.on('select', (event) => {

            // Clear regular selection when link is selected
            if (this.selectInteraction && event.selected.length > 0) {
                this.selectInteraction.getFeatures().clear();
            }

            if (event.selected.length > 0) {
                const link = event.selected[0];
                this.linkModifyManager.enableLinkDragging(link);
            } else {
                // Deselected - cleanup
                this.linkModifyManager.cleanup();
            }
        });

        // Clear link selection when regular feature is selected
        if (this.selectInteraction) {
            this.selectInteraction.on('select', (event) => {
                if (this.linkSelectInteraction && event.selected.length > 0) {
                    this.linkSelectInteraction.getFeatures().clear();
                }
            });
        }

    }

    private getVertexStyleForFeature(feature: Feature): Style | Style[] {
        const geometry = feature.getGeometry();
        if (!geometry) return VertexStyles.default;

        const type = geometry.getType();

        // For LineString (pipes)
        if (type === 'LineString') {
            const coords = (geometry as any).getCoordinates();

            // Return function that styles each vertex based on index
            const vertexCoordinates = (feature.getGeometry() as any).getCoordinates();
            const vertexIndex = coords.findIndex((coord: number[]) =>
                coord[0] === vertexCoordinates[0] && coord[1] === vertexCoordinates[1]
            );

            // Endpoint vertices (start and end)
            if (vertexIndex === 0 || vertexIndex === coords.length - 1) {
                return getVertexStyle({ isEndpoint: true });
            }

            // Regular vertices
            return getVertexStyle({});
        }

        // For Point (nodes)
        if (type === 'Point') {
            return getVertexStyle({ isHighlighted: true });
        }

        return VertexStyles.default;
    }

    private getModifySelectionStyle(feature: Feature): Style {
        const type = feature.get('type');

        if (type === 'pipe') {
            return new Style({
                stroke: new Stroke({
                    color: '#10B981',
                    width: 5,
                }),
            });
        }

        return new Style({
            image: new CircleStyle({
                radius: 10,
                fill: new Fill({ color: '#10B981' }),
                stroke: new Stroke({ color: '#FFFFFF', width: 3 }),
            }),
        });
    }

    private getLinkSelectionStyle(feature: Feature): Style {
        const type = feature.get('type');
        const color = type === 'pump' ? '#F59E0B' : '#EC4899';

        return new Style({
            image: new CircleStyle({
                radius: 12,
                fill: new Fill({ color: color }),
                stroke: new Stroke({ color: '#FFFFFF', width: 3 }),
            }),
            zIndex: 200,
        });
    }

    private calculateLength(geometry: any): number {
        const coords = geometry.getCoordinates();
        let length = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            const dx = coords[i + 1][0] - coords[i][0];
            const dy = coords[i + 1][1] - coords[i][1];
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return Math.round(length);
    }

    public cleanup() {

        if (this.modifyInteraction) {
            this.map.removeInteraction(this.modifyInteraction);
            this.modifyInteraction = null;
        }

        if (this.selectInteraction) {
            this.map.removeInteraction(this.selectInteraction);
            this.selectInteraction = null;
        }

        if (this.linkSelectInteraction) {
            this.map.removeInteraction(this.linkSelectInteraction);
            this.linkSelectInteraction = null;
        }

        if (this.vertexLayer) {
            this.map.removeLayer(this.vertexLayer);
            this.vertexLayer = null;
        }

        this.linkModifyManager.cleanup();
        this.modifyStartCoordinates = {};
        this.map.getViewport().style.cursor = 'default';
    }
}
