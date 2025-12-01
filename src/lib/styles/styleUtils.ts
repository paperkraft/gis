// Color ramps
export const PRESSURE_COLORS = [
    { value: 0, color: '#FF0000' },    // Low/Zero Pressure (Red)
    { value: 20, color: '#FFA500' },   // Low-Medium (Orange)
    { value: 40, color: '#FFFF00' },   // Medium (Yellow)
    { value: 60, color: '#00FF00' },   // Good (Green)
    { value: 80, color: '#00FFFF' },   // High (Cyan)
    { value: 100, color: '#0000FF' },  // Very High (Blue)
];

export const VELOCITY_COLORS = [
    { value: 0, color: '#808080' },    // Stagnant (Gray)
    { value: 0.1, color: '#00FFFF' },  // Very Low (Cyan)
    { value: 0.5, color: '#00FF00' },  // Optimal Low (Green)
    { value: 1.5, color: '#FFFF00' },  // Optimal High (Yellow)
    { value: 2.5, color: '#FFA500' },  // High (Orange)
    { value: 4.0, color: '#FF0000' },  // Excessive (Red)
];

/**
 * Get color for a value based on a color ramp
 */
export function getColorForValue(value: number, ramp: { value: number, color: string }[]): string {
    // Handle bounds
    if (value <= ramp[0].value) return ramp[0].color;
    if (value >= ramp[ramp.length - 1].value) return ramp[ramp.length - 1].color;

    // Find the two stops the value is between
    for (let i = 0; i < ramp.length - 1; i++) {
        const stop1 = ramp[i];
        const stop2 = ramp[i + 1];

        if (value >= stop1.value && value <= stop2.value) {
            // Simple interpolation logic could go here, 
            // but for map performance, returning the lower/nearest bucket is often sufficient.
            // Let's return the "bucket" color.
            return stop1.color;
        }
    }

    return ramp[0].color;
}