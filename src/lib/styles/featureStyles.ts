import { Feature } from 'ol';
import { Circle as CircleStyle, Fill, RegularShape, Stroke, Style, Text } from 'ol/style';
import { COMPONENT_TYPES } from '@/constants/networkComponents';
import { useSimulationStore } from '@/store/simulationStore';
import { useStyleStore } from '@/store/styleStore';
import { FeatureType } from '@/types/network';
import { createSegmentArrows } from './pipeArrowStyles';
import { useMapStore } from '@/store/mapStore';
import { useUIStore } from '@/store/uiStore';
import { interpolateColor } from './helper';

// Main Color Function
function getColor(value: number, min: number, max: number): string {
    if (value === undefined || value === null || isNaN(value)) return '#999';

    const { gradientStops, styleType, classCount } = useStyleStore.getState();

    // Normalize value to 0..100
    let t = ((value - min) / (max - min)) * 100;
    t = Math.max(0, Math.min(100, t));

    if (styleType === 'discrete') {
        // Quantize 't' into bins
        // e.g., 5 classes = 20% width per bin.
        // We use the CENTER of the bin to pick the color.
        const step = 100 / classCount;
        const binIndex = Math.min(Math.floor(t / step), classCount - 1);
        const binCenter = (binIndex * step) + (step / 2);

        return interpolateColor(binCenter, gradientStops);
    }

    return interpolateColor(t, gradientStops);
}

export const getFeatureStyle = (feature: Feature): Style | Style[] => {
    const featureType = feature.get("type") as FeatureType;
    const isHidden = feature.get("hidden");
    const featureId = feature.getId() as string;

    if (isHidden) return new Style({});
    if (feature.get("isVisualLink")) return getVisualLinkStyle(feature);
    if (feature.get("isPreview")) return feature.getStyle() as Style;
    if (feature.get("isVertexMarker")) return feature.getStyle() as Style;

    const config = COMPONENT_TYPES[featureType];
    if (!config) return new Style({});

    // --- THEMATIC COLORING LOGIC ---
    const { colorMode, labelMode, minMax } = useStyleStore.getState();
    const { results, history, currentTimeIndex } = useSimulationStore.getState();
    const { showLabels, showPipeArrows } = useUIStore.getState();

    const activeResults = (history && history.snapshots[currentTimeIndex])
        ? history.snapshots[currentTimeIndex]
        : results;

    let color = config.color; // Default component color
    let labelText = feature.get("label") || featureId;
    let strokeWidth = 2;

    // 1. Calculate Dynamic Color
    let value: number | null = null;
    let range = { min: 0, max: 100 };

    if (['junction', 'tank', 'reservoir'].includes(featureType)) {
        if (colorMode === 'pressure' && activeResults?.nodes[featureId]) {
            value = activeResults.nodes[featureId].pressure;
            range = minMax.pressure;
        } else if (colorMode === 'head' && activeResults?.nodes[featureId]) {
            value = activeResults.nodes[featureId].head;
            range = minMax.head || { min: 0, max: 200 };
        }
    } else if (featureType === 'pipe') {
        const diameter = feature.get('diameter');
        strokeWidth = Math.max(1.5, Math.min(diameter / 100, 8));

        if (colorMode === 'velocity' && activeResults?.links[featureId]) {
            value = activeResults.links[featureId].velocity;
            range = minMax.velocity;
        } else if (colorMode === 'flow' && activeResults?.links[featureId]) {
            value = Math.abs(activeResults.links[featureId].flow);
            range = minMax.flow || { min: 0, max: 1000 };
        } else if (colorMode === 'diameter') {
            value = diameter;
            range = minMax.diameter;
        } else if (colorMode === 'roughness') {
            value = feature.get('roughness');
            range = minMax.roughness;
        }
    }

    if (value !== null && colorMode !== 'none') {
        color = getColor(value, range.min, range.max);
    }

    // 2. Calculate Label
    if (labelMode === 'elevation' && ['junction', 'tank', 'reservoir'].includes(featureType)) {
        labelText = `${feature.get('elevation')}m`;
    } else if (labelMode === 'diameter' && featureType === 'pipe') {
        labelText = `${feature.get('diameter')}mm`;
    } else if (labelMode === 'result') {
        if (value !== null) labelText = value.toFixed(2);
    }

    // --- APPLY STYLES (Preserving Shapes) ---

    const textStyle = showLabels ? new Text({
        text: labelText?.toString(),
        font: '10px "Inter", sans-serif',
        fill: new Fill({ color: '#374151' }),
        stroke: new Stroke({ color: '#FFFFFF', width: 3 }),
        offsetY: featureType === 'pipe' ? 15 : 15,
        overflow: true,
    }) : undefined;

    // PIPE
    if (featureType === "pipe") {
        const baseStyle = new Style({
            stroke: new Stroke({ color: color, width: strokeWidth }),
            text: textStyle,
            zIndex: 99,
        });

        if (showPipeArrows) {
            return [baseStyle, ...createSegmentArrows(feature)];
        }
        return baseStyle;
    }

    // TANK (Pentagon)
    if (featureType === "tank") {
        return new Style({
            image: new RegularShape({
                fill: new Fill({ color: color }),
                stroke: new Stroke({ color: "#ffffff", width: 2 }),
                points: 5,
                radius: 12,
                angle: 0,
            }),
            text: textStyle,
            zIndex: 100,
        });
    }

    // RESERVOIR (Hexagon)
    if (featureType === "reservoir") {
        return new Style({
            image: new RegularShape({
                fill: new Fill({ color: color }),
                stroke: new Stroke({ color: "#ffffff", width: 2 }),
                points: 6,
                radius: 12,
                angle: 0,
            }),
            text: textStyle,
            zIndex: 100,
        });
    }

    // PUMP (Triangle)
    if (featureType === "pump") {
        return new Style({
            image: new RegularShape({
                fill: new Fill({ color: color }),
                stroke: new Stroke({ color: "#ffffff", width: 2 }),
                points: 3,
                radius: 10,
                // angle: Math.PI / 4, 
            }),
            text: textStyle,
            zIndex: 100,
        });
    }

    // VALVE (Diamond / X)
    if (featureType === "valve") {
        return new Style({
            image: new RegularShape({
                fill: new Fill({ color: color }),
                stroke: new Stroke({ color: "#ffffff", width: 2 }),
                points: 4,
                radius: 10,
                angle: Math.PI / 4,
            }),
            text: textStyle,
            zIndex: 100,
        });
    }

    // JUNCTION (Circle - Default)
    // Also handles special case for "Connector Nodes" if needed
    if (isJunctionConnectedToLink(feature)) {
        return new Style({
            image: new CircleStyle({
                radius: 4,
                fill: new Fill({ color: "#D1D5DB" }), // Keep connectors gray/neutral
                stroke: new Stroke({ color: "#6B7280", width: 1 }),
            }),
            zIndex: 100,
        });
    }

    return new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: color }),
            stroke: new Stroke({ color: "#FFFFFF", width: 2 }),
        }),
        text: textStyle,
        zIndex: 100,
    });
};

