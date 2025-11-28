import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { ImportResult } from './fileImporter';
import { COMPONENT_TYPES } from '@/constants/networkComponents';

interface INPSection {
    [key: string]: string[];
}

export function parseINP(fileContent: string): ImportResult {
    console.log('📄 Parsing INP file...');

    try {
        const sections = parseINPSections(fileContent);
        const features: Feature[] = [];

        // Parse coordinates first (needed for spatial data)
        const coordinates = parseCoordinates(sections['COORDINATES'] || []);

        // Parse junctions
        const junctions = parseJunctions(sections['JUNCTIONS'] || [], coordinates);
        features.push(...junctions);

        // Parse tanks
        const tanks = parseTanks(sections['TANKS'] || [], coordinates);
        features.push(...tanks);

        // Parse reservoirs
        const reservoirs = parseReservoirs(sections['RESERVOIRS'] || [], coordinates);
        features.push(...reservoirs);

        // Parse pipes
        const pipes = parsePipes(sections['PIPES'] || [], junctions, tanks, reservoirs);
        features.push(...pipes);

        // Parse pumps
        const pumps = parsePumps(sections['PUMPS'] || [], junctions, tanks, reservoirs);
        features.push(...pumps);

        // Parse valves
        const valves = parseValves(sections['VALVES'] || [], junctions, tanks, reservoirs);
        features.push(...valves);

        // Calculate stats
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

/**
 * Parse INP file into sections
 */
function parseINPSections(content: string): INPSection {
    const sections: INPSection = {};
    let currentSection = '';

    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith(';')) continue;

        // Check for section header
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            currentSection = trimmed.slice(1, -1).toUpperCase();
            sections[currentSection] = [];
            continue;
        }

        // Add line to current section
        if (currentSection) {
            sections[currentSection].push(trimmed);
        }
    }

    return sections;
}

/**
 * Parse coordinates section
 */
function parseCoordinates(lines: string[]): Map<string, number[]> {
    const coords = new Map<string, number[]>();

    for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
            const id = parts[0];
            const x = parseFloat(parts[1]);
            const y = parseFloat(parts[2]);
            coords.set(id, [x, y]);
        }
    }

    return coords;
}

/**
 * Parse junctions
 */
function parseJunctions(lines: string[], coordinates: Map<string, number[]>): Feature[] {
    const junctions: Feature[] = [];

    for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length < 2) continue;

        const id = parts[0];
        const elevation = parseFloat(parts[1]);
        const demand = parts.length >= 3 ? parseFloat(parts[2]) : 0;

        const coord = coordinates.get(id);
        if (!coord) continue;

        const feature = new Feature({
            geometry: new Point(coord),
        });

        feature.setId(id);
        feature.set('type', 'junction');
        feature.setProperties({
            ...COMPONENT_TYPES.junction.defaultProperties,
            label: id,
            elevation,
            demand,
        });

        junctions.push(feature);
    }

    console.log(`  ✓ Parsed ${junctions.length} junctions`);
    return junctions;
}

/**
 * Parse tanks
 */
function parseTanks(lines: string[], coordinates: Map<string, number[]>): Feature[] {
    const tanks: Feature[] = [];

    for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length < 6) continue;

        const id = parts[0];
        const elevation = parseFloat(parts[1]);
        const initLevel = parseFloat(parts[2]);
        const minLevel = parseFloat(parts[3]);
        const maxLevel = parseFloat(parts[4]);
        const diameter = parseFloat(parts[5]);

        const coord = coordinates.get(id);
        if (!coord) continue;

        const feature = new Feature({
            geometry: new Point(coord),
        });

        feature.setId(id);
        feature.set('type', 'tank');
        feature.setProperties({
            ...COMPONENT_TYPES.tank.defaultProperties,
            label: id,
            elevation,
            initLevel,
            minLevel,
            maxLevel,
            diameter,
        });

        tanks.push(feature);
    }

    console.log(`  ✓ Parsed ${tanks.length} tanks`);
    return tanks;
}

/**
 * Parse reservoirs
 */
function parseReservoirs(lines: string[], coordinates: Map<string, number[]>): Feature[] {
    const reservoirs: Feature[] = [];

    for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length < 2) continue;

        const id = parts[0];
        const head = parseFloat(parts[1]);

        const coord = coordinates.get(id);
        if (!coord) continue;

        const feature = new Feature({
            geometry: new Point(coord),
        });

        feature.setId(id);
        feature.set('type', 'reservoir');
        feature.setProperties({
            ...COMPONENT_TYPES.reservoir.defaultProperties,
            label: id,
            head,
        });

        reservoirs.push(feature);
    }

    console.log(`  ✓ Parsed ${reservoirs.length} reservoirs`);
    return reservoirs;
}

