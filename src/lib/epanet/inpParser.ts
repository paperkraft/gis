import { transform } from 'ol/proj';

import {
    ControlAction, NetworkControl, NetworkFeatureData, ProjectSettings, PumpCurve, TimePattern
} from '@/types/network';

import { NetworkFactory } from '../topology/networkFactory';

interface INPSection {
    [key: string]: string[];
}

// Intermediate raw data models matching epanet-js internal structure
interface InpJunction { id: string; elevation: number; demand: number; pattern?: string; }
interface InpTank { id: string; elevation: number; initLevel: number; minLevel: number; maxLevel: number; diameter: number; }
interface InpReservoir { id: string; head: number; pattern?: string; }
interface InpPipe { id: string; n1: string; n2: string; length: number; diameter: number; roughness: number; status: string; }
interface InpPump { id: string; n1: string; n2: string; props: any; }
interface InpValve { id: string; n1: string; n2: string; diameter: number; valveType: string; setting: number; }

interface InpData {
    junctions: InpJunction[];
    tanks: InpTank[];
    reservoirs: InpReservoir[];
    pipes: InpPipe[];
    pumps: InpPump[];
    valves: InpValve[];
    coordinates: Map<string, number[]>;
    vertices: Map<string, number[][]>;
    options: Record<string, string>;
    times: Record<string, string>;
    patterns: TimePattern[];
    curves: PumpCurve[];
}

export interface ParsedProjectData {
    features: NetworkFeatureData[];
    settings: ProjectSettings;
    patterns: TimePattern[];
    curves: PumpCurve[];
    controls: NetworkControl[];
    isGeographic?: boolean;
}

/**
 * Lightweight analysis of INP coordinates for UI feedback
 */
export function analyzeInpCoordinates(fileContent: string) {
    const lines = fileContent.split(/\r?\n/);
    const sections = parseINPSections(fileContent);
    const coords = parseCoordinates(sections['COORDINATES'] || []);
    const sampleCoords: number[][] = [];
    const iterator = coords.values();
    for (let i = 0; i < 5; i++) {
        const next = iterator.next();
        if (next.done) break;
        sampleCoords.push(next.value);
    }

    const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    for (const [x, y] of coords.values()) {
        bounds.minX = Math.min(bounds.minX, x);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxY = Math.max(bounds.maxY, y);
    }

    const firstCoord = sampleCoords[0];
    let isGeographic = false;
    if (firstCoord) {
        const [x, y] = firstCoord;
        isGeographic = x >= -180 && x <= 180 && y >= -90 && y <= 90;
    }

    // Detect Metadata in analysis phase
    let detectedProjection: string | undefined = undefined;
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
        const line = lines[i].trim();
        if (line.toLowerCase().startsWith(';projection:')) {
            // Extract everything after the first colon
            detectedProjection = line.slice(line.indexOf(':') + 1).trim();
            break;
        }
    }

    return {
        sampleCoords,
        bounds,
        isGeographic,
        nodeCount: coords.size,
        projection: detectedProjection
    };
}

/**
 * Parse INP content and transform coordinates to Web Mercator (EPSG:3857)
 * @param fileContent Raw text content of the INP file
 * @param manualProjection Optional projection string provided by user (e.g., "EPSG:4326")
 */
