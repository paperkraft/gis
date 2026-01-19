import { useState, useEffect, useCallback } from 'react';
import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';
import { useUIStore } from '@/store/uiStore';
import { PipeDrawingManager } from '@/lib/topology/pipeDrawingManager';
import { NetworkFactory } from '@/lib/topology/networkFactory';
import Flatbush from 'flatbush';

export function useMapContextMenu() {
    const map = useMapStore((state) => state.map);
    const vectorSource = useMapStore((state) => state.vectorSource);

    const { setActiveModal, setDeleteModalOpen } = useUIStore();
    const { setSelectedFeature, selectFeature, addFeature, selectFeatures } = useNetworkStore();

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
    // 🚀 ROBUST HIT DETECTION
    // =========================================================
    const findFeatureAtCoordinate = (coordinate: number[]) => {
        if (!vectorSource || !map) return null;

        const allFeatures = vectorSource.getFeatures();
        if (allFeatures.length === 0) return null;

        // 1. Build Index (Include EVERYTHING to be safe)
        const index = new Flatbush(allFeatures.length);
        for (const f of allFeatures) {
            const geom = f.getGeometry();
            if (geom instanceof Point) {
                const c = geom.getCoordinates();
                index.add(c[0], c[1], c[0], c[1]);
            } else if (geom instanceof LineString) {
                const ext = geom.getExtent();
                index.add(ext[0], ext[1], ext[2], ext[3]);
            } else {
                // Fallback for empty/unknown geometry
                index.add(0, 0, 0, 0);
            }
        }
        index.finish();

        // 2. Define Tolerance (10px buffer)
        const resolution = map.getView().getResolution() || 1;
        const tolerance = 10 * resolution;

        // 3. Query Closest 20 items (No max distance filter to prevent false negatives)
        const results = index.neighbors(coordinate[0], coordinate[1], 20);

        let bestFeature: Feature | null = null;
        let minDistance = Infinity;

        // 4. Detailed Geometry Check
        for (const i of results) {
            const feature = allFeatures[i];
            const type = feature.get('type');

            // Skip helper objects if necessary
            if (feature.get('isPreview') || feature.get('isVertexMarker')) continue;

            const geom = feature.getGeometry();
            let dist = Infinity;

            if (geom instanceof Point) {
                const c = geom.getCoordinates();
                dist = Math.sqrt(Math.pow(c[0] - coordinate[0], 2) + Math.pow(c[1] - coordinate[1], 2));

                // Priority: If we hit a Node/Icon within tolerance, return immediately
                if (dist <= tolerance) return feature;
            }
            else if (geom instanceof LineString) {
                const closest = geom.getClosestPoint(coordinate);
                dist = Math.sqrt(Math.pow(closest[0] - coordinate[0], 2) + Math.pow(closest[1] - coordinate[1], 2));

                if (dist <= tolerance && dist < minDistance) {
                    minDistance = dist;
                    bestFeature = feature;
                }
            }
        }

        return bestFeature;
    };

    useEffect(() => {
        if (!map) return;

        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();
            const pixel = map.getEventPixel(event);
            const coordinate = map.getCoordinateFromPixel(pixel);

            // 1. HIT DETECTION: Find the Feature (Node or Pipe)
            let feature = findFeatureAtCoordinate(coordinate);

            let type: 'CANVAS' | 'NODE' | 'PIPE' | 'VERTEX' | 'PUMP' | 'VALVE' = 'CANVAS';
            let vertexIndex: number | null = null;

            if (feature) {
                const featureType = feature.get('type');

                // Handle Visual Links (Clicking dashed line -> Select Parent Pump/Valve)
                if (featureType === 'visual') {
                    const parentId = feature.get('parentLinkId');
                    const linkType = feature.get('linkType');
                    const source = useMapStore.getState().vectorSource;
                    const parentFeature = source?.getFeatureById(parentId);

                    if (parentFeature) {
                        feature = parentFeature;
                        if (linkType === 'pump') type = 'PUMP';
                        else if (linkType === 'valve') type = 'VALVE';
                    }
                }

                // Auto-Select Logic
                // const id = feature.getId() as string;
                // if (id && !selectedFeatureIds.includes(id)) {
                //     selectFeature(id);
                //     setSelectedFeature(feature);
                // }

                // Determine Type
                if (['junction', 'tank', 'reservoir'].includes(featureType)) {
                    type = 'NODE';
                } else if (featureType === 'pump') {
                    type = 'PUMP';
                } else if (featureType === 'valve') {
                    type = 'VALVE';
                } else if (featureType === 'pipe') {
                    // Vertex Detection Logic
                    const geometry = feature.getGeometry() as LineString;
                    const coords = geometry.getCoordinates();
                    const resolution = map.getView().getResolution() || 1;

                    // Tolerance: 10 pixels (converted to map units)
                    const tolerance = resolution * 10;

                    type = 'PIPE'; // Default to PIPE

                    // Iterate through valid vertices (excluding start/end nodes)
                    for (let i = 1; i < coords.length - 1; i++) {
                        const vertex = coords[i];

                        // Calculate Distance: Click vs Vertex
                        const dist = Math.sqrt(
                            Math.pow(vertex[0] - coordinate[0], 2) +
                            Math.pow(vertex[1] - coordinate[1], 2)
                        );

                        if (dist <= tolerance) {
                            // WE FOUND A VERTEX!
                            type = 'VERTEX';
                            vertexIndex = i; // Save the index so we know which one to delete
                            break; // Stop looking
                        }
                    }
                }
            } else {
                // Clicked Empty Space
                selectFeature(null);
                selectFeatures([]);
                setSelectedFeature(null);
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
    }, [map, vectorSource, selectFeature, selectFeatures, setSelectedFeature]);

    const handleAction = useCallback((action: string, feature: Feature | null) => {
        if (!map || !vectorSource || !state.coordinate) return;

        const drawingManager = new PipeDrawingManager(map, vectorSource);
        const coordinate = state.coordinate;

        switch (action) {
            case 'ADD_JUNCTION': createNode('junction', coordinate); break;
            case 'ADD_TANK': createNode('tank', coordinate); break;
            case 'ADD_RESERVOIR': createNode('reservoir', coordinate); break;

            case 'PROPERTIES':
                if (feature) {
                    const id = feature.getId()?.toString();
                    if (id) selectFeature(id);
                    setSelectedFeature(feature);
                    const modalMap: Record<string, any> = {
                        junction: 'JUNCTION_PROP', tank: 'TANK_PROP', reservoir: 'RESERVOIR_PROP',
                        pipe: 'PIPE_PROP', pump: 'PUMP_PROP', valve: 'VALVE_PROP'
                    };
                    const modal = modalMap[feature.get('type')];
                    if (modal) setActiveModal(modal);
                }
                break;

            case 'REVERSE_DIRECTION':
                if (feature) drawingManager.reversePipeDirection(feature);
                break;

            case 'DELETE':
                if (feature) {
                    const id = feature.getId()?.toString();
                    if (id) selectFeature(id);
                    setSelectedFeature(feature);
                    setDeleteModalOpen(true);
                }
                break;

            case 'DELETE_VERTEX':
                if (feature && state.vertexIndex !== null) {
                    const geometry = feature.getGeometry() as LineString;
                    const coords = geometry.getCoordinates();
                    if (state.vertexIndex > 0 && state.vertexIndex < coords.length - 1) {
                        coords.splice(state.vertexIndex, 1);
                        geometry.setCoordinates(coords);
                        useNetworkStore.getState().updateFeature(feature.getId() as string, coords);
                        feature.changed();
                    }
                }
                break;

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
        const geom = pipe.getGeometry();
        // Safety Check
        if (!geom || !(geom instanceof LineString)) return;

        const coords = geom.getCoordinates();

        // 1. Find the best segment to insert the vertex
        let bestIndex = 1;
        let minDist = Infinity;

        for (let i = 0; i < coords.length - 1; i++) {
            const p1 = coords[i];
            const p2 = coords[i + 1];

            // Distance from point to line segment
            const dist = Math.abs((p2[1] - p1[1]) * clickCoord[0] - (p2[0] - p1[0]) * clickCoord[1] + p2[0] * p1[1] - p2[1] * p1[0]) /
                Math.sqrt(Math.pow(p2[1] - p1[1], 2) + Math.pow(p2[0] - p1[0], 2));

            if (dist < minDist) {
                minDist = dist;
                bestIndex = i + 1;
            }
        }

        // 2. Modify Array
        coords.splice(bestIndex, 0, clickCoord);

        // 3. Update Map (Visuals)
        geom.setCoordinates(coords);
        const newLength = Math.round(geom.getLength());
        pipe.set('length', newLength);

        console.log('New Vertex', coords);

        // 4. Update Store (Persistence)
        // We pass the raw array; the Store must handle the conversion.
        // useNetworkStore.getState().updateFeature(pipe.getId() as string, coords);
        useNetworkStore.getState().updateFeature(pipe.getId() as string, {
            geometry: coords,
            length: newLength
        });

        pipe.changed();
    }

    const closeMenu = useCallback(() => {
        setState(prev => ({ ...prev, isVisible: false }));

        // This removes the Halo if the user clicks empty space
        setSelectedFeature(null);
    }, [setSelectedFeature]);

    return { ...state, onClose: closeMenu, onAction: handleAction };
}