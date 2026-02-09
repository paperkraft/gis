import { Feature } from 'ol';
import { LineString } from 'ol/geom';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DeleteManager } from '@/lib/topology/deleteManager';
import { NetworkFactory } from '@/lib/topology/networkFactory';
import { PipeDrawingManager } from '@/lib/topology/pipeDrawingManager';
import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';
import { useUIStore } from '@/store/uiStore';

export function useMapContextMenu(
    pipeDrawingManager?: PipeDrawingManager | null,
    deleteManager?: DeleteManager | null
) {
    const map = useMapStore((state) => state.map);
    const vectorSource = useMapStore((state) => state.vectorSource);
    const { setActiveModal, setDeleteModalOpen } = useUIStore();
    const { selectFeature, setSelectedFeature, addFeature, selectFeatures } = useNetworkStore();

    const [state, setState] = useState<{
        isVisible: boolean;
        position: { x: number; y: number };
        coordinate: number[] | null;
        type: 'CANVAS' | 'NODE' | 'PIPE' | 'VERTEX' | 'PUMP' | 'VALVE' | null;
        feature: Feature | null;
        vertexIndex: number | null;
    }>({
        isVisible: false,
        position: { x: 0, y: 0 },
        coordinate: null,
        type: null,
        feature: null,
        vertexIndex: null,
    });

    // =========================================================
    // HIT DETECTION & PRIORITY LOGIC
    // =========================================================
    const handleContextMenu = useCallback((event: Event) => {
        event.preventDefault();
        const mouseEvent = event as MouseEvent;

        if (!map || useMapStore.getState().isDrawingPipe) return;

        const pixel = map.getEventPixel(mouseEvent);
        const coordinate = map.getCoordinateFromPixel(pixel);

        // 1. Get ALL features at this pixel (with tolerance)
        const features = map.getFeaturesAtPixel(pixel, {
            hitTolerance: 8,
            layerFilter: (l) => l.get('title') !== 'Vertex Layer' // Ignore helper layers if any
        }) as Feature[];

        let targetFeature: Feature | null = null;
        let type: 'CANVAS' | 'NODE' | 'PIPE' | 'VERTEX' | 'PUMP' | 'VALVE' = 'CANVAS';
        let vertexIndex: number | null = null;

        if (features.length > 0) {
            // 2. PRIORITY SORTING: Pump/Valve (3) > Node (2) > Pipe (1)
            const sortedFeatures = features.sort((a, b) => {
                const getPriority = (f: Feature) => {
                    const t = f.get('type');
                    if (['pump', 'valve'].includes(t)) return 3;
                    if (['junction', 'tank', 'reservoir'].includes(t)) return 2;
                    if (t === 'pipe') return 1;
                    return 0; // Visuals/Helpers
                };
                return getPriority(b) - getPriority(a);
            });

            targetFeature = sortedFeatures[0];
            const featureType = targetFeature.get('type');

            // 3. Resolve Visual Links (Clicking dashed line -> Select Parent)
            if (featureType === 'visual') {
                const parentId = targetFeature.get('parentLinkId');
                const parentFeature = vectorSource?.getFeatureById(parentId);
                if (parentFeature) {
                    targetFeature = parentFeature;
                    const linkType = parentFeature.get('type');
                    type = linkType === 'pump' ? 'PUMP' : 'VALVE';
                }
            }
            // 4. Determine Specific Type
            else if (featureType === 'pump') {
                type = 'PUMP';
            } else if (featureType === 'valve') {
                type = 'VALVE';
            } else if (['junction', 'tank', 'reservoir'].includes(featureType)) {
                type = 'NODE';
            } else if (featureType === 'pipe') {
                // 5. Pipe Vertex Detection
                type = 'PIPE'; // Default
                const geometry = targetFeature.getGeometry() as LineString;
                const coords = geometry.getCoordinates();
                const resolution = map.getView().getResolution() || 1;
                const tolerance = resolution * 10;

                for (let i = 1; i < coords.length - 1; i++) {
                    const vertex = coords[i];
                    const dist = Math.sqrt(
                        Math.pow(vertex[0] - coordinate[0], 2) +
                        Math.pow(vertex[1] - coordinate[1], 2)
                    );
                    if (dist <= tolerance) {
                        type = 'VERTEX';
                        vertexIndex = i;
                        break;
                    }
                }
            }
        }

        // 6. Select the Winner (Visual Feedback)
        if (targetFeature) {
            const id = targetFeature.getId() as string;
            selectFeature(id);
            setSelectedFeature(targetFeature);
        } else {
            selectFeature(null);
            selectFeatures([]);
            setSelectedFeature(null);
        }

        // 7. Open Menu
        setState({
            isVisible: true,
            position: { x: mouseEvent.clientX, y: mouseEvent.clientY },
            coordinate,
            type,
            feature: targetFeature,
            vertexIndex,
        });

    }, [map, vectorSource, selectFeature, setSelectedFeature, selectFeatures]);

    // Attach Listener
    useEffect(() => {
        if (!map) return;
        const viewport = map.getViewport();
        viewport.addEventListener('contextmenu', handleContextMenu);
        return () => viewport.removeEventListener('contextmenu', handleContextMenu);
    }, [map, handleContextMenu]);


    // =========================================================
    // ACTION HANDLING
    // =========================================================
    const handleAction = useCallback((action: string, feature: Feature | null) => {
        if (!map || !vectorSource || !state.coordinate) return;

        const coordinate = state.coordinate;

        switch (action) {
            case 'ADD_JUNCTION': createNode('junction', coordinate); break;
            case 'ADD_TANK': createNode('tank', coordinate); break;
            case 'ADD_RESERVOIR': createNode('reservoir', coordinate); break;

            case 'PROPERTIES':
                if (feature) {
                    const id = feature.getId()?.toString();
                    if (id) selectFeature(id);
                    const modalMap: Record<string, any> = {
                        junction: 'JUNCTION_PROP', tank: 'TANK_PROP', reservoir: 'RESERVOIR_PROP',
                        pipe: 'PIPE_PROP', pump: 'PUMP_PROP', valve: 'VALVE_PROP'
                    };
                    const modal = modalMap[feature.get('type')];
                    if (modal) setActiveModal(modal);
                }
                break;

            case 'REVERSE_DIRECTION':
                if (feature && pipeDrawingManager) {
                    pipeDrawingManager.reversePipeDirection(feature);
                }
                break;

            case 'DELETE':
                if (feature) {
                    if (deleteManager) {
                        // Use Manager (Handles Merges/Cascades/Safety)
                        deleteManager.deleteFeature(feature);
                    } else {
                        // Fallback (Simple delete)
                        setDeleteModalOpen(true);
                    }
                }
                break;

            case 'DELETE_VERTEX':
                if (feature && state.vertexIndex !== null) {
                    deleteVertexFromPipe(feature, state.vertexIndex);
                }
                break;

            case 'ADD_VERTEX':
                if (feature) addVertexToPipe(feature, coordinate);
                break;

            case 'INSERT_JUNCTION':
                if (feature && pipeDrawingManager) {
                    pipeDrawingManager.insertNodeOnPipe(feature, coordinate, 'junction');
                }
                break;

            case 'INSERT_PUMP':
                if (feature && pipeDrawingManager) {
                    pipeDrawingManager.insertLinkOnPipe(feature, coordinate, 'pump');
                }
                break;

            case 'INSERT_VALVE':
                if (feature && pipeDrawingManager) {
                    pipeDrawingManager.insertLinkOnPipe(feature, coordinate, 'valve');
                }
                break;

            case 'CONVERT_TO_TANK':
                if (feature && pipeDrawingManager) {
                    pipeDrawingManager.convertNode(feature, 'tank');
                }
                break;

            case 'CONVERT_TO_RESERVOIR':
                if (feature && pipeDrawingManager) {
                    pipeDrawingManager.convertNode(feature, 'reservoir');
                }
                break;

            case 'CONVERT_TO_JUNCTION':
                if (feature && pipeDrawingManager) {
                    pipeDrawingManager.convertNode(feature, 'junction');
                }
                break;

            case 'MERGE_PIPES_AT_NODE':
                if (feature && pipeDrawingManager) {
                    const store = useNetworkStore.getState();
                    const storeNode = store.features.get(feature.getId() as string);
                    const conns = storeNode?.get('connectedLinks') || [];

                    // Safety check: Ensure we have exactly 2 connections
                    if (conns.length === 2) {
                        const id1 = conns[0];
                        const id2 = conns[1];

                        // Try Map Source first (best for visuals), Fallback to Store
                        const pipeA = vectorSource?.getFeatureById(id1) || store.features.get(id1);
                        const pipeB = vectorSource?.getFeatureById(id2) || store.features.get(id2);

                        if (pipeA && pipeB) {
                            pipeDrawingManager.mergePipes(pipeA, pipeB, feature);
                        } else {
                            toast.error("Merge failed: Could not find connected pipes in memory.");
                        }
                    }
                }
                break;
        }

        // Close menu
        setState(prev => ({ ...prev, isVisible: false }));

    }, [map, vectorSource, state.coordinate, state.vertexIndex, pipeDrawingManager, deleteManager, setActiveModal, setDeleteModalOpen, selectFeature]);


    // =========================================================
    // HELPERS
    // =========================================================
    const createNode = (type: any, coord: number[]) => {
        const newNode = NetworkFactory.createNode(type, coord);
        if (vectorSource) vectorSource.addFeature(newNode);
        addFeature(newNode);
    };

    const addVertexToPipe = (pipe: Feature, clickCoord: number[]) => {
        const geom = pipe.getGeometry() as LineString;
        const coords = geom.getCoordinates();

        // Find best segment
        let bestIndex = 1;
        let minDist = Infinity;
        for (let i = 0; i < coords.length - 1; i++) {
            const p1 = coords[i];
            const p2 = coords[i + 1];
            // Point-to-Line distance formula
            const dist = Math.abs((p2[1] - p1[1]) * clickCoord[0] - (p2[0] - p1[0]) * clickCoord[1] + p2[0] * p1[1] - p2[1] * p1[0]) /
                Math.sqrt(Math.pow(p2[1] - p1[1], 2) + Math.pow(p2[0] - p1[0], 2));

            if (dist < minDist) {
                minDist = dist;
                bestIndex = i + 1;
            }
        }

        coords.splice(bestIndex, 0, clickCoord);
        updatePipeGeometry(pipe, coords);
    };

    const deleteVertexFromPipe = (pipe: Feature, index: number) => {
        const geom = pipe.getGeometry() as LineString;
        const coords = geom.getCoordinates();
        if (index > 0 && index < coords.length - 1) {
            coords.splice(index, 1);
            updatePipeGeometry(pipe, coords);
        }
    };

    const updatePipeGeometry = (pipe: Feature, coords: number[][]) => {
        const geom = pipe.getGeometry() as LineString;
        geom.setCoordinates(coords);
        const newLength = Math.round(geom.getLength());
        pipe.set('length', newLength);

        useNetworkStore.getState().updateFeature(pipe.getId() as string, {
            geometry: coords,
            length: newLength
        });
        pipe.changed();
    };

    const canMergeNode = (feature: Feature | null) => {
        if (!feature || feature.get('type') !== 'junction') return false;

        // We need to check the store for connections
        const storeNode = useNetworkStore.getState().features.get(feature.getId() as string);
        const connections = storeNode?.get('connectedLinks') || [];

        // Only allow if exactly 2 pipes are connected
        if (connections.length !== 2) return false;

        const store = useNetworkStore.getState();
        const link1 = store.features.get(connections[0]);
        const link2 = store.features.get(connections[1]);

        return link1?.get('type') === 'pipe' && link2?.get('type') === 'pipe';
    };

    const closeMenu = useCallback(() => {
        setState(prev => ({ ...prev, isVisible: false }));
        // Optional: clear selection on background click if desired, 
        // but often context menu dismissal shouldn't deselect.
        // selectFeature(null)
        // selectFeatures([])
    }, []);

    return { ...state, onClose: closeMenu, onAction: handleAction, canMergeNode };
}