import { Feature, MapBrowserEvent } from 'ol';
import { Point } from 'ol/geom';
import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import { useCallback, useEffect, useRef } from 'react';

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

    // Initialize Managers
    useEffect(() => {
        if (!map || !vectorSource) return;

        const pipeManager = new PipeDrawingManager(map, vectorSource);
        const modManager = new ModifyManager(map, vectorSource);
        const menuManager = new ContextMenuManager(map, vectorSource);
        const vertexManager = new VertexLayerManager(map, vectorSource);

        // Wiring
        pipeManager.registerWithContextMenu(menuManager);
        menuManager.setPipeDrawingManager(pipeManager);

        // Sync drawing mode with Context Menu state
        const originalStart = pipeManager.startDrawing.bind(pipeManager);
        pipeManager.startDrawing = () => {
            originalStart();
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

    // Handle Tool Switching
    useEffect(() => {
        if (!map || !pipeDrawingManagerRef.current || !modifyManagerRef.current) return;

        // Reset
        modifyManagerRef.current.cleanup();

        switch (activeTool) {
            case 'pan':
                map.getViewport().style.cursor = 'grab';
                break;
            case 'select':
                map.getViewport().style.cursor = 'default';
                break;
            case 'modify':
                modifyManagerRef.current.startModifying();
                break;
            case 'draw':
                pipeDrawingManagerRef.current.startDrawing();
                break;
        }
    }, [activeTool, map]);

    // Handle ESC key to reset tools
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                useUIStore.getState().resetAllTools();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    // Placement Logic (Exposed Helper)
    const startComponentPlacement = useCallback((componentType: FeatureType) => {
        if (!map || !vectorSource || !pipeDrawingManagerRef.current) return;

        map.getViewport().style.cursor = 'crosshair';

        const placementHandler = (event: MapBrowserEvent<any>) => {
            const coordinate = map.getCoordinateFromPixel(event.pixel);

            // Create Feature
            const feature = new Feature({ geometry: new Point(coordinate) });
            const id = generateUniqueId(componentType);

            feature.setId(id);
            feature.set('type', componentType);
            feature.set('isNew', true);
            feature.setProperties({
                ...COMPONENT_TYPES[componentType].defaultProperties,
                label: `${COMPONENT_TYPES[componentType].name}-${id}`,
            });
            feature.set('connectedLinks', []);

            vectorSource.addFeature(feature);
            addFeature(feature);

            map.un('click', placementHandler);

            // Auto-start drawing pipe from this node
            requestAnimationFrame(() => {
                const pipeManager = pipeDrawingManagerRef.current;
                if (pipeManager) {
                    pipeManager.startDrawing();
                    requestAnimationFrame(() => {
                        pipeManager.continueDrawingFromNode(feature);
                        setActiveTool('draw');
                    });
                }
            });
        };

        map.once('click', placementHandler);
    }, [map, vectorSource, addFeature, generateUniqueId, setActiveTool]);

    return {
        pipeDrawingManager: pipeDrawingManagerRef.current,
        startComponentPlacement,
    };
}