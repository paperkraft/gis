"use client";
import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import { Draw, Modify, Snap } from 'ol/interaction';
import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { useCallback, useEffect, useRef } from 'react';

import { COMPONENT_TYPES, SNAPPING_TOLERANCE } from '@/constants/networkComponents';
import { ContextMenuManager } from '@/lib/topology/contextMenuManager';
import { DeleteManager } from '@/lib/topology/deleteManager';
import { ModifyManager } from '@/lib/topology/modifyManager';
import { PipeDrawingManager } from '@/lib/topology/pipeDrawingManager';
import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';

interface UseMapInteractionsOptions {
    map: Map | null;
    vectorSource: VectorSource | null;
}

export function useMapInteractions({ map, vectorSource }: UseMapInteractionsOptions) {
    const { activeTool } = useMapStore();
    const { addFeature, generateUniqueId } = useNetworkStore();

    // Manager instances
    const pipeDrawingManagerRef = useRef<PipeDrawingManager | null>(null);
    const modifyManagerRef = useRef<ModifyManager | null>(null);
    const deleteManagerRef = useRef<DeleteManager | null>(null);
    const contextMenuManagerRef = useRef<ContextMenuManager | null>(null);

    // Interaction instances
    const drawInteractionRef = useRef<Draw | null>(null);
    const modifyInteractionRef = useRef<Modify | null>(null);
    const snapInteractionRef = useRef<Snap | null>(null);

    /**
     * Initialize all managers
     */
    useEffect(() => {
        if (!map || !vectorSource) return;

        // Initialize managers
        pipeDrawingManagerRef.current = new PipeDrawingManager(map, vectorSource);
        modifyManagerRef.current = new ModifyManager(map, vectorSource);
        deleteManagerRef.current = new DeleteManager(map, vectorSource);
        contextMenuManagerRef.current = new ContextMenuManager(map, vectorSource);

        // Connect pipe drawing manager to context menu
        contextMenuManagerRef.current.setPipeDrawingManager(pipeDrawingManagerRef.current);


        return () => {
            // Cleanup managers
            pipeDrawingManagerRef.current?.cleanup?.();
            modifyManagerRef.current?.cleanup();
            deleteManagerRef.current?.cleanup();
            contextMenuManagerRef.current?.cleanup();
        };
    }, [map, vectorSource]);

    /**
     * Setup snap interaction (always active for better UX)
     */
    useEffect(() => {
        if (!map || !vectorSource) return;

        const snapInteraction = new Snap({
            source: vectorSource,
            pixelTolerance: SNAPPING_TOLERANCE,
        });

        map.addInteraction(snapInteraction);
        snapInteractionRef.current = snapInteraction;

        return () => {
            if (snapInteraction) {
                map.removeInteraction(snapInteraction);
            }
        };
    }, [map, vectorSource]);

    /**
     * Handle tool changes and setup appropriate interactions
     */
    useEffect(() => {
        if (!map || !vectorSource) return;

        // Cleanup previous interactions
        cleanupInteractions();

        // Setup new interactions based on active tool
        switch (activeTool) {
            case "select":
                setupSelectMode();
                break;
            case "modify":
                setupModifyMode();
                break;
            default:
                break;
        }

        return () => {
            cleanupInteractions();
        };
    }, [activeTool, map, vectorSource]);

    /**
     * Cleanup all active interactions
     */
    const cleanupInteractions = useCallback(() => {
        if (!map) return;

        // Remove ALL OpenLayers interactions that might interfere
        const interactions = map.getInteractions().getArray();
        interactions.forEach((interaction) => {
            // Don't remove Snap interaction
            if (!(interaction instanceof Snap)) {
                map.removeInteraction(interaction);
            }
        });

        // Remove draw interaction
        if (drawInteractionRef.current) {
            map.removeInteraction(drawInteractionRef.current);
            drawInteractionRef.current = null;
        }

        // Remove modify interaction
        if (modifyInteractionRef.current) {
            map.removeInteraction(modifyInteractionRef.current);
            modifyInteractionRef.current = null;
        }

        // Stop managers
        pipeDrawingManagerRef.current?.stopDrawing?.();
        modifyManagerRef.current?.cleanup();

        // Reset cursor
        map.getViewport().style.cursor = "default";
    }, [map]);

    /**
     * Setup select mode (handled by useFeatureSelection hook)
     */
    const setupSelectMode = () => {
        if (!map) return;
        map.getViewport().style.cursor = "default";
    };

    /**
     * Setup modify mode
     */
    const setupModifyMode = () => {
        if (!modifyManagerRef.current) return;
        modifyManagerRef.current.startModifying();
    };

    /**
     * Setup pipe drawing
     */
    const setupPipeDrawing = () => {
        if (!pipeDrawingManagerRef.current) return;
        pipeDrawingManagerRef.current.startDrawing();
    };

    /**
     * Setup node drawing (Junction, Tank, Reservoir)
     */
    const setupNodeDrawing = (nodeType: string) => {
        if (!map || !vectorSource) return;

        const drawInteraction = new Draw({
            source: vectorSource,
            type: "Point",
            style: new Style({
                image: new CircleStyle({
                    radius: 8,
                    fill: new Fill({ color: COMPONENT_TYPES[nodeType]?.color || "#28a745" }),
                    stroke: new Stroke({ color: "#ffffff", width: 2 }),
                }),
            }),
        });

        drawInteraction.on("drawend", (event) => {
            const feature = event.feature;
            const id = generateUniqueId(nodeType as any);

            feature.setId(id);
            feature.set("type", nodeType);
            feature.set("isNew", true);
            feature.setProperties({
                ...COMPONENT_TYPES[nodeType].defaultProperties,
                label: `${COMPONENT_TYPES[nodeType].name}-${id}`,
            });
            feature.set("connectedLinks", []);

            addFeature(feature);
            console.log(`${COMPONENT_TYPES[nodeType].name} added: ${id}`);
        });

        map.addInteraction(drawInteraction);
        drawInteractionRef.current = drawInteraction;
        map.getViewport().style.cursor = "crosshair";
    };

    /**
     * Setup link drawing (Pump, Valve)
     */
    const setupLinkDrawing = (linkType: string) => {
        if (!map || !vectorSource) return;

        const drawInteraction = new Draw({
            source: vectorSource,
            type: "LineString",
            maxPoints: 2, // Links are always straight lines between two nodes
            style: new Style({
                stroke: new Stroke({
                    color: COMPONENT_TYPES[linkType]?.color || "#ef4444",
                    width: 3,
                    lineDash: [8, 4],
                }),
            }),
        });

        drawInteraction.on("drawend", (event) => {
            const feature = event.feature;
            const geometry = feature.getGeometry() as LineString;
            const coordinates = geometry.getCoordinates();

            if (coordinates.length !== 2) {
                console.error("Link must connect exactly two points");
                vectorSource.removeFeature(feature);
                return;
            }

            // Find or create nodes at endpoints
            const startNode = findOrCreateNodeAt(coordinates[0], "junction");
            const endNode = findOrCreateNodeAt(coordinates[1], "junction");

            const id = generateUniqueId(linkType as any);

            feature.setId(id);
            feature.set("type", linkType);
            feature.set("isNew", true);
            feature.setProperties({
                ...COMPONENT_TYPES[linkType].defaultProperties,
                label: `${COMPONENT_TYPES[linkType].name}-${id}`,
                startNodeId: startNode.getId(),
                endNodeId: endNode.getId(),
            });

            // Update node connections
            useNetworkStore.getState().updateNodeConnections(startNode.getId() as string, id, "add");
            useNetworkStore.getState().updateNodeConnections(endNode.getId() as string, id, "add");

            addFeature(feature);
            console.log(`${COMPONENT_TYPES[linkType].name} added: ${id}`);
        });

        map.addInteraction(drawInteraction);
        drawInteractionRef.current = drawInteraction;
        map.getViewport().style.cursor = "crosshair";
    };

    /**
     * Find existing node at coordinate or create new one
     */
    const findOrCreateNodeAt = (coordinate: number[], nodeType: string): Feature => {
        if (!vectorSource) throw new Error("Vector source not available");

        const tolerance = SNAPPING_TOLERANCE;
        const features = vectorSource.getFeatures();

        // Search for existing node
        const existingNode = features.find((f) => {
            if (!["junction", "tank", "reservoir"].includes(f.get("type"))) return false;

            const geometry = f.getGeometry();
            if (geometry instanceof Point) {
                const nodeCoord = geometry.getCoordinates();
                const distance = Math.sqrt(
                    Math.pow(nodeCoord[0] - coordinate[0], 2) +
                    Math.pow(nodeCoord[1] - coordinate[1], 2)
                );
                return distance < tolerance;
            }
            return false;
        });

        if (existingNode) {
            return existingNode as Feature;
        }

        // Create new node
        const newNode = new Feature({
            geometry: new Point(coordinate),
        });

        const id = useNetworkStore.getState().generateUniqueId(nodeType as any);
        newNode.setId(id);
        newNode.set("type", nodeType);
        newNode.set("isNew", true);
        newNode.set("autoCreated", true);
        newNode.setProperties({
            ...COMPONENT_TYPES[nodeType].defaultProperties,
            label: `Auto-${COMPONENT_TYPES[nodeType].name}-${id}`,
        });
        newNode.set("connectedLinks", []);

        vectorSource.addFeature(newNode);
        useNetworkStore.getState().addFeature(newNode);

        return newNode;
    };

    /**
     * Enable/disable context menu
     */
    const setContextMenuEnabled = useCallback((enabled: boolean) => {
        contextMenuManagerRef.current?.setEnabled(enabled);
    }, []);

    /**
     * Undo last modification
     */
    const undoLastModification = useCallback(() => {
        modifyManagerRef.current?.undoLastModification();
    }, []);



    return {
        pipeDrawingManager: pipeDrawingManagerRef.current,
        modifyManager: modifyManagerRef.current,
        deleteManager: deleteManagerRef.current,
        contextMenuManager: contextMenuManagerRef.current,
        setContextMenuEnabled,
        undoLastModification,
        cleanupInteractions,
    };
}
