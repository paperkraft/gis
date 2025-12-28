import { create } from 'zustand';
import { SimulationHistory } from './simulationStore';
import { Feature } from 'ol';
import GeoJSON from 'ol/format/GeoJSON';

export interface Scenario {
    id: string;
    name: string;
    timestamp: number;
    results: SimulationHistory;
    networkSnapshot: GeoJSON
    isVisible: boolean;
    color: string;
}

interface ScenarioState {
    scenarios: Scenario[];
    // addScenario: (name: string, data: SimulationHistory) => void;
    addScenario: (name: string, results: SimulationHistory, features: Feature[]) => void;
    removeScenario: (id: string) => void;
    toggleVisibility: (id: string) => void;
    clearScenarios: () => void;
}

const COLORS = ["#ef4444", "#8b5cf6", "#f59e0b", "#10b981"]; // Red, Purple, Amber, Green

export const useScenarioStore = create<ScenarioState>((set) => ({
    scenarios: [],

    addScenario: (name, results, features) => set((state) => {
        const id = Date.now().toString();
        const color = COLORS[state.scenarios.length % COLORS.length];

        // Deep copy network data to prevent reference issues
        const writer = new GeoJSON();
        const geoJSON = writer.writeFeaturesObject(features);

        return {
            scenarios: [
                ...state.scenarios,
                { id, name, timestamp: Date.now(), results, networkSnapshot: geoJSON, isVisible: true, color }
            ]
        };
    }),

    removeScenario: (id) => set((state) => ({
        scenarios: state.scenarios.filter(s => s.id !== id)
    })),

    toggleVisibility: (id) => set((state) => ({
        scenarios: state.scenarios.map(s =>
            s.id === id ? { ...s, isVisible: !s.isVisible } : s
        )
    })),

    clearScenarios: () => set({ scenarios: [] })
}));