import { Feature } from 'ol';
import { Point } from 'ol/geom';
import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import { useCallback, useEffect, useRef } from 'react';
import { Draw, DragBox } from 'ol/interaction';

import { ModifyManager } from '@/lib/topology/modifyManager';
import { PipeDrawingManager } from '@/lib/topology/pipeDrawingManager';
import { VertexLayerManager } from '@/lib/topology/vertexManager';
import { useNetworkStore } from '@/store/networkStore';
import { useMapStore } from '@/store/mapStore';
import { useUIStore } from '@/store/uiStore';
import { FeatureType } from '@/types/network';
import { NetworkFactory } from '@/lib/topology/networkFactory';
import { DeleteManager } from '@/lib/topology/deleteManager';

interface UseMapInteractionsProps {
    map: Map | null;
    vectorSource: VectorSource | null;
}

export function useMapInteractions({ map, vectorSource }: UseMapInteractionsProps) {
    const { activeTool, setActiveTool } = useUIStore();
    const { addFeature } = useNetworkStore();

    const pipeDrawingManagerRef = useRef<PipeDrawingManager | null>(null);
    const modifyManagerRef = useRef<ModifyManager | null>(null);
    const vertexLayerManagerRef = useRef<VertexLayerManager | null>(null);
    const drawInteractionRef = useRef<Draw | null>(null);
    const zoomBoxRef = useRef<DragBox | null>(null);
    const deleteManagerRef = useRef<DeleteManager | null>(null);

    // Initialize Managers
    useEffect(() => {
        if (!map || !vectorSource) return;

        const pipeManager = new PipeDrawingManager(map, vectorSource);
        const modifyManager = new ModifyManager(map, vectorSource);
        const vertexManager = new VertexLayerManager(map, vectorSource);
        const deleteManager = new DeleteManager(vectorSource, pipeManager);

        pipeDrawingManagerRef.current = pipeManager;
        modifyManagerRef.current = modifyManager;
        vertexLayerManagerRef.current = vertexManager;
        deleteManagerRef.current = deleteManager;

        // Expose DeleteManager globally so property panel can use the same delete path
        useMapStore.getState().setDeleteManager(deleteManager);

        return () => {
            pipeManager.cleanup();
            modifyManager.cleanup();
            vertexManager.cleanup();
            deleteManager.cleanup();
            useMapStore.getState().setDeleteManager(null);
        };
    }, [map, vectorSource]);

    // -------------------------------------------------------------------------
    // PLACEMENT LOGIC
    // -------------------------------------------------------------------------
    const placeComponent = useCallback((componentType: FeatureType, coordinate: number[]) => {
        if (!map || !vectorSource || !pipeDrawingManagerRef.current) return;

        // 1. Check for Snap-to-Pipe (Split)
        const pipeUnderCursor = pipeDrawingManagerRef.current.findPipeAtCoordinate(coordinate);

        if (pipeUnderCursor) {
            // If Pump/Valve, use insertLinkOnPipe logic
            if (componentType === 'pump' || componentType === 'valve') {
                pipeDrawingManagerRef.current.insertLinkOnPipe(pipeUnderCursor, coordinate, componentType);
            } else {
                // Otherwise use Node Split logic
                pipeDrawingManagerRef.current.insertNodeOnPipe(pipeUnderCursor, coordinate, componentType);
            }
            return;
        }

        // 2. Standard Placement
        const featureData = NetworkFactory.createNode(componentType, coordinate);
        const id = featureData.id;

        // A. Add to Map Local Source (for instant visual feedback)
        const feature = new Feature({ geometry: new Point(coordinate) });
        feature.setId(id);
        feature.setProperties({
            ...featureData.properties,
            isNew: true,
        });
        vectorSource.addFeature(feature);

        // B. Add to Store (Data Model)
        addFeature({
            ...featureData,
            properties: {
                ...featureData.properties,
                isNew: true
            }
        });

    }, [map, vectorSource, addFeature]);

    // Click handler for simple components (Nodes)
    const handlePlacementClick = useCallback((event: any) => {
        const { activeTool } = useUIStore.getState();
        if (!activeTool || !activeTool.startsWith('draw-')) return;
        const componentType = activeTool.replace('draw-', '') as FeatureType;

        // Skip links, they are handled by PipeDrawingManager
        if (componentType === 'pump' || componentType === 'valve') return;

        placeComponent(componentType, event.coordinate);
    }, [placeComponent]);

    // -------------------------------------------------------------------------
    // TOOL SWITCHING EFFECT
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!map || !pipeDrawingManagerRef.current || !modifyManagerRef.current) return;

        modifyManagerRef.current.cleanup();
        pipeDrawingManagerRef.current.stopDrawing();
        map.un('click', handlePlacementClick);
        map.getViewport().style.cursor = 'default';

        if (zoomBoxRef.current) {
            map.removeInteraction(zoomBoxRef.current);
            zoomBoxRef.current = null;
        }
        if (drawInteractionRef.current) {
            map.removeInteraction(drawInteractionRef.current);
            drawInteractionRef.current = null;
        }

        switch (activeTool) {
            case 'pan':
                map.getViewport().style.cursor = 'grab';
                break;
            case 'select':
                // Handled by useFeatureSelection
                break;
            case 'modify':
                modifyManagerRef.current.startModifying();
                break;
            case 'zoom-box':
                map.getViewport().style.cursor = 'crosshair';
                const dragBox = new DragBox({ className: 'ol-dragbox' });
                dragBox.on('boxend', () => {
                    const geometry = dragBox.getGeometry();
                    const view = map.getView();
                    if (geometry) view.fit(geometry, { padding: [50, 50, 50, 50], duration: 500 });
                    setActiveTool('zoom-box');
                });
                map.addInteraction(dragBox);
                zoomBoxRef.current = dragBox;
                break;

            // --- DRAWING TOOLS ---
            // 1. Links (Pipes, Pumps, Valves drawn as lines)
            case 'draw-pipe':
                pipeDrawingManagerRef.current.startDrawing('pipe');
                break;

            // NOTE: Pumps/Valves can technically be drawn as lines connecting two nodes 
            // OR placed as points on an existing pipe.
            // If the user wants to draw a "Pump Link" from Node A to Node B:
            case 'draw-pump':
            case 'draw-valve':
                // If you want "Draw Line" behavior for these:
                pipeDrawingManagerRef.current.startDrawing(activeTool.replace('draw-', '') as any);
                break;

            // Point Components (Junctions, Tanks, Reservoirs)
            case 'draw-junction':
            case 'draw-tank':
            case 'draw-reservoir': {
                const typeStr = activeTool.replace('draw-', '') as FeatureType;
                map.getViewport().style.cursor = 'crosshair';

                const startPointDraw = () => {
                    // Clean up any existing draw interaction first
                    if (drawInteractionRef.current) {
                        map.removeInteraction(drawInteractionRef.current);
                        drawInteractionRef.current = null;
                    }

                    const draw = new Draw({
                        type: 'Point',
                        source: undefined,
                        stopClick: true
                    });

                    draw.on('drawend', (e) => {
                        const geom = e.feature.getGeometry() as Point;
                        setTimeout(() => {
                            placeComponent(typeStr, geom.getCoordinates());
                            // Re-start the draw interaction so the user can
                            // place another feature without re-clicking the toolbar.
                            if (useUIStore.getState().activeTool === activeTool) {
                                startPointDraw();
                            }
                        }, 0);
                    });

                    map.addInteraction(draw);
                    drawInteractionRef.current = draw;
                };

                startPointDraw();
                break;
            }
        }
    }, [activeTool, map, placeComponent, setActiveTool, handlePlacementClick]);

    // Added: Update cursor to 'grabbing' on mouse down in pan mode
    useEffect(() => {
        if (!map) return;
        const viewport = map.getViewport();

        const handlePointerDown = (e: PointerEvent) => {
            if (activeTool === 'pan' && e.button === 0) {
                viewport.style.cursor = 'grabbing';
            }
        };

        const handlePointerUp = () => {
            if (activeTool === 'pan') {
                viewport.style.cursor = 'grab';
            }
        };

        viewport.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            viewport.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [map, activeTool]);

    return {
        pipeDrawingManager: pipeDrawingManagerRef.current,
        deleteManager: deleteManagerRef.current
    };
}