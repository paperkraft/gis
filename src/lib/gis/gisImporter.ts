import shp from 'shpjs';
import { fromLonLat } from 'ol/proj';
import { convertToLatLon } from './projections';

interface ImportSettings {
    defaultDiameter: number;
    defaultRoughness: number;
    tolerance: number; // Snapping tolerance in Meters
}

export async function convertGisToINP(
    file: File, 
    settings: ImportSettings = { defaultDiameter: 150, defaultRoughness: 100, tolerance: 1.0 },
    sourceEPSG: string = "EPSG:4326" // Default to Lat/Lon, but can be overridden by UI
): Promise<string> {
    
    let geojson: any;

    // 1. Parse File
    try {
        if (file.name.toLowerCase().endsWith('.zip')) {
            const buffer = await file.arrayBuffer();
            geojson = await shp(buffer);
            if (Array.isArray(geojson)) geojson = geojson[0];
            
            // If it's a shapefile, it might have internal .prj
            // We usually trust the .prj if it exists, but sourceEPSG override takes precedence if user selected it
        } else {
            const text = await file.text();
            geojson = JSON.parse(text);
        }
    } catch (e) {
        throw new Error("Invalid file format.");
    }

    if (!geojson) throw new Error("Could not parse GIS data.");

    const rawFeatures = Array.isArray(geojson.features) 
        ? geojson.features 
        : (geojson.type === 'FeatureCollection' ? geojson.features : [geojson]);

    // Data Stores
    // We store X/Y in Web Mercator (Meters) for accurate Euclidean length calc
    const nodes = new Map<string, { id: string; x: number; y: number }>();
    const pipes: any[] = [];
    let nodeIdCounter = 1;
    let pipeIdCounter = 1;
    let repairedCount = 0;
    let skippedCount = 0;

    // --- NODE LOGIC ---
    const getOrAddNode = (rawX: number, rawY: number): string | null => {
        
        // STEP A: Standardize to WGS84 (Lat/Lon)
        // This handles the user selection (e.g. converting UTM -> Lat/Lon)
        const wgs84 = convertToLatLon([rawX, rawY], sourceEPSG);
        if (!wgs84) return null;

        // STEP B: Project to Web Mercator (Meters)
        // We do this so 1 unit = 1 meter. This makes length calculation accurate.
        const [lon, lat] = wgs84;
        const projected = fromLonLat([lon, lat]); // OpenLayers projection
        
        if (isNaN(projected[0]) || isNaN(projected[1])) return null;

        const [x, y] = projected;

        // STEP C: Snapping (Euclidean Distance in Meters)
        for (const node of nodes.values()) {
            const dx = node.x - x;
            const dy = node.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < settings.tolerance) {
                return node.id;
            }
        }

        // Create New
        const id = `J-${nodeIdCounter++}`;
        nodes.set(id, { id, x, y });
        return id;
    };

    // --- REPAIR LOGIC ---
    // Filters out nulls and converts/projects coordinates in one pass
    function repairAndProjectLine(rawCoords: any[]): [string, number, number][] {
        const validPath: [string, number, number][] = []; // [NodeID, x_meter, y_meter]

        const flat = rawCoords.flat(Infinity); // Flatten if deeply nested
        // Re-chunk into pairs? No, safer to iterate the structure if we can assume it's valid
        // Actually, for LineString, rawCoords is Array<[number, number]>
        
        // Handle nesting manually for safety
        const points = Array.isArray(rawCoords[0]) ? rawCoords : [rawCoords];

        for (const pt of points) {
            if (!Array.isArray(pt) || pt.length < 2) continue; // Skip null/bad points
            
            const nodeId = getOrAddNode(pt[0], pt[1]);
            if (nodeId) {
                const node = nodes.get(nodeId)!;
                validPath.push([nodeId, node.x, node.y]);
            }
            // If nodeId is null, we effectively "Bridge the Gap"
        }
        return validPath;
    }

    // --- PIPE PROCESSOR ---
    const processLineString = (rawCoords: any[]) => {
        const path = repairAndProjectLine(rawCoords);

        if (path.length < 2) {
            skippedCount++;
            return;
        }

        if (path.length < rawCoords.length) repairedCount++;

        // Connect the dots
        for (let i = 0; i < path.length - 1; i++) {
            const [id1, x1, y1] = path[i];
            const [id2, x2, y2] = path[i+1];

            if (id1 === id2) continue; // Loop

            // Euclidean Length in Meters (Web Mercator)
            const dx = x2 - x1;
            const dy = y2 - y1;
            const length = Math.sqrt(dx*dx + dy*dy);

            pipes.push({
                id: `P-${pipeIdCounter++}`,
                node1: id1,
                node2: id2,
                length: Math.max(0.1, length), // Min 0.1m
                diameter: settings.defaultDiameter,
                roughness: settings.defaultRoughness
            });
        }
    };

    // --- MAIN LOOP ---
    for (const feature of rawFeatures) {
        if (!feature || !feature.geometry) continue;
        const type = feature.geometry.type;
        const coords = feature.geometry.coordinates;

        if (type === "LineString") {
            processLineString(coords);
        } else if (type === "MultiLineString") {
            if (Array.isArray(coords)) {
                coords.forEach((line: any) => processLineString(line));
            }
        }
    }

    if (pipes.length === 0) throw new Error("No valid network could be created.");
    console.log(`GIS Import: ${pipes.length} pipes created. ${repairedCount} segments repaired.`);

    // --- INP GENERATION ---
    const lines: string[] = [];
    lines.push('[TITLE]', 'Imported from GIS', '');
    
    lines.push('[JUNCTIONS]', ';ID              Elev    Demand  Pattern');
    nodes.forEach(n => lines.push(`${pad(n.id)} 0       0       ;`));
    lines.push('');

    lines.push('[PIPES]', ';ID              Node1           Node2           Length      Diam    Roughness');
    pipes.forEach(p => {
        lines.push(`${pad(p.id)} ${pad(p.node1)} ${pad(p.node2)} ${pad(p.length.toFixed(2))} ${pad(p.diameter)} ${pad(p.roughness)}`);
    });
    lines.push('');

    lines.push('[COORDINATES]', ';Node            X-Coord         Y-Coord');
    nodes.forEach(n => {
        // We save Web Mercator (Meters)
        // Your Map component (OpenLayers/Leaflet) usually handles this well 
        // OR expects Lat/Lon.
        // If your map expects Lat/Lon, convert back using `toLonLat` here.
        // Standard Epanet-JS often prefers Meters for X/Y.
        lines.push(`${pad(n.id)} ${pad(n.x.toFixed(4))} ${pad(n.y.toFixed(4))}`);
    });
    lines.push('');
    lines.push('[END]');

    return lines.join('\n');
}

function pad(s: any, width = 16) {
    return String(s).padEnd(width, ' ');
}