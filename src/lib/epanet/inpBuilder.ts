import { NetworkControl, NetworkFeatureData, ProjectSettings, PumpCurve, TimePattern } from "@/types/network";

const pad = (val: any, width: number = 16) => {
    if (val === undefined || val === null || val === "") return "".padEnd(width, " ");
    let str = String(val);
    if (str === "NaN" || str === "Infinity") str = "0";
    if (str.length >= width) return str + " ";
    return str.padEnd(width, " ");
};

// Helper to get ID safely
const getId = (f: NetworkFeatureData): string => {
    const id = f.id;
    return id ? String(id).trim() : "UNKNOWN";
};

// Helper to ensure "HH:MM" format
const formatTime = (val: any) => {
    if (!val) return "0:00";
    if (typeof val === "number") return `${val}:00`;
    let str = String(val).trim();
    if (str.includes(":")) return str;
    let n = parseFloat(str);
    if (!isNaN(n)) return `${n}:00`;
    return "0:00";
};

export interface INPBuilderOptions {
    transformCoords?: (coords: number[]) => number[];
}

/**
 * Robust INP file generator.
 * Consolidated from inpBuilder, inpWriter, and inpGenerator.
 */
export function buildINP(
    features: NetworkFeatureData[],
    patterns: TimePattern[] = [],
    curves: PumpCurve[] = [],
    controls: NetworkControl[] = [],
    settings?: ProjectSettings,
    options?: INPBuilderOptions
): string {
    const lines: string[] = [];

    const defaultPatternId = settings?.defaultPattern || "1";

    // --- PRE-PROCESSING ---
    // Ensure we have a default pattern if none exist
    const safePatterns = [...patterns];
    const hasDefaultPattern = safePatterns.some(p => p.id === defaultPatternId);
    if (!hasDefaultPattern) {
        safePatterns.push({
            id: defaultPatternId,
            description: "Default",
            multipliers: Array(24).fill(1.0),
        });
    }

    const patternIds = new Set(safePatterns.map(p => p.id));
    const curveIds = new Set(curves.map(c => c.id));

    const getPattern = (p: any) => (p && patternIds.has(String(p)) ? String(p) : "");
    const getCurve = (c: any) => (c && curveIds.has(String(c)) ? String(c) : "");

    // Filter features by type (Case-insensitive check)
    const getByType = (type: string) =>
        features.filter(f => {
            const t = f.type;
            return t && String(t).toLowerCase() === type.toLowerCase();
        });

    const junctions = getByType("junction");
    const reservoirs = getByType("reservoir");
    const tanks = getByType("tank");
    const pipes = getByType("pipe");
    const pumps = getByType("pump");
    const valves = getByType("valve");

    // Collect all IDs for validation (used in Controls)
    const allIds = new Set(features.map(getId));

    // --- HEADER ---
    lines.push('[TITLE]');
    lines.push(settings?.title || 'EPANET Web Simulation');
    if (settings?.projection) {
        lines.push(`;Projection: ${settings.projection}`);
    }
    lines.push('');

    // --- JUNCTIONS ---
    if (junctions.length > 0) {
        lines.push('[JUNCTIONS]');
        lines.push(';ID              Elevation    Demand       Pattern');
        junctions.forEach(f => {
            const props = f.properties || {};
            const elev = props.elevation ?? 0;
            const demand = props.demand ?? 0;
            const pattern = getPattern(props.pattern || defaultPatternId);
            lines.push(`${pad(getId(f))} ${pad(elev)} ${pad(demand)} ${pad(pattern)} ;`);
        });
        lines.push('');
    }

    // --- RESERVOIRS ---
    if (reservoirs.length > 0) {
        lines.push('[RESERVOIRS]');
        lines.push(';ID              Head         Pattern');
        reservoirs.forEach(f => {
            const props = f.properties || {};
            // Absolute Head must be >= Elevation. Fallback to 100 if both are 0.
            const head = Math.max(props.head ?? 0, props.elevation ?? 0);
            const finalHead = head > 0 ? head : 100;

            const pattern = getPattern(props.pattern || props.headPattern);
            lines.push(`${pad(getId(f))} ${pad(finalHead)} ${pad(pattern)} ;`);
        });
        lines.push('');
    }

    // --- TANKS ---
    if (tanks.length > 0) {
        lines.push('[TANKS]');
        lines.push(';ID              Elevation    InitLevel    MinLevel     MaxLevel     Diameter     MinVol       VolCurve');
        tanks.forEach(f => {
            const props = f.properties || {};
            const elev = props.elevation ?? 0;
            const volCurve = getCurve(props.volCurve);
            lines.push(`${pad(getId(f))} ${pad(elev)} ${pad(props.initLevel ?? props.initialLevel ?? 10)} ${pad(props.minLevel ?? 0)} ${pad(props.maxLevel ?? 20)} ${pad(props.diameter ?? 50)} ${pad(props.minVol ?? 0)} ${pad(volCurve)} ;`);
        });
        lines.push('');
    }

    // --- PIPES ---
    if (pipes.length > 0) {
        lines.push('[PIPES]');
        lines.push(';ID              Node1           Node2           Length       Diameter     Roughness    MinorLoss    Status');
        pipes.forEach(f => {
            const props = f.properties || {};
            const node1 = props.startNodeId || props.sourceNodeId || '0';
            const node2 = props.endNodeId || props.targetNodeId || '0';
            lines.push(`${pad(getId(f))} ${pad(node1)} ${pad(node2)} ${pad(props.length ?? 100)} ${pad(props.diameter ?? 100)} ${pad(props.roughness ?? 100)} ${pad(props.minorLoss ?? 0)} ${pad(props.status ?? 'Open')} ;`);
        });
        lines.push('');
    }

    // --- PUMPS ---
    if (pumps.length > 0) {
        lines.push('[PUMPS]');
        lines.push(';ID              Node1           Node2           Parameters');
        pumps.forEach(f => {
            const props = f.properties || {};
            const node1 = props.startNodeId || props.sourceNodeId || '0';
            const node2 = props.endNodeId || props.targetNodeId || '0';

            const pumpCurve = getCurve(props.curve || props.headCurve);
            const powerValue = props.power || 50;
            let param = `POWER ${powerValue}`;

            if (pumpCurve && pumpCurve !== "CONST") param = `HEAD ${pumpCurve}`;

            lines.push(`${pad(getId(f))} ${pad(node1)} ${pad(node2)} ${param} ;`);
        });
        lines.push('');
    }

    // --- VALVES ---
    if (valves.length > 0) {
        lines.push('[VALVES]');
        lines.push(';ID              Node1           Node2           Diameter     Type         Setting      MinorLoss');
        valves.forEach(f => {
            const props = f.properties || {};
            const node1 = props.startNodeId || props.sourceNodeId || '0';
            const node2 = props.endNodeId || props.targetNodeId || '0';
            lines.push(`${pad(getId(f))} ${pad(node1)} ${pad(node2)} ${pad(props.diameter ?? 50)} ${pad(props.valveType ?? 'PRV')} ${pad(props.setting ?? 0)} ${pad(props.minorLoss ?? 0)} ;`);
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

            const row1 = mults.slice(0, 12).map(v => (v || 0).toFixed(3)).join('   ');
            const row2 = mults.slice(12, 24).map(v => (v || 0).toFixed(3)).join('   ');

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
                    line = `LINK ${linkId} ${c.status} AT TIME ${c.value}`;
                } else if (c.type === 'TIMEOFDAY') {
                    line = `LINK ${linkId} ${c.status} AT CLOCKTIME ${c.value}`;
                } else {
                    const condition = c.type === 'LOW LEVEL' ? 'BELOW' : 'ABOVE';
                    line = `LINK ${linkId} ${c.status} IF NODE ${c.nodeId} ${condition} ${c.value}`;
                }
                lines.push(line);
            });
            lines.push('');
        }
    }

    // --- COORDINATES ---
    const nodes = [...junctions, ...reservoirs, ...tanks];

    if (nodes.length > 0) {
        lines.push('[COORDINATES]');
        lines.push(';Node           X-Coord         Y-Coord');
        nodes.forEach(f => {
            let coords = f.geometry as number[];
            if (coords && Array.isArray(coords) && Number.isFinite(coords[0])) {
                if (options?.transformCoords) {
                    try {
                        coords = options.transformCoords(coords);
                    } catch (e) { console.warn("Coordinate transform failed", e); }
                }
                lines.push(`${pad(getId(f))} ${pad(coords[0].toFixed(6))} ${pad(coords[1].toFixed(6))}`);
            }
        });
        lines.push('');
    }

    // --- VERTICES ---
    if (pipes.length > 0) {
        const bentPipes = pipes.filter(f => {
            const geom = f.geometry as number[][];
            return geom && Array.isArray(geom) && Array.isArray(geom[0]) && geom.length > 2;
        });

        if (bentPipes.length > 0) {
            lines.push('[VERTICES]');
            lines.push(';Link           X-Coord         Y-Coord');
            bentPipes.forEach(f => {
                let coords = f.geometry as number[][];
                
                let lastX: string | null = null;
                let lastY: string | null = null;

                for (let i = 1; i < coords.length - 1; i++) {
                    let pt = coords[i];
                    if (options?.transformCoords) {
                        try { pt = options.transformCoords(pt); } catch (e) { }
                    }
                    const x = pt[0].toFixed(6);
                    const y = pt[1].toFixed(6);

                    if (x === lastX && y === lastY) continue;

                    lines.push(`${pad(getId(f))} ${pad(x)} ${pad(y)}`);
                    lastX = x;
                    lastY = y;
                }
            });
            lines.push('');
        }
    }

    lines.push('[OPTIONS]');
    lines.push(`UNITS              ${settings?.units || 'LPS'} ; Flow Units`);
    lines.push(`HEADLOSS           ${settings?.headloss || 'H-W'} ; Headloss Formula`);
    lines.push(`DEMAND MULTIPLIER  ${settings?.demandMultiplier ?? 1.0} ; Global Multiplier`);
    lines.push(`SPECIFIC GRAVITY   ${settings?.specificGravity || 1.0}`);
    lines.push(`VISCOSITY          ${settings?.viscosity || 1.0}`);
    lines.push(`TRIALS             ${settings?.maxTrials || 40}`);
    lines.push(`ACCURACY           ${settings?.accuracy || 0.001}`);
    lines.push('CHECKFREQ          2');
    lines.push('MAXCHECK           10');
    lines.push('DAMPLIMIT          0');
    lines.push('UNBALANCED         CONTINUE 10');
    lines.push(`PATTERN            ${defaultPatternId}`);
    lines.push('');

    lines.push('[TIMES]');
    lines.push(`DURATION           ${formatTime(settings?.duration || "24:00")}`);
    lines.push(`HYDRAULIC TIMESTEP ${formatTime(settings?.hydraulicStep || "1:00")}`);
    lines.push(`PATTERN TIMESTEP   ${formatTime(settings?.patternStep || "1:00")}`);
    lines.push(`REPORT TIMESTEP    ${formatTime(settings?.reportStep || "1:00")}`);
    lines.push(`REPORT START       ${formatTime(settings?.reportStart || "0:00")}`);
    lines.push(`START CLOCKTIME    ${settings?.startClock || "12:00 AM"}`);
    lines.push(`STATISTIC          ${settings?.statistic || 'NONE'}`);
    lines.push('');

    lines.push('[REPORT]');
    lines.push('STATUS             YES');
    lines.push('SUMMARY            YES');
    lines.push('NODES              ALL');
    lines.push('LINKS              ALL');
    lines.push('');

    lines.push('[END]');
    return lines.join('\n');
}