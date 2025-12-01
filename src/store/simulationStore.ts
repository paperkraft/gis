import { create } from 'zustand';
import { Feature } from 'ol';
import { SimulationResults, SimulationStatus } from '@/types/simulation';
import { generateINP } from '@/lib/export/inpWriter';

interface SimulationState {
    status: SimulationStatus;
    results: SimulationResults | null;
    error: string | null;

    // Actions
    runSimulation: (features: Feature[]) => Promise<void>;
    resetSimulation: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
    status: 'idle',
    results: null,
    error: null,

    runSimulation: async (features) => {
        set({ status: 'running', error: null, results: null });

        try {
            if (features.length === 0) {
                throw new Error("Network is empty. Cannot run simulation.");
            }

            // Call the solver
            // const results = await MockSolver.solve(features);

            // 1. Generate INP String on Client
            const inpContent = generateINP(features);

            // 2. Call Next.js API Route
            const response = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inp: inpContent }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Server simulation failed");
            }

            // 3. Receive Results
            const data = await response.json();

            set({
                status: 'completed',
                results: {
                    nodes: data.nodes,
                    links: data.links,
                    timestamp: data.timestamp,
                    message: "Simulation completed (Server-Side)"
                }
            });
        } catch (err) {
            set({
                status: 'error',
                error: err instanceof Error ? err.message : "Unknown simulation error"
            });
        }
    },

    resetSimulation: () => {
        set({ status: 'idle', results: null, error: null });
    }
}));