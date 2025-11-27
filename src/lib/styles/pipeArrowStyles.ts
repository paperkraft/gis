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

    // Create arrow for each segment
    for (let i = 0; i < coords.length - 1; i++) {
        const start = coords[i];
        const end = coords[i + 1];

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
                // rotation: rotation - Math.PI / 2,
            }),

            // image: new Icon({
            //     src: '/arrow.svg',
            //     scale: 0.02,
            //     anchor: [0.75, 0.5],
            //     rotateWithView: true,
            //     rotation: -rotation,
            // }),

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
