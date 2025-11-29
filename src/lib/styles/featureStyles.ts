import { Feature } from 'ol';
import { Circle as CircleStyle, Fill, RegularShape, Stroke, Style } from 'ol/style';

import { COMPONENT_TYPES } from '@/constants/networkComponents';
import { useMapStore } from '@/store/mapStore';
import { useUIStore } from '@/store/uiStore';
import { FeatureType } from '@/types/network';

import { createSegmentArrows } from './pipeArrowStyles';

export const getFeatureStyle = (feature: Feature): Style | Style[] => {
    const featureType = feature.get("type") as FeatureType;

    // Handle visual link lines
    if (feature.get("isVisualLink")) {
        const linkType = feature.get("linkType");
        const color = linkType === "pump" ? "#F59E0B" : "#EC4899";

        return new Style({
            stroke: new Stroke({
                color: color,
                width: 4,
                lineDash: [8, 4],
            }),
            zIndex: 99,
        });
    }

    if (feature.get("isPreview") || feature.get("isVertexMarker")) {
        return feature.getStyle() as Style;
    }

    if (feature.get("hidden")) {
        return new Style({});
    }

    const config = COMPONENT_TYPES[featureType];
    if (!config) return new Style({});

    // PIPES - Lines with arrows
    if (featureType === "pipe") {
        const diameter = feature.get("diameter") || 300;
        const width = Math.max(2, Math.min(diameter / 100, 8));

        const baseStyle = new Style({
            stroke: new Stroke({
                color: config.color,
                width: width,
            }),
            zIndex: 99,
        });

        // Add arrows
        const { showPipeArrows } = useUIStore.getState();
        if (showPipeArrows) {
            const arrowStyles = createSegmentArrows(feature);
            return [baseStyle, ...arrowStyles];
        }

        return baseStyle;
    }

    // Special styling for junctions connected to pump/valve
    if (featureType === "junction") {
        const isLinkJunction = isJunctionConnectedToLink(feature);

        if (isLinkJunction) {
            // Style link junctions differently (locked appearance)
            return new Style({
                image: new CircleStyle({
                    radius: 6,
                    fill: new Fill({ color: "#9CA3AF" }), // Gray fill
                    stroke: new Stroke({
                        color: "#6B7280",
                        width: 2,
                        lineDash: [4, 4], // Dashed border to indicate "locked"
                    }),
                }),
                zIndex: 101,
            });
        }
    }

    if (featureType === "junction") {
        return new Style({
            image: new CircleStyle({
                radius: 8,
                fill: new Fill({ color: config.color }),
                stroke: new Stroke({ color: "#ffffff", width: 2 }),
            }),
            zIndex: 101,
        });
    } else if (featureType === "tank") {
        return new Style({
            image: new RegularShape({
                fill: new Fill({ color: config.color }),
                stroke: new Stroke({ color: "#ffffff", width: 2 }),
                points: 4,
                radius: 12,
            }),
            zIndex: 101,
        });
    } else if (featureType === "reservoir") {
        return new Style({
            image: new RegularShape({
                fill: new Fill({ color: config.color }),
                stroke: new Stroke({ color: "#ffffff", width: 2 }),
                points: 6,
                radius: 10,
            }),
            zIndex: 101,
        });
    } else if (featureType === "pump") {
        return new Style({
            image: new RegularShape({
                fill: new Fill({ color: config.color }),
                stroke: new Stroke({ color: "#ffffff", width: 2 }),
                points: 3,
                radius: 10,
            }),
            zIndex: 101,
        });
    } else if (featureType === "valve") {
        return new Style({
            image: new RegularShape({
                fill: new Fill({ color: config.color }),
                stroke: new Stroke({ color: "#ffffff", width: 2 }),
                points: 4,
                radius: 10,
                angle: Math.PI / 4,
            }),
            zIndex: 101,
        });
    }

    return new Style({});
};

export const getSelectedStyle = (feature: Feature): Style => {
    const featureType = feature.get("type");
    const config = COMPONENT_TYPES[featureType];

    if (featureType === "pipe") {
        return new Style({
            stroke: new Stroke({
                // color: "rgba(31, 184, 205, 0.9)",
                color: "rgba(255, 215, 0, 0.9)", // gold
                width: 6,
            }),
        });
    }

    return new Style({
        image: new CircleStyle({
            radius: 10,
            fill: new Fill({ color: config?.color || "#cccccc" }),
            stroke: new Stroke({ color: "#1FB8CD", width: 3 }),
        }),
    });
};

export function isJunctionConnectedToLink(junction: Feature): boolean {
    const junctionId = junction.getId() as string;
    const { vectorSource } = useMapStore.getState();
    const features = vectorSource?.getFeatures() || [];

    return features.some((feature) => {
        const type = feature.get("type");
        if (type !== "pump" && type !== "valve") {
            return false;
        }

        const startNodeId = feature.get("startNodeId");
        const endNodeId = feature.get("endNodeId");

        return startNodeId === junctionId || endNodeId === junctionId;
    });
}