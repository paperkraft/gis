import { NetworkControl, NetworkFeatureProperties, ProjectSettings, PumpCurve, TimePattern } from "@/types/network";
import { Feature } from "ol";
import { LineString, Point } from "ol/geom";
import { transform } from "ol/proj";

const pad = (val: any, width: number = 16) => {
    let str = (val !== undefined && val !== null) ? String(val) : '0';
    if (str.length >= width) return str + ' ';
    return str.padEnd(width, ' ');
};

// Helper to get ID safely from an OpenLayers Feature
const getId = (f: Feature): string => {
    const id = f.getId() || f.get('id');
    return id ? String(id).trim() : 'UNKNOWN';
};

export function buildINP(features: Feature[],
    patterns: TimePattern[] = [],
    curves: PumpCurve[] = [],
    controls: NetworkControl[] = [],
    settings: ProjectSettings
): string {
    const lines: string[] = [];

    // --- 0. PRE-PROCESSING ---
    // Ensure we have a default pattern if none exist
    const safePatterns = [...patterns];
    const hasPattern1 = safePatterns.some(p => p.id === "1");
    if (!hasPattern1) {
        safePatterns.push({
            id: "1",
            description: "Default",
            multipliers: Array(24).fill(1.0)
        });
    }

    // Filter features by type (Case-insensitive check)
    const getByType = (type: string) => features.filter(f => {
        const t = f.get('type');
        return t && String(t).toLowerCase() === type.toLowerCase();
    });

    const junctions = getByType('junction');
    const reservoirs = getByType('reservoir');
    const tanks = getByType('tank');
    const pipes = getByType('pipe');
    const pumps = getByType('pump');
    const valves = getByType('valve');

    // Collect all IDs for validation (used in Controls)
    const allIds = new Set(features.map(getId));

    // Handle Projections (Optional: Logic to transform coords if settings differ from map)
    const mapProjection = 'EPSG:3857'; // Default for OpenLayers
    const targetProjection = settings?.projection || 'EPSG:3857';
    const shouldTransform = targetProjection !== mapProjection && targetProjection !== 'Simple';

    // --- HEADER ---
    lines.push('[TITLE]');
    lines.push(settings?.title || 'EPANET Web Simulation');
    lines.push('');

    // --- JUNCTIONS ---
    if (junctions.length > 0) {
        lines.push('[JUNCTIONS]');
        lines.push(';ID              Elevation    Demand       Pattern');
        junctions.forEach(f => {
            const props = f.getProperties() as NetworkFeatureProperties;
            // Use '1' as default pattern if none specified
            const pattern = props.pattern || (hasPattern1 ? "1" : "");
            lines.push(`${pad(getId(f))} ${pad(props.elevation ?? 0)} ${pad(props.demand ?? 0)} ${pad(pattern)} ;`);
        });
        lines.push('');
    }

    // --- RESERVOIRS ---
    if (reservoirs.length > 0) {
        lines.push('[RESERVOIRS]');
        lines.push(';ID              Head         Pattern');
        reservoirs.forEach(f => {
            const props = f.getProperties() as NetworkFeatureProperties;
            // Head is often stored in 'head' or 'elevation'
            const head = props.head !== undefined ? props.head : (props.elevation ?? 100);
            lines.push(`${pad(getId(f))} ${pad(head)} ${pad(props.headPattern || "")} ;`);
        });
        lines.push('');
    }

    // --- TANKS ---
    if (tanks.length > 0) {
        lines.push('[TANKS]');
        lines.push(';ID              Elevation    InitLevel    MinLevel     MaxLevel     Diameter     MinVol       VolCurve');
        tanks.forEach(f => {
            const props = f.getProperties() as NetworkFeatureProperties;
            lines.push(`${pad(getId(f))} ${pad(props.elevation ?? 0)} ${pad(props.initLevel ?? 10)} ${pad(props.minLevel ?? 0)} ${pad(props.maxLevel ?? 20)} ${pad(props.diameter ?? 50)} ${pad(props.minVol ?? 0)} ${pad(props.volCurve || "")} ;`);
        });
        lines.push('');
    }

    // --- PIPES ---
    if (pipes.length > 0) {
        lines.push('[PIPES]');
        lines.push(';ID              Node1           Node2           Length       Diameter     Roughness    MinorLoss    Status');
        pipes.forEach(f => {
            const props = f.getProperties() as NetworkFeatureProperties;
            lines.push(`${pad(getId(f))} ${pad(props.startNodeId)} ${pad(props.endNodeId)} ${pad(props.length ?? 100)} ${pad(props.diameter ?? 100)} ${pad(props.roughness ?? 100)} ${pad(props.minorLoss ?? 0)} ${pad(props.status ?? 'Open')} ;`);
        });
        lines.push('');
    }

    // --- PUMPS ---
    if (pumps.length > 0) {
        lines.push('[PUMPS]');
        lines.push(';ID              Node1           Node2           Parameters');
        pumps.forEach(f => {
            const props = f.getProperties() as NetworkFeatureProperties;
            // Support Curve or Constant Power
            let param = `POWER ${props.power ?? 50}`;
            if (props.headCurve) param = `HEAD ${props.headCurve}`;

            lines.push(`${pad(getId(f))} ${pad(props.startNodeId)} ${pad(props.endNodeId)} ${param} ;`);
        });
        lines.push('');
    }

    // --- VALVES ---
    if (valves.length > 0) {
        lines.push('[VALVES]');
        lines.push(';ID              Node1           Node2           Diameter     Type         Setting      MinorLoss');
        valves.forEach(f => {
            const props = f.getProperties() as NetworkFeatureProperties;
            lines.push(`${pad(getId(f))} ${pad(props.startNodeId)} ${pad(props.endNodeId)} ${pad(props.diameter ?? 50)} ${pad(props.valveType ?? 'PRV')} ${pad(props.setting ?? 0)} ${pad(props.minorLoss ?? 0)} ;`);
        });
        lines.push('');
    }

    // --- PATTERNS ---
    if (safePatterns.length > 0) {
        lines.push('[PATTERNS]');
        lines.push(';ID             Multipliers');
        safePatterns.forEach(p => {
            const mults = [...p.multipliers];
            // Pad to ensure 24 values
            while (mults.length < 24) mults.push(1.0);

            const row1 = mults.slice(0, 12).map(v => v.toFixed(3)).join('   ');
            const row2 = mults.slice(12, 24).map(v => v.toFixed(3)).join('   ');

            lines.push(`${pad(p.id)} ${row1}`);
            lines.push(`${pad(p.id)} ${row2}`);
        });
        lines.push('');
    }

    // --- CURVES ---
    if (curves.length > 0) {
        lines.push('[CURVES]');
        lines.push(';ID             X-Value         Y-Value');
        curves.forEach(c => {
            lines.push(`; ${c.type}`);
            c.points.forEach(pt => {
                lines.push(`${pad(c.id)} ${pad(pt.x)} ${pad(pt.y)}`);
            });
            lines.push('');
        });
        lines.push('');
    }

    // --- CONTROLS ---
    if (controls.length > 0) {
        const validControls = controls.filter(c => {
            // Validate IDs exist to prevent engine crash
            if (!c.linkId || !allIds.has(c.linkId)) return false;
            if (['LOW LEVEL', 'HI LEVEL'].includes(c.type)) {
                if (!c.nodeId || !allIds.has(c.nodeId)) return false;
            }
            return true;
        });

        if (validControls.length > 0) {
            lines.push('[CONTROLS]');
            validControls.forEach(c => {
                let line = '';
                const linkId = c.linkId;

                if (c.type === 'TIMER') {
                    // LINK linkID status AT TIME time
                    line = `LINK ${linkId} ${c.status} AT TIME ${c.value}`;
                } else if (c.type === 'TIMEOFDAY') {
                    // LINK linkID status AT CLOCKTIME time
                    line = `LINK ${linkId} ${c.status} AT CLOCKTIME ${c.value}`;
                } else {
                    // LINK linkID status IF NODE nodeID BELOW/ABOVE value
                    const condition = c.type === 'LOW LEVEL' ? 'BELOW' : 'ABOVE';
                    line = `LINK ${linkId} ${c.status} IF NODE ${c.nodeId} ${condition} ${c.value}`;
                }
                lines.push(line);
            });
            lines.push('');
        }
    }

    // --- COORDINATES (Optional, mainly for viz) ---
    const nodes = [...junctions, ...reservoirs, ...tanks];
    if (nodes.length > 0) {
        lines.push('[COORDINATES]');
        lines.push(';Node           X-Coord         Y-Coord');
        nodes.forEach(f => {
            const geom = f.getGeometry() as Point;
            if (geom) {
                let coords = geom.getCoordinates();

                if (shouldTransform) {
                    try {
                        coords = transform(coords, mapProjection, targetProjection);
                    } catch (e) { console.warn("Projection transform failed", e); }
                }

                // EPANET coords
                lines.push(`${pad(getId(f))} ${pad(coords[0].toFixed(2))} ${pad(coords[1].toFixed(2))}`);
            }
        });
        lines.push('');
    }

    // --- 14. VERTICES (For bent pipes) ---
    if (pipes.length > 0) {
        const bentPipes = pipes.filter(f => {
            const geom = f.getGeometry() as LineString;
            return geom && geom.getCoordinates().length > 2;
        });

        if (bentPipes.length > 0) {
            lines.push('[VERTICES]');
            lines.push(';Link           X-Coord         Y-Coord');
            bentPipes.forEach(f => {
                const geom = f.getGeometry() as LineString;
                let coords = geom.getCoordinates();

                if (shouldTransform) {
                    try {
                        coords = coords.map(c => transform(c, mapProjection, targetProjection));
                    } catch (e) { }
                }

                // Skip first and last (start/end nodes)
                for (let i = 1; i < coords.length - 1; i++) {
                    lines.push(`${pad(getId(f))} ${pad(coords[i][0].toFixed(2))} ${pad(coords[i][1].toFixed(2))}`);
                }
            });
            lines.push('');
        }
    }

    lines.push('[OPTIONS]');
    lines.push(`Units              ${settings?.units || 'LPS'}`);
    lines.push(`Headloss           ${settings?.headloss || 'H-W'}`);
    lines.push(`Specific Gravity   ${settings?.specificGravity || 1.0}`);
    lines.push(`Viscosity          ${settings?.viscosity || 1.0}`);
    lines.push(`Trials             ${settings?.trials || 40}`);
    lines.push(`Accuracy           ${settings?.accuracy || 0.001}`);
    lines.push('CHECKFREQ          2');
    lines.push('MAXCHECK           10');
    lines.push('DAMPLIMIT          0');
    lines.push('UNBALANCED         Continue 10');
    lines.push('PATTERN            1');
    lines.push('');

    // lines.push(`Duration           ${options?.duration || 24}:00`);
    // lines.push(`Hydraulic Timestep ${options?.timeStep || "1:00"}`);
    lines.push('[TIMES]');
    lines.push('Duration           24:00');
    lines.push('Hydraulic Timestep 1:00');
    lines.push('Pattern Timestep   1:00');
    lines.push('Report Timestep    1:00');
    lines.push('Report Start       0:00');
    lines.push('Start Time         0:00');
    lines.push('Statistic          None');
    lines.push('');



    lines.push('[END]');
    return lines.join('\n');
}