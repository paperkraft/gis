import { Feature } from 'ol';
import { Circle as CircleStyle, Fill, Icon, RegularShape, Stroke, Style, Text } from 'ol/style';
import { COMPONENT_TYPES } from '@/constants/networkComponents';
import { useSimulationStore } from '@/store/simulationStore';
import { useStyleStore } from '@/store/styleStore';
import { FeatureType } from '@/types/network';
import { createSegmentArrows } from './pipeArrowStyles';
import { useMapStore } from '@/store/mapStore';
import { useUIStore } from '@/store/uiStore';
import { getColor, hexToRgba } from './helper';

export const getFeatureStyle = (feature: Feature, resolution?: number): Style | Style[] => {
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
    const { 
        nodeColorMode, linkColorMode, labelSettings, selectedProps, minMax, 
        layerStyles, nodeGradient, linkGradient, highlightedFeatureIds, highlightColors,
        nodeClassification, linkClassification, nodeCustomBreaks, linkCustomBreaks,
        nodeReverse, linkReverse
    } = useStyleStore.getState();
    // const { results, history, currentTimeIndex } = useSimulationStore.getState();
    const { results } = useSimulationStore.getState();
    const { showLabels, showPipeArrows } = useUIStore.getState();

    const isHighlighted = highlightedFeatureIds.has(featureId);
    const hasHighlights = highlightedFeatureIds.size > 0;

    // 2. Resolve Base Style (Uniform)
    const customStyle = layerStyles[featureType];

    // Default to uniform color first
    let color = customStyle?.color || config.color;

    let strokeWidth = customStyle?.width || 2;
    let pointRadius = customStyle?.radius || 6;
    let pointStrokeWidth = customStyle?.strokeWidth || 2;
    let opacity = customStyle?.opacity ?? 1;
    const isAutoScale = customStyle?.autoScale ?? false;

    // --- DIMMING LOGIC ---
    if (hasHighlights && !isHighlighted) {
        opacity *= 0.25; // Dim the unhighlighted network features
    }

    // 3. SAFE DATA EXTRACTION (Fixes the crash)
    let activeSnapshot = results;

    let value: number | null = null;
    let range = { min: 0, max: 100 };

    let currentMode = 'none';
    let activeGradient = nodeGradient; // Default

    // --- PIPES ---
    if (featureType === 'pipe') {
        currentMode = linkColorMode;
        activeGradient = linkGradient;
        const diameter = feature.get('diameter') || 150;

        // Auto Scale Logic (Overrides fixed width)
        if (isAutoScale) {
            strokeWidth = Math.max(1.5, Math.min(diameter / 50, 8));
        }

        // Color Mode Logic
        if (currentMode === 'diameter') {
            value = diameter;
            range = minMax.diameter || { min: 0, max: 500 };
        } else if (currentMode === 'roughness') {
            value = feature.get('roughness');
            range = minMax.roughness || { min: 80, max: 150 };
        } else if (currentMode === 'velocity' && activeSnapshot?.links[featureId]) {
            value = activeSnapshot.links[featureId].velocity;
            range = minMax.velocity;
        } else if (currentMode === 'flow' && activeSnapshot?.links[featureId]) {
            value = Math.abs(activeSnapshot.links[featureId].flow);
            range = minMax.flow;
        }
    }

    // --- NODES ---
    else if (['junction', 'tank', 'reservoir'].includes(featureType)) {
        currentMode = nodeColorMode;
        activeGradient = nodeGradient;

        // Auto Scale Logic for Junctions
        if (featureType === 'junction' && isAutoScale) {
             pointRadius = 5; // Fixed standard size for "auto" junctions
        }

        if (currentMode === 'elevation') {
            value = feature.get('elevation');
            range = { min: 0, max: 100 };
        } else if (currentMode === 'pressure' && activeSnapshot?.nodes[featureId]) {
            value = activeSnapshot.nodes[featureId].pressure;
            range = minMax.pressure;
        } else if (currentMode === 'head' && activeSnapshot?.nodes[featureId]) {
            value = activeSnapshot.nodes[featureId].head;
            range = minMax.head;
        }
    }

    // 4. Apply Gradient Override
    if (value !== null && currentMode !== 'none') {
        const isNode = ['junction', 'tank', 'reservoir'].includes(featureType);
        const classification = isNode ? nodeClassification : linkClassification;
        const customBreaks = isNode ? nodeCustomBreaks : linkCustomBreaks;
        const reverse = isNode ? nodeReverse : linkReverse;

        color = getColor(value, range.min, range.max, activeGradient, classification, customBreaks, reverse);
    }

    // --- APPLY HIGHLIGHT OVERRIDE (SYMBOLOGY THEMING) ---
    if (isHighlighted && hasHighlights) {
        const customHighlightColor = highlightColors.get(featureId) || '#ff0000';
        color = customHighlightColor;
        strokeWidth += 2; // Make highlighted pipes thicker
        pointRadius += 2; // Make highlighted nodes larger
        opacity = 1.0;    // Ensure fully opaque
    }

    // 5. Finalize Color with Opacity
    const rgbaColor = hexToRgba(color, opacity);
    const borderRgba = hexToRgba('#FFFFFF', opacity);

    // 6. Labels
    const labels: string[] = [];
    
    if (labelSettings.showId) {
        labels.push(featureId);
    }

    if (labelSettings.showProp) {
        const activeProps = selectedProps[featureType] || [];
        activeProps.forEach(propKey => {
            const val = feature.get(propKey);
            if (val !== undefined && val !== null) {
                let displayVal = val;
                // Basic unit formatting
                if (propKey === 'elevation') displayVal = `${val}m`;
                else if (propKey === 'diameter') displayVal = `${val}mm`;
                else if (propKey === 'height' || propKey === 'head') displayVal = `${val}m`;
                else if (propKey === 'pressure') displayVal = `${val} kPa`;
                else if (propKey === 'capacity') displayVal = `${val} L`;
                else if (propKey === 'power') displayVal = `${val} kW`;
                else if (propKey === 'roughness') displayVal = `${val} (C)`;

                // Short forms mapping
                const shortForms: Record<string, string> = {
                    elevation: 'ele.',
                    diameter: 'dia.',
                    pressure: 'pres.',
                    capacity: 'cap.',
                    demand: 'dem.',
                    population: 'pop.',
                    roughness: 'rou.',
                    efficiency: 'eff.',
                    currentLevel: 'lvl.',
                    power: 'pow.',
                    head: 'head',
                    headGain: 'gain',
                    setting: 'set.',
                    valveType: 'type'
                };
                
                if (propKey === 'label') {
                    labels.push(String(displayVal));
                } else {
                    const labelHead = shortForms[propKey] || propKey;
                    labels.push(`${labelHead}: ${displayVal}`);
                }
            }
        });
    }

    if (labelSettings.showSim && value !== null) {
        labels.push(`Sim: ${value.toFixed(2)}`);
    }

    const labelText = labels.join('\n');

    // --- APPLY STYLES (Standardized Icons) ---
    // Hide labels at lower zoom levels (higher resolution) to improve performance
    const labelThreshold = 10;
    const isLabelVisible = showLabels && (resolution === undefined || resolution < labelThreshold);

    const textStyle = isLabelVisible ? new Text({
        text: labelText?.toString(),
        font: `${labelSettings.fontSize || 10}px "Inter", sans-serif`,
        fill: new Fill({ color: '#374151' }),
        stroke: new Stroke({ color: '#FFFFFF', width: 3 }),
        offsetY: featureType === 'pipe' ? 15 : 20, // Increased offset for icons
        overflow: true,
    }) : undefined;

    // 4. LOD Visibility Check (Hide complex icons when zoomed out for performance)
    const visibilityThreshold = 5;
    const isFeatureVisible = resolution === undefined || resolution < visibilityThreshold;
    const isComplexNode = ['junction', 'tank', 'reservoir'].includes(featureType);
    const isComplexLink = ['pump', 'valve'].includes(featureType);

    if (!isFeatureVisible && (isComplexNode || isComplexLink)) {
        return new Style({});
    }

    // Helper for SVG encoded icons
    const getSvgIcon = (svgString: string, size: [number, number], scale: number = 1, rotation: number = 0) => {
        const encoded = encodeURIComponent(svgString);
        return new Style({
            image: new Icon({
                src: `data:image/svg+xml;charset=utf-8,${encoded}`,
                size: size,
                scale: (pointRadius / 6) * scale, // Scale based on global pointRadius
                anchor: [0.5, 0.5],
                rotation: rotation // Apply flow direction rotation
            }),
            text: textStyle,
            zIndex: 100,
        });
    };

    // 11. Resolve Final Style
    let finalStyle: Style | Style[];

    // PIPE
    if (featureType === "pipe") {
        const baseStyle = new Style({
            stroke: new Stroke({ color: rgbaColor, width: strokeWidth }),
            text: textStyle,
            zIndex: 99,
        });

        // LOD for arrows: also hide when zoomed out
        const isArrowVisible = showPipeArrows && (resolution === undefined || resolution < visibilityThreshold);

        if (isArrowVisible) {
            finalStyle = [baseStyle, ...createSegmentArrows(feature)];
        } else {
            finalStyle = baseStyle;
        }
    }
    // TANK
    else if (featureType === "tank") {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path d="M4 6c0-1.657 3.582-3 8-3s8 1.343 8 3v12c0 1.657-3.582 3-8 3s-8-1.343-8-3V6z" fill="${color}" stroke="white" stroke-width="1.5"/>
            <ellipse cx="12" cy="6" rx="8" ry="3" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8"/>
        </svg>`;
        finalStyle = getSvgIcon(svg, [24, 24], 0.8);
    }
    // RESERVOIR
    else if (featureType === "reservoir") {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="16" rx="2" fill="${color}" stroke="white" stroke-width="1.5" />
            <path d="M3 10c2 0 3 2 6 2s4-2 6-2 3 2 6 2" fill="none" stroke="white" stroke-width="1.5" opacity="0.6"/>
            <path d="M3 14c2 0 3 2 6 2s4-2 6-2 3 2 6 2" fill="none" stroke="white" stroke-width="1.2" opacity="0.4"/>
        </svg>`;
        finalStyle = getSvgIcon(svg, [24, 24], 0.9);
    }
    // PUMP
    else if (featureType === "pump") {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="1.5"/>
            <path d="M10 8l7 4-7 4V8z" fill="white"/>
        </svg>`;
        const rotation = feature.get('rotation') || 0;
        finalStyle = getSvgIcon(svg, [24, 24], 0.8, rotation);
    }
    // VALVE
    else if (featureType === "valve") {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
             <path d="M4 6l16 12V6L4 18V6z" fill="${color}" stroke="white" stroke-width="1.5"/>
             <rect x="11" y="4" width="2" height="16" fill="white" opacity="0.5"/>
        </svg>`;
        const rotation = feature.get('rotation') || 0;
        finalStyle = getSvgIcon(svg, [24, 24], 0.8, rotation);
    }
    // CONNECTOR JUNCTION
    else if (isJunctionConnectedToLink(feature)) {
        finalStyle = new Style({
            image: new CircleStyle({
                radius: 4,
                fill: new Fill({ color: "#D1D5DB" }),
                stroke: new Stroke({ color: "#6B7280", width: 1 }),
            }),
            zIndex: 100,
        });
    }
    // DEFAULT JUNCTION
    else {
        finalStyle = new Style({
            image: new CircleStyle({
                radius: pointRadius,
                fill: new Fill({ color: rgbaColor }),
                stroke: new Stroke({ color: borderRgba, width: pointStrokeWidth }),
            }),
            text: textStyle,
            zIndex: 100,
        });
    }

    // --- APPLY HIGHLIGHT OVERLAY (HALO) ---
    // if (isHighlighted && hasHighlights) {
    //     const customHighlightColor = highlightColors.get(featureId) || '#ff0000';

    //     const haloStyle = featureType === 'pipe' || featureType === 'visual'
    //         ? new Style({
    //             // Thick semi-transparent line underneath
    //             stroke: new Stroke({
    //                 color: hexToRgba(customHighlightColor, 0.4),
    //                 width: strokeWidth + 10,
    //                 lineCap: 'round',
    //                 lineJoin: 'round'
    //             }),
    //             zIndex: 90
    //         })
    //         : new Style({
    //             // Thick ring or glow underneath nodes
    //             image: new CircleStyle({
    //                 radius: pointRadius + 6,
    //                 fill: new Fill({ color: hexToRgba(customHighlightColor, 0.2) }),
    //                 stroke: new Stroke({ color: hexToRgba(customHighlightColor, 0.6), width: 3 })
    //             }),
    //             zIndex: 90
    //         });

    //     return Array.isArray(finalStyle) ? [haloStyle, ...finalStyle] : [haloStyle, finalStyle];
    // }

    return finalStyle;
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

    // Halo — shape-matched per feature type
    if (featureType === "pipe") {
        styles.push(new Style({
            stroke: new Stroke({ color: "rgba(250, 204, 21, 0.6)", width: 12 }),
            zIndex: 199,
        }));
    } else if (featureType === "pump") {
        styles.push(new Style({
            image: new CircleStyle({
                radius: 20,
                fill: new Fill({ color: "rgba(250, 204, 21, 0.5)" }),
                stroke: new Stroke({ color: "rgba(250, 204, 21, 1)", width: 2 }),
            }),
            zIndex: 199,
        }));
    } else if (featureType === "valve") {
        styles.push(new Style({
            image: new RegularShape({
                fill: new Fill({ color: "rgba(250, 204, 21, 0.5)" }),
                stroke: new Stroke({ color: "rgba(250, 204, 21, 1)", width: 2 }),
                points: 4,
                radius: 20,
                angle: 0, // Changed to match bow-tie better
            }),
            zIndex: 199,
        }));
    } else if (featureType === "tank") {
        styles.push(new Style({
            image: new RegularShape({
                fill: new Fill({ color: "rgba(250, 204, 21, 0.5)" }),
                stroke: new Stroke({ color: "rgba(250, 204, 21, 1)", width: 2 }),
                points: 4,
                radius: 22,
                angle: Math.PI / 4,
            }),
            zIndex: 199,
        }));
    } else if (featureType === "reservoir") {
        styles.push(new Style({
            image: new RegularShape({
                fill: new Fill({ color: "rgba(250, 204, 21, 0.5)" }),
                stroke: new Stroke({ color: "rgba(250, 204, 21, 1)", width: 2 }),
                points: 4,
                radius: 24,
                angle: Math.PI / 4,
            }),
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