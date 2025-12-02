export interface NodeResult {
    id: string;
    head: number;
    pressure: number;
    demand: number;
    quality?: number;
}

export interface LinkResult {
    id: string;
    flow: number;
    velocity: number;
    headloss: number;
    quality?: number;
    status: 'Open' | 'Closed';
}

// A single point in time (what the map renders)
export interface SimulationSnapshot {
    nodes: Record<string, NodeResult>;
    links: Record<string, LinkResult>;
    timestamp: number; // Real-world timestamp of when sim ran
    timeStep: number;  // Simulation seconds (e.g., 3600 for hour 1)
    message?: string;
}

// The full simulation data (what the server returns)
export interface SimulationHistory {
    timestamps: number[]; // Array of simulation times in seconds [0, 3600, 7200...]
    snapshots: SimulationSnapshot[]; // Array of results matching timestamps
    generatedAt: number;
}

export type SimulationStatus = 'idle' | 'running' | 'completed' | 'error';