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

// Calculate Quantile Breaks
export function calculateQuantiles(data: number[], count: number): number[] {
    if (!data || data.length === 0) return [];
    
    // Sort data
    const sorted = [...data].sort((a, b) => a - b);
    const breaks: number[] = [];
    
    for (let i = 1; i < count; i++) {
        const index = Math.floor((i / count) * sorted.length);
        breaks.push(sorted[index]);
    }
    
    return breaks.map((b) => parseFloat(b.toFixed(2)));
}

export interface LegendBin {
    color: string;
    label: string;
}

export function calculateLegendBins(
    range: { min: number; max: number },
    stops: GradientStop[],
    classCount: number,
    classification: 'equal_interval' | 'quantile' | 'manual',
    customBreaks: number[],
    reverse: boolean
): LegendBin[] {
    const bins: LegendBin[] = [];
    const hasCustomBreaks = customBreaks && customBreaks.length > 0 && (classification === 'manual' || classification === 'quantile');

    if (hasCustomBreaks) {
        // Ensure we have a valid thresholds list: [min, ...breaks, max]
        const thresholds = [range.min, ...customBreaks, range.max].sort((a, b) => a - b);

        for (let i = thresholds.length - 1; i > 0; i--) {
            const lower = thresholds[i - 1];
            const upper = thresholds[i];
            const centerVal = lower + (upper - lower) / 2;
            const binColor = getColor(centerVal, range.min, range.max, stops, classification, customBreaks, reverse);

            bins.push({
                color: binColor,
                label: `${upper.toFixed(2)}`,
            });
        }
    } else {
        // Equal Interval (Default)
        const step = (range.max - range.min) / classCount;
        for (let i = classCount - 1; i >= 0; i--) {
            const lower = range.min + (i * step);
            const upper = range.min + ((i + 1) * step);
            const centerVal = lower + (step / 2);
            const binColor = getColor(centerVal, range.min, range.max, stops, 'equal_interval', [], reverse);

            bins.push({
                color: binColor,
                label: `${upper.toFixed(2)}`,
            });
        }
    }
    return bins;
}

// Unit helper
export function getUnit(attribute: string) {
    const attr = attribute?.toLowerCase() || '';
    if (attr.includes('pressure')) return 'm (Head)';
    if (attr.includes('velocity')) return 'm/s';
    if (attr.includes('flow')) return 'LPS';
    if (attr.includes('diameter')) return 'mm';
    if (attr.includes('head')) return 'm';
    if (attr.includes('elevation')) return 'm';
    if (attr.includes('headloss')) return 'm/km';
    if (attr.includes('demand')) return 'LPS';
    return '';
}

export function getColor(
    value: number, 
    min: number, 
    max: number, 
    stops: GradientStop[],
    classification: 'equal_interval' | 'quantile' | 'manual' = 'equal_interval',
    customBreaks: number[] = [],
    reverse: boolean = false
): string {
    if (value === undefined || value === null || isNaN(value)) return '#999999';

    const { styleType, classCount } = useStyleStore.getState();

    // 1. Handle Reverse
    let activeStops = stops;
    if (reverse) {
        activeStops = stops.map((s, i) => ({
            offset: s.offset,
            color: stops[stops.length - 1 - i].color
        }));
    }

    // 2. Continuous
    if (styleType === 'continuous') {
        let t = ((value - min) / (max - min)) * 100;
        t = Math.max(0, Math.min(100, t));
        return interpolateColor(t, activeStops);
    }

    // 3. Discrete (Classification)
    let binIndex = 0;

    if (classification === 'quantile') {
        // Use customBreaks which should contain quantile threshold values
        binIndex = customBreaks.findIndex(b => value <= b);
        if (binIndex === -1) binIndex = customBreaks.length; // Above last break
    } 
    else if (classification === 'manual') {
        // Use customBreaks provided by user
        binIndex = customBreaks.findIndex(b => value <= b);
        if (binIndex === -1) binIndex = customBreaks.length;
    }
    else {
        // Equal Interval (Default)
        let t = ((value - min) / (max - min)) * 100;
        t = Math.max(0, Math.min(100, t));
        const step = 100 / classCount;
        binIndex = Math.min(Math.floor(t / step), classCount - 1);
    }

    // Get color for center of bin to avoid edge issues
    const step = 100 / classCount;
    const binCenter = (binIndex * step) + (step / 2);
    return interpolateColor(binCenter, activeStops);
}