import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { ImportResult } from './fileImporter';
import { COMPONENT_TYPES } from '@/constants/networkComponents';
import { NetworkFeatureProperties, ProjectSettings, TimePattern, PumpCurve } from '@/types/network';

interface INPSection {
    [key: string]: string[];
}

// Extended Result Interface
export interface ParsedProjectData {
    features: Feature[];
    settings: ProjectSettings;
    patterns: TimePattern[];
    curves: PumpCurve[];
}

export function parseINP(fileContent: string): ParsedProjectData {
    // Basic section parsing
    const sections = parseINPSections(fileContent);
    const features: Feature[] = [];

    // 1. Parse Metadata (Settings)
    const optionsMap = parseOptions(sections['OPTIONS'] || []);

    const settings: ProjectSettings = {
        title: sections['TITLE']?.[0] || "Untitled Project",
        units: (optionsMap['Units'] as any) || 'GPM',
        headloss: (optionsMap['Headloss'] as any) || 'H-W',
        specificGravity: parseFloat(optionsMap['Specific'] || '1.0'),
        viscosity: parseFloat(optionsMap['Viscosity'] || '1.0'),
        trials: parseInt(optionsMap['Trials'] || '40'),
        accuracy: parseFloat(optionsMap['Accuracy'] || '0.001'),
        demandMultiplier: parseFloat(optionsMap['DEMAND'] || '1.0'),
    };

    // 2. Parse Patterns & Curves
    const patterns = parsePatterns(sections['PATTERNS'] || []);
    const curves = parseCurves(sections['CURVES'] || []);

    // 3. Parse Geometry
    const coordinates = parseCoordinates(sections['COORDINATES'] || []);
    const vertices = parseVertices(sections['VERTICES'] || []);

    // 4. Parse Nodes
    const junctions = parseJunctions(sections['JUNCTIONS'] || [], coordinates);
    const tanks = parseTanks(sections['TANKS'] || [], coordinates);
    const reservoirs = parseReservoirs(sections['RESERVOIRS'] || [], coordinates);

    features.push(...junctions, ...tanks, ...reservoirs);

    // 5. Parse Links (Need all nodes for geometry lookup)
    const allNodes = [...junctions, ...tanks, ...reservoirs];

    features.push(...parsePipes(sections['PIPES'] || [], allNodes, vertices));
    features.push(...parsePumps(sections['PUMPS'] || [], allNodes, vertices));
    features.push(...parseValves(sections['VALVES'] || [], allNodes, vertices));

    return { features, settings, patterns, curves };
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
        // Handle multi-word keys like "Specific Gravity"
        if (l.includes("Specific Gravity")) options['Specific'] = l.split(/\s+/).pop() || "1.0";
        else if (l.includes("DEMAND MULTIPLIER")) options['DEMAND'] = l.split(/\s+/).pop() || "1.0";
        else {
            const p = l.trim().split(/\s+/);
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
    return Array.from(patternMap.entries()).map(([id, multipliers]) => ({
        id, description: `Pattern ${id}`, multipliers
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
        if (!curveMap.has(id)) curveMap.set(id, []);
        curveMap.get(id)?.push({ x, y });
    });
    return Array.from(curveMap.entries()).map(([id, points]) => ({
        id, type: 'PUMP', points
    }));
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
        return createNode(p[0], 'junction', coords, { elevation: parseFloat(p[1]), demand: parseFloat(p[2] || '0') });
    }).filter((f): f is Feature => !!f);
}

function parseTanks(lines: string[], coords: Map<string, number[]>): Feature[] {
    return lines.map(l => {
        const p = l.split(/\s+/);
        return createNode(p[0], 'tank', coords, {
            elevation: parseFloat(p[1]), initLevel: parseFloat(p[2]),
            minLevel: parseFloat(p[3]), maxLevel: parseFloat(p[4]), diameter: parseFloat(p[5])
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
    feature.setProperties({
        ...COMPONENT_TYPES[type].defaultProperties, ...props,
        id, label: id, startNodeId: n1, endNodeId: n2
    });
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
            diameter: parseFloat(p[3]), valveType: p[4], setting: parseFloat(p[5]), status: 'Active'
        });
    }).filter((f): f is Feature => !!f);
}