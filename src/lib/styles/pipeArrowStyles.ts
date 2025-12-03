import { useSimulationStore } from '@/store/simulationStore';
import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import { Fill, RegularShape, Stroke, Style } from 'ol/style';

/**
 * Helper to check if arrow direction should be reversed based on flow direction
 */
function shouldReverseArrowDirection(feature: Feature): boolean {
    // 1. Check for manual topology reverse flag (if set by editing tools)
    if (feature.get('reversed')) {
        return true;
    }

    // 2. Check Simulation Results
    try {
        const { results, status } = useSimulationStore.getState();

        // Only apply if simulation has results
        if (status === 'completed' && results) {
            const id = feature.getId() as string;
            const linkResult = results.links[id];

            // EPANET Convention: 
            // Positive Flow = StartNode -> EndNode
            // Negative Flow = EndNode -> StartNode (Reverse)
            if (linkResult && linkResult.flow < 0) {
                return true;
            }
        }
    } catch (e) {
        // Safe fallback if store is not ready
        return false;
    }

    return false;
}

/**
 * Create arrow style for pipe - arrows point from startNode to endNode
 */
export function createPipeArrowStyle(feature: Feature): Style[] {
    const geometry = feature.getGeometry() as LineString;
    if (!geometry) return [];

    const coords = geometry.getCoordinates();
    if (coords.length < 2) return [];

    const styles: Style[] = [];

    // Create ONE arrow at the overall midpoint pointing in flow direction
    const style = createSinglePipeArrow(feature);
    if (style) {
        styles.push(style);
    }

    return styles;
}

/**
 * Create single arrow at pipe midpoint pointing from start to end
 */
export function createSinglePipeArrow(feature: Feature): Style | null {
    const geometry = feature.getGeometry() as LineString;
    if (!geometry) return null;

    const coordinate = geometry.getCoordinateAt(0.5); // Get midpoint (0-1 range)
    if (!coordinate) return null;

    // Calculate angle at midpoint
    // We sample a tiny bit before and after 0.5 to get the tangent
    const p1 = geometry.getCoordinateAt(0.49);
    const p2 = geometry.getCoordinateAt(0.51);

    if (!p1 || !p2) return null;

    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    let angle = Math.atan2(dy, dx);

    if (shouldReverseArrowDirection(feature)) {
        angle += Math.PI;
    }

    const arrowSize = getArrowSize(feature) * 1.2; // Slightly larger for single arrow
    const arrowColor = getArrowColor(feature);

    return new Style({
        geometry: new Point(coordinate),
        image: new RegularShape({
            fill: new Fill({ color: arrowColor }),
            stroke: new Stroke({ color: '#FFFFFF', width: 1.5 }),
            points: 3,
            radius: arrowSize,
            rotation: -angle + (Math.PI / 2),
            angle: 0,
        }),
        zIndex: 101,
    });
}

/**
 * Alternative: Create arrows for each segment
 */
export function createSegmentArrows(feature: Feature): Style[] {
    const geometry = feature.getGeometry() as LineString;
    if (!geometry) return [];

    const coords = geometry.getCoordinates();
    if (coords.length < 2) return [];

    const styles: Style[] = [];
    const arrowSize = getArrowSize(feature);
    const arrowColor = getArrowColor(feature);
    const reverse = shouldReverseArrowDirection(feature);

    // Create arrow at midpoint of each segment
    for (let i = 0; i < coords.length - 1; i++) {
        const start = coords[i];
        const end = coords[i + 1];

        // Midpoint
        const midX = (start[0] + end[0]) / 2;
        const midY = (start[1] + end[1]) / 2;

        // Direction
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        let angle = Math.atan2(dy, dx);

        // Reverse angle if needed (if flow is opposite to geometry)
        if (reverse) {
            angle += Math.PI;
        }

        const arrowStyle = new Style({
            geometry: new Point([midX, midY]),
            image: new RegularShape({
                fill: new Fill({ color: arrowColor }),
                stroke: new Stroke({ color: '#FFFFFF', width: 1 }),
                points: 3,
                radius: arrowSize,
                rotation: -angle + (Math.PI / 2), // Rotate to point along line
                // rotation: -angle,
                // angle: Math.PI / 2, // Triangle pointing right initially
            }),
            zIndex: 101,
        });

        styles.push(arrowStyle);
    }

    return styles;
}

/**
 * Get arrow color
 */
export function getArrowColor(feature: Feature): string {
    const status = feature.get('status');
    if (status === 'closed' || status === 'inactive') return '#9CA3AF'; // Gray
    return '#1f1e1c'; // default
}

/**
 * Get arrow size based on pipe diameter
 */
export function getArrowSize(feature: Feature): number {
    const diameter = feature.get('diameter') || 300;

    if (diameter < 150) return 7;
    if (diameter < 300) return 8;
    if (diameter < 600) return 10;
    return 12;
}
