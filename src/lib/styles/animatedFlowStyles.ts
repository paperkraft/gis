import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import { Fill, Stroke, Style, Circle as CircleStyle } from 'ol/style';

/**
 * Animated water flow visualization using dashed stroke animation
 * This creates a "marching ants" effect along the pipe
 */
export class AnimatedFlowRenderer {
    private animationFrame: number | null = null;
    private offset = 0;
    private speed = 10; // pixels per frame
    private dashLength = 40;
    private gapLength = 20;

    constructor(private vectorLayer: any) { }

    /**
     * Start the flow animation
     */
    public startAnimation() {
        if (this.animationFrame) return;

        const animate = () => {
            this.offset = (this.offset + this.speed) % (this.dashLength + this.gapLength);
            this.vectorLayer.changed(); // Trigger re-render
            this.animationFrame = requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * Stop the flow animation
     */
    public stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * Get current offset for animated dashes
     */
    public getOffset(): number {
        return this.offset;
    }

    /**
     * Set animation speed
     */
    public setSpeed(speed: number) {
        this.speed = speed;
    }

    /**
     * Set dash pattern
     */
    public setDashPattern(dashLength: number, gapLength: number) {
        this.dashLength = dashLength;
        this.gapLength = gapLength;
    }
}

/**
 * Create animated flow style for a pipe
 * Uses dashed stroke with animated offset to simulate flow
 */
export function createAnimatedFlowStyle(
    feature: Feature,
    animationOffset: number = 0
): Style {
    const diameter = feature.get('diameter') || 300;
    const status = feature.get('status') || 'active';
    const isSelected = feature.get('selected') || false;

    // Determine stroke width based on diameter
    let strokeWidth = 3;
    if (diameter < 150) strokeWidth = 2;
    else if (diameter < 300) strokeWidth = 3;
    else if (diameter < 600) strokeWidth = 4;
    else strokeWidth = 5;

    // Color based on status
    let strokeColor = '#FFFFFF'; // Blue for active
    if (status === 'closed') strokeColor = '#DC2626'; // Red
    else if (status === 'inactive') strokeColor = '#9CA3AF'; // Gray

    if (isSelected) {
        strokeColor = '#F59E0B'; // Orange for selected
        strokeWidth += 1;
    }

    // Create animated dash pattern
    const dashLength = 20;
    const gapLength = 10;

    return new Style({
        stroke: new Stroke({
            color: strokeColor,
            width: strokeWidth,
            lineDash: [dashLength, gapLength],
            lineDashOffset: -animationOffset, // Negative for forward flow
        }),
        zIndex: 12,
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
    const flowRate = feature.get('flow') || 1; // Flow rate (affects speed)
    const numParticles = Math.max(2, Math.floor(geometry.getLength() / 100)); // Density

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
    const speed = 0.5 + Math.abs(flowRate) * 0.5; // Speed based on flow rate
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
            // Particle style
            const particleStyle = new Style({
                geometry: new Point(position),
                image: new CircleStyle({
                    radius: 4,
                    fill: new Fill({ color: 'rgba(59, 130, 246, 0.8)' }),
                    stroke: new Stroke({ color: '#FFFFFF', width: 1 }),
                }),
                zIndex: 13,
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
 */
export function createPulsingGlowStyle(
    feature: Feature,
    time: number = 0
): Style {
    const diameter = feature.get('diameter') || 300;
    const status = feature.get('status') || 'active';

    if (status !== 'active') {
        // No glow for inactive pipes
        return new Style({});
    }

    // Pulsing alpha based on time
    const pulseSpeed = 2; // Complete cycle in 2 seconds
    const alpha = 0.2 + Math.sin(time * pulseSpeed) * 0.15; // 0.05 to 0.35

    let glowWidth = 8;
    if (diameter < 150) glowWidth = 6;
    else if (diameter < 300) glowWidth = 8;
    else if (diameter < 600) glowWidth = 10;
    else glowWidth = 12;

    return new Style({
        stroke: new Stroke({
            color: `rgba(59, 130, 246, ${alpha})`,
            width: glowWidth,
        }),
        zIndex: 11,
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

    // Base animated dash style
    if (showDashes) {
        styles.push(createAnimatedFlowStyle(feature, animationTime));
    }

    // Particle effects
    if (showParticles) {
        styles.push(...createFlowParticleStyles(feature, animationTime));
    }

    // Pulsing glow
    if (showGlow) {
        styles.push(createPulsingGlowStyle(feature, animationTime));
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
