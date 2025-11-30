import { Feature } from 'ol';
import { Circle as CircleStyle, Fill, RegularShape, Stroke, Style, Text } from 'ol/style';

import { COMPONENT_TYPES } from '@/constants/networkComponents';
import { useMapStore } from '@/store/mapStore';
import { useUIStore } from '@/store/uiStore';
import { FeatureType } from '@/types/network';

import { createSegmentArrows } from './pipeArrowStyles';

export const getFeatureStyle = (feature: Feature): Style | Style[] => {
    const featureType = feature.get("type") as FeatureType;
    const isHidden = feature.get("hidden");

    // 1. Handle hidden state
    if (isHidden) return new Style({});

    // 2. Handle visual helpers (link lines, previews, vertex markers)
    if (feature.get("isVisualLink")) return getVisualLinkStyle(feature);
    if (feature.get("isPreview")) return feature.getStyle() as Style;
    if (feature.get("isVertexMarker")) return feature.getStyle() as Style;

    // 3. Base Configuration
    const config = COMPONENT_TYPES[featureType];
    if (!config) return new Style({});

    const label = feature.get("label") || feature.getId();
    const status = feature.get("status");
    const isInactive = status === "closed" || status === "inactive" || status === "stopped";

    // Use gray color if inactive, otherwise component color
    const color = isInactive ? "#9CA3AF" : config.color;

    // Check if labels are enabled
    const { showPipeArrows, showLabels } = useUIStore.getState();

    // Text Style for Labels
    const textStyle = showLabels ? new Text({
        text: label?.toString(),
        font: '10px "Inter", sans-serif',
        fill: new Fill({ color: '#374151' }),
        stroke: new Stroke({ color: '#FFFFFF', width: 3 }),
        offsetY: featureType === 'pipe' ? 0 : 15,
        overflow: true,
    }) : undefined

    // --- PIPE STYLING ---
    if (featureType === "pipe") {
        const diameter = feature.get("diameter") || 300;
        // Scale width: 100mm -> 2px, 1000mm -> 8px
        const width = Math.max(1.5, Math.min(diameter / 100, 8));

        const baseStyle = new Style({
            stroke: new Stroke({
                color: color,
                width: width,
                lineDash: isInactive ? [10, 5] : undefined, // Dashed if closed
            }),
            text: textStyle,
            zIndex: 99,
        });

        // Add Arrows if enabled
        if (showPipeArrows && !isInactive) {
            // Use single arrow for short pipes or low zoom, segments for others
            // For now defaulting to segments as it's clearer
            const arrowStyles = createSegmentArrows(feature);
            return [baseStyle, ...arrowStyles];
        }

        return baseStyle;
    }

    // --- NODE STYLING (Junctions) ---
    if (featureType === "junction") {
        // Special style for junctions that are just connectors for pumps/valves
        if (isJunctionConnectedToLink(feature)) {
            return new Style({
                image: new CircleStyle({
                    radius: 4,
                    fill: new Fill({ color: "#D1D5DB" }), // Light gray
                    stroke: new Stroke({ color: "#6B7280", width: 1 }),
                }),
                zIndex: 100,
            });
        }

        return new Style({
            image: new CircleStyle({
                radius: 8,
                fill: new Fill({ color: color }),
                stroke: new Stroke({ color: "#FFFFFF", width: 2 }),
            }),
            text: textStyle,
            zIndex: 100,
        });
    }

    // --- TANK STYLING ---
    if (featureType === "tank") {
        return new Style({
            image: new RegularShape({
                fill: new Fill({ color: color }),
                stroke: new Stroke({ color: "#ffffff", width: 2 }),
                points: 4,
                radius: 12,
                angle: 0,
            }),
            text: textStyle,
            zIndex: 100,
        });
    }

    // --- RESERVOIR STYLING ---
    if (featureType === "reservoir") {
        return new Style({
            image: new RegularShape({
                fill: new Fill({ color: color }),
                stroke: new Stroke({ color: "#ffffff", width: 2 }),
                points: 6,
                radius: 14,
                angle: 0,
                rotation: 0,
            }),
            text: textStyle,
            zIndex: 100,
        });
    }

    // --- PUMP STYLING ---
    if (featureType === "pump") {
        return new Style({
            image: new RegularShape({
                fill: new Fill({ color: color }),
                stroke: new Stroke({ color: "#ffffff", width: 2 }),
                points: 3,
                radius: 10,
                // angle: Math.PI / 4, // Diamond shape
                // radius2: 0, // Makes it a diamond
            }),
            text: textStyle,
            zIndex: 100,
        });
    }

    // --- VALVE STYLING ---
    if (featureType === "valve") {
        return new Style({
            image: new RegularShape({
                fill: new Fill({ color: color }),
                stroke: new Stroke({ color: "#ffffff", width: 2 }),
                points: 4,
                radius: 10,
                angle: Math.PI / 4,
                // radius2: 4, // Creates an X or Bowtie shape
            }),
            text: textStyle,
            zIndex: 100,
        });
    }

    return new Style({});
};


// Style for the selection highlight (Gold/Orange halo)
export const getSelectedStyle = (feature: Feature): Style => {
    const featureType = feature.get("type");

    if (featureType === "pipe") {
        return new Style({
            stroke: new Stroke({
                color: "rgba(250, 204, 21, 0.8)", // Yellow-400
                width: 10, // Wide halo
            }),
            zIndex: 90,
        });
    }

    return new Style({
        image: new CircleStyle({
            radius: 16,
            fill: new Fill({ color: "rgba(250, 204, 21, 0.4)" }),
            stroke: new Stroke({ color: "rgba(250, 204, 21, 1)", width: 2 }),
        }),
        zIndex: 90,
    });
};

// Helper for visual link lines (dashed line connecting pump/valve nodes)
function getVisualLinkStyle(feature: Feature): Style {
    const linkType = feature.get("linkType");
    const color = linkType === "pump" ? "#F59E0B" : "#EC4899";

    return new Style({
        stroke: new Stroke({
            color: color,
            width: 2,
            lineDash: [6, 4],
        }),
        zIndex: 98,
    });
}

// Utility to check if a junction is just a connector
export function isJunctionConnectedToLink(junction: Feature): boolean {
    const junctionId = junction.getId() as string;
    // We need safe access to the store here
    // In a real app, you might pass connections as a property to avoid store lookups in render loop
    // For now, this logic assumes properties are set on the feature
    const connectedLinks = junction.get("connectedLinks") || [];

    // Heuristic: If it's connected to a pump or valve, it's a connector
    // Note: This requires the feature to have updated 'connectedTypes' or similar
    // Or we rely on the caller/manager to mark it.

    // Fallback: Check global store (careful with performance)
    try {
        const { vectorSource } = useMapStore.getState();
        if (!vectorSource) return false;

        const links = vectorSource.getFeatures().filter(f => {
            const type = f.get('type');
            return (type === 'pump' || type === 'valve') &&
                (f.get('startNodeId') === junctionId || f.get('endNodeId') === junctionId);
        });

        return links.length > 0;
    } catch (e) {
        return false;
    }
}