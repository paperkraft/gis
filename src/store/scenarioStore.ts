import { create } from 'zustand';
import { SimulationHistory } from './simulationStore';

export interface Scenario {
    id: string;
    name: string;
    timestamp: number;
    data: SimulationHistory; 
    // Ideally we would also save 'nodes' and 'links' here to restore the physical model later
    // but for now, we just save results for comparison.
    isVisible: boolean; // Toggle for graph visibility
    color: string;      // Color for the graph line
}

interface ScenarioState {
    scenarios: Scenario[];
    addScenario: (name: string, data: SimulationHistory) => void;
    removeScenario: (id: string) => void;
    toggleVisibility: (id: string) => void;
    clearScenarios: () => void;
}

const COLORS = ["#ef4444", "#8b5cf6", "#f59e0b", "#10b981"]; // Red, Purple, Amber, Green

export const useScenarioStore = create<ScenarioState>((set) => ({
    scenarios: [],
    
    addScenario: (name, data) => set((state) => {
        const id = Date.now().toString();
        // Cycle through colors based on count
        const color = COLORS[state.scenarios.length % COLORS.length]; 
        
        return {
            scenarios: [
                ...state.scenarios, 
                { id, name, timestamp: Date.now(), data, isVisible: true, color }
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