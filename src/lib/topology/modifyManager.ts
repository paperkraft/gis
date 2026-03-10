import { Collection, Feature, Map } from 'ol';
import { click } from 'ol/events/condition';
import { LineString, Point } from 'ol/geom';
import { Modify, Select } from 'ol/interaction';
import { unByKey } from 'ol/Observable';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Style } from 'ol/style';

import { getVertexStyle, VertexStyles } from '@/lib/styles/vertexStyles';
import { getFeatureStyle } from '@/lib/styles/featureStyles';
import { useNetworkStore } from '@/store/networkStore';

import { getSelectedStyle } from '../styles/featureStyles';
import { LinkModifyManager } from './linkModifyManager';

export class ModifyManager {
    private map: Map;
    private vectorSource: VectorSource;
    private modifyInteraction: Modify | null = null;
    private selectInteraction: Select | null = null;
    private linkModifyManager: LinkModifyManager;

    private isModifying: boolean = false;
    private isPointerDown: boolean = false;

    private modifiableFeatures: Collection<Feature>;
    private boundPointerMoveHandler: (e: any) => void;
    private boundPointerDownHandler: (e: any) => void;
    private boundPointerUpHandler: (e: any) => void;

    private dragSource: VectorSource;
    private dragLayer: VectorLayer<any>;
    private activeDragFeatures: Feature[] = [];

    constructor(map: Map, vectorSource: VectorSource) {
        this.map = map;
        this.vectorSource = vectorSource;
        this.linkModifyManager = new LinkModifyManager(map, vectorSource);

        this.modifiableFeatures = new Collection<Feature>();
        this.boundPointerMoveHandler = this.handlePointerMove.bind(this);
        this.boundPointerDownHandler = () => { this.isPointerDown = true; };
        this.boundPointerUpHandler = () => { this.isPointerDown = false; };

        this.dragSource = new VectorSource();
        this.dragLayer = new VectorLayer({
            source: this.dragSource,
            zIndex: 100, // Topmost interaction layer
            style: (feature) => getFeatureStyle(feature as Feature<any>),
            declutter: false, // Disabling declutter makes it render instantly
            updateWhileAnimating: true,
            updateWhileInteracting: true
        });
        this.map.addLayer(this.dragLayer);
    }

    private getFeature(id: string): Feature | null {
        if (!id) return null;
        let f = this.vectorSource.getFeatureById(id);
        if (f) return f as Feature;
        f = this.dragSource.getFeatureById(id);
        if (f) return f as Feature;
        return null;
    }

    private setDragEnvironment(draggedFeatures: Feature[]) {
        const affected = new Set<Feature>();

        const addLink = (linkId: string) => {
            const link = this.getFeature(linkId);
            if (link) {
                affected.add(link);
                let visLine = this.getFeature(`VIS-${linkId}`);
                if (!visLine) {
                    visLine = this.vectorSource.getFeatures().find(
                        f => f.get('isVisualLink') && f.get('parentLinkId') === linkId
                    ) || null;
                }
                if (visLine) affected.add(visLine);
            }
        };

        const addNode = (nodeId: string) => {
            const node = this.getFeature(nodeId);
            if (node) {
                affected.add(node);
                const links = node.get('connectedLinks') as string[] || [];
                links.forEach(addLink);
            }
        };

        draggedFeatures.forEach(feature => {
            affected.add(feature);
            const type = feature.get('type');
            if (['junction', 'tank', 'reservoir'].includes(type)) {
                addNode(feature.getId() as string);
            } else if (['pipe', 'pump', 'valve'].includes(type)) {
                addLink(feature.getId() as string);
                addNode(feature.get('startNodeId'));
                addNode(feature.get('endNodeId'));
            }
        });

        this.activeDragFeatures = Array.from(affected);
        // Move to drag layer for fast rendering
        this.activeDragFeatures.forEach(f => {
            if (this.vectorSource.hasFeature(f)) {
                this.vectorSource.removeFeature(f);
                this.dragSource.addFeature(f);
            }
        });
    }

