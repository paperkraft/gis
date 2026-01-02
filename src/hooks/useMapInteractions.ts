import { Feature } from 'ol';
import { Point } from 'ol/geom';
import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import { useCallback, useEffect, useRef } from 'react';
import { Draw, DragBox } from 'ol/interaction';

import { COMPONENT_TYPES } from '@/constants/networkComponents';
import { ContextMenuManager } from '@/lib/topology/contextMenuManager';
import { ModifyManager } from '@/lib/topology/modifyManager';
import { PipeDrawingManager } from '@/lib/topology/pipeDrawingManager';
import { VertexLayerManager } from '@/lib/topology/vertexManager';
import { useNetworkStore } from '@/store/networkStore';
import { useUIStore } from '@/store/uiStore';
import { FeatureType } from '@/types/network';

interface UseMapInteractionsProps {
    map: Map | null;
    vectorSource: VectorSource | null;
}

export function useMapInteractions({ map, vectorSource }: UseMapInteractionsProps) {
    const { activeTool, setActiveTool } = useUIStore();
    const { addFeature, generateUniqueId } = useNetworkStore();

    const pipeDrawingManagerRef = useRef<PipeDrawingManager | null>(null);
    const modifyManagerRef = useRef<ModifyManager | null>(null);
    const contextMenuManagerRef = useRef<ContextMenuManager | null>(null);
    const vertexLayerManagerRef = useRef<VertexLayerManager | null>(null);
    const drawInteractionRef = useRef<Draw | null>(null);
    const zoomBoxRef = useRef<DragBox | null>(null);

    // Initialize Managers
    useEffect(() => {
        if (!map || !vectorSource) return;

        const pipeManager = new PipeDrawingManager(map, vectorSource);
        const modManager = new ModifyManager(map, vectorSource);
        const menuManager = new ContextMenuManager(map, vectorSource);
        const vertexManager = new VertexLayerManager(map, vectorSource);

        pipeManager.registerWithContextMenu(menuManager);
        menuManager.setPipeDrawingManager(pipeManager);

        const originalStart = pipeManager.startDrawing.bind(pipeManager);
        pipeManager.startDrawing = (type) => {
            originalStart(type);
            menuManager.setDrawingMode(true);
        };

        const originalStop = pipeManager.stopDrawing.bind(pipeManager);
        pipeManager.stopDrawing = () => {
            originalStop();
            menuManager.setDrawingMode(false);
        };

        pipeDrawingManagerRef.current = pipeManager;
        modifyManagerRef.current = modManager;
        contextMenuManagerRef.current = menuManager;
        vertexLayerManagerRef.current = vertexManager;

        return () => {
            pipeManager.cleanup();
            modManager.cleanup();
            menuManager.cleanup();
            vertexManager.cleanup();
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
        const feature = new Feature({ geometry: new Point(coordinate) });
        const id = generateUniqueId(componentType);

        feature.setId(id);
        feature.set('type', componentType);
        feature.set('isNew', true);
        feature.setProperties({
            ...COMPONENT_TYPES[componentType].defaultProperties,
            label: `${id}`,
        });
        feature.set('connectedLinks', []);

        vectorSource.addFeature(feature);
        addFeature(feature);

    }, [map, vectorSource, addFeature, generateUniqueId]);

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

            // BUT commonly pumps/valves are placed as points. 
            // If you treat them as points, fall through to the Node logic below.
            // For now, let's assume they are Points placed on pipes or canvas.
            // Fallthrough...
            case 'draw-junction':
            case 'draw-tank':
            case 'draw-reservoir':
                // Extract type: 'draw-junction' -> 'junction'
                const typeStr = activeTool.replace('draw-', '') as FeatureType;

                // Use OL Draw Interaction for "Point" placement
                // This gives us the crosshair and prevents map panning while drawing
                const draw = new Draw({
                    type: 'Point',
                    source: undefined, // We handle adding manually in placeComponent
                    stopClick: true    // Stop click bubbling to map
                });

                draw.on('drawend', (e) => {
                    const geom = e.feature.getGeometry() as Point;
                    // We use timeout to ensure the click doesn't trigger selection immediately after
                    setTimeout(() => {
                        placeComponent(typeStr, geom.getCoordinates());
                    }, 0);
                });

                map.addInteraction(draw);
                drawInteractionRef.current = draw;
                map.getViewport().style.cursor = 'crosshair';
                break;
        }
    }, [activeTool, map, placeComponent, setActiveTool]);

    return {
        pipeDrawingManager: pipeDrawingManagerRef.current,
        // startComponentPlacement: placeComponent,
    };
}