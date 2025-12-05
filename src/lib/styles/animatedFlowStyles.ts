import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import { Fill, Stroke, Style, Circle as CircleStyle } from 'ol/style';

/**
 * Animated water flow visualization using dashed stroke animation
 */
export class AnimatedFlowRenderer {
    private animationFrame: number | null = null;
    private offset = 0;
    private speed = 20; // pixels per frame
    private dashLength = 40;
    private gapLength = 20;

    constructor(private vectorLayer: any) { }

    public startAnimation() {
        if (this.animationFrame) return;

        const animate = () => {
            this.offset = (this.offset + this.speed) % (this.dashLength + this.gapLength);
            this.vectorLayer.changed();
            this.animationFrame = requestAnimationFrame(animate);
        };

        animate();
    }

    public stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    public getOffset(): number { return this.offset; }
    public setSpeed(speed: number) { this.speed = speed; }
    public setDashPattern(dashLength: number, gapLength: number) {
        this.dashLength = dashLength;
        this.gapLength = gapLength;
    }
}

/**
 * Create animated flow overlay style for a pipe
 */
export function createAnimatedFlowStyle(
    feature: Feature,
    animationOffset: number = 0
): Style {
    const diameter = feature.get('diameter') || 300;

    // Thinner stroke for overlay effect (doesn't replace base pipe)
    let strokeWidth = 2;
    if (diameter < 150) strokeWidth = 1.5;
    else if (diameter < 300) strokeWidth = 2;
    else if (diameter < 600) strokeWidth = 2.5;
    else strokeWidth = 3;

    // Bright color with good contrast - semi-transparent
    // const strokeColor = 'rgba(0, 200, 255, 0.4)'; // Light blue with 70% opacity
    const strokeColor = '#FFFFFF';

    // Create animated dash pattern
    const dashLength = 12;
    const gapLength = 15;

    return new Style({
        stroke: new Stroke({
            color: strokeColor,
            width: strokeWidth,
            lineDash: [dashLength, gapLength],
            lineDashOffset: -animationOffset * 2, // Negative for forward flow
        }),
        zIndex: 100, // Higher than base pipe 
    });
}

/**
 * Create particle-based flow animation
 * Renders moving dots along the pipe to simulate water flow
 */
export function createFlowParticleStyles(
    feature: Feature,
    time: number = 0
): Style[] {
    const geometry = feature.getGeometry() as LineString;
    if (!geometry) return [];

    const coords = geometry.getCoordinates();
    if (coords.length < 2) return [];

    const styles: Style[] = [];
    const reversed = feature.get('reversed') || false;
    const flowRate = feature.get('flow') || 1;
    const diameter = feature.get('diameter') || 300;

    // Adjust particle density based on pipe length
    const pipeLength = geometry.getLength();
    const numParticles = Math.max(2, Math.min(5, Math.floor(pipeLength / 150)));

    // Calculate total length
    let totalLength = 0;
    const segments: { start: number[]; end: number[]; length: number }[] = [];

    for (let i = 0; i < coords.length - 1; i++) {
        const start = coords[i];
        const end = coords[i + 1];
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const length = Math.sqrt(dx * dx + dy * dy);

        segments.push({ start, end, length });
        totalLength += length;
    }

    // Create particles at intervals
    const speed = 20 + Math.abs(flowRate) * 10;
    const cycleLength = totalLength;

    for (let i = 0; i < numParticles; i++) {
        const offset = (i / numParticles) * cycleLength;
        const animatedOffset = (offset + time * speed) % cycleLength;

        // Find position along pipe
        const position = getPositionAlongPipe(
            segments,
            reversed ? cycleLength - animatedOffset : animatedOffset
        );

        if (position) {
            // Particle size based on diameter
            let particleRadius = 3;
            if (diameter < 150) particleRadius = 2;
            else if (diameter < 300) particleRadius = 3;
            else if (diameter < 600) particleRadius = 4;
            else particleRadius = 5;

            // Particle style
            const particleStyle = new Style({
                geometry: new Point(position),
                image: new CircleStyle({
                    radius: particleRadius,
                    fill: new Fill({ color: 'rgba(59, 130, 246, 0.9)' }),
                    stroke: new Stroke({ color: '#FFFFFF', width: 1.5 }),
                }),
                zIndex: 99,
            });

            styles.push(particleStyle);
        }
    }

    return styles;
}

/**
 * Get position along pipe at a specific distance from start
 */
function getPositionAlongPipe(
    segments: { start: number[]; end: number[]; length: number }[],
    distance: number
): number[] | null {
    let accumulatedLength = 0;

    for (const segment of segments) {
        if (accumulatedLength + segment.length >= distance) {
            const remainingDistance = distance - accumulatedLength;
            const ratio = remainingDistance / segment.length;

            const x = segment.start[0] + (segment.end[0] - segment.start[0]) * ratio;
            const y = segment.start[1] + (segment.end[1] - segment.start[1]) * ratio;

            return [x, y];
        }
        accumulatedLength += segment.length;
    }

    return null;
}

/**
 * Create pulsing glow effect for active pipes
 * This is a WIDE SOFT OVERLAY that pulses behind the base pipe
 */
export function createPulsingGlowStyle(
    feature: Feature,
    time: number = 0
): Style {
    const diameter = feature.get('diameter') || 300;
    const status = (feature.get('status') || 'open').toString().toLowerCase();

    if (status !== 'active' && status !== 'open') {
        // No glow for closed/inactive pipes
        return new Style({});
    }

    // Pulsing alpha based on time
    const pulseSpeed = 2; // Complete cycle in 2 seconds
    const alpha = 0.15 + Math.sin(time * pulseSpeed) * 0.1; // 0.05 to 0.25

    // Wide glow stroke (wider than base pipe)
    let glowWidth = 10;
    if (diameter < 150) glowWidth = 8;
    else if (diameter < 300) glowWidth = 10;
    else if (diameter < 600) glowWidth = 12;
    else glowWidth = 14;

    return new Style({
        stroke: new Stroke({
            color: `rgba(59, 130, 246, ${alpha})`,
            width: glowWidth,
        }),
        zIndex: 8, // Behind base pipe (which should be at 10)
    });
}

/**
 * Combined style function that creates all flow animations
 */
export function createCombinedFlowStyles(
    feature: Feature,
    animationTime: number = 0,
    options: {
        showDashes?: boolean;
        showParticles?: boolean;
        showGlow?: boolean;
    } = {}
): Style[] {
    const {
        showDashes = true,
        showParticles = false,
        showGlow = false,
    } = options;

    const styles: Style[] = [];

    // Pulsing glow (behind base pipe)
    if (showGlow) {
        styles.push(createPulsingGlowStyle(feature, animationTime));
    }

    // Animated dash overlay (on top of base pipe)
    if (showDashes) {
        styles.push(createAnimatedFlowStyle(feature, animationTime));
    }

    // Particle effects (on top of everything)
    if (showParticles) {
        styles.push(...createFlowParticleStyles(feature, animationTime));
    }

    return styles;
}

/**
 * Utility to get flow speed multiplier based on flow rate
 */
export function getFlowSpeedMultiplier(flow: number | undefined): number {
    if (!flow) return 1;

    const absFlow = Math.abs(flow);

    if (absFlow < 10) return 0.5;   // Slow
    if (absFlow < 50) return 1;     // Normal
    if (absFlow < 100) return 1.5;  // Fast
    return 2;                        // Very fast
}
