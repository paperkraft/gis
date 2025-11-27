"use client";
import { useEffect, useCallback, useRef } from "react";
import { Feature } from "ol";
import { Select } from "ol/interaction";
import { click, pointerMove } from "ol/events/condition";
import Map from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";

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
    const { selectFeature, selectedFeatureId } = useNetworkStore();
    const { activeTool } = useUIStore();

    const selectInteractionRef = useRef<Select | null>(null);
    const hoverInteractionRef = useRef<Select | null>(null);
    const selectedFeatureRef = useRef<Feature | null>(null);

    /**
     * Get currently selected feature
     */
    const getSelectedFeature = useCallback((): Feature | null => {
        return selectedFeatureRef.current;
    }, []);

    /**
     * Select a feature by ID
     */
    const selectFeatureById = useCallback(
        (featureId: string | null) => {
            if (!selectInteractionRef.current) return;

            const features = selectInteractionRef.current.getFeatures();
            features.clear();

            if (featureId && vectorLayer) {
                const feature = vectorLayer
                    .getSource()
                    ?.getFeatures()
                    .find((f: any) => f.getId() === featureId);

                if (feature) {
                    features.push(feature);
                    selectedFeatureRef.current = feature;
                    selectFeature(featureId);
                    onFeatureSelect?.(feature);
                }
            } else {
                selectedFeatureRef.current = null;
                selectFeature(null);
                onFeatureSelect?.(null);
            }
        },
        [vectorLayer, selectFeature, onFeatureSelect]
    );

    /**
     * Clear selection
     */
    const clearSelection = useCallback(() => {
        if (selectInteractionRef.current) {
            selectInteractionRef.current.getFeatures().clear();
        }
        selectedFeatureRef.current = null;
        selectFeature(null);
        onFeatureSelect?.(null);
    }, [selectFeature, onFeatureSelect]);

    /**
     * Get all selected features (for multi-select)
     */
    const getSelectedFeatures = useCallback((): Feature[] => {
        if (!selectInteractionRef.current) return [];
        return selectInteractionRef.current.getFeatures().getArray();
    }, []);

    /**
     * Initialize select interaction
     */
    useEffect(() => {
        if (!map || !vectorLayer) return;

        // Only enable select interaction when in select mode
        if (activeTool !== "select") {
            if (selectInteractionRef.current) {
                map.removeInteraction(selectInteractionRef.current);
                selectInteractionRef.current = null;
            }
            return;
        }

        // Create select interaction
        const selectInteraction = new Select({
            layers: [vectorLayer],
            condition: click,
            filter: (feature) => !feature.get("isPreview"),
            multi: false, // Single selection
            hitTolerance: 5,
        });

        // Handle selection change
        selectInteraction.on("select", (event) => {
            if (event.selected.length > 0) {
                const feature = event.selected[0];
                const featureId = feature.getId() as string;
                selectedFeatureRef.current = feature;
                selectFeature(featureId);
                onFeatureSelect?.(feature);
            } else {
                selectedFeatureRef.current = null;
                selectFeature(null);
                onFeatureSelect?.(null);
            }
        });

        map.addInteraction(selectInteraction);
        selectInteractionRef.current = selectInteraction;

        return () => {
            if (selectInteraction) {
                map.removeInteraction(selectInteraction);
            }
        };
    }, [map, vectorLayer, activeTool, selectFeature, onFeatureSelect]);

    /**
     * Initialize hover interaction (optional)
     */
    useEffect(() => {
        if (!map || !vectorLayer || !enableHover) return;

        let hoveredFeature: Feature | null = null;

        const hoverInteraction = new Select({
            layers: [vectorLayer],
            condition: pointerMove,
            filter: (feature) => !feature.get("isPreview"),
        });

        hoverInteraction.on("select", (event) => {
            // Clear previous hover
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
                map.getViewport().style.cursor = activeTool === "select" ? "default" : "crosshair";
            }
        });

        map.addInteraction(hoverInteraction);
        hoverInteractionRef.current = hoverInteraction;

        return () => {
            if (hoverInteraction) {
                map.removeInteraction(hoverInteraction);
            }
            map.getViewport().style.cursor = "default";
        };
    }, [map, vectorLayer, enableHover, activeTool, onFeatureHover]);

    /**
     * Sync with external selection changes
     */
    useEffect(() => {
        if (selectedFeatureId && selectedFeatureId !== selectedFeatureRef.current?.getId()) {
            selectFeatureById(selectedFeatureId);
        } else if (!selectedFeatureId && selectedFeatureRef.current) {
            clearSelection();
        }
    }, [selectedFeatureId, selectFeatureById, clearSelection]);

    return {
        selectedFeature: selectedFeatureRef.current,
        selectFeatureById,
        clearSelection,
        getSelectedFeature,
        getSelectedFeatures,
    };
}