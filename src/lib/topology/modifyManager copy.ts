import { Feature } from 'ol';
import Map from 'ol/Map';
import { click, never } from 'ol/events/condition';
import { Modify, Select } from 'ol/interaction';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { Point, LineString } from 'ol/geom';
import { ModifyEvent } from 'ol/interaction/Modify';

import { getVertexStyle, VertexStyles } from '@/lib/styles/vertexStyles';
import { LinkModifyManager } from './linkModifyManager';

export class ModifyManager {
    private map: Map;
    private vectorSource: VectorSource;
    private modifyInteraction: Modify | null = null;
    private selectInteraction: Select | null = null;
    private vertexLayer: VectorLayer<VectorSource> | null = null;
    private linkModifyManager: LinkModifyManager;
    private linkSelectInteraction: Select | null = null;
    private modifyStartCoordinates: Record<string, number[]> = {};
    private isMovingLinkSystem: boolean = false;

    constructor(map: Map, vectorSource: VectorSource) {
        this.map = map;
        this.vectorSource = vectorSource;
        this.linkModifyManager = new LinkModifyManager(map, vectorSource);
    }

    public startModifying() {
        if (this.modifyInteraction) {
            return;
        }

        this.selectInteraction = new Select({
            condition: click,
            style: (feature) => this.getModifySelectionStyle(feature as Feature),
            filter: (feature) => {
                const type = feature.get('type');

                if (feature.get('isPreview') ||
                    feature.get('isVertexMarker') ||
                    feature.get('isVisualLink')) {
                    return false;
                }

                if (type === 'pump' || type === 'valve') {
                    return false;
                }

                return true;
            },
        });

        this.map.addInteraction(this.selectInteraction);

        // Create modify interaction with custom delete condition
        this.modifyInteraction = new Modify({
            features: this.selectInteraction.getFeatures(),
            style: (feature) => this.getVertexStyleForFeature(feature as Feature),
            pixelTolerance: 10,
            deleteCondition: never, // Disable delete with Alt+Click for now
        });

        this.modifyInteraction.on('modifystart', (event: ModifyEvent) => {
            this.modifyStartCoordinates = {};
            this.isMovingLinkSystem = false;

            const features = event.features.getArray();

            // Check if we're trying to modify a junction connected to a link
            const junctionFeature = features.find(f => f.get('type') === 'junction');

            if (junctionFeature) {
                const connectedLink = this.getConnectedLink(junctionFeature);

                if (connectedLink) {
                    // We're moving a link junction - need to move entire system
                    this.isMovingLinkSystem = true;

                    // Store original coordinates for ALL features in the link system
                    const linkSystem = this.getLinkSystemFeatures(connectedLink);
                    linkSystem.forEach(feature => {
                        const geometry = feature.getGeometry();
                        if (geometry && geometry.getType() === 'Point') {
                            const coord = (geometry as Point).getCoordinates();
                            this.modifyStartCoordinates[feature.getId() as string] = [...coord];
                        }
                    });
                }
            }

            // Store coordinates for all selected features
            features.forEach((feature) => {
                const geometry = feature.getGeometry();
                if (geometry && geometry.getType() === 'Point') {
                    const coord = (geometry as Point).getCoordinates();
                    this.modifyStartCoordinates[feature.getId() as string] = [...coord];
                }
            });
        });

        // Listen to modify events in real-time
        this.modifyInteraction.on('modifying', (event: any) => {
            if (this.isMovingLinkSystem) {
                const features = event.features.getArray();
                const junctionFeature = features.find((f: Feature) => f.get('type') === 'junction');

                if (junctionFeature) {
                    this.handleLinkSystemMoving(junctionFeature);
                }
            }
        });

        this.modifyInteraction.on('modifyend', (event: ModifyEvent) => {
            const features = event.features.getArray();

            features.forEach((feature) => {
                const type = feature.get('type');

                if (type === 'pipe') {
                    const geometry = feature.getGeometry();
                    if (geometry) {
                        const length = this.calculateLength(geometry as LineString);
                        feature.set('length', length);
                    }
                }
            });

            this.modifyStartCoordinates = {};
            this.isMovingLinkSystem = false;
            this.vectorSource.changed();
        });

        this.map.addInteraction(this.modifyInteraction);
        this.setupLinkModification();
        this.map.getViewport().style.cursor = 'crosshair';
    }

