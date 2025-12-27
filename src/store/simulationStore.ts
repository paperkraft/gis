import { create } from 'zustand';

// --- Types ---
export type SimulationStatus = 'idle' | 'running' | 'completed' | 'error';

export interface SimulationSnapshot {
    time: number;
    nodes: Record<string, { pressure: number; demand: number; head: number }>;
    links: Record<string, { flow: number; velocity: number; headloss: number; status: string }>;
}

export interface SimulationHistory {
    timestamps: number[];
    snapshots: SimulationSnapshot[];
    summary: { nodeCount: number; linkCount: number; duration: number };
}

interface SimulationState {
    status: SimulationStatus;
    history: SimulationHistory | null;    // Holds ALL time steps
    results: SimulationSnapshot | null;   // Holds CURRENT time step data
    currentTimeIndex: number;
    error: string | null;
    isPlaying: boolean;
    isSimulating: boolean;

    runSimulation: (networkData: any) => Promise<boolean>; // Changed to return boolean for UI feedback
    setTimeIndex: (index: number) => void;
    togglePlayback: () => void;
    resetSimulation: () => void;
    nextStep: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
    status: 'idle',
    history: null,
    results: null,
    currentTimeIndex: 0,
    error: null,
    isPlaying: false,
    isSimulating: false,

    runSimulation: async (networkData) => {
        set({ status: 'running', isSimulating: true, error: null, history: null, results: null });

        try {
            // Using the new API route that accepts JSON body
            const response = await fetch('/api/simulation/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(networkData),
            });

            const json = await response.json();

            if (!response.ok || !json.success) {
                throw new Error(json.error || "Simulation failed");
            }

            const data: SimulationHistory = json.data;
            const lastIndex = data.snapshots.length - 1;

            set({
                status: 'completed',
                isSimulating: false,
                history: data,
                results: data.snapshots[lastIndex], // Default to last step
                currentTimeIndex: lastIndex,
            });
            return true;

        } catch (err: any) {
            console.error(err);
            set({
                status: 'error',
                isSimulating: false,
                error: err.message || "Simulation error"
            });
            return false;
        }
    },

    setTimeIndex: (index) => {
        const { history } = get();
        if (!history || index < 0 || index >= history.timestamps.length) return;
        set({ currentTimeIndex: index, results: history.snapshots[index] });
    },

    togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

    nextStep: () => {
        const { history, currentTimeIndex } = get();
        if (!history) return;
        let nextIndex = currentTimeIndex + 1;
        if (nextIndex >= history.snapshots.length) nextIndex = 0;
        set({ currentTimeIndex: nextIndex, results: history.snapshots[nextIndex] });
    },

    resetSimulation: () => {
        set({ status: 'idle', history: null, results: null, error: null, isPlaying: false });
    }
}));