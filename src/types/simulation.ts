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

export interface SimulationResults {
    nodes: Record<string, NodeResult>;
    links: Record<string, LinkResult>;
    timestamp: number;
    message?: string;
}

export type SimulationStatus = 'idle' | 'running' | 'completed' | 'error';