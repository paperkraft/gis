import { create } from 'zustand';
import { SimulationHistory } from './simulationStore';
import { Feature } from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import { FeatureType } from '@/types/network';

export interface Scenario {
    id: string;
    name: string;
    timestamp: number;
    results: SimulationHistory;

    snapshot: {
        geoJSON: GeoJSON | any;
        counters: Record<FeatureType, number>;
        // patterns: TimePattern[];
        // curves: PumpCurve[];
        // controls: NetworkControl[];
        // settings: ProjectSettings;
    };

    isVisible: boolean;
    color: string;
}

interface ScenarioState {
    scenarios: Scenario[];

    addScenario: (
        name: string,
        results: SimulationHistory,
        features: Feature[],
        counters: Record<FeatureType, number>,
        // patterns: TimePattern[],
        // curves: PumpCurve[],
        // controls: NetworkControl[],
        // settings: ProjectSettings
    ) => void;

    removeScenario: (id: string) => void;
    toggleVisibility: (id: string) => void;
    clearScenarios: () => void;
}

const COLORS = ["#ef4444", "#8b5cf6", "#f59e0b", "#10b981"]; // Red, Purple, Amber, Green

export const useScenarioStore = create<ScenarioState>((set) => ({
    scenarios: [],

    addScenario: (name, results, features, counters) => set((state) => {
        const id = Date.now().toString();
        const color = COLORS[state.scenarios.length % COLORS.length];

        // 1. Serialize Features
        const writer = new GeoJSON();
        const geoJSON = writer.writeFeaturesObject(features);

        // 2. Deep Copy Logic (Critical to prevent reference mutation)
        const snapshot = {
            geoJSON,
            counters: JSON.parse(JSON.stringify(counters)),
            // patterns: JSON.parse(JSON.stringify(patterns)),
            // curves: JSON.parse(JSON.stringify(curves)),
            // controls: JSON.parse(JSON.stringify(controls)),
            // settings: JSON.parse(JSON.stringify(settings))
        };

        return {
            scenarios: [
                ...state.scenarios,
                { id, name, timestamp: Date.now(), results, snapshot, isVisible: true, color }
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