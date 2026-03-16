import { ProjectSettings, TimePattern, PumpCurve, NetworkControl } from "@/types/network";

// Helper for formatting
const pad = (val: any, width: number = 16) => {
    if (val === undefined || val === null || val === "") return "".padEnd(width, " ");
    let str = String(val);
    if (str === "NaN" || str === "Infinity") str = "0";
    if (str.length >= width) return str + " ";
    return str.padEnd(width, " ");
};

const formatTime = (val: any) => {
    if (!val) return "0:00";
    if (typeof val === "number") return `${val}:00`;
    let str = String(val).trim();
    if (str.includes(":")) return str;
    let n = parseFloat(str);
    if (!isNaN(n)) return `${n}:00`;
    return "0:00";
};

export function buildINPFromDB(
    project: { title: string, settings: any, patterns: any, curves: any, controls: any },
    nodes: any[],
    links: any[]
): string {
    const lines: string[] = [];
    const settings = (project.settings as ProjectSettings) || {};
    const patterns = [...((project.patterns as TimePattern[]) || [])];
    const curves = (project.curves as PumpCurve[]) || [];
    const controls = (project.controls as NetworkControl[]) || [];

    const defaultPatternId = settings.defaultPattern || "1";

    // --- PRE-PROCESSING ---
    const hasDefaultPattern = patterns.some(p => p.id === defaultPatternId);
    if (!hasDefaultPattern) {
        patterns.push({
            id: defaultPatternId,
            description: "Default",
            multipliers: Array(24).fill(1.0),
        });
    }

    const patternIds = new Set(patterns.map(p => p.id));
    const curveIds = new Set(curves.map(c => c.id));

    const getPattern = (p: any) => (p && patternIds.has(String(p)) ? String(p) : "");
    const getCurve = (c: any) => (c && curveIds.has(String(c)) ? String(c) : "");

    // Filter features
    const junctions = nodes.filter(n => n.type === "junction");
    const reservoirs = nodes.filter(n => n.type === "reservoir");
    const tanks = nodes.filter(n => n.type === "tank");
    const pipes = links.filter(l => l.type === "pipe");
    const pumps = links.filter(l => l.type === "pump");
    const valves = links.filter(l => l.type === "valve");

    const allIds = new Set([...nodes.map(n => String(n.id)), ...links.map(l => String(l.id))]);

    // --- HEADER ---
    lines.push("[TITLE]");
    lines.push(project.title || "EPANET Simulation");
    lines.push("");

    // --- JUNCTIONS ---
    if (junctions.length > 0) {
        lines.push("[JUNCTIONS]");
        lines.push(";ID              Elevation    Demand       Pattern");
        junctions.forEach(n => {
            const props = n.properties || {};
            const elev = props.elevation ?? 0;
            const demand = props.demand ?? 0;
            const pattern = getPattern(props.pattern || defaultPatternId);
            lines.push(`${pad(n.id)} ${pad(elev)} ${pad(demand)} ${pad(pattern)} ;`);
        });
        lines.push("");
    }

    // --- RESERVOIRS ---
    if (reservoirs.length > 0) {
        lines.push("[RESERVOIRS]");
        lines.push(";ID              Head         Pattern");
        reservoirs.forEach(n => {
            const props = n.properties || {};
            const head = Math.max(props.head ?? 0, props.elevation ?? 0);
            const finalHead = head > 0 ? head : 100;
            const pattern = getPattern(props.pattern || props.headPattern);
            lines.push(`${pad(n.id)} ${pad(finalHead)} ${pad(pattern)} ;`);
        });
        lines.push("");
    }

    // --- TANKS ---
    if (tanks.length > 0) {
        lines.push("[TANKS]");
        lines.push(";ID              Elevation    InitLevel    MinLevel     MaxLevel     Diameter     MinVol       VolCurve");
        tanks.forEach(n => {
            const props = n.properties || {};
            const elev = props.elevation ?? 0;
            const volCurve = getCurve(props.volCurve);
            lines.push(`${pad(n.id)} ${pad(elev)} ${pad(props.initLevel ?? props.initialLevel ?? 10)} ${pad(props.minLevel ?? 0)} ${pad(props.maxLevel ?? 20)} ${pad(props.diameter ?? 50)} ${pad(props.minVol ?? 0)} ${pad(volCurve)} ;`);
        });
        lines.push("");
    }

    // --- PIPES ---
    if (pipes.length > 0) {
        lines.push("[PIPES]");
        lines.push(";ID              Node1           Node2           Length       Diameter     Roughness    MinorLoss    Status");
        pipes.forEach(l => {
            const props = l.properties || {};
            const node1 = l.sourceNodeId || props.startNodeId || props.sourceNodeId || "0";
            const node2 = l.targetNodeId || props.endNodeId || props.targetNodeId || "0";
            lines.push(`${pad(l.id)} ${pad(node1)} ${pad(node2)} ${pad(props.length ?? 100)} ${pad(props.diameter ?? 100)} ${pad(props.roughness ?? 100)} ${pad(props.minorLoss ?? 0)} ${pad(props.status ?? "OPEN")} ;`);
        });
        lines.push("");
    }

    // --- PUMPS ---
    if (pumps.length > 0) {
        lines.push("[PUMPS]");
        lines.push(";ID              Node1           Node2           Parameters");
        pumps.forEach(l => {
            const props = l.properties || {};
            const node1 = l.sourceNodeId || props.startNodeId || props.sourceNodeId || "0";
            const node2 = l.targetNodeId || props.endNodeId || props.targetNodeId || "0";

            const pumpCurve = getCurve(props.curve || props.headCurve);
            const powerValue = props.power || 50;
            let param = `POWER ${powerValue}`;
            if (pumpCurve && pumpCurve !== "CONST") param = `HEAD ${pumpCurve}`;

            lines.push(`${pad(l.id)} ${pad(node1)} ${pad(node2)} ${param} ;`);
        });
        lines.push("");
    }

    // --- VALVES ---
    if (valves.length > 0) {
        lines.push("[VALVES]");
        lines.push(";ID              Node1           Node2           Diameter     Type         Setting      MinorLoss");
        valves.forEach(l => {
            const props = l.properties || {};
            const node1 = l.sourceNodeId || props.startNodeId || props.sourceNodeId || "0";
            const node2 = l.targetNodeId || props.endNodeId || props.targetNodeId || "0";
            lines.push(`${pad(l.id)} ${pad(node1)} ${pad(node2)} ${pad(props.diameter ?? 50)} ${pad(props.valveType ?? "PRV")} ${pad(props.setting ?? 0)} ${pad(props.minorLoss ?? 0)} ;`);
        });
        lines.push("");
    }

    // --- PATTERNS ---
    if (patterns.length > 0) {
        lines.push("[PATTERNS]");
        lines.push(";ID             Multipliers");
        patterns.forEach(p => {
            const mults = [...p.multipliers];
            while (mults.length < 24) mults.push(1.0);
            const row1 = mults.slice(0, 12).map(v => v.toFixed(3)).join("   ");
            const row2 = mults.slice(12, 24).map(v => v.toFixed(3)).join("   ");
            lines.push(`${pad(p.id)} ${row1}`);
            lines.push(`${pad(p.id)} ${row2}`);
        });
        lines.push("");
    }

    // --- CURVES ---
    if (curves.length > 0) {
        lines.push("[CURVES]");
        lines.push(";ID             X-Value         Y-Value");
        curves.forEach(c => {
            lines.push(`; ${c.type}`);
            c.points.forEach(pt => {
                lines.push(`${pad(c.id)} ${pad(pt.x)} ${pad(pt.y)}`);
            });
            lines.push("");
        });
        lines.push("");
    }

    // --- CONTROLS ---
    if (controls.length > 0) {
        const validControls = controls.filter(c => {
            if (!c.linkId || !allIds.has(String(c.linkId))) return false;
            if (["LOW LEVEL", "HI LEVEL"].includes(c.type)) {
                if (!c.nodeId || !allIds.has(String(c.nodeId))) return false;
            }
            return true;
        });

        if (validControls.length > 0) {
            lines.push("[CONTROLS]");
            validControls.forEach(c => {
                let line = "";
                if (c.type === "TIMER") line = `LINK ${c.linkId} ${c.status} AT TIME ${c.value}`;
                else if (c.type === "TIMEOFDAY") line = `LINK ${c.linkId} ${c.status} AT CLOCKTIME ${c.value}`;
                else {
                    const condition = c.type === "LOW LEVEL" ? "BELOW" : "ABOVE";
                    line = `LINK ${c.linkId} ${c.status} IF NODE ${c.nodeId} ${condition} ${c.value}`;
                }
                lines.push(line);
            });
            lines.push("");
        }
    }

    // --- COORDINATES ---
    if (nodes.length > 0 && nodes[0].x !== undefined) {
        lines.push("[COORDINATES]");
        lines.push(";Node           X-Coord         Y-Coord");
        nodes.forEach(n => {
            lines.push(`${pad(n.id)} ${pad(parseFloat(n.x).toFixed(6))} ${pad(parseFloat(n.y).toFixed(6))}`);
        });
        lines.push("");
    }

    // --- VERTICES ---
    if (pipes.length > 0) {
        const bentPipes = pipes.filter(l => {
            const geom = l.geometry;
            return geom && Array.isArray(geom) && geom.length > 2;
        });

        if (bentPipes.length > 0) {
            lines.push("[VERTICES]");
            lines.push(";Link           X-Coord         Y-Coord");
            bentPipes.forEach(l => {
                const coords = l.geometry as any[];
                
                let lastX: string | null = null;
                let lastY: string | null = null;

                // Skip first and last
                for (let i = 1; i < coords.length - 1; i++) {
                    const pt = coords[i];
                    if (Array.isArray(pt)) {
                        const x = parseFloat(pt[0]).toFixed(6);
                        const y = parseFloat(pt[1]).toFixed(6);

                        if (x === lastX && y === lastY) continue;

                        lines.push(`${pad(l.id)} ${pad(x)} ${pad(y)}`);
                        lastX = x;
                        lastY = y;
                    }
                }
            });
            lines.push("");
        }
    }

    // --- OPTIONS ---
    lines.push("[OPTIONS]");
    lines.push(`UNITS              ${settings.units || "LPS"} ; Flow Units`);
    lines.push(`HEADLOSS           ${settings.headloss || "H-W"} ; Headloss Formula`);
    lines.push(`DEMAND MULTIPLIER  ${settings.demandMultiplier ?? 1.0} ; Global Multiplier`);
    lines.push(`SPECIFIC GRAVITY   ${settings.specificGravity || 1.0}`);
    lines.push(`VISCOSITY          ${settings.viscosity || 1.0}`);
    lines.push(`TRIALS             ${settings.maxTrials || 40}`);
    lines.push(`ACCURACY           ${settings.accuracy || 0.001}`);
    lines.push("CHECKFREQ          2");
    lines.push("MAXCHECK           10");
    lines.push("DAMPLIMIT          0");
    lines.push("UNBALANCED         CONTINUE 10");
    lines.push(`PATTERN            ${defaultPatternId}`);
    lines.push("");

    // --- TIMES ---
    lines.push("[TIMES]");
    lines.push(`DURATION           ${formatTime(settings.duration || "24:00")}`);
    lines.push(`HYDRAULIC TIMESTEP ${formatTime(settings.hydraulicStep || "1:00")}`);
    lines.push(`PATTERN TIMESTEP   ${formatTime(settings.patternStep || "1:00")}`);
    lines.push(`REPORT TIMESTEP    ${formatTime(settings.reportStep || "1:00")}`);
    lines.push(`REPORT START       ${formatTime(settings.reportStart || "0:00")}`);
    lines.push(`START CLOCKTIME    ${settings.startClock || "12:00 AM"}`);
    lines.push("STATISTIC          NONE");
    lines.push("");

    lines.push("[END]");
    return lines.join("\n");
}