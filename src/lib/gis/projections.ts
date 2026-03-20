import proj4 from 'proj4';

/**
 * Converts ANY input coordinate to WGS84 (Lat/Lon).
 * Returns null if conversion fails.
 */
export function convertToLatLon(coords: number[], sourceEpsg: string): [number, number] | null {
    if (!coords || coords.length < 2) return null;
    const [x, y] = coords;

    // Safety: Check for valid numbers
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

    // If already WGS84, return as is
    if (sourceEpsg === 'EPSG:4326') return [x, y];

    try {
        const converted = proj4(sourceEpsg, 'EPSG:4326', [x, y]);
        if (isNaN(converted[0]) || isNaN(converted[1])) return null;
        return [converted[0], converted[1]];
    } catch (e) {
        console.error(`Projection failed for ${sourceEpsg}`, e);
        return null;
    }
}