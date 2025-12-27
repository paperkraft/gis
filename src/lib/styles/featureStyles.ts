import { Feature } from 'ol';
import { Circle as CircleStyle, Fill, RegularShape, Stroke, Style, Text } from 'ol/style';
import { COMPONENT_TYPES } from '@/constants/networkComponents';
import { useSimulationStore } from '@/store/simulationStore';
import { useStyleStore } from '@/store/styleStore';
import { FeatureType } from '@/types/network';
import { createSegmentArrows } from './pipeArrowStyles';
import { useMapStore } from '@/store/mapStore';
import { useUIStore } from '@/store/uiStore';
import { getColor, hexToRgba } from './helper';

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

    // 1. Get Stores
    const { colorMode, labelMode, minMax, layerStyles } = useStyleStore.getState();
    // const { results, history, currentTimeIndex } = useSimulationStore.getState();
    const { results } = useSimulationStore.getState();
    const { showLabels, showPipeArrows } = useUIStore.getState();

    // 2. Resolve Base Style (Uniform)
    const customStyle = layerStyles[featureType];

    // Default to uniform color first
    let color = customStyle?.color || config.color;

    let strokeWidth = customStyle?.width || 2;
    let pointRadius = customStyle?.radius || 6;
    let pointStrokeWidth = customStyle?.strokeWidth || 2;
    let opacity = customStyle?.opacity ?? 1;
    const isAutoScale = customStyle?.autoScale ?? false;

    // 3. SAFE DATA EXTRACTION (Fixes the crash)
    let activeSnapshot = results;

    let value: number | null = null;
    let range = { min: 0, max: 100 };

    // --- PIPES ---
    if (featureType === 'pipe') {
        const diameter = feature.get('diameter') || 100;

        // Auto Scale Logic (Overrides fixed width)
        if (isAutoScale) {
            strokeWidth = Math.max(1.5, Math.min(diameter / 50, 8));
        }

        // Color Mode Logic
        if (colorMode === 'diameter') {
            value = diameter;
            range = minMax.diameter || { min: 0, max: 500 };
        } else if (colorMode === 'roughness') {
            value = feature.get('roughness');
            range = minMax.roughness || { min: 80, max: 150 };
        } else if (colorMode === 'velocity' && activeSnapshot?.links[featureId]) {
            value = activeSnapshot.links[featureId].velocity;
            range = minMax.velocity;
        } else if (colorMode === 'flow' && activeSnapshot?.links[featureId]) {
            value = Math.abs(activeSnapshot.links[featureId].flow);
            range = minMax.flow;
        }
    }

    // --- NODES ---
    else if (['junction', 'tank', 'reservoir'].includes(featureType)) {
        if (colorMode === 'elevation') {
            value = feature.get('elevation');
            range = { min: 0, max: 100 };
        } else if (colorMode === 'pressure' && activeSnapshot?.nodes[featureId]) {
            value = activeSnapshot.nodes[featureId].pressure;
            range = minMax.pressure;
        } else if (colorMode === 'head' && activeSnapshot?.nodes[featureId]) {
            value = activeSnapshot.nodes[featureId].head;
            range = minMax.head;
        }
    }

    // 4. Apply Gradient Override
    if (value !== null && colorMode !== 'none') {
        color = getColor(value, range.min, range.max);
    }

    // 5. Finalize Color with Opacity
    const rgbaColor = hexToRgba(color, opacity);
    const borderRgba = hexToRgba('#FFFFFF', opacity);

    // 6. Labels
    let labelText = feature.get("label") || featureId;
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
            stroke: new Stroke({ color: rgbaColor, width: strokeWidth }),
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
                fill: new Fill({ color: rgbaColor }),
                stroke: new Stroke({ color: borderRgba, width: pointStrokeWidth }),
                points: 5,
                radius: pointRadius + 4,
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
                fill: new Fill({ color: rgbaColor }),
                stroke: new Stroke({ color: borderRgba, width: pointStrokeWidth }),
                points: 6,
                radius: pointRadius + 4,
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
                fill: new Fill({ color: rgbaColor }),
                stroke: new Stroke({ color: borderRgba, width: pointStrokeWidth }),
                points: 3,
                radius: pointRadius + 2,
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
                fill: new Fill({ color: rgbaColor }),
                stroke: new Stroke({ color: borderRgba, width: pointStrokeWidth }),
                points: 4,
                radius: pointRadius + 2,
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
            radius: pointRadius,
            fill: new Fill({ color: rgbaColor }),
            stroke: new Stroke({ color: borderRgba, width: pointStrokeWidth }),
        }),
        text: textStyle,
        zIndex: 100,
    });
};

function getVisualLinkStyle(feature: Feature): Style {
    const linkType = feature.get("linkType");
    const color = linkType === "pump" ? "#F59E0B" : "#EC4899";
    return new Style({
        stroke: new Stroke({ color: color, width: 2, lineDash: [6, 4] }),
        zIndex: 98,
    });
}

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