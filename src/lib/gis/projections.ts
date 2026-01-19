import proj4 from 'proj4';

// Define common definitions (Add more from epsg.io if needed)
proj4.defs("EPSG:32643", "+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs"); // India West (Maharashtra)
proj4.defs("EPSG:32644", "+proj=utm +zone=44 +datum=WGS84 +units=m +no_defs"); // India East
proj4.defs("EPSG:3857", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs");

export const COMMON_PROJECTIONS = [
    { label: "WGS 84 (Lat/Lon) - Standard", value: "EPSG:4326" },
    { label: "Web Mercator (Google Maps)", value: "EPSG:3857" },
    { label: "UTM Zone 43N (India - West/Maha)", value: "EPSG:32643" },
    { label: "UTM Zone 44N (India - East)", value: "EPSG:32644" },
];

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