    /**
     * Get all features that are part of the link system
     */
    private getLinkSystemFeatures(link: Feature): Feature[] {
        const startNodeId = link.get('startNodeId');
        const endNodeId = link.get('endNodeId');
        const features = this.vectorSource.getFeatures();

        const startJunction = features.find(f => f.getId() === startNodeId);
        const endJunction = features.find(f => f.getId() === endNodeId);

        const systemFeatures = [link];
        if (startJunction) systemFeatures.push(startJunction);
        if (endJunction) systemFeatures.push(endJunction);

        return systemFeatures;
    }

    /**
     * Handle moving the entire link system while dragging
     */
    private handleLinkSystemMoving(movedJunction: Feature) {
        const junctionId = movedJunction.getId() as string;
        const newCoord = (movedJunction.getGeometry() as Point).getCoordinates();
        const oldCoord = this.modifyStartCoordinates[junctionId];

        if (!oldCoord) return;

        const dx = newCoord[0] - oldCoord[0];
        const dy = newCoord[1] - oldCoord[1];

        const connectedLink = this.getConnectedLink(movedJunction);
        if (!connectedLink) return;

        const linkId = connectedLink.getId() as string;
        const movedJunctionId = movedJunction.getId() as string;

        const startNodeId = connectedLink.get('startNodeId');
        const endNodeId = connectedLink.get('endNodeId');

        const features = this.vectorSource.getFeatures();
        const startJunction = features.find(f => f.getId() === startNodeId);
        const endJunction = features.find(f => f.getId() === endNodeId);

        if (!startJunction || !endJunction) return;

        // Move the link
        const linkOldCoord = this.modifyStartCoordinates[linkId];
        if (linkOldCoord) {
            const linkGeometry = connectedLink.getGeometry() as Point;
            linkGeometry.setCoordinates([linkOldCoord[0] + dx, linkOldCoord[1] + dy]);
        }

        // Move the other junction
        const otherJunction = movedJunctionId === startNodeId ? endJunction : startJunction;
        const otherJunctionId = otherJunction.getId() as string;
        const otherOldCoord = this.modifyStartCoordinates[otherJunctionId];

        if (otherOldCoord) {
            const otherGeometry = otherJunction.getGeometry() as Point;
            otherGeometry.setCoordinates([otherOldCoord[0] + dx, otherOldCoord[1] + dy]);
        }

        // Update visual link line
        const newStartCoord = (startJunction.getGeometry() as Point).getCoordinates();
        const newEndCoord = (endJunction.getGeometry() as Point).getCoordinates();
        this.updateVisualLinkLine(linkId, newStartCoord, newEndCoord);

        // Update connected pipes
        this.updatePipesConnectedToJunction(startJunction, newStartCoord);
        this.updatePipesConnectedToJunction(endJunction, newEndCoord);
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
                coords[0] = newCoord;
                geometry.setCoordinates(coords);
                feature.set('length', this.calculateLength(geometry));
            } else if (endNodeId === junctionId) {
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
        this.linkSelectInteraction = new Select({
            condition: click,
            style: (feature) => this.getLinkSelectionStyle(feature as Feature),
            filter: (feature) => {
                const type = feature.get('type');
                return type === 'pump' || type === 'valve';
            },
        });

        this.map.addInteraction(this.linkSelectInteraction);

        this.linkSelectInteraction.on('select', (event) => {
            if (this.selectInteraction && event.selected.length > 0) {
                this.selectInteraction.getFeatures().clear();
            }

            if (event.selected.length > 0) {
                const link = event.selected[0];
                this.linkModifyManager.enableLinkDragging(link);
            } else {
                this.linkModifyManager.cleanup();
            }
        });

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

        if (type === 'LineString') {
            const coords = (geometry as any).getCoordinates();
            const vertexCoordinates = (feature.getGeometry() as any).getCoordinates();
            const vertexIndex = coords.findIndex((coord: number[]) =>
                coord[0] === vertexCoordinates[0] && coord[1] === vertexCoordinates[1]
            );

            if (vertexIndex === 0 || vertexIndex === coords.length - 1) {
                return getVertexStyle({ isEndpoint: true });
            }

            return getVertexStyle({});
        }

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

    private calculateLength(geometry: LineString): number {
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
        this.isMovingLinkSystem = false;
        this.map.getViewport().style.cursor = 'default';
    }
}
