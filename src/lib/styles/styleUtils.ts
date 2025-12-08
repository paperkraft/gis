// Blue to Red gradient (Low to High)
export const PRESSURE_COLORS = [
    { value: 0, color: '#3b82f6' },   // Blue (Low)
    { value: 20, color: '#06b6d4' },  // Cyan
    { value: 40, color: '#10b981' },  // Green (Good)
    { value: 60, color: '#f59e0b' },  // Amber
    { value: 80, color: '#ef4444' },  // Red (High)
];

// Green scale for Velocity
export const VELOCITY_COLORS = [
    { value: 0, color: '#d1fae5' },   // Pale Green
    { value: 0.5, color: '#6ee7b7' },
    { value: 1.0, color: '#10b981' }, // Normal
    { value: 2.0, color: '#047857' }, // High
    { value: 3.0, color: '#064e3b' }, // Very High
];

// Helper to interpolate color
export function getColorForValue(value: number, stops: { value: number; color: string }[]): string {
    if (value === undefined || value === null) return '#999';

    // Find surrounding stops
    for (let i = 0; i < stops.length - 1; i++) {
        if (value >= stops[i].value && value <= stops[i + 1].value) {
            return interpolateColor(stops[i].color, stops[i + 1].color, (value - stops[i].value) / (stops[i + 1].value - stops[i].value));
        }
    }

    if (value < stops[0].value) return stops[0].color;
    return stops[stops.length - 1].color;
}

function interpolateColor(color1: string, color2: string, factor: number) {
    // Simple RGB interpolation logic or use d3-color if installed
    // For now, let's return the nearest or implement simple hex interpolation
    // Returning color2 for simplicity if no library, or implementing simple hex mix:
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));
    return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}