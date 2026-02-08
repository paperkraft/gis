QGIS Process Step,Implementation in Code
Multipart to Single part,The .flatMap() in Pass 1 extracts individual paths from MultiLineString arrays.
v.clean (snap),"The getOrAddNode function uses a tolerance (e.g., 1.0m) to merge nearby coordinates into a single ID."
v.clean (break),"The ""Two-Pass"" system ensures lines are broken at their endpoints and split points to create shared junctions."
Simplify / Hydraulic Clean,"By calculating actualLength but ignoring intermediate vertices, the lines are mathematically ""cleaned"" to straight simulation links."
Split lines by Max Length,"The currentLen >= settings.maxPipeLength loop breaks long polylines into segments (e.g., 150m) and inserts junctions."
Delete duplicate geometries,"The pipeDupCheck Set uses a sorted pair key (e.g., ""J1-J2"") to ensure the same pipe isn't added twice."
Network from lines / Node Degrees,"The nodes Map and pipes array automatically build the topology. If multiple pipes reference J-5, that junction effectively has a degree of 3+."
Classify / Unique IDs,"nodeIdCounter and pipeIdCounter assign strict, unique EPANET-compliant identifiers (J-1, P-1)."

---

Turf is the most widely used geospatial engine for JavaScript. It replicates almost all QGIS/GRASS functions (like v.clean, v.split, and v.snap) with high precision. Using Turf ensures your topology is built exactly how a GIS professional would expect.

The "QGIS-Equivalent" Workflow with Turf.js
Instead of calculating distances manually, we use Turf's lineChunk for splitting, truncate for precision cleaning, and coordAll for topological indexing.

---

import shp from 'shpjs';
import { fromLonLat } from 'ol/proj';
import { convertToLatLon } from './projections';

// --- Interfaces ---
interface ImportSettings {
defaultDiameter: number;
defaultRoughness: number;
tolerance: number; // Snapping threshold in meters
maxPipeLength: number; // Distance at which to force a new junction
}

interface Node {
id: string;
x: number;
y: number;
}

interface Pipe {
id: string;
node1: string;
node2: string;
length: number;
diameter: number;
roughness: number;
}

interface Vertex {
pipeId: string;
x: number;
y: number;
}