export const getSelectedStyle = (feature: Feature): Style[] => {
    const featureType = feature.get("type");
    const styles: Style[] = [];

    // Halo
    if (featureType === "pipe") {
        styles.push(new Style({
            stroke: new Stroke({ color: "rgba(250, 204, 21, 0.6)", width: 12 }),
            zIndex: 199,
        }));
    } else {
        styles.push(new Style({
            image: new CircleStyle({
                radius: 18,
                fill: new Fill({ color: "rgba(250, 204, 21, 0.5)" }),
                stroke: new Stroke({ color: "rgba(250, 204, 21, 1)", width: 2 }),
            }),
            zIndex: 199,
        }));
    }

    // Base Style (Dynamic)
    const baseStyles = getFeatureStyle(feature);
    if (Array.isArray(baseStyles)) {
        baseStyles.forEach(s => s.setZIndex(200));
        styles.push(...baseStyles);
    } else {
        baseStyles.setZIndex(200);
        styles.push(baseStyles);
    }

    return styles;
};

function getVisualLinkStyle(feature: Feature): Style {
    const linkType = feature.get("linkType");
    const color = linkType === "pump" ? "#F59E0B" : "#EC4899";
    return new Style({
        stroke: new Stroke({ color: color, width: 2, lineDash: [6, 4] }),
        zIndex: 98,
    });
}

// Helper to detect if a junction is just a connector for a pump/valve
export function isJunctionConnectedToLink(junction: Feature): boolean {
    const junctionId = junction.getId() as string;
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