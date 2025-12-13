export function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : [0, 0, 0];
}

// Internal interpolation
export function interpolateColor(t: number, stops: any[]): string {
    const sortedStops = [...stops].sort((a, b) => a.offset - b.offset);
    const lower = sortedStops.find((s, i) => s.offset <= t && (sortedStops[i + 1]?.offset > t || i === sortedStops.length - 1)) || sortedStops[0];
    const upper = sortedStops.find(s => s.offset >= t) || sortedStops[sortedStops.length - 1];

    if (lower === upper) return lower.color;

    const range = upper.offset - lower.offset;
    const w = (t - lower.offset) / range;

    const c1 = hexToRgb(lower.color);
    const c2 = hexToRgb(upper.color);

    const r = Math.round(c1[0] + w * (c2[0] - c1[0]));
    const g = Math.round(c1[1] + w * (c2[1] - c1[1]));
    const b = Math.round(c1[2] + w * (c2[2] - c1[2]));

    return `rgb(${r},${g},${b})`;
}