    private cleanupDragEnvironment() {
        this.activeDragFeatures.forEach(f => {
            if (this.dragSource.hasFeature(f)) {
                this.dragSource.removeFeature(f);
                this.vectorSource.addFeature(f);
            }
        });
        this.activeDragFeatures = [];
    }

    public startModifying() {
        if (this.modifyInteraction) return;

        // 1. Select Interaction (Visual only)
        this.selectInteraction = new Select({
            condition: click,
            style: (feature) => getSelectedStyle(feature as Feature),
            filter: (feature) => {
                const type = feature.get('type');
                return ['pipe', 'junction', 'tank', 'reservoir', 'pump', 'valve'].includes(type);
            },
        });
        this.map.addInteraction(this.selectInteraction);

        // 2. Modify Interaction (Linked to dynamic collection)
        this.modifyInteraction = new Modify({
            features: this.modifiableFeatures,
            style: (feature) => this.getVertexStyleForFeature(feature as Feature),
            pixelTolerance: 10,
        });

        // 4. Lifecycle Events
        this.modifyInteraction.on('modifystart', (event) => {
            this.isModifying = true;

            const store = useNetworkStore.getState();
            store.startTransaction();

            this.setDragEnvironment(event.features.getArray());

            try {
                event.features.forEach((feature) => {
                    feature.set('isModifying', true);
                    const geom = feature.getGeometry();
                    const type = feature.get('type');

                    if (['junction', 'tank', 'reservoir'].includes(type)) {
                        const key = geom?.on('change', () => {
                            this.rubberBandNode(feature as Feature);
                        });
                        if (key) feature.set('_modifyListenerKey', key);
                    }
                    else if (['pump', 'valve'].includes(type)) {
                        const key = geom?.on('change', () => {
                            this.rubberBandLink(feature as Feature);
                        });
                        if (key) feature.set('_modifyListenerKey', key);
                    }
                    else if (type === 'pipe') {
                        // Reverse Rubber-Banding: Dragging a pipe endpoint should move the underlying node
                        const key = geom?.on('change', () => {
                            this.rubberBandNodesFromPipe(feature as Feature);
                        });
                        if (key) feature.set('_modifyListenerKey', key);
                    }
                });

                store.commitTransaction();

            } catch (error) {
                this.cleanupDragEnvironment();
                store.commitTransaction();
                throw error;
            }
        });

        this.modifyInteraction.on('modifyend', (event) => {
            this.isModifying = false;
            this.isPointerDown = false;

            const store = useNetworkStore.getState();
            const modifiedIds: string[] = [];
            const updatesAccumulator: Record<string, any> = {};

            event.features.forEach((feature) => {
                feature.unset('isModifying');
                const key = feature.get('_modifyListenerKey');
                if (key) {
                    unByKey(key);
                    feature.unset('_modifyListenerKey');
                }

                const type = feature.get('type');
                const id = feature.getId() as string;

                // Capture final feature positions for Zustand
                if (!modifiedIds.includes(id)) modifiedIds.push(id);
                const finalGeom = feature.getGeometry();

                if (finalGeom) {
                    updatesAccumulator[id] = {
                        geometry: finalGeom
                    };
                }

                if (['junction', 'tank', 'reservoir'].includes(type)) {
                    this.rubberBandNode(feature as Feature, modifiedIds, updatesAccumulator);
                    this.checkForPipeSplit(feature as Feature);
                } else if (type === 'pump' || type === 'valve') {
                    this.rubberBandLink(feature as Feature, modifiedIds, updatesAccumulator);
                } else if (type === 'pipe') {
                    this.handlePipeMove(feature as Feature, updatesAccumulator);
                    this.rubberBandNodesFromPipe(feature as Feature, modifiedIds, updatesAccumulator);
                }
            });

            // Put them back in the main source
            this.cleanupDragEnvironment();

            if (Object.keys(updatesAccumulator).length > 0) {
                store.updateFeatures(updatesAccumulator);
            }

            store.markModified(modifiedIds);
            store.markUnSaved();
        });

        this.map.addInteraction(this.modifyInteraction);

        this.map.on('pointermove', this.boundPointerMoveHandler);
        this.map.on('pointerdown' as any, this.boundPointerDownHandler);
        this.map.on('pointerup' as any, this.boundPointerUpHandler);

        this.map.getViewport().style.cursor = 'move';
    }

