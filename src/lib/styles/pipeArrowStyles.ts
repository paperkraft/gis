import { Style, Fill, Stroke, RegularShape } from 'ol/style';
import { LineString, Point } from 'ol/geom';
import { Feature } from 'ol';

/**
 * Create arrow style for pipe - arrows point from startNode to endNode
 */
export function createPipeArrowStyle(feature: Feature): Style[] {
    const geometry = feature.getGeometry() as LineString;
    if (!geometry) return [];

    const coords = geometry.getCoordinates();
    if (coords.length < 2) return [];

    // Get pipe direction (start node -> end node)
    const startNodeId = feature.get('startNodeId');
    const endNodeId = feature.get('endNodeId');

    console.log('Creating arrows for pipe:', feature.getId());
    console.log('  Start node:', startNodeId);
    console.log('  End node:', endNodeId);
    console.log('  Coordinates:', coords.length);

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

    const coords = geometry.getCoordinates();
    if (coords.length < 2) return null;

    // Calculate total length and find midpoint
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

    const halfLength = totalLength / 2;

    // Find segment containing the midpoint
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

    // Calculate direction from start to end of segment
    const dx = midSegment.end[0] - midSegment.start[0];
    const dy = midSegment.end[1] - midSegment.start[1];

    // Calculate angle in radians
    const angle = Math.atan2(dy, dx);

    console.log('Arrow at:', [midX, midY]);
    console.log('  Segment direction:', { dx, dy });
    console.log('  Angle (radians):', angle);
    console.log('  Angle (degrees):', (angle * 180 / Math.PI).toFixed(2));

    const arrowSize = getArrowSize(feature);
    const arrowColor = getArrowColor(feature);

    // Create triangle arrow
    // RegularShape with 3 points creates a triangle pointing UP (north) when rotation = 0
    // We need to rotate it to point in the direction of flow
    return new Style({
        geometry: new Point([midX, midY]),
        image: new RegularShape({
            fill: new Fill({ color: arrowColor }),
            stroke: new Stroke({ color: '#FFFFFF', width: 1 }),
            points: 3, // Triangle
            radius: arrowSize,
            rotation: -angle, // Negative because OpenLayers rotates clockwise
            angle: Math.PI / 2, // Start with triangle pointing right (east)
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
        const angle = Math.atan2(dy, dx);

        const arrowStyle = new Style({
            geometry: new Point([midX, midY]),
            image: new RegularShape({
                fill: new Fill({ color: arrowColor }),
                stroke: new Stroke({ color: '#FFFFFF', width: 1 }),
                points: 3,
                radius: arrowSize,
                rotation: -angle,
                angle: Math.PI / 2, // Triangle pointing right initially
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
    return '#EF4444'; // Red
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
