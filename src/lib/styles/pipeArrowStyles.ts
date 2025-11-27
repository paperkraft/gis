import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import { Fill, Icon, RegularShape, Stroke, Style } from 'ol/style';

/**
 * Create arrow style for pipe at midpoint of each segment
 */
export function createPipeArrowStyle(feature: Feature): Style[] {
    const geometry = feature.getGeometry() as LineString;
    if (!geometry) return [];

    const coords = geometry.getCoordinates();
    if (coords.length < 2) return [];

    const styles: Style[] = [];

    // Determine if we need to reverse the arrow direction
    const shouldReverse = shouldReverseArrowDirection(feature, coords);

    // Create arrow for each segment
    for (let i = 0; i < coords.length - 1; i++) {
        const start = shouldReverse ? coords[coords.length - 1 - i] : coords[i];
        const end = shouldReverse ? coords[coords.length - 2 - i] : coords[i + 1];

        // Midpoint of segment
        const midX = (start[0] + end[0]) / 2;
        const midY = (start[1] + end[1]) / 2;

        // Calculate rotation angle (from start to end)
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const rotation = Math.atan2(dy, dx);

        // Get arrow properties
        const arrowSize = getArrowSize(feature);
        const arrowColor = getArrowColor(feature);

        // Create arrow pointing in flow direction (start → end)
        const arrowStyle = new Style({
            geometry: new Point([midX, midY]),

            image: new RegularShape({
                fill: new Fill({ color: arrowColor }),
                stroke: new Stroke({ color: '#FFFFFF', width: 1 }),
                points: 3, // Triangle
                radius: arrowSize,
                rotateWithView: false,
                rotation: rotation,
            }),

            zIndex: 100,
        });

        styles.push(arrowStyle);
    }

    return styles;
}


export function createSinglePipeArrow(feature: Feature): Style | null {
    const geometry = feature.getGeometry() as LineString;
    if (!geometry) return null;

    const coords = geometry.getCoordinates();
    if (coords.length < 2) return null;

    // Determine if we need to reverse the arrow direction
    const shouldReverse = shouldReverseArrowDirection(feature, coords);
    const workingCoords = shouldReverse ? [...coords].reverse() : coords;

    // Calculate total length
    let totalLength = 0;
    const segments: { start: number[]; end: number[]; length: number }[] = [];

    for (let i = 0; i < workingCoords.length - 1; i++) {
        const start = workingCoords[i];
        const end = workingCoords[i + 1];
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const length = Math.sqrt(dx * dx + dy * dy);

        segments.push({ start, end, length });
        totalLength += length;
    }

    const halfLength = totalLength / 2;

    // Find segment containing midpoint
    let accumulatedLength = 0;
    let midSegment = segments[0];
    let remainingLength = halfLength;

    for (let i = 0; i < segments.length; i++) {
        if (accumulatedLength + segments[i].length >= halfLength) {
            midSegment = segments[i];
            remainingLength = halfLength - accumulatedLength;
            break;
        }
        accumulatedLength += segments[i].length;
    }

    // Calculate exact position on segment
    const ratio = remainingLength / midSegment.length;
    const midX = midSegment.start[0] + (midSegment.end[0] - midSegment.start[0]) * ratio;
    const midY = midSegment.start[1] + (midSegment.end[1] - midSegment.start[1]) * ratio;

    // Calculate rotation based on segment direction
    const dx = midSegment.end[0] - midSegment.start[0];
    const dy = midSegment.end[1] - midSegment.start[1];
    const rotation = Math.atan2(dy, dx);

    const arrowSize = getArrowSize(feature);
    const arrowColor = getArrowColor(feature);

    return new Style({
        geometry: new Point([midX, midY]),
        image: new RegularShape({
            fill: new Fill({ color: arrowColor }),
            stroke: new Stroke({ color: '#FFFFFF', width: 1 }),
            points: 3,
            radius: arrowSize,
            rotation: rotation - Math.PI / 2, // Adjust for triangle orientation
            rotateWithView: false,
        }),
        zIndex: 101,
    });
}

/**
 * Determine if arrow direction should be reversed based on node topology
 * 
 * Logic:
 * - If pipe has startNodeId and endNodeId, use those to determine direction
 * - Flow direction is from startNode → endNode
 * - If the geometry coordinates are in reverse order (endNode coords first),
 *   we need to reverse the arrow to point in the correct flow direction
 */
function shouldReverseArrowDirection(feature: Feature, coords: number[][]): boolean {
    const startNodeId = feature.get('startNodeId');
    const endNodeId = feature.get('endNodeId');

    // If no topology info, assume coordinates are in correct order
    if (!startNodeId || !endNodeId) {
        return false;
    }

    // Get the actual start and end coordinates
    const firstCoord = coords[0];
    const lastCoord = coords[coords.length - 1];

    // This would require access to the node features to compare positions
    // For now, we'll add a 'reversed' property that can be set when creating/modifying pipes
    const isReversed = feature.get('reversed') || false;
    
    return isReversed;
}

export function getArrowColor(feature: Feature): string {
    // Default: Red arrows
    return '#EF4444';

    // Future: Dynamic based on flow
    // const flow = feature.get('flow');
    // if (flow === undefined || flow === 0) return '#9CA3AF'; // Gray
    // return flow > 0 ? '#10B981' : '#EF4444'; // Green or Red
}

export function getArrowSize(feature: Feature): number {
    const diameter = feature.get('diameter') || 300;

    if (diameter < 150) return 6;
    if (diameter < 300) return 7;
    if (diameter < 600) return 9;
    return 11;
}