    private handlePointerMove(event: any) {
        if (this.isModifying || this.isPointerDown) return;

        const pixel = this.map.getEventPixel(event.originalEvent);
        let bestFeature: Feature | null = null;
        let priority = 0; // 0 = none, 1 = pipe, 2 = node, 3 = device

        this.map.forEachFeatureAtPixel(pixel, (feature, layer) => {
            if (priority === 3) return; // Max priority already found

            const type = feature.get('type');
            if (['pump', 'valve'].includes(type)) {
                if (priority < 3) {
                    bestFeature = feature as Feature;
                    priority = 3;
                }
            } else if (['junction', 'tank', 'reservoir'].includes(type)) {
                if (priority < 2) {
                    bestFeature = feature as Feature;
                    priority = 2;
                }
            } else if (type === 'pipe') {
                if (priority < 1) {
                    bestFeature = feature as Feature;
                    priority = 1;
                }
            }
        }, {
            hitTolerance: 10
        });

        if (bestFeature) {
            const current = this.modifiableFeatures.getArray();
            if (current.length !== 1 || current[0] !== bestFeature) {
                this.modifiableFeatures.clear();
                this.modifiableFeatures.push(bestFeature);
                this.map.getViewport().style.cursor = 'move';
            }
            return;
        }

        // Clear if nothing found
        if (this.modifiableFeatures.getLength() > 0) {
            this.modifiableFeatures.clear();
            this.map.getViewport().style.cursor = 'move';
        }
    }

    private handlePipeMove(pipe: Feature, updatesAccumulator: Record<string, any>) {
        const id = pipe.getId() as string;
        const geom = pipe.getGeometry();

        if (!geom || !(geom instanceof LineString)) return;

        const newCoords = geom.getCoordinates();
        const newLength = Math.round(geom.getLength());
        pipe.set('length', newLength);

        updatesAccumulator[id] = {
            geometry: newCoords,
            length: newLength
        };
    }

    private rubberBandNodesFromPipe(pipe: Feature, modifiedIds?: string[], updatesAccumulator?: Record<string, any>) {
        const geom = pipe.getGeometry() as LineString;
        if (!geom) return;

        const coords = geom.getCoordinates();
        const startCoord = coords[0];
        const endCoord = coords[coords.length - 1];

        const startNodeId = pipe.get('startNodeId');
        const endNodeId = pipe.get('endNodeId');

        [
            { id: startNodeId, coord: startCoord },
            { id: endNodeId, coord: endCoord }
        ].forEach(({ id, coord }) => {
            if (!id) return;
            const node = this.getFeature(id);
            if (!node) return;

            const nodeGeom = node.getGeometry() as Point;
            const currentCoord = nodeGeom.getCoordinates();

            // Only update if the coordinate actually moved 
            if (currentCoord[0] !== coord[0] || currentCoord[1] !== coord[1]) {
                nodeGeom.setCoordinates(coord);
            }

            if (updatesAccumulator) {
                if (modifiedIds && !modifiedIds.includes(id as string)) {
                    modifiedIds.push(id as string);
                }
                updatesAccumulator[id as string] = {
                    geometry: coord
                };
            }
        });
    }

