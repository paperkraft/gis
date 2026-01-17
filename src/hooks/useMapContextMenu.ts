import { useState, useEffect, useCallback } from 'react';
import { Feature } from 'ol';
import { LineString } from 'ol/geom';
import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';
import { useUIStore } from '@/store/uiStore';
import { PipeDrawingManager } from '@/lib/topology/pipeDrawingManager';
import { NetworkFactory } from '@/lib/topology/networkFactory';

export function useMapContextMenu() {
    const map = useMapStore((state) => state.map);
    const vectorSource = useMapStore((state) => state.vectorSource);
    const { setActiveModal, setDeleteModalOpen } = useUIStore();
    const { setSelectedFeature, selectFeature, addFeature } = useNetworkStore();

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

    useEffect(() => {
        if (!map) return;

        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();

            const pixel = map.getEventPixel(event);
            const coordinate = map.getCoordinateFromPixel(pixel);

            // Hit Detection
            // We prioritize points (Icons) over lines (Visual/Pipes) if they overlap
            let feature = map.forEachFeatureAtPixel(pixel, (f) => f, {
                hitTolerance: 8, // Slightly larger tolerance
                layerFilter: (l) => l.get('name') === 'network',
            }) as Feature | undefined;

            let type: 'CANVAS' | 'NODE' | 'PIPE' | 'VERTEX' | 'PUMP' | 'VALVE' = 'CANVAS';
            let vertexIndex: number | null = null;

            if (feature) {
                const featureType = feature.get('type');

                // 1. Handle Visual Lines (Dashed lines for Pump/Valve)
                // If we clicked the line, switch 'feature' to the actual Pump/Valve component
                if (featureType === 'visual') {
                    const parentId = feature.get('parentLinkId');
                    const linkType = feature.get('linkType'); // 'pump' or 'valve'

                    // Try to find the actual component feature
                    const source = useMapStore.getState().vectorSource;
                    const parentFeature = source?.getFeatureById(parentId);

                    if (parentFeature) {
                        feature = parentFeature; // SWAP feature
                        if (linkType === 'pump') type = 'PUMP';
                        else if (linkType === 'valve') type = 'VALVE';
                    }
                }
                // 2. Standard Feature Detection
                else if (['junction', 'tank', 'reservoir'].includes(featureType)) {
                    type = 'NODE';
                } else if (featureType === 'pump') {
                    type = 'PUMP';
                } else if (featureType === 'valve') {
                    type = 'VALVE';
                } else if (featureType === 'pipe') {
                    // Vertex Detection logic
                    const geometry = feature.getGeometry() as LineString;
                    const coords = geometry.getCoordinates();
                    const resolution = map.getView().getResolution() || 1;
                    const tolerance = resolution * 10;

                    for (let i = 1; i < coords.length - 1; i++) {
                        const vertex = coords[i];
                        const dx = vertex[0] - coordinate[0];
                        const dy = vertex[1] - coordinate[1];
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist <= tolerance) {
                            type = 'VERTEX';
                            vertexIndex = i;
                            break;
                        }
                    }

                    if (type !== 'VERTEX') {
                        type = 'PIPE';
                    }
                }
            }

            setState({
                isVisible: true,
                position: { x: event.clientX, y: event.clientY },
                coordinate,
                type,
                feature: feature || null,
                vertexIndex,
            });
        };

        const viewport = map.getViewport();
        viewport.addEventListener('contextmenu', handleContextMenu);

        return () => {
            viewport.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [map]);

    const handleAction = useCallback((action: string, feature: Feature | null) => {
        if (!map || !vectorSource || !state.coordinate) return;

        const drawingManager = new PipeDrawingManager(map, vectorSource);
        const coordinate = state.coordinate;

        switch (action) {
            // --- CANVAS ACTIONS ---
            case 'ADD_JUNCTION':
                createNode('junction', coordinate);
                break;
            case 'ADD_TANK':
                createNode('tank', coordinate);
                break;
            case 'ADD_RESERVOIR':
                createNode('reservoir', coordinate);
                break;

            // --- COMMON ACTIONS (Props/Delete) ---
            case 'PROPERTIES':
                if (feature) {
                    const id = feature.getId()?.toString();
                    if (id) selectFeature(id);
                    setSelectedFeature(feature);

                    const modalMap: Record<string, any> = {
                        junction: 'JUNCTION_PROP',
                        tank: 'TANK_PROP',
                        reservoir: 'RESERVOIR_PROP',
                        pipe: 'PIPE_PROP',
                        pump: 'PUMP_PROP',
                        valve: 'VALVE_PROP'
                    };
                    const modal = modalMap[feature.get('type')];
                    if (modal) setActiveModal(modal);
                }
                break;

            case 'REVERSE_DIRECTION':
                if (feature) {
                    drawingManager.reversePipeDirection(feature);
                }
                break;

            case 'DELETE':
                if (feature) {
                    const id = feature.getId()?.toString();
                    if (id) selectFeature(id); // Ensure ID is selected for DeleteHandler

                    setSelectedFeature(feature);
                    setDeleteModalOpen(true);
                }
                break;

            // --- VERTEX ACTIONS ---
            case 'DELETE_VERTEX':
                if (feature && state.vertexIndex !== null) {
                    const geometry = feature.getGeometry() as LineString;
                    const coords = geometry.getCoordinates();

                    if (state.vertexIndex > 0 && state.vertexIndex < coords.length - 1) {
                        coords.splice(state.vertexIndex, 1);
                        geometry.setCoordinates(coords);
                        useNetworkStore.getState().updateFeature(feature.getId() as string, coords);
                    }
                }
                break;

            // --- PIPE ACTIONS ---
            case 'ADD_VERTEX':
                if (feature) addVertexToPipe(feature, coordinate);
                break;
            case 'INSERT_JUNCTION':
                if (feature) drawingManager.insertNodeOnPipe(feature, coordinate, 'junction');
                break;
            case 'INSERT_PUMP':
                if (feature) drawingManager.insertLinkOnPipe(feature, coordinate, 'pump');
                break;
            case 'INSERT_VALVE':
                if (feature) drawingManager.insertLinkOnPipe(feature, coordinate, 'valve');
                break;
        }
    }, [map, vectorSource, state.coordinate, state.vertexIndex, setActiveModal, setDeleteModalOpen, setSelectedFeature, selectFeature]);

    // --- Helpers ---
    const createNode = (type: any, coord: number[]) => {
        const newNode = NetworkFactory.createNode(type, coord);
        if (vectorSource) vectorSource.addFeature(newNode);
        addFeature(newNode);
    };

    const addVertexToPipe = (pipe: Feature, clickCoord: number[]) => {
        const geom = pipe.getGeometry() as LineString;
        const coords = geom.getCoordinates();

        let bestIndex = 1;
        let minDist = Infinity;
        for (let i = 0; i < coords.length - 1; i++) {
            const p1 = coords[i];
            const p2 = coords[i + 1];
            const dist = Math.abs((p2[1] - p1[1]) * clickCoord[0] - (p2[0] - p1[0]) * clickCoord[1] + p2[0] * p1[1] - p2[1] * p1[0]) /
                Math.sqrt(Math.pow(p2[1] - p1[1], 2) + Math.pow(p2[0] - p1[0], 2));
            if (dist < minDist) {
                minDist = dist;
                bestIndex = i + 1;
            }
        }
        coords.splice(bestIndex, 0, clickCoord);
        geom.setCoordinates(coords);
        useNetworkStore.getState().updateFeature(pipe.getId() as string, coords);
    }

    const closeMenu = () => setState(s => ({ ...s, isVisible: false }));

    return { ...state, onClose: closeMenu, onAction: handleAction };
}