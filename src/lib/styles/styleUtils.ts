// Pressure (psi): Red (0) -> Green (50) -> Blue (100)
export const PRESSURE_COLORS = [
    { value: 0, color: '#FF0000' },    // 0 psi (Bad)
    { value: 20, color: '#FFA500' },   // 20 psi (Low)
    { value: 40, color: '#FFFF00' },   // 40 psi (Okay)
    { value: 60, color: '#00FF00' },   // 60 psi (Good)
    { value: 80, color: '#00FFFF' },   // 80 psi (High)
    { value: 100, color: '#0000FF' },  // 100+ psi (Very High)
];

// Velocity (fps): Cyan (0) -> Green (2) -> Red (5)
export const VELOCITY_COLORS = [
    { value: 0, color: '#808080' },    // Stagnant (Gray)
    { value: 0.1, color: '#00FFFF' },  // Very Low (Cyan)
    { value: 0.5, color: '#00FF00' },  // Optimal Low (Green)
    { value: 1.5, color: '#FFFF00' },  // Optimal High (Yellow)
    { value: 2.5, color: '#FFA500' },  // High (Orange)
    { value: 4.0, color: '#FF0000' },  // Excessive (Red)
];

export function getColorForValue(value: number, ramp: { value: number, color: string }[]): string {
    // Return bounds
    if (value <= ramp[0].value) return ramp[0].color;
    if (value >= ramp[ramp.length - 1].value) return ramp[ramp.length - 1].color;

    // Simple bucket search
    for (let i = 0; i < ramp.length - 1; i++) {
        if (value >= ramp[i].value && value <= ramp[i + 1].value) {
            // Return the lower bound color (stepped look)
            return ramp[i].color;

            // OR Interpolate for smooth look:
            // return interpolateColor(value, ramp[i], ramp[i+1]);
        }
    }
    return ramp[0].color;
}