export function parseINP(fileContent: string, manualProjection: string = 'EPSG:3857', skipTransform: boolean = false): ParsedProjectData {
    try {
        const sections = parseINPSections(fileContent);

        // --- Phase 1: Raw Data Parsing (epanet-js style) ---
        const inpData: InpData = {
            junctions: (sections['JUNCTIONS'] || []).map(l => {
                const p = l.split(/\s+/);
                return { id: p[0], elevation: parseFloat(p[1]), demand: parseFloat(p[2] || '0'), pattern: p[3] || undefined };
            }),
            tanks: (sections['TANKS'] || []).map(l => {
                const p = l.split(/\s+/);
                return { id: p[0], elevation: parseFloat(p[1]), initLevel: parseFloat(p[2]), minLevel: parseFloat(p[3]), maxLevel: parseFloat(p[4]), diameter: parseFloat(p[5]) };
            }),
            reservoirs: (sections['RESERVOIRS'] || []).map(l => {
                const p = l.split(/\s+/);
                return { id: p[0], head: parseFloat(p[1]), pattern: p[2] || undefined };
            }),
            pipes: (sections['PIPES'] || []).map(l => {
                const p = l.split(/\s+/);
                return { id: p[0], n1: p[1], n2: p[2], length: parseFloat(p[3]), diameter: parseFloat(p[4]), roughness: parseFloat(p[5]), status: p[7] || 'Open' };
            }),
            pumps: (sections['PUMPS'] || []).map(l => {
                const p = l.split(/\s+/);
                const props: any = { status: 'Open' };
                for (let i = 3; i < p.length; i += 2) {
                    const key = p[i]?.toUpperCase();
                    const val = p[i + 1];
                    if (!key || !val) continue;
                    if (key === 'HEAD') props.curve = val;
                    else if (key === 'POWER') props.power = parseFloat(val);
                    else if (key === 'SPEED') props.speed = parseFloat(val);
                    else if (key === 'PATTERN') props.pattern = val;
                }
                return { id: p[0], n1: p[1], n2: p[2], props };
            }),
            valves: (sections['VALVES'] || []).map(l => {
                const p = l.split(/\s+/);
                return { id: p[0], n1: p[1], n2: p[2], diameter: parseFloat(p[3]), valveType: p[4], setting: parseFloat(p[5]) };
            }),
            coordinates: parseCoordinates(sections['COORDINATES'] || []),
            vertices: parseVertices(sections['VERTICES'] || []),
            options: parseOptions(sections['OPTIONS'] || []),
            times: parseOptions(sections['TIMES'] || []),
            patterns: parsePatterns(sections['PATTERNS'] || []),
            curves: parseCurves(sections['CURVES'] || []),
        };

        // --- Phase 2: Network Model Assembly (epanet-js style) ---
        return buildProjectModel(inpData, manualProjection, skipTransform, fileContent);

    } catch (error) {
        throw new Error(`INP parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Assembles the Network Model with strict validation and coordinate transformation
 */
function buildProjectModel(inpData: InpData, manualProjection: string, skipTransform: boolean, rawContent: string): ParsedProjectData {
    const features: NetworkFeatureData[] = [];
    const coordinates = new Map<string, number[]>();
    inpData.coordinates.forEach((v, k) => coordinates.set(k.toUpperCase(), v));
    
    const vertices = new Map<string, number[][]>();
    inpData.vertices.forEach((v, k) => vertices.set(k.toUpperCase(), v));

    // 1. Projection Handling (Same logic as before, but centralized)
    let sourceProjection = manualProjection;
    const lines = rawContent.split(/\r?\n/);
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
        const line = lines[i].trim();
        if (line.toLowerCase().startsWith(';projection:')) {
            const detected = line.split(':')[1]?.trim();
            if (detected) { sourceProjection = detected; break; }
        }
    }

    if (sourceProjection === manualProjection && sourceProjection === 'EPSG:3857') {
        const firstCoord = coordinates.values().next().value;
        if (firstCoord) {
            const [x, y] = firstCoord;
            if (x >= -180 && x <= 180 && y >= -90 && y <= 90) sourceProjection = 'EPSG:4326';
            else if (Math.abs(x) < 20000000 && Math.abs(y) < 20000000) sourceProjection = 'Simple';
        }
    }

    const mapProjection = 'EPSG:3857';
    if (!skipTransform && sourceProjection !== mapProjection && sourceProjection !== 'Simple') {
        for (const [id, coord] of coordinates) {
            try { coordinates.set(id, transform(coord, sourceProjection, mapProjection)); } catch (e) { }
        }
        for (const [id, vertList] of vertices) {
            vertices.set(id, vertList.map(v => { try { return transform(v, sourceProjection, mapProjection); } catch (e) { return v; } }));
        }
    }

    // 2. Strict Node Discovery and Creation
    const tankIds = new Set(inpData.tanks.map(t => t.id.toUpperCase()));
    const reservoirIds = new Set(inpData.reservoirs.map(r => r.id.toUpperCase()));
    const visitedNodeIds = new Set<string>();

    const junctions = inpData.junctions.map(j => {
        const idUpper = j.id.toUpperCase();
        const coord = coordinates.get(idUpper);
        if (!coord) return null;
        visitedNodeIds.add(idUpper);
        return NetworkFactory.createNode('junction', coord, j.id, { elevation: j.elevation, demand: j.demand, pattern: j.pattern });
    }).filter((f): f is NetworkFeatureData => !!f);

    const tanks = inpData.tanks.map(t => {
        const idUpper = t.id.toUpperCase();
        const coord = coordinates.get(idUpper);
        if (!coord) return null;
        visitedNodeIds.add(idUpper);
        return NetworkFactory.createNode('tank', coord, t.id, { elevation: t.elevation, initLevel: t.initLevel, minLevel: t.minLevel, maxLevel: t.maxLevel, diameter: t.diameter });
    }).filter((f): f is NetworkFeatureData => !!f);

    const reservoirs = inpData.reservoirs.map(r => {
        const idUpper = r.id.toUpperCase();
        const coord = coordinates.get(idUpper);
        if (!coord) return null;
        visitedNodeIds.add(idUpper);
        return NetworkFactory.createNode('reservoir', coord, r.id, { head: r.head, pattern: r.pattern });
    }).filter((f): f is NetworkFeatureData => !!f);

    // CATCH-ALL: Create junctions for coordinates not explicitly defined in JUNCTIONS/TANKS/RESERVOIRS
    // This ensures all georeferenced points in the INP appear on the map.
    for (const [idUpper, coord] of coordinates) {
        if (!visitedNodeIds.has(idUpper) && !tankIds.has(idUpper) && !reservoirIds.has(idUpper)) {
            junctions.push(NetworkFactory.createNode('junction', coord, idUpper, { elevation: 0, demand: 0 }));
        }
    }

    const allNodes = [...junctions, ...tanks, ...reservoirs];
    const nodeMap = new Map(allNodes.map(n => [n.id.toUpperCase(), n]));

    // --- DISCOVER MISSING NODES FROM LINKS (Conditional, like your previous robust discovery) ---
    // Note: epanet-js typically skips links with missing nodes, but we keep this for GIS usability 
    // BUT only if coordinates were found elsewhere or we want to allow it.
    // For "Exactly same", we should probably SKIP if missing.

    // 3. Assemble Links (Strict Validation: Only add if both terminals exist)
    const linkIdMap = new Map<string, string>();
    const isLatLon = sourceProjection === 'EPSG:4326';
    const offsetVal = isLatLon ? 0.000005 : 0.5;

    // Pipes
    inpData.pipes.forEach(p => {
        const n1 = nodeMap.get(p.n1.toUpperCase());
        const n2 = nodeMap.get(p.n2.toUpperCase());
        if (n1 && n2) {
            const c1 = n1.geometry as number[];
            const c2 = [...(n2.geometry as number[])];
            if (Math.abs(c1[0] - c2[0]) < 1e-6 && Math.abs(c1[1] - c2[1]) < 1e-6) { c2[0] += offsetVal; c2[1] += offsetVal; }
            let path = [c1];
            if (vertices.has(p.id.toUpperCase())) path = path.concat(vertices.get(p.id.toUpperCase())!);
            path.push(c2);

            const idUpper = p.id.toUpperCase();
            const collides = nodeMap.has(idUpper);
            const prefixedId = collides ? (p.id.startsWith('P-') ? p.id : `P-${p.id}`) : p.id;
            if (collides) linkIdMap.set(p.id, prefixedId);

            features.push(NetworkFactory.createPipe(path, n1.id, n2.id, prefixedId, { length: p.length, diameter: p.diameter, roughness: p.roughness, status: p.status }));
        }
    });

    // PUMPS & VALVES (Complex)
    [...inpData.pumps.map(pu => ({ ...pu, type: 'pump' as const })), ...inpData.valves.map(v => ({ ...v, type: 'valve' as const }))].forEach(l => {
        const n1 = nodeMap.get(l.n1.toUpperCase());
        const n2 = nodeMap.get(l.n2.toUpperCase());
        if (n1 && n2) {
            const idUpper = l.id.toUpperCase();
            const collides = nodeMap.has(idUpper);
            const prefix = l.type === 'pump' ? 'PU-' : 'V-';
            const prefixedId = collides ? (idUpper.startsWith(prefix) ? l.id : `${prefix}${l.id}`) : l.id;
            if (collides) linkIdMap.set(l.id, prefixedId);

            const c1 = n1.geometry as number[];
            const c2 = [...(n2.geometry as number[])];
            if (Math.abs(c1[0] - c2[0]) < 1e-6 && Math.abs(c1[1] - c2[1]) < 1e-6) { c2[0] += offsetVal; c2[1] += offsetVal; }

            const props = l.type === 'pump' ? (l as any).props : { diameter: (l as any).diameter, valveType: (l as any).valveType, setting: (l as any).setting, status: 'Active' };
            const [comp, vis] = NetworkFactory.createComplexLink(l.type, n1, n2, prefixedId, props);
            features.push(comp, vis);
        }
    });

    features.push(...allNodes);

    const controls = parseControls(lines.filter(l => l.trim().split(';')[0].toUpperCase().startsWith('LINK')), linkIdMap);
    buildConnectivity(allNodes, features.filter(f => ['pipe', 'pump', 'valve'].includes(f.type)));

    return {
        features,
        settings: {
            title: inpData.options['TITLE'] || "Untitled Project",
            projection: sourceProjection,
            units: (inpData.options['UNITS'] as any) || 'GPM',
            headloss: (inpData.options['HEADLOSS'] as any) || 'H-W',
            specificGravity: parseFloat(inpData.options['SPECIFIC GRAVITY'] || '1.0'),
            viscosity: parseFloat(inpData.options['VISCOSITY'] || '1.0'),
            maxTrials: parseInt(inpData.options['TRIALS'] || '24'),
            accuracy: parseFloat(inpData.options['ACCURACY'] || '0.001'),
            demandMultiplier: parseFloat(inpData.options['DEMAND MULTIPLIER'] || '1.0'),
            emitterExponent: parseFloat(inpData.options['EMITTER EXPONENT'] || '0.5'),
            duration: inpData.times['DURATION'] || '24:00',
            hydraulicStep: inpData.times['HYDRAULIC TIMESTEP'] || '1:00',
            patternStep: inpData.times['PATTERN TIMESTEP'] || '1:00',
            reportStep: inpData.times['REPORT TIMESTEP'] || '1:00',
            reportStart: inpData.times['REPORT START'] || '0:00',
            startClock: inpData.times['START CLOCKTIME'] || '12:00 AM',
            defaultPattern: inpData.options['PATTERN'] || "1",
            isGeographic: sourceProjection !== 'Simple'
        },
        patterns: inpData.patterns,
        curves: inpData.curves,
        controls
    };
}

// --- HELPERS ---

/**
 * Fixes "Orphan Node" issues by populating the 'connectedLinks' property
 */
function buildConnectivity(nodes: NetworkFeatureData[], links: NetworkFeatureData[]) {
    const nodeMap = new Map<string, NetworkFeatureData>();
    nodes.forEach(n => {
        n.properties.connectedLinks = [];
        nodeMap.set(n.id, n);
    });

    links.forEach(link => {
        const linkId = link.id;
        const startId = link.properties.startNodeId;
        const endId = link.properties.endNodeId;

        [startId, endId].forEach(nodeId => {
            if (nodeId && nodeMap.has(nodeId)) {
                const node = nodeMap.get(nodeId)!;
                const conns = node.properties.connectedLinks || [];
                if (!conns.includes(linkId)) {
                    conns.push(linkId);
                    node.properties.connectedLinks = conns;
                }
            }
        });
    });
}

function parseINPSections(content: string): INPSection {
    const sections: INPSection = {};
    let currentSection = '';
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        const cleanLine = line.split(';')[0].trim();
        if (!cleanLine) continue;
        if (cleanLine.startsWith('[') && cleanLine.endsWith(']')) {
            currentSection = cleanLine.slice(1, -1).toUpperCase();
            sections[currentSection] = [];
            continue;
        }
        if (currentSection) sections[currentSection].push(cleanLine);
    }
    return sections;
}

function parseOptions(lines: string[]) {
    const options: Record<string, string> = {};
    lines.forEach(l => {
        const parts = l.trim().split(/\s{2,}|\t/);
        if (parts.length >= 2) options[parts[0].toUpperCase()] = parts[1];
        else {
            const p = l.split(/\s+/);
            if (p.length >= 2) options[p[0].toUpperCase()] = p[1];
        }
    });
    return options;
}

function parsePatterns(lines: string[]): TimePattern[] {
    const patternMap = new Map<string, number[]>();
    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) return;
        const id = parts[0];
        const multipliers = parts.slice(1).map(parseFloat);
        if (!patternMap.has(id)) patternMap.set(id, []);
        patternMap.get(id)?.push(...multipliers);
    });
    return Array.from(patternMap.entries()).map(([id, multipliers]) => ({ id, description: `Pattern ${id}`, multipliers }));
}

function parseCurves(lines: string[]): PumpCurve[] {
    const curveMap = new Map<string, { x: number, y: number }[]>();
    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 3) return;
        const id = parts[0];
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        if (!curveMap.has(id)) curveMap.set(id, []);
        curveMap.get(id)?.push({ x, y });
    });
    return Array.from(curveMap.entries()).map(([id, points]) => ({ id, type: 'PUMP', description: `Curve ${id}`, points }));
}

function parseControls(lines: string[], linkIdMap: Map<string, string>): NetworkControl[] {
    const controls: NetworkControl[] = [];
    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 6) return;
        if (parts[0].toUpperCase() !== 'LINK') return;
        const originalLinkId = parts[1];
        const linkId = linkIdMap.get(originalLinkId) || originalLinkId;
        const status = parts[2].toUpperCase() as ControlAction;
        const typeKey = parts[4].toUpperCase();
        if (typeKey === 'TIME') {
            controls.push({ id: crypto.randomUUID(), linkId, status, type: 'TIMER', value: parseFloat(parts[5]), nodeId: undefined });
        } else if (typeKey === 'NODE') {
            const nodeId = parts[5];
            const condition = parts[6].toUpperCase();
            const value = parseFloat(parts[7]);
            const type = condition === 'BELOW' ? 'LOW LEVEL' : 'HI LEVEL';
            controls.push({ id: crypto.randomUUID(), linkId, status, type, value, nodeId });
        }
    });
    return controls;
}

function parseCoordinates(lines: string[]): Map<string, number[]> {
    const coords = new Map<string, number[]>();
    for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 3) coords.set(parts[0], [parseFloat(parts[1]), parseFloat(parts[2])]);
    }
    return coords;
}

function parseVertices(lines: string[]): Map<string, number[][]> {
    const verts = new Map<string, number[][]>();
    for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
            const id = parts[0];
            if (!verts.has(id)) verts.set(id, []);
            verts.get(id)?.push([parseFloat(parts[1]), parseFloat(parts[2])]);
        }
    }
    return verts;
}