    private rubberBandNode(node: Feature, modifiedIds?: string[], updatesAccumulator?: Record<string, any>) {
        const nodeId = node.getId() as string;
        const newCoord = (node.getGeometry() as Point).getCoordinates();
        const connectedLinks = node.get('connectedLinks') as string[] || [];

        connectedLinks.forEach(linkId => {
            const link = this.getFeature(linkId);
            if (!link) return;

            const type = link.get('type');

            if (type === 'pipe') {
                const geom = link.getGeometry() as LineString;
                const coords = geom.getCoordinates();
                let isConnected = false;
                let coordsChanged = false;

                if (link.get('startNodeId') === nodeId) {
                    isConnected = true;
                    if (coords[0][0] !== newCoord[0] || coords[0][1] !== newCoord[1]) {
                        coords[0] = newCoord;
                        coordsChanged = true;
                    }
                } else if (link.get('endNodeId') === nodeId) {
                    isConnected = true;
                    if (coords[coords.length - 1][0] !== newCoord[0] || coords[coords.length - 1][1] !== newCoord[1]) {
                        coords[coords.length - 1] = newCoord;
                        coordsChanged = true;
                    }
                }

                if (coordsChanged) {
                    geom.setCoordinates([...coords]);
                    link.set('length', Math.round(geom.getLength()));
                }

                if (isConnected && updatesAccumulator) {
                    const newLen = Math.round(geom.getLength());
                    if (modifiedIds && !modifiedIds.includes(linkId)) modifiedIds.push(linkId);

                    updatesAccumulator[linkId] = {
                        geometry: geom.getCoordinates(),
                        length: newLen
                    };
                }
            } else if (type === 'pump' || type === 'valve') {
                this.rubberBandLinkVisual(link, nodeId, newCoord, modifiedIds, updatesAccumulator);
            }
        });
    }

    private rubberBandLink(link: Feature, modifiedIds?: string[], updatesAccumulator?: Record<string, any>) {
        const linkId = link.getId() as string;
        const newCoord = (link.getGeometry() as Point).getCoordinates();

        const visualId = `VIS-${linkId}`;
        let visualLine = this.getFeature(visualId);

        if (!visualLine) {
            visualLine = this.vectorSource.getFeatures().find(
                f => f.get('isVisualLink') && f.get('parentLinkId') === linkId
            ) || null;
            if (!visualLine) {
                visualLine = this.dragSource.getFeatures().find(
                    f => f.get('isVisualLink') && f.get('parentLinkId') === linkId
                ) || null;
            }
        }

        if (visualLine) {
            if (modifiedIds && !modifiedIds.includes(linkId)) modifiedIds.push(linkId);
            const lGeom = visualLine.getGeometry() as LineString;
            const lCoords = lGeom.getCoordinates();

            let midX, midY;
            if (lCoords.length >= 3) {
                midX = lCoords[1][0];
                midY = lCoords[1][1];
            } else if (lCoords.length === 2) {
                midX = (lCoords[0][0] + lCoords[1][0]) / 2;
                midY = (lCoords[0][1] + lCoords[1][1]) / 2;
            } else {
                return;
            }

            const dx = newCoord[0] - midX;
            const dy = newCoord[1] - midY;

            let newLCoords = lCoords;
            // Only move if significantly different
            if (Math.abs(dx) >= 1e-6 || Math.abs(dy) >= 1e-6) {
                newLCoords = lCoords.map(coord => [coord[0] + dx, coord[1] + dy]);
                lGeom.setCoordinates(newLCoords);
            }

            if (updatesAccumulator) {
                if (modifiedIds && !modifiedIds.includes(visualId)) modifiedIds.push(visualId);
                updatesAccumulator[visualId] = { geometry: newLCoords };
            }

            const moveNode = (nodeId: string, coord: number[]) => {
                const node = this.getFeature(nodeId);
                if (node) {
                    const nGeom = node.getGeometry() as Point;
                    const cCoord = nGeom.getCoordinates();
                    if (cCoord[0] !== coord[0] || cCoord[1] !== coord[1]) {
                        nGeom.setCoordinates(coord);
                    }

                    if (updatesAccumulator) {
                        if (modifiedIds && !modifiedIds.includes(nodeId)) {
                            modifiedIds.push(nodeId);
                        }
                        updatesAccumulator[nodeId] = { geometry: coord };
                    }
                    // Trigger pipe rubber-banding
                    this.rubberBandNode(node, modifiedIds, updatesAccumulator);
                }
            };

            const startNodeId = link.get('startNodeId');
            const endNodeId = link.get('endNodeId');

            if (startNodeId) moveNode(startNodeId as string, newLCoords[0]);
            if (endNodeId) moveNode(endNodeId as string, newLCoords[newLCoords.length - 1]);
        }
    }

