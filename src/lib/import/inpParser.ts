import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { ImportResult } from './fileImporter';
import { COMPONENT_TYPES } from '@/constants/networkComponents';
import { NetworkFeatureProperties } from '@/types/network';
import { useNetworkStore } from '@/store/networkStore';

interface INPSection {
    [key: string]: string[];
}

export function parseINP(fileContent: string): ImportResult {
    try {
        const sections = parseINPSections(fileContent);
        const features: Feature[] = [];

        // 1. Parse Reference Data (Patterns, Curves)
        const patterns = parsePatterns(sections['PATTERNS'] || []);
        const curves = parseCurves(sections['CURVES'] || []);
        const options = parseOptions(sections['OPTIONS'] || []);
        const times = parseTimes(sections['TIMES'] || []);

        // UPDATE STORE WITH PARSED SETTINGS
        const store = useNetworkStore.getState();

        store.updateSettings({
            units: (options['Units'] as any) || 'GPM',
            headloss: (options['Headloss'] as any) || 'H-W',
            specificGravity: parseFloat(options['Specific'] || '1.0'),
            viscosity: parseFloat(options['Viscosity'] || '1.0'),
            trials: parseInt(options['Trials'] || '40'),
            accuracy: parseFloat(options['Accuracy'] || '0.001'),
        });

        // 2. Parse Geometry
        const coordinates = parseCoordinates(sections['COORDINATES'] || []);
        const vertices = parseVertices(sections['VERTICES'] || []);

        // 3. Parse Nodes
        const junctions = parseJunctions(sections['JUNCTIONS'] || [], coordinates);
        features.push(...junctions);

        const tanks = parseTanks(sections['TANKS'] || [], coordinates);
        features.push(...tanks);

        const reservoirs = parseReservoirs(sections['RESERVOIRS'] || [], coordinates);
        features.push(...reservoirs);

        // 4. Parse Links
        const pipes = parsePipes(sections['PIPES'] || [], junctions, tanks, reservoirs, vertices);
        features.push(...pipes);

        const pumps = parsePumps(sections['PUMPS'] || [], junctions, tanks, reservoirs, vertices);
        features.push(...pumps);

        const valves = parseValves(sections['VALVES'] || [], junctions, tanks, reservoirs, vertices);
        features.push(...valves);

        // Stats
        const stats = {
            junctions: junctions.length,
            tanks: tanks.length,
            reservoirs: reservoirs.length,
            pipes: pipes.length,
            pumps: pumps.length,
            valves: valves.length,
        };

        return {
            success: true,
            features,
            message: `Successfully imported ${features.length} features`,
            stats,
        };
    } catch (error) {
        throw new Error(`INP parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// --- HELPER PARSERS ---

function parseINPSections(content: string): INPSection {
    const sections: INPSection = {};
    let currentSection = '';

    const lines = content.split(/\r?\n/); // Handle both \n and \r\n

    for (const line of lines) {
        // Remove comments (everything after ;)
        const cleanLine = line.split(';')[0].trim();

        if (!cleanLine) continue;

        if (cleanLine.startsWith('[') && cleanLine.endsWith(']')) {
            currentSection = cleanLine.slice(1, -1).toUpperCase();
            sections[currentSection] = [];
            continue;
        }

        if (currentSection) {
            sections[currentSection].push(cleanLine);
        }
    }

    return sections;
}

function parseCoordinates(lines: string[]): Map<string, number[]> {
    const coords = new Map<string, number[]>();
    for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
            coords.set(parts[0], [parseFloat(parts[1]), parseFloat(parts[2])]);
        }
    }
    return coords;
}

function parseVertices(lines: string[]): Map<string, number[][]> {
    const verts = new Map<string, number[][]>();
    for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
            const id = parts[0];
            const x = parseFloat(parts[1]);
            const y = parseFloat(parts[2]);

            if (!verts.has(id)) verts.set(id, []);
            verts.get(id)?.push([x, y]);
        }
    }
    return verts;
}

// --- NODE PARSERS ---

function createNode(
    id: string,
    type: string,
    coordinates: Map<string, number[]>,
    props: Partial<NetworkFeatureProperties>
): Feature | null {
    const coord = coordinates.get(id);
    if (!coord) return null;

    const feature = new Feature({ geometry: new Point(coord) });
    feature.setId(id);
    feature.set('type', type);
    // Merge defaults with parsed props
    feature.setProperties({
        ...COMPONENT_TYPES[type].defaultProperties,
        ...props,
        label: id,
        id: id // Explicit ID property
    });
    return feature;
}

function parseJunctions(lines: string[], coords: Map<string, number[]>): Feature[] {
    return lines.map(line => {
        const p = line.split(/\s+/);
        // ID, Elev, Demand, Pattern
        return createNode(p[0], 'junction', coords, {
            elevation: parseFloat(p[1]),
            demand: p.length > 2 ? parseFloat(p[2]) : 0,
            // pattern: p[3] // Store pattern if we had a field for it
        });
    }).filter((f): f is Feature => !!f);
}

function parseReservoirs(lines: string[], coords: Map<string, number[]>): Feature[] {
    return lines.map(line => {
        const p = line.split(/\s+/);
        // ID, Head, Pattern
        return createNode(p[0], 'reservoir', coords, {
            head: parseFloat(p[1]),
            elevation: parseFloat(p[1]) // Reservoir head is essentially elevation
        });
    }).filter((f): f is Feature => !!f);
}

function parseTanks(lines: string[], coords: Map<string, number[]>): Feature[] {
    return lines.map(line => {
        const p = line.split(/\s+/);
        // ID, Elev, InitLvl, MinLvl, MaxLvl, Dia, MinVol, VolCurve
        return createNode(p[0], 'tank', coords, {
            elevation: parseFloat(p[1]),
            initLevel: parseFloat(p[2]),
            minLevel: parseFloat(p[3]),
            maxLevel: parseFloat(p[4]),
            diameter: parseFloat(p[5])
        });
    }).filter((f): f is Feature => !!f);
}

// --- LINK PARSERS ---

function createLink(
    id: string,
    type: string,
    node1Id: string,
    node2Id: string,
    allNodes: Feature[],
    vertices: Map<string, number[][]>,
    props: Partial<NetworkFeatureProperties>
): Feature | null {
    const n1 = allNodes.find(n => n.getId() === node1Id);
    const n2 = allNodes.find(n => n.getId() === node2Id);

    if (!n1 || !n2) return null;

    const c1 = (n1.getGeometry() as Point).getCoordinates();
    const c2 = (n2.getGeometry() as Point).getCoordinates();

    // Construct geometry with vertices
    let path = [c1];
    if (vertices.has(id)) {
        path = path.concat(vertices.get(id)!);
    }
    path.push(c2);

    const feature = new Feature({ geometry: new LineString(path) });
    feature.setId(id);
    feature.set('type', type);
    feature.setProperties({
        ...COMPONENT_TYPES[type].defaultProperties,
        ...props,
        label: id,
        id: id,
        startNodeId: node1Id,
        endNodeId: node2Id
    });

    return feature;
}

function parsePipes(lines: string[], j: Feature[], t: Feature[], r: Feature[], v: Map<string, number[][]>): Feature[] {
    const nodes = [...j, ...t, ...r];
    return lines.map(line => {
        const p = line.split(/\s+/);
        // ID, Node1, Node2, Len, Dia, Rough, MinorLoss, Status
        return createLink(p[0], 'pipe', p[1], p[2], nodes, v, {
            length: parseFloat(p[3]),
            diameter: parseFloat(p[4]),
            roughness: parseFloat(p[5]),
            status: p.length > 7 ? p[7] : 'Open'
        });
    }).filter((f): f is Feature => !!f);
}

function parsePumps(lines: string[], j: Feature[], t: Feature[], r: Feature[], v: Map<string, number[][]>): Feature[] {
    const nodes = [...j, ...t, ...r];
    return lines.map(line => {
        const p = line.split(/\s+/);
        // ID, Node1, Node2, Parameters (KEY VALUE)
        // Pump parsing is tricky, usually just grab power or curve
        // Simply storing as is for now
        return createLink(p[0], 'pump', p[1], p[2], nodes, v, {
            status: 'Open' // Pumps default open
        });
    }).filter((f): f is Feature => !!f);
}

function parseValves(lines: string[], j: Feature[], t: Feature[], r: Feature[], v: Map<string, number[][]>): Feature[] {
    const nodes = [...j, ...t, ...r];
    return lines.map(line => {
        const p = line.split(/\s+/);
        // ID, Node1, Node2, Dia, Type, Setting, MinorLoss
        return createLink(p[0], 'valve', p[1], p[2], nodes, v, {
            diameter: parseFloat(p[3]),
            valveType: p[4],
            setting: parseFloat(p[5]),
            status: 'Active'
        });
    }).filter((f): f is Feature => !!f);
}

// --- METADATA PARSERS (For future use in Project Settings) ---

function parsePatterns(lines: string[]) {
    // Basic parser to just acknowledge existence
    return lines.length;
}

function parseCurves(lines: string[]) {
    return lines.length;
}

function parseOptions(lines: string[]) {
    const options: Record<string, string> = {};
    lines.forEach(l => {
        // const p = l.split(/\s+/);
        // if (p.length >= 2) options[p[0]] = p[1];
        const parts = l.trim().split(/\s{2,}|\t/); // Split by 2+ spaces or tab
        if (parts.length >= 2) {
            options[parts[0].trim()] = parts[1].trim();
        } else {
            // Fallback for single space
            const p = l.split(/\s+/);
            if (p.length >= 2) options[p[0]] = p[1];
        }
    });
    return options;
}

function parseTimes(lines: string[]) {
    const times: Record<string, string> = {};
    lines.forEach(l => {
        const p = l.split(/\s+/);
        if (p.length >= 2) times[p[0]] = p[1];
    });
    return times;
}