const pad = (val: any, width: number = 16) => {
    let str = (val !== undefined && val !== null) ? String(val) : '0';
    if (str.length >= width) return str + ' ';
    return str.padEnd(width, ' ');
};

export function buildINP(nodeList: any, linkList: any, options: any): string {
    const lines: string[] = [];

    const nodes = Array.isArray(nodeList) ? nodeList : Object.values(nodeList);
    const links = Array.isArray(linkList) ? linkList : Object.values(linkList);

    // --- 1. HEADER ---
    lines.push('[TITLE]');
    lines.push('EPANET Web Simulation');
    lines.push('');

    // --- 2. NODES ---
    const junctions = nodes.filter(n => n.type === 'junction');
    const reservoirs = nodes.filter(n => n.type === 'reservoir');
    const tanks = nodes.filter(n => n.type === 'tank');

    if (junctions.length > 0) {
        lines.push('[JUNCTIONS]');
        lines.push(';ID              Elevation    Demand       Pattern');
        junctions.forEach(n => {
            lines.push(`${pad(n.id)} ${pad(n.elevation)} ${pad(n.diameter)}                1   ;`);
        });
        lines.push('');
    }

    if (reservoirs.length > 0) {
        lines.push('[RESERVOIRS]');
        lines.push(';ID              Head         Pattern');
        reservoirs.forEach(n => {
            lines.push(`${pad(n.id)} ${pad(n.head || n.elevation)}                ;`);
        });
        lines.push('');
    }

    if (tanks.length > 0) {
        lines.push('[TANKS]');
        lines.push(';ID              Elevation    InitLevel    MinLevel     MaxLevel     Diameter     MinVol       VolCurve');
        tanks.forEach(n => {
            lines.push(`${pad(n.id)} ${pad(n.elevation)} ${pad(n.initLevel ?? 5)} ${pad(n.minLevel)} ${pad(n.maxLevel ?? 20)} ${pad(n.diameter ?? 15)}  ;`);
        });
        lines.push('');
    }

    // --- 3. LINKS ---
    const pipes = links.filter(l => l.type === 'pipe');
    const pumps = links.filter(l => l.type === 'pump');
    const valves = links.filter(l => l.type === 'valve');

    if (pipes.length > 0) {
        lines.push('[PIPES]');
        lines.push(';ID              Node1           Node2           Length       Diameter     Roughness    MinorLoss    Status');
        pipes.forEach(l => {
            lines.push(`${pad(l.id)} ${pad(l.startNodeId)} ${pad(l.endNodeId)} ${pad(l.length)} ${pad(l.diameter)} ${pad(l.roughness)} ${pad('0')} ${pad(l.status || 'Open')}`);
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
            lines.push(`${pad(l.id)} ${pad(l.startNodeId)} ${pad(l.endNodeId)} ${pad(param)}`);
        });
        lines.push('');
    }

    if (valves.length > 0) {
        lines.push('[VALVES]');
        lines.push(';ID              Node1           Node2           Diameter     Type         Setting      MinorLoss');
        valves.forEach(l => {
            lines.push(`${pad(l.id)} ${pad(l.startNodeId)} ${pad(l.endNodeId)} ${pad(l.diameter)} ${pad(l.valveType || 'PRV')} ${pad(l.setting || 30)} 0`);
        });
        lines.push('');
    }

    // --- 4. COORDINATES  ---
    if (nodes[0] && nodes[0].x !== undefined) {
        lines.push('[COORDINATES]');
        lines.push(';Node            X-Coord          Y-Coord');
        nodes.forEach(n => {
            lines.push(`${pad(n.id)} ${pad(n.x)} ${pad(n.y)}`);
        });
        lines.push('');
    }

    lines.push('[OPTIONS]');
    lines.push(`Units              ${options?.flowUnits || 'LPS'}`);
    lines.push(`Headloss           ${options?.headLoss || 'H-W'}`);
    lines.push(`Specific Gravity   ${options?.specificGravity || 1.0}`);
    lines.push(`Viscosity          ${options?.viscosity || 1.0}`);
    lines.push(`Trials             ${options?.trials || 40}`);
    lines.push(`Accuracy           ${options?.accuracy || 0.001}`);
    lines.push('CHECKFREQ          2');
    lines.push('MAXCHECK           10');
    lines.push('DAMPLIMIT          0');
    lines.push('UNBALANCED         Continue 10');
    lines.push('PATTERN            1');
    lines.push('');

    lines.push('[TIMES]');
    lines.push(`Duration           ${options?.duration || 24}:00`);
    lines.push(`Hydraulic Timestep ${options?.timeStep || "1:00"}`);
    lines.push('Pattern Timestep   1:00');
    lines.push('Report Timestep    1:00');
    lines.push('Report Start       0:00');
    lines.push('Start Time         0:00');
    lines.push('Statistic          None');
    lines.push('');

    lines.push('[PATTERNS]');
    lines.push(';ID             Multipliers');
    lines.push('1               1.0   1.0   1.0   1.0   1.0   1.0');
    lines.push('                1.0   1.0   1.0   1.0   1.0   1.0');
    lines.push('                1.0   1.0   1.0   1.0   1.0   1.0');
    lines.push('                1.0   1.0   1.0   1.0   1.0   1.0');
    lines.push('');

    lines.push('[END]');
    return lines.join('\n');
}