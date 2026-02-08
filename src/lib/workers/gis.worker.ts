import shp from 'shpjs';
import RBush from 'rbush';
import { fromLonLat } from 'ol/proj';
import { convertToLatLon } from '../gis/projections';

interface SpatialNode {
    minX: number; minY: number; maxX: number; maxY: number;
    id: string; x: number; y: number; elevation: number;
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
    const tree = new RBush<SpatialNode>();
    const nodes = new Map<string, { id: string, x: number, y: number, elevation: number }>();
    const pipes: any[] = [];
    const vertices: any[] = [];
    const pipeDupCheck = new Set<string>();

    let nodeIdCounter = 1;
    let pipeIdCounter = 1;

    const findExistingNode = (x: number, y: number): string | null => {
        const tol = settings.tolerance;
        const neighbors = tree.search({ minX: x - tol, minY: y - tol, maxX: x + tol, maxY: y + tol });
        for (const node of neighbors) {
            if (Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2) <= tol) return node.id;
        }
        return null;
    };

    const getOrAddNode = (x: number, y: number, elevation: number = 0): string => {
        const existingId = findExistingNode(x, y);
        if (existingId) return existingId;

        const id = `J-${nodeIdCounter++}`;
        const newNode: SpatialNode = { minX: x, minY: y, maxX: x, maxY: y, id, x, y, elevation };
        tree.insert(newNode);
        nodes.set(id, { id, x, y, elevation });
        return id;
    };

    // --- PASS 1: Project and Filter ---
    const rawFeatures = Array.isArray(geojson.features) ? geojson.features : [geojson];

    // Safety: Filter out non-line features immediately
    const featureData = rawFeatures
        .map((f: any) => {
            if (!f.geometry || !["LineString", "MultiLineString"].includes(f.geometry.type)) return null;

            const coords = f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [f.geometry.coordinates];

            // Case-insensitive attribute lookup
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
                    if (!latLon) return [0, 0]; // Safety guard
                    return fromLonLat(latLon);
                })
            );

            // Register endpoints
            projectedLines.forEach((line: any[]) => {
                if (line.length > 0) {
                    getOrAddNode(line[0][0], line[0][1], elevStart);
                    getOrAddNode(line[line.length - 1][0], line[line.length - 1][1], elevEnd);
                }
            });

            return { props, projectedLines, elevStart, elevEnd };
        })
        .filter((item: any) => item !== null && item.projectedLines.length > 0); // REMOVE NULLS

    // --- PASS 2: Split and Interpolate ---
    const totalItems = featureData.length;
    featureData.forEach((feat: any, idx: number) => {
        // Progress update
        if (idx % 10 === 0) {
            ctx.postMessage({ type: 'progress', data: Math.round((idx / totalItems) * 100) });
        }

        feat.projectedLines.forEach((line: any[]) => {
            if (line.length < 2) return; // Safety guard for corrupt geometries

            let totalLength = 0;
            for (let j = 0; j < line.length - 1; j++) {
                totalLength += Math.sqrt((line[j + 1][0] - line[j][0]) ** 2 + (line[j + 1][1] - line[j][1]) ** 2);
            }

            let startNodeId = getOrAddNode(line[0][0], line[0][1], feat.elevStart);
            let currentPath = [line[0]];
            let currentLen = 0;
            let accumulatedDist = 0;

            for (let i = 0; i < line.length - 1; i++) {
                const p1 = line[i];
                const p2 = line[i + 1];
                const segDist = Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2);

                currentPath.push(p2);
                currentLen += segDist;
                accumulatedDist += segDist;

                // Check for T-Junction split
                const tol = settings.tolerance;
                const nodeAtP2 = findExistingNode(p2[0], p2[1]);
                const isLast = i === line.length - 2;

                if (currentLen >= settings.maxPipeLength || nodeAtP2 || isLast) {
                    const ratio = totalLength > 0 ? accumulatedDist / totalLength : 0;
                    const interpElev = feat.elevStart + (feat.elevEnd - feat.elevStart) * ratio;

                    const endNodeId = getOrAddNode(p2[0], p2[1], interpElev);

                    if (startNodeId !== endNodeId) {
                        const pairKey = [startNodeId, endNodeId].sort().join('-');
                        if (!pipeDupCheck.has(pairKey)) {
                            const pId = `P-${pipeIdCounter++}`;
                            currentPath.slice(1, -1).forEach(v => vertices.push({ pId, x: v[0], y: v[1] }));

                            pipes.push({
                                id: pId, n1: startNodeId, n2: endNodeId,
                                len: Math.max(0.1, currentLen),
                                diam: feat.props?.DIAMETER || feat.props?.diam || settings.defaultDiameter,
                                rough: feat.props?.ROUGHNESS || feat.props?.rough || settings.defaultRoughness
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

    // --- PASS 3: Generate INP Output ---
    const pad = (s: any) => String(s).padEnd(16, ' ');
    let out = "[TITLE]\nWeb Project Topology Export\n\n[JUNCTIONS]\n;ID              Elev      Demand\n";
    nodes.forEach(n => out += `${pad(n.id)} ${n.elevation.toFixed(2)}      0\n`);

    out += "\n[PIPES]\n;ID              Node1           Node2           Length    Diam      Roughness\n";
    pipes.forEach(p => out += `${pad(p.id)} ${pad(p.n1)} ${pad(p.n2)} ${p.len.toFixed(2).padEnd(10)} ${String(p.diam).padEnd(10)} ${p.rough}\n`);

    out += "\n[COORDINATES]\n";
    nodes.forEach(n => out += `${pad(n.id)} ${n.x.toFixed(4)} ${n.y.toFixed(4)}\n`);

    out += "\n[VERTICES]\n";
    vertices.forEach(v => out += `${pad(v.pId)} ${v.x.toFixed(4)} ${v.y.toFixed(4)}\n`);

    return out + "\n[END]";
}