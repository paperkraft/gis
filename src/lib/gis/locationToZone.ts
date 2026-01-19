import proj4 from 'proj4';

export interface AutoProjection {
    code: string;       // e.g., "EPSG:32643"
    definition: string; // The Proj4 definition string
    zone: number;
    hemisphere: 'N' | 'S';
    locationName: string;
}

/**
 * 1. Takes a city name (e.g. "Mumbai")
 * 2. Finds its Lat/Lon
 * 3. Calculates the correct UTM Zone
 * 4. Returns the Projection Definition
 */
export async function getProjectionFromLocation(query: string): Promise<AutoProjection> {

    // A. Geocoding (Using OpenStreetMap Nominatim - Free, No Key required)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

    let lat: number, lon: number;
    let displayName: string;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (!data || data.length === 0) {
            throw new Error(`Location '${query}' not found.`);
        }

        lat = parseFloat(data[0].lat);
        lon = parseFloat(data[0].lon);
        displayName = data[0].display_name;
    } catch (e) {
        throw new Error("Could not fetch location data. Please check internet connection.");
    }

    // B. Calculate UTM Zone
    // Formula: Zone = floor((lon + 180) / 6) + 1
    const zone = Math.floor((lon + 180) / 6) + 1;
    const hemisphere = lat >= 0 ? 'N' : 'S';

    // C. Generate EPSG Code & Definition
    // UTM North: 326xx, UTM South: 327xx
    const epsgPrefix = hemisphere === 'N' ? '326' : '327';
    const code = `EPSG:${epsgPrefix}${zone}`;

    // Dynamically build the Proj4 string
    // e.g. "+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs"
    const def = `+proj=utm +zone=${zone} ${hemisphere === 'S' ? '+south ' : ''}+datum=WGS84 +units=m +no_defs`;

    // D. Register it immediately so Proj4 knows it
    proj4.defs(code, def);

    return {
        code,
        definition: def,
        zone,
        hemisphere,
        locationName: displayName
    };
}