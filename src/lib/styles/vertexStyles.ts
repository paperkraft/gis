import { Style, Circle as CircleStyle, Fill, Stroke, RegularShape } from 'ol/style';

export const VertexStyles = {
    // Default vertex style (blue circle)
    default: new Style({
        image: new CircleStyle({
            radius: 4,
            fill: new Fill({ color: '#FFFFFF' }),
            stroke: new Stroke({ color: '#1FB8CD', width: 1.5 }),
        }),
        zIndex: 100,
    }),

    // Highlighted vertex (larger, orange)
    highlighted: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#F59E0B' }),
            stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
        }),
        zIndex: 100,
    }),

    // Selected vertex (green with pulse effect)
    selected: new Style({
        image: new CircleStyle({
            radius: 5,
            fill: new Fill({ color: '#10B981' }),
            stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
        }),
        zIndex: 100,
    }),

    // Start/End vertices (square shape)
    endpoint: new Style({
        image: new RegularShape({
            fill: new Fill({ color: '#EF4444' }),
            stroke: new Stroke({ color: '#FFFFFF', width: 1.5 }),
            points: 4,
            radius: 5,
            angle: Math.PI / 4, // 45 degrees rotation for diamond
        }),
        zIndex: 100,
    }),

    // Midpoint vertex (smaller, subtle)
    midpoint: new Style({
        image: new CircleStyle({
            radius: 3,
            fill: new Fill({ color: '#94A3B8' }),
            stroke: new Stroke({ color: '#FFFFFF', width: 1.5 }),
        }),
        zIndex: 100,
    }),

    // Ghost vertex (semi-transparent, for preview)
    ghost: new Style({
        image: new CircleStyle({
            radius: 4,
            fill: new Fill({ color: 'rgba(31, 184, 205, 0.4)' }),
            stroke: new Stroke({ color: 'rgba(255, 255, 255, 0.8)', width: 1.5, lineDash: [4, 4] }),
        }),
        zIndex: 100,
    }),

    // Deletable vertex (red with X)
    deletable: new Style({
        image: new CircleStyle({
            radius: 5,
            fill: new Fill({ color: '#DC2626' }),
            stroke: new Stroke({ color: '#FFFFFF', width: 1.5 }),
        }),
        zIndex: 100,
    }),
};

// Function to get vertex style based on state
export function getVertexStyle(state: {
    isEndpoint?: boolean;
    isHighlighted?: boolean;
    isSelected?: boolean;
    isDeletable?: boolean;
    isGhost?: boolean;
    isMidpoint?: boolean;
}): Style {
    if (state.isDeletable) return VertexStyles.deletable;
    if (state.isSelected) return VertexStyles.selected;
    if (state.isHighlighted) return VertexStyles.highlighted;
    if (state.isEndpoint) return VertexStyles.endpoint;
    if (state.isGhost) return VertexStyles.ghost;
    if (state.isMidpoint) return VertexStyles.midpoint;
    return VertexStyles.default;
}

// Animated pulse effect for selected vertex
export function createPulseStyle(color: string = '#10B981'): Style[] {
    return [
        // Outer pulse
        new Style({
            image: new CircleStyle({
                radius: 10,
                fill: new Fill({ color: `${color}33` }), // 20% opacity
                stroke: new Stroke({ color: `${color}66`, width: 1 }), // 40% opacity
            }),
            zIndex: 100,
        }),
        // Inner circle
        new Style({
            image: new CircleStyle({
                radius: 5,
                fill: new Fill({ color }),
                stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
            }),
            zIndex: 101,
        }),
    ];
}