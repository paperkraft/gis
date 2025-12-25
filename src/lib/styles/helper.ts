import { GradientStop, useStyleStore } from "@/store/styleStore";

// Interpolate between two hex colors
// Returns an HEX string or RGB string depending on implementation
export function interpolateColor(t: number, stops: GradientStop[]): string {
    if (!stops || stops.length === 0) return '#000000';

    // Sort stops just in case
    const sorted = [...stops].sort((a, b) => a.offset - b.offset);

    if (t <= sorted[0].offset) return sorted[0].color;
    if (t >= sorted[sorted.length - 1].offset) return sorted[sorted.length - 1].color;

    // Find the two stops t is between
    for (let i = 0; i < sorted.length - 1; i++) {
        if (t >= sorted[i].offset && t <= sorted[i + 1].offset) {
            const start = sorted[i];
            const end = sorted[i + 1];
            const range = end.offset - start.offset;
            const percent = (t - start.offset) / range;

            return interpolateHex(start.color, end.color, percent);
        }
    }
    return sorted[0].color;
}

// Helper: Linear Interpolation of Hex
function interpolateHex(c1: string, c2: string, factor: number): string {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);

    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);

    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));

    // Return as Hex to be consistent with input
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// ROBUST CONVERTER: Handles Hex, RGB, RGBA
export function hexToRgba(color: string, alpha: number = 1): string {
    if (!color) return `rgba(0,0,0,${alpha})`;

    // 1. If it's already an RGB/RGBA string, just update alpha
    if (color.startsWith('rgb')) {
        // Extract numbers: rgb(255, 0, 0) -> [255, 0, 0]
        const match = color.match(/\d+(\.\d+)?/g);
        if (match && match.length >= 3) {
            return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${alpha})`;
        }
        return color; // Fallback
    }

    // 2. Handle Hex
    let hex = color.replace('#', '');

    // Handle short hex (#abc -> #aabbcc)
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return `rgba(0,0,0,${alpha})`; // Fallback for invalid colors
    }

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getColor(value: number, min: number, max: number): string {
    if (value === undefined || value === null || isNaN(value)) return '#999999';

    const { gradientStops, styleType, classCount } = useStyleStore.getState();

    let t = ((value - min) / (max - min)) * 100;
    t = Math.max(0, Math.min(100, t));

    if (styleType === 'discrete') {
        const step = 100 / classCount;
        const binIndex = Math.min(Math.floor(t / step), classCount - 1);
        const binCenter = (binIndex * step) + (step / 2);
        return interpolateColor(binCenter, gradientStops);
    }

    return interpolateColor(t, gradientStops);
}