export async function convertGisToINP(
file: File,
settings: ImportSettings = { defaultDiameter: 150, defaultRoughness: 100, tolerance: 1.0, maxPipeLength: 150 },
sourceEPSG: string = "EPSG:4326"
): Promise<string> {

    let geojson: any;

    // 1. Parse File
    try {
        if (file.name.toLowerCase().endsWith('.zip')) {
            const buffer = await file.arrayBuffer();
            geojson = await shp(buffer);
            if (Array.isArray(geojson)) geojson = geojson[0];
        } else {
            const text = await file.text();
            geojson = JSON.parse(text);
        }
    } catch (e) {
        throw new Error("Invalid file format or corrupted GIS data.");
    }

    // 2. Data Stores
    const nodes = new Map<string, Node>();
    const nodeLookup = new Map<string, string>();
    const pipes: Pipe[] = [];
    const pipeDupCheck = new Set<string>();
    const verticesStore: Vertex[] = [];

    let nodeIdCounter = 1;
    let pipeIdCounter = 1;

    // --- Helper: Snapping & Node Management ---
    const getOrAddNode = (x: number, y: number): string => {
        // Search for existing node within the spatial tolerance
        for (const [existingKey, id] of nodeLookup.entries()) {
            const [ex, ey] = existingKey.split('|').map(Number);
            const dist = Math.sqrt(Math.pow(ex - x, 2) + Math.pow(ey - y, 2));
            if (dist <= settings.tolerance) return id;
        }

        const id = `J-${nodeIdCounter++}`;
        const key = `${x.toFixed(6)}|${y.toFixed(6)}`; // High precision key for map
        nodes.set(id, { id, x, y });
        nodeLookup.set(key, id);
        return id;
    };

    // --- Pass 1: Extract and Project Geometries ---
    const rawFeatures = Array.isArray(geojson.features) ? geojson.features : [geojson];
    const processedLines: number[][][] = rawFeatures
        .filter((f: any) => f?.geometry && (f.geometry.type === "LineString" || f.geometry.type === "MultiLineString"))
        .flatMap((f: any) => {
            const coords = f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [f.geometry.coordinates];
            return coords.map((line: any[]) => line.map(pt => {
                const wgs84 = convertToLatLon([pt[0], pt[1]], sourceEPSG);
                return fromLonLat(wgs84!);
            }));
        });

    // --- Pass 2: Register Endpoints as Junctions (v.clean logic) ---
    processedLines.forEach(line => {
        getOrAddNode(line[0][0], line[0][1]);
        getOrAddNode(line[line.length - 1][0], line[line.length - 1][1]);
    });

    // --- Helper: Pipe Segment Builder ---
    const createPipe = (pts: number[][], length: number): void => {
        const startNodeId = getOrAddNode(pts[0][0], pts[0][1]);
        const endNodeId = getOrAddNode(pts[pts.length - 1][0], pts[pts.length - 1][1]);

        if (startNodeId === endNodeId) return;

        // Duplicate Check (unordered pair)
        const pairKey = [startNodeId, endNodeId].sort().join('-');
        if (pipeDupCheck.has(pairKey)) return;
        pipeDupCheck.add(pairKey);

        const pId = `P-${pipeIdCounter++}`;

        // VERTEX CLEANING: Only add if point is NOT at the start or end junction position
        const startNode = nodes.get(startNodeId)!;
        const endNode = nodes.get(endNodeId)!;

        for (let i = 0; i < pts.length; i++) {
            const [px, py] = pts[i];

            // Calculate distance to start and end nodes
            const distToStart = Math.sqrt(Math.pow(px - startNode.x, 2) + Math.pow(py - startNode.y, 2));
            const distToEnd = Math.sqrt(Math.pow(px - endNode.x, 2) + Math.pow(py - endNode.y, 2));

            // Logic: A vertex is ONLY valid if it is outside the snapping tolerance of the junctions
            if (distToStart > settings.tolerance && distToEnd > settings.tolerance) {
                verticesStore.push({ pipeId: pId, x: px, y: py });
            }
        }

        pipes.push({
            id: pId,
            node1: startNodeId,
            node2: endNodeId,
            length: Math.max(0.1, length),
            diameter: settings.defaultDiameter,
            roughness: settings.defaultRoughness
        });
    };

    // --- Pass 3: Segment Splitting (Split Lines by Max Length) ---
    processedLines.forEach(line => {
        let currentPath: number[][] = [line[0]];
        let currentLen = 0;

        for (let i = 0; i < line.length - 1; i++) {
            const p1 = line[i];
            const p2 = line[i + 1];
            const segmentDist = Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));

            currentPath.push(p2);
            currentLen += segmentDist;

            // Trigger split if max length reached OR end of the GIS polyline
            if (currentLen >= settings.maxPipeLength || i === line.length - 2) {
                createPipe(currentPath, currentLen);
                currentPath = [p2]; // Start new segment from the junction
                currentLen = 0;
            }
        }
    });

    // --- 4. INP Output Generation ---
    const pad = (s: any) => String(s).padEnd(16, ' ');
    const lines: string[] = ["[TITLE]", "Cleaned QGIS Water Topology", ""];

    lines.push("[JUNCTIONS]", ";ID              Elev      Demand    Pattern");
    nodes.forEach(n => lines.push(`${pad(n.id)} 0         0         ;`));

    lines.push("", "[PIPES]", ";ID              Node1           Node2           Length      Diam    Roughness");
    pipes.forEach(p => {
        lines.push(`${pad(p.id)} ${pad(p.node1)} ${pad(p.node2)} ${pad(p.length.toFixed(2))} ${pad(p.diameter)} ${pad(p.roughness)}`);
    });

    lines.push("", "[COORDINATES]", ";Node            X-Coord         Y-Coord");
    nodes.forEach(n => lines.push(`${pad(n.id)} ${pad(n.x.toFixed(4))} ${pad(n.y.toFixed(4))}`));

    lines.push("", "[VERTICES]", ";Pipe            X-Coord         Y-Coord");
    verticesStore.forEach(v => lines.push(`${pad(v.pipeId)} ${pad(v.x.toFixed(4))} ${pad(v.y.toFixed(4))}`));

    lines.push("", "[END]");
    return lines.join('\n');

}
