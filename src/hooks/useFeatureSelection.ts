"use client";
import { useEffect, useCallback, useRef } from "react";
import { Feature } from "ol";
import { Select, DragBox, Draw } from "ol/interaction";
import { click, pointerMove, shiftKeyOnly, platformModifierKeyOnly, always, never } from "ol/events/condition";
import Map from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";
import { getSelectedStyle } from "@/lib/styles/featureStyles";

interface UseFeatureSelectionOptions {
    map: Map | null;
    vectorLayer: VectorLayer<any> | null;
    onFeatureSelect?: (feature: Feature | null) => void;
    onFeatureHover?: (feature: Feature | null) => void;
    enableHover?: boolean;
}

export function useFeatureSelection({
    map,
    vectorLayer,
    onFeatureSelect,
    onFeatureHover,
    enableHover,
}: UseFeatureSelectionOptions) {

    // Subscribe to the store's selected IDs
    const selectedFeatureId = useNetworkStore((state) => state.selectedFeatureId);
    const selectedFeatureIds = useNetworkStore((state) => state.selectedFeatureIds);

    const selectFeatures = useNetworkStore((state) => state.selectFeatures);
    const selectFeature = useNetworkStore((state) => state.selectFeature);

    const { activeTool } = useUIStore();

    const selectInteractionRef = useRef<Select | null>(null);
    const dragBoxInteractionRef = useRef<DragBox | null>(null);
    const drawPolygonInteractionRef = useRef<Draw | null>(null);
    const hoverInteractionRef = useRef<Select | null>(null);
    const selectedFeatureRef = useRef<Feature | null>(null);

    // Helper: Select feature by ID programmatically
    const selectFeatureById = useCallback(
        (featureId: string | null) => {
            if (!selectInteractionRef.current || !vectorLayer) return;

            const features = selectInteractionRef.current.getFeatures();

            if (featureId) {
                const feature = vectorLayer.getSource()?.getFeatures().find((f: any) => f.getId() === featureId);
                if (feature) {
                    // Avoid clearing if already selected (preserves multi-select state if needed)
                    if (!features.getArray().includes(feature)) {
                        features.clear();
                        features.push(feature);
                    }
                    selectedFeatureRef.current = feature;
                    onFeatureSelect?.(feature);
                }
            } else {
                features.clear();
                selectedFeatureRef.current = null;
                onFeatureSelect?.(null);
            }
        },
        [vectorLayer, onFeatureSelect]
    );

    // Helper: Clear all selection
    const clearSelection = useCallback(() => {
        if (selectInteractionRef.current) {
            selectInteractionRef.current.getFeatures().clear();
        }
        selectedFeatureRef.current = null;
        selectFeature(null);
        onFeatureSelect?.(null);
    }, [selectFeature, onFeatureSelect]);

    // 1. MAIN SELECTION LOGIC
    useEffect(() => {
        if (!map || !vectorLayer) return;

        // Cleanup previous interactions
        if (selectInteractionRef.current) map.removeInteraction(selectInteractionRef.current);
        if (dragBoxInteractionRef.current) map.removeInteraction(dragBoxInteractionRef.current);
        if (drawPolygonInteractionRef.current) map.removeInteraction(drawPolygonInteractionRef.current);

        const isSelectionMode = ['select', 'select-box', 'select-polygon'].includes(activeTool || '');

        if (!isSelectionMode) {
            selectInteractionRef.current = null;
            // return;
        }

        // --- Standard Click Selection ---
        const selectInteraction = new Select({
            layers: [vectorLayer],
            // Disable click selection while drawing polygon to prevent conflicts
            // condition: activeTool === 'select-polygon' ? never : (e) => click(e) || (click(e) && (shiftKeyOnly(e) || platformModifierKeyOnly(e))),

            // If tool is PAN, condition returns false -> Interaction ignores clicks -> Pan works!
            // If tool is SELECT, condition returns true -> Interaction handles clicks.
            condition: (e) => {
                const isSelectTool = ['select', 'select-box', 'select-polygon'].includes(activeTool || '');
                if (!isSelectTool) return false; // Block selection events if Panning/Drawing
                
                // Standard click handling
                return click(e) || (click(e) && (shiftKeyOnly(e) || platformModifierKeyOnly(e)));
            },

            // Use the new Multi-Style function
            style: (feature) => getSelectedStyle(feature as Feature),

            filter: (feature) => !feature.get("isPreview") && !feature.get("isVertexMarker") && !feature.get("isVisualLink"),
            multi: true,

            // Add Hit Tolerance (makes selecting small nodes easier)
            hitTolerance: 5,
        });

        selectInteraction.on("select", (event) => {
            const collection = event.target.getFeatures();
            const selectedFeatures = collection.getArray();

            // 1. Check for High Priority Features (Pumps/Valves)
            const hasDevice = selectedFeatures.some((f: Feature) =>
                ['pump', 'valve'].includes(f.get('type'))
            );

            if (hasDevice) {
                // If a device is clicked, prioritize it over everything else (Nodes/Pipes)
                // Remove anything that is NOT a pump or valve
                const toRemove = selectedFeatures.filter((f: Feature) =>
                    !['pump', 'valve'].includes(f.get('type'))
                );
                toRemove.forEach((f: Feature) => collection.remove(f));
            } else {
                // 2. If no device, check for Nodes
                const hasNode = selectedFeatures.some((f: Feature) =>
                    ['junction', 'tank', 'reservoir'].includes(f.get('type'))
                );

                if (hasNode) {
                    // If a Node is clicked, prioritize it over Pipes
                    // Remove only Pipes
                    const linksToRemove = selectedFeatures.filter((f: Feature) =>
                        f.get('type') === 'pipe'
                    );
                    linksToRemove.forEach((link: Feature) => {
                        collection.remove(link);
                    });
                }
            }

            // Re-fetch the cleaned array
            const finalSelection = collection.getArray();
            const ids = finalSelection.map((f: Feature) => f.getId() as string);

            selectFeatures(ids);

            // Update primary selection (last selected)
            if (finalSelection.length > 0) {
                const feature = finalSelection[finalSelection.length - 1];
                selectedFeatureRef.current = feature;
                onFeatureSelect?.(feature);
            } else {
                selectedFeatureRef.current = null;
                onFeatureSelect?.(null);
            }
        });

        map.addInteraction(selectInteraction);
        selectInteractionRef.current = selectInteraction;

        // --- Box Selection ---
        if (activeTool === 'select-box') {
            const dragBox = new DragBox({
                condition: always, // Active immediately without modifiers
                className: 'ol-dragbox', // Requires CSS
            });

            dragBox.on('boxend', () => {
                const extent = dragBox.getGeometry().getExtent();
                const source = vectorLayer.getSource();
                if (!source) return;

                const selectedFeatures: Feature[] = [];
                source.forEachFeatureIntersectingExtent(extent, (feature: any) => {
                    if (feature.get("isPreview") || feature.get("isVertexMarker") || feature.get("isVisualLink")) return;
                    selectedFeatures.push(feature as Feature);
                });

                if (selectedFeatures.length > 0) {
                    const currentSelection = selectInteraction.getFeatures();
                    currentSelection.clear(); // Replace selection
                    selectedFeatures.forEach(f => currentSelection.push(f));
                    selectFeatures(selectedFeatures.map(f => f.getId() as string));
                }
            });

            map.addInteraction(dragBox);
            dragBoxInteractionRef.current = dragBox;
            map.getViewport().style.cursor = "crosshair";
        }

        // --- Polygon Selection ---
        if (activeTool === 'select-polygon') {
            const draw = new Draw({
                source: new VectorSource(), // Temporary source
                type: 'Polygon',
            });

            draw.on('drawend', (evt) => {
                const polygonGeometry = evt.feature.getGeometry();
                if (!polygonGeometry) return;

                const source = vectorLayer.getSource();
                const selectedFeatures: Feature[] = [];

                if (source) {
                    source.getFeatures().forEach((feature: any) => {
                        if (feature.get("isPreview") || feature.get("isVertexMarker") || feature.get("isVisualLink")) return;

                        const geometry = feature.getGeometry();
                        if (geometry && geometry.intersectsExtent(polygonGeometry.getExtent())) {
                            // Simple extent check for performance. For strict polygon containment, usage of JSTS or Turf is required.
                            selectedFeatures.push(feature as Feature);
                        }
                    });
                }

                if (selectedFeatures.length > 0) {
                    const currentSelection = selectInteraction.getFeatures();
                    currentSelection.clear();
                    selectedFeatures.forEach(f => currentSelection.push(f));
                    selectFeatures(selectedFeatures.map(f => f.getId() as string));
                }
            });

            map.addInteraction(draw);
            drawPolygonInteractionRef.current = draw;
            map.getViewport().style.cursor = "crosshair";
        }

        return () => {
            if (selectInteractionRef.current) map.removeInteraction(selectInteractionRef.current);
            if (dragBoxInteractionRef.current) map.removeInteraction(dragBoxInteractionRef.current);
            if (drawPolygonInteractionRef.current) map.removeInteraction(drawPolygonInteractionRef.current);
            map.getViewport().style.cursor = "default";
        };
    }, [map, vectorLayer, activeTool, selectFeature, selectFeatures, onFeatureSelect]);

    // 2. HOVER INTERACTION
    useEffect(() => {
        if (!map || !vectorLayer || !enableHover) return;
        if (activeTool === 'pan' || activeTool === 'select-polygon' || activeTool === 'select-box') return;

        let hoveredFeature: Feature | null = null;

        const hoverInteraction = new Select({
            layers: [vectorLayer],
            condition: pointerMove,
            filter: (feature) => !feature.get("isPreview"),
        });

        hoverInteraction.on("select", (event) => {
            if (hoveredFeature && hoveredFeature !== selectedFeatureRef.current) {
                hoveredFeature.set("isHovered", false);
            }
            if (event.selected.length > 0) {
                const feature = event.selected[0];
                if (feature !== selectedFeatureRef.current) {
                    feature.set("isHovered", true);
                    hoveredFeature = feature;
                    onFeatureHover?.(feature);
                    map.getViewport().style.cursor = "pointer";
                }
            } else {
                hoveredFeature = null;
                onFeatureHover?.(null);
                map.getViewport().style.cursor = activeTool === 'select' ? "default" : "crosshair";
            }
        });

        map.addInteraction(hoverInteraction);
        hoverInteractionRef.current = hoverInteraction;

        return () => {
            if (hoverInteraction) map.removeInteraction(hoverInteraction);
        };
    }, [map, vectorLayer, enableHover, activeTool, onFeatureHover]);

    // 3. EXTERNAL SYNC
    useEffect(() => {
        if (selectedFeatureId && selectedFeatureId !== selectedFeatureRef.current?.getId()) {
            selectFeatureById(selectedFeatureId);
        } else if (!selectedFeatureId && selectedFeatureRef.current) {
            // Check if store is truly empty before clearing
            if (useNetworkStore.getState().selectedFeatureIds.length === 0) {
                clearSelection();
            }
        }
    }, [selectedFeatureId, selectFeatureById, clearSelection]);

    useEffect(() => {
        const select = selectInteractionRef.current;
        if (!select || !vectorLayer) return;

        const source = vectorLayer.getSource();
        if (!source) return;

        const selectedCollection = select.getFeatures();

        // Create a set of IDs currently highlighted on the map
        const currentMapIds = new Set(selectedCollection.getArray().map(f => f.getId()));

        // Create a set of IDs that SHOULD be highlighted (from Store)
        const targetIds = new Set(selectedFeatureIds);

        // A. Remove features that are no longer selected
        const toRemove: Feature[] = [];
        selectedCollection.forEach((f) => {
            if (!targetIds.has(f.getId() as string)) {
                toRemove.push(f);
            }
        });
        toRemove.forEach((f) => selectedCollection.remove(f));

        // B. Add features that are new selections
        selectedFeatureIds.forEach((id) => {
            if (!currentMapIds.has(id)) {
                const feature = source.getFeatureById(id);
                if (feature) {
                    selectedCollection.push(feature);
                }
            }
        });

    }, [selectedFeatureIds, vectorLayer]);

    return {
        selectedFeature: selectedFeatureRef.current,
        selectFeatureById,
        clearSelection,
    };
}