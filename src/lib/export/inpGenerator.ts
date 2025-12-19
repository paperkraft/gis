import { ProjectSettings, TimePattern, PumpCurve, NetworkControl } from "@/types/network";

// Helper for formatting
const pad = (val: any, width: number = 16) => {
    let str = (val !== undefined && val !== null) ? String(val) : '0';
    if (str.length >= width) return str + ' ';
    return str.padEnd(width, ' ');
};

export function buildINPFromDB(
    project: { title: string, settings: any, patterns: any, curves: any, controls: any },
    nodes: any[],
    links: any[]
): string {
    const lines: string[] = [];
    const settings = project.settings as ProjectSettings || {};
    const patterns = (project.patterns as TimePattern[]) || [];
    const curves = (project.curves as PumpCurve[]) || [];
    const controls = (project.controls as NetworkControl[]) || [];

    // Ensure default pattern exists
    const hasPattern1 = patterns.some(p => p.id === "1");
    if (!hasPattern1) {
        // Add default pattern if missing
        patterns.push({ id: "1", description: "Default", multipliers: Array(24).fill(1.0) });
    }

    // --- 1. HEADER & OPTIONS ---
    lines.push('[TITLE]');
    lines.push(project.title || 'EPANET Simulation');
    lines.push('');

    lines.push('[OPTIONS]');
    lines.push(`Units              ${settings.units || 'GPM'}`);
    lines.push(`Headloss           ${settings.headloss || 'H-W'}`);
    lines.push(`Specific Gravity   ${settings.specificGravity || 1.0}`);
    lines.push(`Viscosity          ${settings.viscosity || 1.0}`);
    lines.push(`Trials             ${settings.trials || 40}`);
    lines.push(`Accuracy           ${settings.accuracy || 0.001}`);
    lines.push('CHECKFREQ          2');
    lines.push('MAXCHECK           10');
    lines.push('DAMPLIMIT          0');
    lines.push('UNBALANCED         Continue 10');
    lines.push('PATTERN            1');
    lines.push('');

    lines.push('[TIMES]');
    lines.push('Duration           24:00');
    lines.push('Hydraulic Timestep 1:00');
    lines.push('Pattern Timestep   1:00');
    lines.push('Report Timestep    1:00');
    lines.push('Report Start       0:00');
    lines.push('Start Time         0:00');
    lines.push('Statistic          None');
    lines.push('');

    // --- 2. PATTERNS ---
    lines.push('[PATTERNS]');
    lines.push(';ID   Multipliers');
    patterns.forEach(p => {
        const mults = [...p.multipliers];
        // Ensure 24 values
        while (mults.length < 24) mults.push(1.0);

        const row1 = mults.slice(0, 12).map(v => v.toFixed(2)).join(' ');
        const row2 = mults.slice(12, 24).map(v => v.toFixed(2)).join(' ');
        lines.push(`${p.id}     ${row1}`);
        lines.push(`${p.id}     ${row2}`);
    });
    lines.push('');

    // --- 3. CURVES ---
    if (curves.length > 0) {
        lines.push('[CURVES]');
        lines.push(';ID   X-Value  Y-Value');
        curves.forEach(c => {
            c.points.forEach(pt => {
                lines.push(`${c.id}   ${pt.x}   ${pt.y}`);
            });
            lines.push('');
        });
        lines.push('');
    }

    // --- 4. NODES ---
    const junctions = nodes.filter(n => n.type === 'junction');
    const reservoirs = nodes.filter(n => n.type === 'reservoir');
    const tanks = nodes.filter(n => n.type === 'tank');

    if (junctions.length > 0) {
        lines.push('[JUNCTIONS]');
        lines.push(';ID              Elevation    Demand       Pattern');
        junctions.forEach(n => {
            const props = n.properties || {};
            lines.push(`${pad(n.id)} ${pad(n.elevation)} ${pad(n.baseDemand)}                1   ;`);
        });
        lines.push('');
    }

    if (reservoirs.length > 0) {
        lines.push('[RESERVOIRS]');
        lines.push(';ID              Head         Pattern');
        reservoirs.forEach(n => {
            const props = n.properties || {};
            // For Reservoir, "Elevation" field often stores the Head
            lines.push(`${pad(n.id)} ${pad(props.head || n.elevation)}                ;`);
        });
        lines.push('');
    }

    if (tanks.length > 0) {
        lines.push('[TANKS]');
        lines.push(';ID              Elevation    InitLevel    MinLevel     MaxLevel     Diameter     MinVol       VolCurve');
        tanks.forEach(n => {
            const props = n.properties || {};
            lines.push(`${pad(n.id)} ${pad(n.elevation)} ${pad(props.initLevel)} ${pad(props.minLevel)} ${pad(props.maxLevel)} ${pad(props.diameter)} 0            ;`);
        });
        lines.push('');
    }

    // --- 5. LINKS ---
    const pipes = links.filter(l => l.type === 'pipe');
    const pumps = links.filter(l => l.type === 'pump');
    const valves = links.filter(l => l.type === 'valve');

    if (pipes.length > 0) {
        lines.push('[PIPES]');
        lines.push(';ID              Node1           Node2           Length       Diameter     Roughness    MinorLoss    Status');
        pipes.forEach(l => {
            const props = l.properties || {};
            lines.push(`${pad(l.id)} ${pad(l.sourceNodeId)} ${pad(l.targetNodeId)} ${pad(l.length)} ${pad(l.diameter)} ${pad(l.roughness)} 0            ${props.status || 'Open'}`);
        });
        lines.push('');
    }

    if (pumps.length > 0) {
        lines.push('[PUMPS]');
        lines.push(';ID              Node1           Node2           Parameters');
        pumps.forEach(l => {
            const props = l.properties || {};
            // Support Power or Head Curve
            const param = props.headCurve ? `HEAD ${props.headCurve}` : `POWER ${props.power || 50}`;
            lines.push(`${pad(l.id)} ${pad(l.sourceNodeId)} ${pad(l.targetNodeId)} ${param}`);
        });
        lines.push('');
    }

    if (valves.length > 0) {
        lines.push('[VALVES]');
        lines.push(';ID              Node1           Node2           Diameter     Type         Setting      MinorLoss');
        valves.forEach(l => {
            const props = l.properties || {};
            lines.push(`${pad(l.id)} ${pad(l.sourceNodeId)} ${pad(l.targetNodeId)} ${pad(l.diameter)} ${props.valveType || 'PRV'} ${props.setting || 0} 0`);
        });
        lines.push('');
    }

    // --- 6. COORDINATES (Optional for Simulation, but good for completeness) ---
    // Note: We need coordinates to be available in the 'nodes' array passed to this function.
    // If the DB query includes them, we can print them.
    if (nodes[0] && nodes[0].x !== undefined) {
        lines.push('[COORDINATES]');
        lines.push(';Node            X-Coord          Y-Coord');
        nodes.forEach(n => {
            lines.push(`${pad(n.id)} ${pad(n.x)} ${pad(n.y)}`);
        });
        lines.push('');
    }

    lines.push('[END]');
    return lines.join('\n');
}