import { create } from 'zustand';
import { useNetworkStore } from './networkStore';
import { buildINP } from '@/lib/epanet/inpBuilder';
import { toast } from 'sonner';

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
    history: SimulationHistory | null;
    results: SimulationSnapshot | null;
    currentTimeIndex: number;

    error: string | null;
    warnings: string[];
    report: string | null;

    isPlaying: boolean;
    isSimulating: boolean;

    runSimulation: () => Promise<boolean>;
    setTimeIndex: (index: number) => void;
    togglePlayback: () => void;
    nextStep: () => void;
    resetSimulation: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
    status: 'idle',
    history: null,
    results: null,
    currentTimeIndex: 0,

    error: null,
    warnings: [],
    report: null,

    isPlaying: false,
    isSimulating: false,

    runSimulation: async () => {
        set({ status: 'running', isSimulating: true, error: null });

        try {
            // 1. Get Current Project State from Network Store
            const { features, patterns, curves, controls, settings } = useNetworkStore.getState();

            console.log("curves", curves);
            console.log("patterns", patterns);
            console.log("controls", controls);

            // 2. Build INP from LIVE data
            const inpData = buildINP(
                Array.from(features.values()),
                patterns,
                curves,
                controls,
                settings
            );

            // 3. Initialize Worker
            const worker = new Worker(new URL('../lib/workers/simulation.worker.ts', import.meta.url));

            // 4. Promisify the Worker interaction
            const result: any = await new Promise((resolve, reject) => {
                worker.onmessage = (e) => {
                    resolve(e.data);
                    worker.terminate();
                };
                worker.onerror = (e) => {
                    reject(new Error(e.message));
                    worker.terminate();
                };

                // Start Work
                worker.postMessage({ inpData });
            });

            if (!result.success) {
                toast.error(result.error);
                set({
                    status: 'error',
                    isSimulating: false,
                    error: result.error || "Simulation failed"
                });
                return false
                // throw new Error(result.error);
            }

            // 5. Success
            const data = result.data;
            const lastIndex = data.snapshots.length - 1;

            set({
                status: 'completed',
                isSimulating: false,
                history: data,
                results: data.snapshots[lastIndex],
                currentTimeIndex: lastIndex,

                warnings: result.warnings || [],
                report: result.report || null
            });
            return true;

        } catch (err: any) {
            console.error("Simulation Error:", err);
            set({
                status: 'error',
                isSimulating: false,
                error: err.message || "Simulation failed"
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
        set({
            status: 'idle',
            history: null,
            results: null,
            error: null,
            warnings: [],
            report: null,
            isPlaying: false
        });
    }
}));