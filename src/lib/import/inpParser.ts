import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { COMPONENT_TYPES } from '@/constants/networkComponents';
import { ProjectSettings, TimePattern, PumpCurve, NetworkControl, ControlType, ControlAction } from '@/types/network';

interface INPSection {
    [key: string]: string[];
}

export interface ParsedProjectData {
    features: Feature[];
    settings: ProjectSettings;
    patterns: TimePattern[];
    curves: PumpCurve[];
    controls: NetworkControl[];
}

export function parseINP(fileContent: string): ParsedProjectData {
    const sections = parseINPSections(fileContent);
    const features: Feature[] = [];

    // 1. Parse Metadata
    const optionsMap = parseOptions(sections['OPTIONS'] || []);

    const settings: ProjectSettings = {
        title: sections['TITLE']?.[0] || "Untitled Project",
        units: (optionsMap['UNITS'] as any) || 'GPM',
        headloss: (optionsMap['HEADLOSS'] as any) || 'H-W',
        specificGravity: parseFloat(optionsMap['SPECIFIC GRAVITY'] || '1.0'),
        viscosity: parseFloat(optionsMap['VISCOSITY'] || '1.0'),
        trials: parseInt(optionsMap['TRIALS'] || '40'),
        accuracy: parseFloat(optionsMap['ACCURACY'] || '0.001'),
        demandMultiplier: parseFloat(optionsMap['DEMAND MULTIPLIER'] || '1.0'),
    };

    const patterns = parsePatterns(sections['PATTERNS'] || []);
    const curves = parseCurves(sections['CURVES'] || []);
    const controls = parseControls(sections['CONTROLS'] || []);

    // 2. Parse Geometry
    const coordinates = parseCoordinates(sections['COORDINATES'] || []);
    const vertices = parseVertices(sections['VERTICES'] || []);

    // 3. Parse Nodes
    const junctions = parseJunctions(sections['JUNCTIONS'] || [], coordinates);
    const tanks = parseTanks(sections['TANKS'] || [], coordinates);
    const reservoirs = parseReservoirs(sections['RESERVOIRS'] || [], coordinates);

    features.push(...junctions, ...tanks, ...reservoirs);

    // 4. Parse Links
    const allNodes = [...junctions, ...tanks, ...reservoirs];

    features.push(...parsePipes(sections['PIPES'] || [], allNodes, vertices));
    features.push(...parsePumps(sections['PUMPS'] || [], allNodes, vertices));
    features.push(...parseValves(sections['VALVES'] || [], allNodes, vertices));

    return { features, settings, patterns, curves, controls };
}

// --- HELPER PARSERS ---

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
        // Handle keys with spaces like "SPECIFIC GRAVITY 1.0"
        // Split by multiple spaces or tab
        const parts = l.trim().split(/\s{2,}|\t/);

        if (parts.length >= 2) {
            options[parts[0].toUpperCase()] = parts[1];
        } else {
            // Fallback: Split by first space if no wide gap found
            const firstSpace = l.indexOf(' ');
            if (firstSpace > 0) {
                const key = l.substring(0, firstSpace).trim().toUpperCase();
                const val = l.substring(firstSpace).trim();
                options[key] = val;
            }
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

        if (!patternMap.has(id)) {
            patternMap.set(id, []);
        }
        patternMap.get(id)?.push(...multipliers);
    });

    return Array.from(patternMap.entries()).map(([id, multipliers]) => ({
        id,
        description: `Pattern ${id}`,
        multipliers
    }));
}

function parseCurves(lines: string[]): PumpCurve[] {
    const curveMap = new Map<string, { x: number, y: number }[]>();

    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 3) return;

        const id = parts[0];
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);

        if (!curveMap.has(id)) {
            curveMap.set(id, []);
        }
        curveMap.get(id)?.push({ x, y });
    });

    return Array.from(curveMap.entries()).map(([id, points]) => ({
        id,
        type: 'PUMP',
        description: `Curve ${id}`,
        points
    }));
}

