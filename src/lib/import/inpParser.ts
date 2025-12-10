import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { COMPONENT_TYPES } from '@/constants/networkComponents';
import { ProjectSettings, TimePattern, PumpCurve, NetworkControl, ControlAction } from '@/types/network';
import { transform } from 'ol/proj';

interface INPSection {
    [key: string]: string[];
}

// Extended interface to support full project data
export interface ParsedProjectData {
    features: Feature[];
    settings: ProjectSettings;
    patterns: TimePattern[];
    curves: PumpCurve[];
    controls: NetworkControl[];
}

/**
 * Parse INP content and transform coordinates to Web Mercator (EPSG:3857)
 * @param fileContent Raw text content of the INP file
 * @param manualProjection Optional projection string provided by user (e.g., "EPSG:4326")
 */
export function parseINP(fileContent: string, manualProjection: string = 'EPSG:3857'): ParsedProjectData {

    try {
        const sections = parseINPSections(fileContent);
        const features: Feature[] = [];

        // 1. Parse Metadata
        const optionsMap = parseOptions(sections['OPTIONS'] || []);
        let coordinates = parseCoordinates(sections['COORDINATES'] || []);
        let vertices = parseVertices(sections['VERTICES'] || []);

        // --- PROJECTION HANDLING ---
        // 1. Determine Source Projection
        let sourceProjection = manualProjection;

        // Auto-detection logic if manually set to 'Simple' or default is ambiguous
        if (sourceProjection === 'EPSG:3857') {
            const firstCoord = coordinates.values().next().value;
            if (firstCoord) {
                const [x, y] = firstCoord;
                // If coordinates look like Lat/Lon, assume WGS84
                if (x >= -180 && x <= 180 && y >= -90 && y <= 90) {
                    sourceProjection = 'EPSG:4326';
                    console.log("Auto-detected Lat/Lon coordinates (EPSG:4326).");
                }
            }
        }

        const mapProjection = 'EPSG:3857';

        // 2. Transform Coordinates to Map Projection (EPSG:3857)
        // If source is different from map, transform. 
        // Note: We do not transform 'Simple' (Cartesian) as it has no projection definition, 
        // but for GIS display we treat it as 3857 to render it "somewhere".
        if (sourceProjection !== mapProjection && sourceProjection !== 'Simple') {
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
            units: (optionsMap['UNITS'] as any) || 'GPM',
            headloss: (optionsMap['HEADLOSS'] as any) || 'H-W',
            specificGravity: parseFloat(optionsMap['SPECIFIC GRAVITY'] || '1.0'),
            viscosity: parseFloat(optionsMap['VISCOSITY'] || '1.0'),
            trials: parseInt(optionsMap['TRIALS'] || '40'),
            accuracy: parseFloat(optionsMap['ACCURACY'] || '0.001'),
            demandMultiplier: parseFloat(optionsMap['DEMAND MULTIPLIER'] || '1.0'),
            projection: sourceProjection,
        };

        const patterns = parsePatterns(sections['PATTERNS'] || []);
        const curves = parseCurves(sections['CURVES'] || []);
        const controls = parseControls(sections['CONTROLS'] || []);

        // 4. Parse Nodes using (potentially transformed) coordinates
        const junctions = parseJunctions(sections['JUNCTIONS'] || [], coordinates);
        const tanks = parseTanks(sections['TANKS'] || [], coordinates);
        const reservoirs = parseReservoirs(sections['RESERVOIRS'] || [], coordinates);

        const allNodes = [...junctions, ...tanks, ...reservoirs];
        features.push(...allNodes);

        // 5. Parse Links (Pipes, Pumps, Valves)
        // Note: We pass 'features' array to add Visual Links to it
        const pipes = parsePipes(sections['PIPES'] || [], allNodes, vertices);
        const pumps = parsePumps(sections['PUMPS'] || [], allNodes, vertices, features);
        const valves = parseValves(sections['VALVES'] || [], allNodes, vertices, features);

        const allLinks = [...pipes, ...pumps, ...valves];
        features.push(...allLinks);

        // 6. Build Connectivity
        buildConnectivity(allNodes, allLinks);

        return { features, settings, patterns, curves, controls };
    } catch (error) {
        throw new Error(`INP parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// --- HELPERS ---

/**
 * Fixes "Orphan Node" issues by populating the 'connectedLinks' property
 */
function buildConnectivity(nodes: Feature[], links: Feature[]) {
    const nodeMap = new Map<string, Feature>();
    nodes.forEach(n => {
        n.set('connectedLinks', []); // Initialize empty array
        nodeMap.set(n.getId() as string, n);
    });

    links.forEach(link => {
        const linkId = link.getId() as string;
        const startId = link.get('startNodeId');
        const endId = link.get('endNodeId');

        // Add link ID to Start Node
        if (startId && nodeMap.has(startId)) {
            const node = nodeMap.get(startId)!;
            const conns = node.get('connectedLinks');
            if (!conns.includes(linkId)) {
                conns.push(linkId);
                node.set('connectedLinks', conns); // Trigger update
            }
        }

        // Add link ID to End Node
        if (endId && nodeMap.has(endId)) {
            const node = nodeMap.get(endId)!;
            const conns = node.get('connectedLinks');
            if (!conns.includes(linkId)) {
                conns.push(linkId);
                node.set('connectedLinks', conns); // Trigger update
            }
        }
    });
}

// Creates the dashed visual line for Pumps and Valves

function createVisualLink(id: string, type: string, startNode: Feature, endNode: Feature): Feature {
    const startCoord = (startNode.getGeometry() as Point).getCoordinates();
    const endCoord = (endNode.getGeometry() as Point).getCoordinates();

    const visualLine = new Feature({
        geometry: new LineString([startCoord, endCoord])
    });

    visualLine.set('isVisualLink', true);
    visualLine.set('parentLinkId', id);
    visualLine.set('linkType', type);
    return visualLine;
}

// --- SECTION PARSERS ---

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

// --- COMPONENT FACTORIES ---

function createNode(id: string, type: string, coords: Map<string, number[]>, props: any): Feature | null {
    const coord = coords.get(id);
    if (!coord) return null;
    const feature = new Feature({ geometry: new Point(coord) });
    feature.setId(id);
    feature.set('type', type);
    feature.setProperties({ ...COMPONENT_TYPES[type].defaultProperties, ...props, id, label: id });
    return feature;
}

function parseJunctions(lines: string[], coords: Map<string, number[]>): Feature[] {
    return lines.map(l => {
        const p = l.split(/\s+/);
        return createNode(p[0], 'junction', coords, { elevation: parseFloat(p[1]), demand: parseFloat(p[2] || '0') });
    }).filter((f): f is Feature => !!f);
}

function parseTanks(lines: string[], coords: Map<string, number[]>): Feature[] {
    return lines.map(l => {
        const p = l.split(/\s+/);
        return createNode(p[0], 'tank', coords, { elevation: parseFloat(p[1]), initLevel: parseFloat(p[2]), minLevel: parseFloat(p[3]), maxLevel: parseFloat(p[4]), diameter: parseFloat(p[5]) });
    }).filter((f): f is Feature => !!f);
}

function parseReservoirs(lines: string[], coords: Map<string, number[]>): Feature[] {
    return lines.map(l => {
        const p = l.split(/\s+/);
        return createNode(p[0], 'reservoir', coords, { head: parseFloat(p[1]) });
    }).filter((f): f is Feature => !!f);
}

// --- LINK PARSERS ---

function createLink(id: string, type: string, n1: string, n2: string, nodes: Feature[], verts: Map<string, number[][]>, props: any): Feature | null {
    const node1 = nodes.find(n => n.getId() === n1);
    const node2 = nodes.find(n => n.getId() === n2);
    if (!node1 || !node2) return null;

    const c1 = (node1.getGeometry() as Point).getCoordinates();
    const c2 = (node2.getGeometry() as Point).getCoordinates();

    // Midpoint for Pump/Valve geometry
    const midX = (c1[0] + c2[0]) / 2;
    const midY = (c1[1] + c2[1]) / 2;

    // Geometry: LineString for Pipe, Point for Pump/Valve
    let geometry;
    if (type === 'pipe') {
        let path = [c1];
        if (verts.has(id)) path = path.concat(verts.get(id)!);
        path.push(c2);
        geometry = new LineString(path);
    } else {
        geometry = new Point([midX, midY]);
    }

    const feature = new Feature({ geometry });
    feature.setId(id);
    feature.set('type', type);
    feature.setProperties({ ...COMPONENT_TYPES[type].defaultProperties, ...props, id, label: id, startNodeId: n1, endNodeId: n2 });
    return feature;
}

function parsePipes(lines: string[], nodes: Feature[], verts: Map<string, number[][]>): Feature[] {
    return lines.map(l => {
        const p = l.split(/\s+/);
        return createLink(p[0], 'pipe', p[1], p[2], nodes, verts, {
            length: parseFloat(p[3]), diameter: parseFloat(p[4]), roughness: parseFloat(p[5]), status: p[7] || 'Open'
        });
    }).filter((f): f is Feature => !!f);
}

function parsePumps(lines: string[], nodes: Feature[], verts: Map<string, number[][]>, featureList: Feature[]): Feature[] {
    return lines.map(l => {
        const p = l.split(/\s+/);
        const pump = createLink(p[0], 'pump', p[1], p[2], nodes, verts, { status: 'Open' });

        if (pump) {
            // FIX: Add Visual Link Feature
            const n1 = nodes.find(n => n.getId() === p[1]);
            const n2 = nodes.find(n => n.getId() === p[2]);
            if (n1 && n2) {
                const visual = createVisualLink(p[0], 'pump', n1, n2);
                featureList.push(visual); // Add to main list immediately
            }
        }
        return pump;
    }).filter((f): f is Feature => !!f);
}

function parseValves(lines: string[], nodes: Feature[], verts: Map<string, number[][]>, featureList: Feature[]): Feature[] {
    return lines.map(l => {
        const p = l.split(/\s+/);
        const valve = createLink(p[0], 'valve', p[1], p[2], nodes, verts, {
            diameter: parseFloat(p[3]), valveType: p[4], setting: parseFloat(p[5]), status: 'Active'
        });

        if (valve) {
            // FIX: Add Visual Link Feature
            const n1 = nodes.find(n => n.getId() === p[1]);
            const n2 = nodes.find(n => n.getId() === p[2]);
            if (n1 && n2) {
                const visual = createVisualLink(p[0], 'valve', n1, n2);
                featureList.push(visual);
            }
        }
        return valve;
    }).filter((f): f is Feature => !!f);
}