/**
 * Parse pipes
 */
function parsePipes(lines: string[], junctions: Feature[], tanks: Feature[], reservoirs: Feature[]): Feature[] {
    const pipes: Feature[] = [];
    const allNodes = [...junctions, ...tanks, ...reservoirs];

    for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length < 6) continue;

        const id = parts[0];
        const node1Id = parts[1];
        const node2Id = parts[2];
        const length = parseFloat(parts[3]);
        const diameter = parseFloat(parts[4]);
        const roughness = parseFloat(parts[5]);

        // Find nodes
        const node1 = allNodes.find(n => n.getId() === node1Id);
        const node2 = allNodes.find(n => n.getId() === node2Id);

        if (!node1 || !node2) continue;

        const coord1 = (node1.getGeometry() as Point).getCoordinates();
        const coord2 = (node2.getGeometry() as Point).getCoordinates();

        const feature = new Feature({
            geometry: new LineString([coord1, coord2]),
        });

        feature.setId(id);
        feature.set('type', 'pipe');
        feature.setProperties({
            ...COMPONENT_TYPES.pipe.defaultProperties,
            label: id,
            startNodeId: node1Id,
            endNodeId: node2Id,
            length,
            diameter,
            roughness,
        });

        pipes.push(feature);
    }

    console.log(`  ✓ Parsed ${pipes.length} pipes`);
    return pipes;
}

/**
 * Parse pumps
 */
function parsePumps(lines: string[], junctions: Feature[], tanks: Feature[], reservoirs: Feature[]): Feature[] {
    const pumps: Feature[] = [];
    const allNodes = [...junctions, ...tanks, ...reservoirs];

    for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length < 3) continue;

        const id = parts[0];
        const node1Id = parts[1];
        const node2Id = parts[2];

        const node1 = allNodes.find(n => n.getId() === node1Id);
        const node2 = allNodes.find(n => n.getId() === node2Id);

        if (!node1 || !node2) continue;

        const coord1 = (node1.getGeometry() as Point).getCoordinates();
        const coord2 = (node2.getGeometry() as Point).getCoordinates();

        // Pump at midpoint
        const midX = (coord1[0] + coord2[0]) / 2;
        const midY = (coord1[1] + coord2[1]) / 2;

        const feature = new Feature({
            geometry: new Point([midX, midY]),
        });

        feature.setId(id);
        feature.set('type', 'pump');
        feature.setProperties({
            ...COMPONENT_TYPES.pump.defaultProperties,
            label: id,
            startNodeId: node1Id,
            endNodeId: node2Id,
        });

        pumps.push(feature);
    }

    console.log(`  ✓ Parsed ${pumps.length} pumps`);
    return pumps;
}

/**
 * Parse valves
 */
function parseValves(lines: string[], junctions: Feature[], tanks: Feature[], reservoirs: Feature[]): Feature[] {
    const valves: Feature[] = [];
    const allNodes = [...junctions, ...tanks, ...reservoirs];

    for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length < 5) continue;

        const id = parts[0];
        const node1Id = parts[1];
        const node2Id = parts[2];
        const diameter = parseFloat(parts[3]);
        const setting = parseFloat(parts[4]);

        const node1 = allNodes.find(n => n.getId() === node1Id);
        const node2 = allNodes.find(n => n.getId() === node2Id);

        if (!node1 || !node2) continue;

        const coord1 = (node1.getGeometry() as Point).getCoordinates();
        const coord2 = (node2.getGeometry() as Point).getCoordinates();

        const midX = (coord1[0] + coord2[0]) / 2;
        const midY = (coord1[1] + coord2[1]) / 2;

        const feature = new Feature({
            geometry: new Point([midX, midY]),
        });

        feature.setId(id);
        feature.set('type', 'valve');
        feature.setProperties({
            ...COMPONENT_TYPES.valve.defaultProperties,
            label: id,
            startNodeId: node1Id,
            endNodeId: node2Id,
            diameter,
            setting,
        });

        valves.push(feature);
    }

    console.log(`  ✓ Parsed ${valves.length} valves`);
    return valves;
}