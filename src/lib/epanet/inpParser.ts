import { ProjectSettings, TimePattern, PumpCurve, NetworkControl, ControlAction, NetworkFeatureData, FeatureType } from '@/types/network';
import { transform } from 'ol/proj';
import { NetworkFactory } from '../topology/networkFactory';

interface INPSection {
    [key: string]: string[];
}

// Extended interface to support full project data
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
        const features: NetworkFeatureData[] = [];

        // 1. Parse Metadata
        const optionsMap = parseOptions(sections['OPTIONS'] || []);
        const timesMap = parseOptions(sections['TIMES'] || []);
        let coordinates = parseCoordinates(sections['COORDINATES'] || []);
        let vertices = parseVertices(sections['VERTICES'] || []);

        // --- PROJECTION HANDLING ---
        // 1. Determine Source Projection
        let sourceProjection = manualProjection;

        // Metadata Detection (Search for ;Projection: in the first 50 lines)
        const lines = fileContent.split(/\r?\n/);
        for (let i = 0; i < Math.min(lines.length, 50); i++) {
            const line = lines[i].trim();
            if (line.toLowerCase().startsWith(';projection:')) {
                const detected = line.split(':')[1]?.trim();
                if (detected) {
                    sourceProjection = detected;
                    console.log(`Metadata-detected projection: ${sourceProjection}`);
                    break;
                }
            }
        }

        // Auto-detection logic if manually set to 'Simple' or default is ambiguous and no metadata found
        if (sourceProjection === manualProjection && sourceProjection === 'EPSG:3857') {
            const firstCoord = coordinates.values().next().value;
            if (firstCoord) {
                const [x, y] = firstCoord;
                // 1. If coordinates look like Lat/Lon, assume WGS84
                if (x >= -180 && x <= 180 && y >= -90 && y <= 90) {
                    sourceProjection = 'EPSG:4326';
                    console.log("Auto-detected Lat/Lon coordinates (EPSG:4326).");
                } 
                // 2. If coordinates are very large (typical for local XY), assume Simple
                else if (Math.abs(x) > 20000000 || Math.abs(y) > 20000000) {
                     // Keep as 3857 (Web Mercator) - likely georeferenced but not Lat/Lon
                } else {
                    sourceProjection = 'Simple';
                    console.log("Auto-detected local XY coordinates (Simple).");
                }
            }
        }

        const mapProjection = 'EPSG:3857';

        // 2. Transform Coordinates to Map Projection (EPSG:3857)
        // If source is different from map, transform. 
        // Note: We do not transform 'Simple' (Cartesian) as it has no projection definition, 
        // but for GIS display we treat it as 3857 to render it "somewhere".
        if (!skipTransform && sourceProjection !== mapProjection && sourceProjection !== 'Simple') {
            console.log(`Transforming from ${sourceProjection} to ${mapProjection}...`);

            // Transform Node Coordinates
            for (const [id, coord] of coordinates) {
                try {
                    const transformed = transform(coord, sourceProjection, mapProjection);
                    coordinates.set(id, transformed);
                } catch (e) {
                    console.warn(`Failed to transform coordinate for node ${id}`, e);
                }
            }

            // Transform Vertex Coordinates
            for (const [id, vertList] of vertices) {
                const newVerts = vertList.map(v => {
                    try {
                        return transform(v, sourceProjection, mapProjection);
                    } catch (e) {
                        return v;
                    }
                });
                vertices.set(id, newVerts);
            }
        }

        // 3. Create Settings (Store the Source Projection as the Project Projection)
        const settings: ProjectSettings = {
            title: sections['TITLE']?.[0] || "Untitled Project",
            projection: sourceProjection,

            // Hydraulics
            units: (optionsMap['UNITS'] as any) || 'GPM',
            headloss: (optionsMap['HEADLOSS'] as any) || 'H-W',
            specificGravity: parseFloat(optionsMap['SPECIFIC GRAVITY'] || '1.0'),
            viscosity: parseFloat(optionsMap['VISCOSITY'] || '1.0'),
            maxTrials: parseInt(optionsMap['TRIALS'] || '24'),
            accuracy: parseFloat(optionsMap['ACCURACY'] || '0.001'),

            // Controls
            demandMultiplier: parseFloat(optionsMap['DEMAND MULTIPLIER'] || '1.0'),
            emitterExponent: parseFloat(optionsMap['EMITTER EXPONENT'] || '0.5'),

            // Times (Defaulting if missing)
            duration: timesMap['DURATION'] || '24:00',
            hydraulicStep: timesMap['HYDRAULIC TIMESTEP'] || '1:00',
            patternStep: timesMap['PATTERN TIMESTEP'] || '1:00',
            reportStep: timesMap['REPORT TIMESTEP'] || '1:00',
            reportStart: timesMap['REPORT START'] || '0:00',
            startClock: timesMap['START CLOCKTIME'] || '12:00 AM',

            // Pattern
            defaultPattern: optionsMap['PATTERN'] || "1",
            isGeographic: sourceProjection !== 'Simple'
        };

        const patterns = parsePatterns(sections['PATTERNS'] || []);
        const curves = parseCurves(sections['CURVES'] || []);
        const controls = parseControls(sections['CONTROLS'] || []);


        const createNodeHelper = (lines: string[], type: 'junction' | 'tank' | 'reservoir', propsParser: (p: string[]) => any) => {
            return lines.map(l => {
                const p = l.split(/\s+/);
                const id = p[0];
                const coord = coordinates.get(id);
                if (!coord) return null;

                return NetworkFactory.createNode(type, coord, id, propsParser(p));
            }).filter((f): f is NetworkFeatureData => !!f);
        };

        // 4. Parse Nodes using (potentially transformed) coordinates
        
        // --- ROBUST NODE DISCOVERY ---
        // Ensure ALL node IDs referenced in any link section are in our coordinates map
        const allLinkSections = [...(sections['PIPES'] || []), ...(sections['PUMPS'] || []), ...(sections['VALVES'] || [])];
        allLinkSections.forEach(line => {
            const p = line.split(/\s+/);
            const n1 = p[1];
            const n2 = p[2];
            if (n1 && !coordinates.has(n1)) {
                // Discover n1: Use partner n2 coord if available, else [0,0]
                const fallback = coordinates.get(n2) || [0, 0];
                coordinates.set(n1, [...fallback]);
                console.log(`Discovered missing node ${n1} from link. Assigning fallback coord from ${n2}`);
            }
            if (n2 && !coordinates.has(n2)) {
                // Discover n2: Use partner n1 coord if available, else [0,0]
                const fallback = coordinates.get(n1) || [0, 0];
                coordinates.set(n2, [...fallback]);
                console.log(`Discovered missing node ${n2} from link. Assigning fallback coord from ${n1}`);
            }
        });

        // Collect IDs that are explicitly defined as Tanks or Reservoirs
        const tankIds = new Set((sections['TANKS'] || []).map(l => l.split(/\s+/)[0]));
        const reservoirIds = new Set((sections['RESERVOIRS'] || []).map(l => l.split(/\s+/)[0]));

        const junctions = createNodeHelper(sections['JUNCTIONS'] || [], 'junction', p => ({
            elevation: parseFloat(p[1]), demand: parseFloat(p[2] || '0'), pattern: p[3] || undefined
        }));
        
        // Add discovered nodes that are NOT in the JUNCTIONS section
        const definedJunctionIds = new Set(junctions.map(j => j.id));
        for (const [id, coord] of coordinates) {
            if (!definedJunctionIds.has(id) && !tankIds.has(id) && !reservoirIds.has(id)) {
                junctions.push(NetworkFactory.createNode('junction', coord, id, { elevation: 0, demand: 0 }));
            }
        }

        const tanks = createNodeHelper(sections['TANKS'] || [], 'tank', p => ({
            elevation: parseFloat(p[1]), initLevel: parseFloat(p[2]), minLevel: parseFloat(p[3]), maxLevel: parseFloat(p[4]), diameter: parseFloat(p[5])
        }));
        const reservoirs = createNodeHelper(sections['RESERVOIRS'] || [], 'reservoir', p => ({
            head: parseFloat(p[1]), pattern: p[2] || undefined
        }));

        const allNodes = [...junctions, ...tanks, ...reservoirs];
        features.push(...allNodes);

        // 5. Parse Links (Pipes, Pumps, Valves)
        // Offset logic for overlapping endpoints
        const isLatLon = sourceProjection === 'EPSG:4326';
        const offsetVal = isLatLon ? 0.000005 : 0.5;

        // Helper to find nodes
        const findNode = (id: string) => allNodes.find(n => n.id === id);

        // Pipes
        (sections['PIPES'] || []).forEach(l => {
            const p = l.split(/\s+/);
            const id = p[0];
            const n1 = findNode(p[1]);
            const n2 = findNode(p[2]);
            if (n1 && n2) {
                const c1 = n1.geometry as number[];
                const c2 = n2.geometry as number[];

                // Offset OVERLAPPING nodes for visibility
                if (Math.abs(c1[0] - c2[0]) < 0.000001 && Math.abs(c1[1] - c2[1]) < 0.000001) {
                    c2[0] += offsetVal;
                    c2[1] += offsetVal;
                }

                let path = [c1];
                if (vertices.has(id)) path = path.concat(vertices.get(id)!);
                path.push(c2);

                const pipe = NetworkFactory.createPipe(path, n1.id, n2.id, id, {
                    length: parseFloat(p[3]),
                    diameter: parseFloat(p[4]),
                    roughness: parseFloat(p[5]),
                    status: p[7] || 'Open'
                });
                features.push(pipe);
            }
        });

        // Pumps & Valves (Complex Links)
        const createComplexHelper = (lines: string[], type: 'pump' | 'valve', propsParser: (p: string[]) => any) => {
            lines.forEach(l => {
                const p = l.split(/\s+/);
                const id = p[0];
                const n1 = findNode(p[1]);
                const n2 = findNode(p[2]);

                if (n1 && n2) {
                    const c1 = n1.geometry as number[];
                    const c2 = n2.geometry as number[];
                    
                    // Offset OVERLAPPING nodes for visibility
                    if (Math.abs(c1[0] - c2[0]) < 0.000001 && Math.abs(c1[1] - c2[1]) < 0.000001) {
                        c2[0] += offsetVal;
                        c2[1] += offsetVal;
                    }

                    const [component, visual] = NetworkFactory.createComplexLink(type, n1, n2, id, propsParser(p));
                    features.push(component);
                    features.push(visual); // Factory guarantees this exists and has ID
                }
            });
        };

        createComplexHelper(sections['PUMPS'] || [], 'pump', p => {
            const props: any = { status: 'Open' };
            // Standard EPANET format: ID Node1 Node2 Keyword Value ...
            for (let i = 3; i < p.length; i += 2) {
                const key = p[i]?.toUpperCase();
                const val = p[i + 1];
                if (!key || !val) continue;

                if (key === 'HEAD') props.curve = val;
                else if (key === 'POWER') props.power = parseFloat(val);
                else if (key === 'SPEED') props.speed = parseFloat(val);
                else if (key === 'PATTERN') props.pattern = val;
            }
            return props;
        });
        createComplexHelper(sections['VALVES'] || [], 'valve', p => ({
            diameter: parseFloat(p[3]), valveType: p[4], setting: parseFloat(p[5]), status: 'Active'
        }));

        // 6. Build Connectivity
        buildConnectivity(allNodes, features.filter(f => ['pipe', 'pump', 'valve'].includes(f.type)));

        return { features, settings, patterns, curves, controls, isGeographic: sourceProjection !== 'Simple' };

    } catch (error) {
        throw new Error(`INP parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
            if (p.length >= 2) options[p[0]] = p[1];
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

function parseControls(lines: string[]): NetworkControl[] {
    const controls: NetworkControl[] = [];
    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 6) return;
        if (parts[0].toUpperCase() !== 'LINK') return;
        const linkId = parts[1];
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