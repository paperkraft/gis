import shp from 'shpjs';

export type GisValidationResult =
    | { status: 'valid'; message?: string }
    | { status: 'warning'; message: string }
    | { status: 'error'; message: string };

// Helper: Check for Nulls/NaNs
function containsNulls(coords: any): boolean {
    if (!Array.isArray(coords)) return true;
    if (coords.length >= 2 && typeof coords[0] !== 'object') {
        return coords[0] === null || coords[1] === null || isNaN(coords[0]) || isNaN(coords[1]);
    }
    return coords.some(child => containsNulls(child));
}

function hasValidCoordinates(coords: any): boolean {
    if (!Array.isArray(coords)) return false;
    if (coords.length >= 2 && typeof coords[0] === 'number') {
        const [x, y] = coords;
        return Number.isFinite(x) && Number.isFinite(y);
    }
    if (coords.length === 0) return false;
    return coords.some(child => hasValidCoordinates(child));
}

export async function validateGisFile(file: File): Promise<GisValidationResult> {
    const isZip = file.name.toLowerCase().endsWith('.zip');
    const fileTypeLabel = isZip ? "Shapefile (ZIP)" : "GeoJSON";

    try {
        let geojson: any;

        // 1. Parse File
        if (isZip) {
            try {
                const buffer = await file.arrayBuffer();
                geojson = await shp(buffer);
                if (Array.isArray(geojson)) geojson = geojson[0];
            } catch (e) {
                return { status: 'error', message: "Failed to parse Shapefile. Ensure valid .shp/.shx/.dbf." };
            }
        } else {
            try {
                const text = await file.text();
                if (!text.trim()) return { status: 'error', message: "File is empty." };
                geojson = JSON.parse(text);
            } catch (e) {
                return { status: 'error', message: "Invalid JSON syntax." };
            }
        }

        if (!geojson || (!geojson.features && geojson.type !== 'FeatureCollection')) {
            return { status: 'error', message: `Invalid ${fileTypeLabel} structure.` };
        }

        const features = Array.isArray(geojson.features) ? geojson.features : [geojson];
        if (features.length === 0) {
            return { status: 'error', message: `No features found in ${fileTypeLabel}.` };
        }

        // 2. Scan Features
        let nullCount = 0;
        let invalidStructureCount = 0;
        let validCount = 0;
        let looksLikeMeters = false;

        const scanLimit = Math.min(features.length, 2000);

        for (let i = 0; i < scanLimit; i++) {
            const feature = features[i];

            if (!feature || !feature.geometry || !feature.geometry.coordinates) {
                invalidStructureCount++;
                continue;
            }

            const coords = feature.geometry.coordinates;

            if (containsNulls(coords)) {
                nullCount++;
                continue;
            }

            if (!hasValidCoordinates(coords)) {
                invalidStructureCount++;
                continue;
            }

            validCount++;

            // Projection Check (Sample first 5 valid features)
            if (validCount <= 5) {
                const flatCoords = JSON.stringify(coords);
                // Heuristic: If we see numbers larger than 180, it's definitely not Lat/Lon
                if (/[0-9]{3,}\./.test(flatCoords)) {
                    let pt: number[] | null = null;
                    if (feature.geometry.type === "LineString") pt = coords[0];
                    else if (feature.geometry.type === "MultiLineString") pt = coords[0]?.[0];

                    if (pt && (Math.abs(pt[0]) > 180 || Math.abs(pt[1]) > 90)) {
                        looksLikeMeters = true;
                    }
                }
            }
        }

        // 3. Status Determination
        if (validCount === 0) {
            if (nullCount > 0) return { status: 'error', message: `File contains ONLY null coordinates.` };
            return { status: 'error', message: `No valid geometry found.` };
        }

        // --- SPECIFIC WARNINGS ---

        if (nullCount > 0) {
            return {
                status: 'warning',
                message: `Found ${nullCount} features with 'null' values. These will be skipped.`
            };
        }

        // --- THE FIX: Allow Meters for GeoJSON (as Warning) ---
        if (looksLikeMeters) {
            return {
                status: 'warning',
                message: isZip
                    ? "Projected coordinates (Meters) detected. Ensure .prj file is included."
                    // This specific message triggers the UI Dropdown in your modal
                    : "Projected coordinates (Meters) detected."
            };
        }

        return { status: 'valid', message: `Ready to import ${features.length} features.` };

    } catch (e) {
        return { status: 'error', message: `Error reading ${fileTypeLabel}.` };
    }
}