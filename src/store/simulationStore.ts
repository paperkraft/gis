import { create } from 'zustand';
import { Feature } from 'ol';
import { SimulationSnapshot, SimulationHistory, SimulationStatus } from '@/types/simulation';
import { generateINP } from '@/lib/export/inpWriter';

interface SimulationState {
    status: SimulationStatus;
    history: SimulationHistory | null;
    results: SimulationSnapshot | null;
    currentTimeIndex: number;
    error: string | null;
    isPlaying: boolean;

    runSimulation: (features: Feature[]) => Promise<void>;
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

    runSimulation: async (features) => {
        set({ status: 'running', error: null, history: null, results: null });

        try {
            if (features.length === 0) throw new Error("Network is empty.");

            const inpContent = generateINP(features);

            const response = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inp: inpContent }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.details || errData.error || "Server simulation failed");
            }

            const data: SimulationHistory = await response.json();

            set({
                status: 'completed',
                history: data,
                currentTimeIndex: 0,
                results: data.snapshots[0] || null,
            });

        } catch (err) {
            console.error(err);
            set({
                status: 'error',
                error: err instanceof Error ? err.message : "Simulation error"
            });
        }
    },

    setTimeIndex: (index) => {
        const { history } = get();
        // if (!history || !history.snapshots[index]) return;
        if (!history || index < 0 || index >= history.timestamps.length) return;
        set({ currentTimeIndex: index, results: history.snapshots[index] });
    },

    togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

    nextStep: () => {
        const { history, currentTimeIndex, isPlaying } = get();
        if (!history || !isPlaying) return;
        let nextIndex = currentTimeIndex + 1;
        if (nextIndex >= history.snapshots.length) nextIndex = 0;
        set({ currentTimeIndex: nextIndex, results: history.snapshots[nextIndex] });
    },

    resetSimulation: () => {
        set({ status: 'idle', history: null, results: null, error: null, isPlaying: false });
    }
}));