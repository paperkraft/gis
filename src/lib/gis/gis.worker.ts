import shp from 'shpjs';
import Flatbush from 'flatbush';
import { fromLonLat } from 'ol/proj';
import { convertToLatLon } from '../gis/projections';

interface SpatialNode {
    id: string;
    x: number;
    y: number;
    elevation: number;
}

const ctx: Worker = self as any;

ctx.onmessage = async (e) => {
    const { buffer, fileName, settings, sourceEPSG } = e.data;
    try {
        let geojson: any;
        if (fileName.toLowerCase().endsWith('.zip')) {
            geojson = await shp(buffer);
            if (Array.isArray(geojson)) geojson = geojson[0];
        } else {
            const text = new TextDecoder().decode(buffer);
            geojson = JSON.parse(text);
        }

        if (!geojson || !geojson.features) throw new Error("Invalid GeoJSON structure");

        const result = convertWithElevation(geojson, settings, sourceEPSG);
        ctx.postMessage({ type: 'success', data: result });
    } catch (err: any) {
        ctx.postMessage({ type: 'error', error: err.message });
    }
};

function convertWithElevation(geojson: any, settings: any, sourceEPSG: string): string {
    const nodesMap = new Map<string, SpatialNode>();
    const pipes: any[] = [];
    const vertices: any[] = [];
    const pipeDupCheck = new Set<string>();

    let nodeIdCounter = 1;
    let pipeIdCounter = 1;

    const rawFeatures = Array.isArray(geojson.features) ? geojson.features : [geojson];

    // --- PASS 1: COLLECT ONLY ENDPOINTS FOR THE INDEX ---
    // This prevents intermediate vertices from being treated as junction candidates
    const endpointList: { x: number; y: number; elev: number }[] = [];

    const featureData = rawFeatures
        .map((f: any) => {
            if (!f.geometry || !["LineString", "MultiLineString"].includes(f.geometry.type)) return null;

            const coords = f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [f.geometry.coordinates];
            const props = f.properties || {};

            const findProp = (keys: string[]) => {
                const found = Object.keys(props).find(k => keys.includes(k.toUpperCase()));
                return found ? props[found] : 0;
            };

            const elevStart = findProp(['ELEV_START', 'Z_START', 'ELEV', 'START_Z', 'FROM_ELEV']);
            const elevEnd = findProp(['ELEV_END', 'Z_END', 'ELEV', 'END_Z', 'TO_ELEV']);

            const projectedLines = coords.map((line: any[]) =>
                line.map(pt => {
                    const latLon = convertToLatLon([pt[0], pt[1]], sourceEPSG);
                    return latLon ? fromLonLat(latLon) : [0, 0];
                })
            );

            // Only index the START and END points of each line
            projectedLines.forEach((line: any[]) => {
                if (line.length > 0) {
                    endpointList.push({ x: line[0][0], y: line[0][1], elev: elevStart });
                    endpointList.push({ x: line[line.length - 1][0], y: line[line.length - 1][1], elev: elevEnd });
                }
            });

            return { props, projectedLines, elevStart, elevEnd };
        })
        .filter((item: any) => item !== null && item.projectedLines.length > 0);

    // Build index using ONLY endpoints
    const index = new Flatbush(endpointList.length);
    for (const p of endpointList) {
        index.add(p.x, p.y, p.x, p.y);
    }
    index.finish();

    // --- HELPER: SNAP TO ENDPOINTS ---
    const getOrAddNode = (x: number, y: number, elevation: number = 0): string => {
        const tol = settings.tolerance;
        const neighbors = index.search(x - tol, y - tol, x + tol, y + tol);

        for (const idx of neighbors) {
            const candidate = endpointList[idx];
            const dist = Math.sqrt((candidate.x - x) ** 2 + (candidate.y - y) ** 2);
            if (dist <= tol) {
                // Return existing junction if one was already created at this specific coordinate
                const existing = Array.from(nodesMap.values()).find(n =>
                    Math.abs(n.x - candidate.x) < 0.0001 && Math.abs(n.y - candidate.y) < 0.0001
                );
                if (existing) return existing.id;
            }
        }

        const id = `J-${nodeIdCounter++}`;
        nodesMap.set(id, { id, x, y, elevation });
        return id;
    };

    const totalItems = featureData.length;

    // --- PASS 2: GENERATE TOPOLOGY (VERTEX vs JUNCTION) ---
    featureData.forEach((feat: any, idx: number) => {
        // Use the constant for progress updates
        if (idx % 10 === 0) {
            ctx.postMessage({
                type: 'progress',
                data: Math.round((idx / totalItems) * 100)
            });
        }

        feat.projectedLines.forEach((line: any[]) => {
            if (line.length < 2) return;

            let totalLength = 0;
            for (let j = 0; j < line.length - 1; j++) {
                totalLength += Math.sqrt((line[j + 1][0] - line[j][0]) ** 2 + (line[j + 1][1] - line[j][1]) ** 2);
            }

            let startNodeId = getOrAddNode(line[0][0], line[0][1], feat.elevStart);
            let currentPath = [line[0]];
            let currentLen = 0;
            let accumulatedDist = 0;

            for (let i = 0; i < line.length - 1; i++) {
                const p2 = line[i + 1];
                const segDist = Math.sqrt((p2[0] - line[i][0]) ** 2 + (p2[1] - line[i][1]) ** 2);

                currentPath.push(p2);
                currentLen += segDist;
                accumulatedDist += segDist;

                const tol = settings.tolerance;
                // Only split if P2 is an endpoint of ANOTHER line (T-Junction)
                const splitCandidates = index.search(p2[0] - tol, p2[1] - tol, p2[0] + tol, p2[1] + tol);
                const isLast = i === line.length - 2;

                if (currentLen >= settings.maxPipeLength || splitCandidates.length > 0 || isLast) {
                    const ratio = totalLength > 0 ? accumulatedDist / totalLength : 0;
                    const interpElev = feat.elevStart + (feat.elevEnd - feat.elevStart) * ratio;
                    const endNodeId = getOrAddNode(p2[0], p2[1], interpElev);

                    if (startNodeId !== endNodeId) {
                        const pairKey = [startNodeId, endNodeId].sort().join('-');
                        if (!pipeDupCheck.has(pairKey)) {
                            const pId = `P-${pipeIdCounter++}`;
                            // Intermediate points in currentPath become VERTICES, not Junctions
                            currentPath.slice(1, -1).forEach(v => vertices.push({ pId, x: v[0], y: v[1] }));

                            pipes.push({
                                id: pId, n1: startNodeId, n2: endNodeId,
                                len: Math.max(0.1, currentLen),
                                diam: feat.props?.DIAMETER || settings.defaultDiameter,
                                rough: feat.props?.ROUGHNESS || settings.defaultRoughness
                            });
                            pipeDupCheck.add(pairKey);
                        }
                    }
                    startNodeId = endNodeId;
                    currentPath = [p2];
                    currentLen = 0;
                }
            }
        });
    });

    // --- PASS 3: GENERATE INP ---
    const pad = (s: any) => String(s).padEnd(16, ' ');
    let out = "[TITLE]\nTopology Export\n\n[JUNCTIONS]\n";
    nodesMap.forEach(n => out += `${pad(n.id)} ${n.elevation.toFixed(2)}      0\n`);
    out += "\n[PIPES]\n";
    pipes.forEach(p => out += `${pad(p.id)} ${pad(p.n1)} ${pad(p.n2)} ${p.len.toFixed(2).padEnd(10)} ${String(p.diam).padEnd(10)} ${p.rough}\n`);
    out += "\n[COORDINATES]\n";
    nodesMap.forEach(n => out += `${pad(n.id)} ${n.x.toFixed(4)} ${n.y.toFixed(4)}\n`);
    out += "\n[VERTICES]\n";
    vertices.forEach(v => out += `${pad(v.pId)} ${v.x.toFixed(4)} ${v.y.toFixed(4)}\n`);

    return out + "\n[END]";
}