function parseControls(lines: string[]): NetworkControl[] {
    const controls: NetworkControl[] = [];

    lines.forEach(line => {
        // Format: LINK <ID> <STATUS> IF/AT <NODE/TIME> <ID> <CONDITION> <VALUE>
        // Ex: LINK P-1 CLOSED IF NODE T-1 ABOVE 20
        // Ex: LINK P-1 OPEN AT TIME 6

        const parts = line.trim().split(/\s+/);
        if (parts.length < 6) return;

        if (parts[0].toUpperCase() !== 'LINK') return;

        const linkId = parts[1];
        const status = parts[2].toUpperCase() as ControlAction;
        const keyword = parts[3].toUpperCase(); // IF or AT
        const typeKey = parts[4].toUpperCase(); // NODE or TIME

        if (typeKey === 'TIME') {
            controls.push({
                id: crypto.randomUUID(),
                linkId,
                status,
                type: 'TIMER',
                value: parseFloat(parts[5]),
                nodeId: undefined
            });
        } else if (typeKey === 'NODE') {
            const nodeId = parts[5];
            const condition = parts[6].toUpperCase(); // ABOVE/BELOW
            const value = parseFloat(parts[7]);

            let type: ControlType = 'HI LEVEL';
            if (condition === 'BELOW') type = 'LOW LEVEL';

            controls.push({
                id: crypto.randomUUID(),
                linkId,
                status,
                type,
                value,
                nodeId
            });
        }
    });

    return controls;
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
            if (!verts.has(id)) verts.set(id, []);
            verts.get(id)?.push([parseFloat(parts[1]), parseFloat(parts[2])]);
        }
    }
    return verts;
}

// --- NODE FACTORIES ---

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
        // ID, Elev, Demand, Pattern
        return createNode(p[0], 'junction', coords, {
            elevation: parseFloat(p[1]),
            demand: parseFloat(p[2] || '0')
            // pattern: p[3] 
        });
    }).filter((f): f is Feature => !!f);
}

function parseTanks(lines: string[], coords: Map<string, number[]>): Feature[] {
    return lines.map(l => {
        const p = l.split(/\s+/);
        return createNode(p[0], 'tank', coords, {
            elevation: parseFloat(p[1]),
            initLevel: parseFloat(p[2]),
            minLevel: parseFloat(p[3]),
            maxLevel: parseFloat(p[4]),
            diameter: parseFloat(p[5])
        });
    }).filter((f): f is Feature => !!f);
}

function parseReservoirs(lines: string[], coords: Map<string, number[]>): Feature[] {
    return lines.map(l => {
        const p = l.split(/\s+/);
        return createNode(p[0], 'reservoir', coords, { head: parseFloat(p[1]) });
    }).filter((f): f is Feature => !!f);
}

// --- LINK FACTORIES ---

function createLink(id: string, type: string, n1: string, n2: string, nodes: Feature[], verts: Map<string, number[][]>, props: any): Feature | null {
    const node1 = nodes.find(n => n.getId() === n1);
    const node2 = nodes.find(n => n.getId() === n2);
    if (!node1 || !node2) return null;

    const c1 = (node1.getGeometry() as Point).getCoordinates();
    const c2 = (node2.getGeometry() as Point).getCoordinates();
    let path = [c1];
    if (verts.has(id)) path = path.concat(verts.get(id)!);
    path.push(c2);

    const feature = new Feature({ geometry: new LineString(path) });
    feature.setId(id);
    feature.set('type', type);
    feature.setProperties({ ...COMPONENT_TYPES[type].defaultProperties, ...props, id, label: id, startNodeId: n1, endNodeId: n2 });
    return feature;
}

function parsePipes(lines: string[], nodes: Feature[], verts: Map<string, number[][]>): Feature[] {
    return lines.map(l => {
        const p = l.split(/\s+/);
        // ID, Node1, Node2, Len, Dia, Rough, MinorLoss, Status
        return createLink(p[0], 'pipe', p[1], p[2], nodes, verts, {
            length: parseFloat(p[3]),
            diameter: parseFloat(p[4]),
            roughness: parseFloat(p[5]),
            status: p[7] || 'Open' // Default to Open
        });
    }).filter((f): f is Feature => !!f);
}

function parsePumps(lines: string[], nodes: Feature[], verts: Map<string, number[][]>): Feature[] {
    return lines.map(l => {
        const p = l.split(/\s+/);
        return createLink(p[0], 'pump', p[1], p[2], nodes, verts, { status: 'Open' });
    }).filter((f): f is Feature => !!f);
}

function parseValves(lines: string[], nodes: Feature[], verts: Map<string, number[][]>): Feature[] {
    return lines.map(l => {
        const p = l.split(/\s+/);
        return createLink(p[0], 'valve', p[1], p[2], nodes, verts, {
            diameter: parseFloat(p[3]),
            valveType: p[4],
            setting: parseFloat(p[5]),
            status: 'Active'
        });
    }).filter((f): f is Feature => !!f);
}