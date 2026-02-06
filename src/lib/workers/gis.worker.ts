import { fromLonLat } from 'ol/proj';
import proj4 from 'proj4';
import RBush from 'rbush';
import shp from 'shpjs';

import { convertToLatLon } from '../gis/projections';

// Define the structure for RBush indexing
interface SpatialNode {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    id: string;
    x: number;
    y: number;
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

        const result = convertWithRBush(geojson, settings, sourceEPSG);
        ctx.postMessage({ type: 'success', data: result });
    } catch (err: any) {
        ctx.postMessage({ type: 'error', error: err.message });
    }
};

function convertWithRBush(geojson: any, settings: any, sourceEPSG: string): string {
    const tree = new RBush<SpatialNode>();
    const nodes = new Map<string, { id: string, x: number, y: number }>();
    const pipes: any[] = [];
    const vertices: any[] = [];
    const pipeDupCheck = new Set<string>();

    let nodeIdCounter = 1;
    let pipeIdCounter = 1;

    // Helper: Snapping Search
    const findExistingNode = (x: number, y: number): string | null => {
        const tol = settings.tolerance;
        const neighbors = tree.search({ minX: x - tol, minY: y - tol, maxX: x + tol, maxY: y + tol });
        for (const node of neighbors) {
            if (Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2) <= tol) return node.id;
        }
        return null;
    };

    const getOrAddNode = (x: number, y: number): string => {
        const existingId = findExistingNode(x, y);
        if (existingId) return existingId;

        const id = `J-${nodeIdCounter++}`;
        const newNode = { minX: x, minY: y, maxX: x, maxY: y, id, x, y };
        tree.insert(newNode);
        nodes.set(id, { id, x, y });
        return id;
    };

    // --- PASS 1: Project and Index Endpoints ---
    const rawFeatures = Array.isArray(geojson.features) ? geojson.features : [geojson];
    const totalFeatures = rawFeatures.length;

    const featureData = rawFeatures.map((f: any) => {
        if (!f.geometry) return null;
        const coords = f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [f.geometry.coordinates];
        const projectedLines = coords.map((line: any[]) =>
            line.map(pt => fromLonLat(convertToLatLon([pt[0], pt[1]], sourceEPSG)!))
        );

        // Register endpoints as mandatory junctions
        projectedLines.forEach((line: any[]) => {
            getOrAddNode(line[0][0], line[0][1]);
            getOrAddNode(line[line.length - 1][0], line[line.length - 1][1]);
        });

        return { properties: f.properties, projectedLines };
    }).filter(Boolean);

    // --- PASS 2: Build Pipes with T-Junction Splitting ---
    featureData.forEach((feat: any, index: number) => {
        // Report progress every 100 features
        if (index % 100 === 0) {
            const progress = Math.round((index / totalFeatures) * 100);
            ctx.postMessage({ type: 'progress', data: progress });
        }

        feat.projectedLines.forEach((line: any[]) => {
            let startNodeId = getOrAddNode(line[0][0], line[0][1]);
            let currentPath = [line[0]];
            let currentLen = 0;

            for (let i = 0; i < line.length - 1; i++) {
                const p1 = line[i];
                const p2 = line[i + 1];
                const segDist = Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2);

                currentPath.push(p2);
                currentLen += segDist;

                // CRITICAL BUG FIX: Check if p2 is an endpoint for ANY other pipe (T-Junction)
                const nodeAtP2 = findExistingNode(p2[0], p2[1]);
                const isLast = i === line.length - 2;

                // Split if: Max Length exceeded OR p2 is a registered junction OR end of feature
                if (currentLen >= settings.maxPipeLength || nodeAtP2 || isLast) {
                    const endNodeId = getOrAddNode(p2[0], p2[1]);

                    if (startNodeId !== endNodeId) {
                        const pairKey = [startNodeId, endNodeId].sort().join('-');
                        if (!pipeDupCheck.has(pairKey)) {
                            const pId = `P-${pipeIdCounter++}`;

                            // Only add vertices if they aren't the junctions themselves
                            currentPath.slice(1, -1).forEach(v => vertices.push({ pId, x: v[0], y: v[1] }));

                            pipes.push({
                                id: pId, n1: startNodeId, n2: endNodeId,
                                len: Math.max(0.1, currentLen),
                                diam: feat.properties?.diameter || settings.defaultDiameter,
                                rough: feat.properties?.roughness || settings.defaultRoughness
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

    // --- Generate INP ---
    const pad = (s: any) => String(s).padEnd(16, ' ');
    let out = "[TITLE]\nWeb Import with RBush Topology\n\n[JUNCTIONS]\n;ID              Elev      Demand\n";
    nodes.forEach(n => out += `${pad(n.id)} 0         0\n`);

    out += "\n[PIPES]\n;ID              Node1           Node2           Length    Diam      Roughness\n";
    pipes.forEach(p => out += `${pad(p.id)} ${pad(p.n1)} ${pad(p.n2)} ${pad(p.len.toFixed(2))} ${pad(p.diam)} ${pad(p.rough)}\n`);

    out += "\n[COORDINATES]\n";
    nodes.forEach(n => out += `${pad(n.id)} ${n.x.toFixed(4)} ${n.y.toFixed(4)}\n`);

    out += "\n[VERTICES]\n";
    vertices.forEach(v => out += `${pad(v.pId)} ${v.x.toFixed(4)} ${v.y.toFixed(4)}\n`);

    ctx.postMessage({ type: 'progress', data: 100 });
    return out + "\n[END]";
}