    private rubberBandLinkVisual(component: Feature, movedNodeId: string, newCoord: number[], modifiedIds?: string[], updatesAccumulator?: Record<string, any>) {
        const linkId = component.getId() as string;
        const visualId = `VIS-${linkId}`;
        let visualLine = this.getFeature(visualId);

        if (!visualLine) {
            visualLine = this.vectorSource.getFeatures().find(
                f => f.get('isVisualLink') && f.get('parentLinkId') === linkId
            ) || null;
            if (!visualLine) {
                visualLine = this.dragSource.getFeatures().find(
                    f => f.get('isVisualLink') && f.get('parentLinkId') === linkId
                ) || null;
            }
        }

        if (visualLine) {
            if (modifiedIds) modifiedIds.push(linkId);
            const lGeom = visualLine.getGeometry() as LineString;
            const lCoords = [...lGeom.getCoordinates()];

            if (component.get('startNodeId') === movedNodeId) {
                lCoords[0] = [...newCoord];
            } else {
                lCoords[lCoords.length - 1] = [...newCoord];
            }

            lGeom.setCoordinates(lCoords);

            if (lCoords.length === 2) {
                if (!component.get('isModifying')) {
                    const componentGeom = component.getGeometry() as Point;
                    const compNewCoord = [
                        (lCoords[0][0] + lCoords[1][0]) / 2,
                        (lCoords[0][1] + lCoords[1][1]) / 2
                    ];
                    componentGeom.setCoordinates(compNewCoord);

                    if (updatesAccumulator) {
                        const compId = component.getId() as string;
                        if (modifiedIds && !modifiedIds.includes(compId)) modifiedIds.push(compId);
                        updatesAccumulator[compId] = { geometry: compNewCoord };
                    }
                }
            }

            if (updatesAccumulator) {
                const vId = visualLine.getId() as string;
                if (vId) {
                    if (modifiedIds && !modifiedIds.includes(vId)) modifiedIds.push(vId);
                    updatesAccumulator[vId] = { geometry: lCoords };
                }
            }
        }
    }

    private getVertexStyleForFeature(feature: Feature): Style | Style[] {
        const geometry = feature.getGeometry();
        if (!geometry) return VertexStyles.default;
        const type = geometry.getType();

        if (type === 'LineString') return getVertexStyle({});
        if (type === 'Point') return getVertexStyle({ isHighlighted: true });

        return VertexStyles.default;
    }

    private checkForPipeSplit(node: Feature) {
        const nodeCoord = (node.getGeometry() as Point).getCoordinates();
        const nodeId = node.getId() as string;

        const resolution = this.map.getView().getResolution() || 1;
        const tolerance = 10 * resolution;

        const bestPipe = this.vectorSource.getClosestFeatureToCoordinate(nodeCoord, (f) => f.get('type') === 'pipe');
        if (!bestPipe) return;

        const geom = bestPipe.getGeometry() as LineString;
        const closestPoint = geom.getClosestPoint(nodeCoord);
        const dist = Math.sqrt(Math.pow(closestPoint[0] - nodeCoord[0], 2) + Math.pow(closestPoint[1] - nodeCoord[1], 2));

        if (dist < tolerance) {
            const startId = bestPipe.get('startNodeId');
            const endId = bestPipe.get('endNodeId');

            if (startId !== nodeId && endId !== nodeId) {
                this.splitPipeByNode(bestPipe, node);
            }
        }
    }

