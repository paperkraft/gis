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
    enableHover = true,
}: UseFeatureSelectionOptions) {
    const { selectFeature, selectFeatures, selectedFeatureId } = useNetworkStore();
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
            return;
        }

        // --- Standard Click Selection ---
        const selectInteraction = new Select({
            layers: [vectorLayer],
            // Disable click selection while drawing polygon to prevent conflicts
            condition: (e) => {
                // DISABLE user selection if tool is 'pan' or 'draw' or 'modify'
                if (activeTool === 'pan' || activeTool === 'draw' || activeTool === 'modify' || activeTool === 'zoom-box') {
                    return false;
                }

                // Normal selection logic for 'select' tool
                if (activeTool === 'select-polygon' || activeTool === 'select-box') return false;
                return click(e) || (click(e) && (shiftKeyOnly(e) || platformModifierKeyOnly(e)));
            },
            style: (feature) => getSelectedStyle(feature as Feature),
            filter: (feature) => !feature.get("isPreview") && !feature.get("isVertexMarker") && !feature.get("isVisualLink"),
            multi: true,
        });

        selectInteraction.on("select", (event) => {
            const selectedFeatures = event.target.getFeatures().getArray();
            const ids = selectedFeatures.map((f: Feature) => f.getId() as string);

            selectFeatures(ids);

            // Update primary selection (last selected)
            if (selectedFeatures.length > 0) {
                const feature = selectedFeatures[selectedFeatures.length - 1];
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

    return {
        selectedFeature: selectedFeatureRef.current,
        selectFeatureById,
        clearSelection,
    };
}