    private splitPipeByNode(pipe: Feature, node: Feature) {
        import('@/store/networkStore').then(({ useNetworkStore }) => {
            const store = useNetworkStore.getState();
            const geometry = pipe.getGeometry() as LineString;
            const coords = geometry.getCoordinates();
            const nodeCoord = (node.getGeometry() as Point).getCoordinates();

            const originalProps = { ...pipe.getProperties() };
            delete originalProps.geometry; delete originalProps.id;
            delete originalProps.startNodeId; delete originalProps.endNodeId;
            delete originalProps.length; delete originalProps.label;

            let splitIndex = 0;
            let minDistance = Infinity;
            for (let i = 0; i < coords.length - 1; i++) {
                const seg = new LineString([coords[i], coords[i + 1]]);
                const closest = seg.getClosestPoint(nodeCoord);
                const dist = Math.sqrt(Math.pow(closest[0] - nodeCoord[0], 2) + Math.pow(closest[1] - nodeCoord[1], 2));
                if (dist < minDistance) { minDistance = dist; splitIndex = i; }
            }

            const pipe1Id = store.generateUniqueId('pipe');
            const pipe2Id = store.generateUniqueId('pipe');
            const startId = pipe.get('startNodeId');
            const endId = pipe.get('endNodeId');
            const nodeId = node.getId() as string;
            const oldPipeId = pipe.getId() as string;

            const coords1 = [...coords.slice(0, splitIndex + 1), nodeCoord];
            const coords2 = [nodeCoord, ...coords.slice(splitIndex + 1)];

            const p1Props = {
                ...originalProps,
                type: 'pipe' as const,
                id: pipe1Id,
                startNodeId: startId,
                endNodeId: nodeId,
                label: `${pipe1Id}`,
                length: Math.round(new LineString(coords1).getLength())
            };

            const p1 = new Feature({ geometry: new LineString(coords1) });
            p1.setId(pipe1Id);
            p1.setProperties(p1Props);

            const p2Props = {
                ...originalProps,
                type: 'pipe' as const,
                id: pipe2Id,
                startNodeId: nodeId,
                endNodeId: endId,
                label: `${pipe2Id}`,
                length: Math.round(new LineString(coords2).getLength())
            };

            const p2 = new Feature({ geometry: new LineString(coords2) });
            p2.setId(pipe2Id);
            p2.setProperties(p2Props);

            this.vectorSource.removeFeature(pipe);
            this.vectorSource.addFeatures([p1, p2]);

            const updateFeatureConnections = (targetNodeId: string, removeId: string | null, addId: string) => {
                const targetNode = this.vectorSource.getFeatureById(targetNodeId);
                if (targetNode) {
                    let links = targetNode.get('connectedLinks') as string[] || [];
                    if (removeId) {
                        links = links.filter(id => id !== removeId);
                    }
                    if (!links.includes(addId)) {
                        links.push(addId);
                    }
                    targetNode.set('connectedLinks', [...links]);
                }
            };

            updateFeatureConnections(startId, oldPipeId, pipe1Id);
            updateFeatureConnections(endId, oldPipeId, pipe2Id);
            updateFeatureConnections(nodeId, null, pipe1Id);
            updateFeatureConnections(nodeId, null, pipe2Id);

            store.removeFeature(oldPipeId);
            store.addFeature({
                id: pipe1Id,
                type: 'pipe',
                geometry: coords1,
                properties: p1Props
            });
            store.addFeature({
                id: pipe2Id,
                type: 'pipe',
                geometry: coords2,
                properties: p2Props
            });

            store.updateNodeConnections(startId, oldPipeId, 'remove');
            store.updateNodeConnections(endId, oldPipeId, 'remove');
            store.updateNodeConnections(startId, pipe1Id, 'add');
            store.updateNodeConnections(nodeId, pipe1Id, 'add');
            store.updateNodeConnections(nodeId, pipe2Id, 'add');
            store.updateNodeConnections(endId, pipe2Id, 'add');
        });
    }

    public cleanup() {
        if (this.modifyInteraction) this.map.removeInteraction(this.modifyInteraction);
        if (this.selectInteraction) this.map.removeInteraction(this.selectInteraction);

        this.map.un('pointermove', this.boundPointerMoveHandler);
        this.map.un('pointerdown' as any, this.boundPointerDownHandler);
        this.map.un('pointerup' as any, this.boundPointerUpHandler);

        this.modifyInteraction = null;
        this.selectInteraction = null;
        this.modifiableFeatures.clear();

        this.linkModifyManager.cleanup();
        this.map.getViewport().style.cursor = 'default';
    }
}