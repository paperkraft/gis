import { create } from "zustand";
import { Feature } from "ol";
import { FeatureType, NetworkControl, NetworkFeatureProperties, ProjectSettings, PumpCurve, TimePattern } from "@/types/network";
import { ParsedProjectData } from "@/lib/import/inpParser";
import { COMPONENT_TYPES } from "@/constants/networkComponents";

interface NetworkState {
    features: Map<string, Feature>;
    selectedFeature: Feature | null;
    selectedFeatureId: string | null;
    selectedFeatureIds: string[];
    nextIdCounter: Record<FeatureType, number>;

    // Project Data
    settings: ProjectSettings;
    patterns: TimePattern[];
    curves: PumpCurve[];
    controls: NetworkControl[];

    // History
    past: Feature[][];
    future: Feature[][];

    // Actions
    setSelectedFeature: (feature: Feature | null) => void;
    addFeature: (feature: Feature) => void;
    removeFeature: (id: string) => void;
    updateFeature: (id: string, properties: Partial<NetworkFeatureProperties>) => void;
    updateFeatures: (updates: Record<string, Partial<NetworkFeatureProperties>>) => void;
    selectFeature: (id: string | null) => void;
    selectFeatures: (ids: string[]) => void;
    clearFeatures: () => void;
    getFeatureById: (id: string) => Feature | undefined;
    getFeaturesByType: (type: FeatureType) => Feature[];
    generateUniqueId: (type: FeatureType) => string;

    addPattern: (pattern: TimePattern) => void;
    updatePattern: (id: string, pattern: TimePattern) => void;
    deletePattern: (id: string) => void;

    addCurve: (curve: PumpCurve) => void;
    updateCurve: (id: string, curve: PumpCurve) => void;
    deleteCurve: (id: string) => void;

    addControl: (control: NetworkControl) => void;
    updateControl: (id: string, control: NetworkControl) => void;
    deleteControl: (id: string) => void;

    updateNodeConnections: (nodeId: string, linkId: string, action: "add" | "remove") => void;
    getConnectedLinks: (nodeId: string) => string[];
    findNodeById: (nodeId: string) => Feature | undefined;

    // Project Actions
    loadProject: (data: ParsedProjectData) => void;

    setPatterns: (patterns: TimePattern[]) => void;
    setCurves: (curves: PumpCurve[]) => void;
    setControls: (controls: NetworkControl[]) => void;
    updateSettings: (settings: Partial<ProjectSettings>) => void;

    // History Actions
    snapshot: () => void;
    undo: () => Feature[] | null;
    redo: () => Feature[] | null;
}

const DEFAULT_PATTERNS: TimePattern[] = [
    {
        id: "1",
        description: "Default Diurnal",
        multipliers: [0.5, 0.5, 0.6, 0.7, 0.9, 1.2, 1.5, 1.3, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.5, 0.6, 0.8, 1.1, 1.4, 1.2, 1.0, 0.8, 0.6]
    }
];

const DEFAULT_SETTINGS: ProjectSettings = {
    title: "Untitled Project",
    units: "GPM",
    headloss: "H-W",
    specificGravity: 1.0,
    viscosity: 1.0,
    trials: 40,
    accuracy: 0.001,
    demandMultiplier: 1.0,
};

export const useNetworkStore = create<NetworkState>((set, get) => ({
    features: new Map(),
    selectedFeatureId: null,
    selectedFeature: null,
    selectedFeatureIds: [],

    settings: DEFAULT_SETTINGS,
    patterns: DEFAULT_PATTERNS,
    curves: [],

    past: [],
    future: [],
    controls: [],

    nextIdCounter: {
        junction: 100,
        tank: 100,
        reservoir: 100,
        pump: 100,
        valve: 100,
        pipe: 100,
    },

    loadProject: (data) => {
        const featureMap = new Map<string, Feature>();

        // Reset counters to default base
        const newCounters = {
            junction: 100,
            tank: 100,
            reservoir: 100,
            pump: 100,
            valve: 100,
            pipe: 100,
        };

        data.features.forEach(f => {
            const id = f.getId() as string;
            const type = f.get('type') as FeatureType;

            if (id) {
                f.set('id', id);
                featureMap.set(id, f);

                // FIX: Scan ID to update counters
                // Matches "J-105", "P-100", "PIPE-500", etc.
                const match = id.match(/^[a-zA-Z]+-(\d+)$/);
                if (match && type && newCounters[type] !== undefined) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num)) {
                        // Ensure counter is always 1 higher than the highest existing ID
                        if (num >= newCounters[type]) {
                            newCounters[type] = num + 1;
                        }
                    }
                }
            }
        });

        console.log("Loaded Counters:", newCounters);

        set({
            features: featureMap,
            settings: data.settings,
            patterns: data.patterns.length > 0 ? data.patterns : DEFAULT_PATTERNS,
            curves: data.curves || [],
            past: [],
            future: [],
            controls: data.controls || [],
            selectedFeature: null,
            selectedFeatureId: null,
            nextIdCounter: newCounters, // Apply updated counters
        });
    },

    setPatterns: (patterns) => set({ patterns }),
    setCurves: (curves) => set({ curves }),
    setControls: (controls) => set({ controls }),

    updateSettings: (newSettings) => {
        set((state) => ({
            settings: { ...state.settings, ...newSettings }
        }));
    },

    addPattern: (pattern) => set((state) => ({ patterns: [...state.patterns, pattern] })),

    updatePattern: (id, updated) => set((state) => ({
        patterns: state.patterns.map(p => p.id === id ? updated : p)
    })),

    deletePattern: (id) => set((state) => ({
        patterns: state.patterns.filter(p => p.id !== id)
    })),

    addCurve: (curve) => set((state) => ({ curves: [...state.curves, curve] })),

    updateCurve: (id, updated) => set((state) => ({
        curves: state.curves.map(c => c.id === id ? updated : c)
    })),

    deleteCurve: (id) => set((state) => ({
        curves: state.curves.filter(c => c.id !== id)
    })),

    addControl: (control) => set((state) => ({
        controls: [...state.controls, control]
    })),

    updateControl: (id, updated) => set((state) => ({
        controls: state.controls.map(c => c.id === id ? updated : c)
    })),

    deleteControl: (id) => set((state) => ({
        controls: state.controls.filter(c => c.id !== id)
    })),

    clearFeatures: () => set({
        features: new Map(),
        past: [],
        future: [],
        settings: DEFAULT_SETTINGS,
        patterns: DEFAULT_PATTERNS,
        curves: [],
        controls: []
    }),

    setSelectedFeature: (feature) => set({ selectedFeature: feature }),

    addFeature: (feature) => {
        const id = feature.getId() as string;
        if (id) {
            feature.set('id', id);
        }

        set((state) => {
            const newFeatures = new Map(state.features);
            newFeatures.set(id, feature);
            return { features: newFeatures };
        });
    },

    removeFeature: (id) => {
        set((state) => {
            const newFeatures = new Map(state.features);
            newFeatures.delete(id);
            return { features: newFeatures };
        });
    },

    updateFeature: (id, properties) => {
        const feature = get().features.get(id);
        if (feature) {
            feature.setProperties({ ...feature.getProperties(), ...properties });
            set((state) => {
                const newFeatures = new Map(state.features);
                newFeatures.set(id, feature);
                return { features: newFeatures };
            });
        }
    },

    updateFeatures: (updates) => {
        set((state) => {
            const newFeatures = new Map(state.features);
            let hasChanges = false;

            Object.entries(updates).forEach(([id, props]) => {
                const feature = newFeatures.get(id);
                if (feature) {
                    feature.setProperties({ ...feature.getProperties(), ...props });
                    hasChanges = true;
                }
            });

            return hasChanges ? { features: newFeatures } : {};
        });
    },

    selectFeature: (id) => set((state) => ({
        selectedFeatureId: id,
        selectedFeatureIds: id ? [id] : [],
        selectedFeature: id === null ? null : state.selectedFeature
    })),

    selectFeatures: (ids) => {
        set({
            selectedFeatureIds: ids,
            selectedFeatureId: ids.length > 0 ? ids[ids.length - 1] : null,
            selectedFeature: ids.length === 0 ? null : get().selectedFeature
        });
    },

    getFeatureById: (id) => get().features.get(id),

    getFeaturesByType: (type) =>
        Array.from(get().features.values()).filter(
            (f) => f.get("type") === type
        ),

    generateUniqueId: (type) => {
        const counter = get().nextIdCounter[type];
        set((state) => ({
            nextIdCounter: {
                ...state.nextIdCounter,
                [type]: counter + 1,
            },
        }));

        const prefix = COMPONENT_TYPES[type]?.prefix || type.toUpperCase();
        return `${prefix}-${counter}`;
    },

    updateNodeConnections: (nodeId, linkId, action) => {
        const node = get().getFeatureById(nodeId);
        if (!node) return;

        const connections = node.get("connectedLinks") || [];
        if (action === "add" && !connections.includes(linkId)) {
            connections.push(linkId);
        } else if (action === "remove") {
            const index = connections.indexOf(linkId);
            if (index > -1) connections.splice(index, 1);
        }
        node.set("connectedLinks", connections);
    },

    getConnectedLinks: (nodeId) => {
        const node = get().getFeatureById(nodeId);
        return node?.get("connectedLinks") || [];
    },

    findNodeById: (nodeId) => {
        return Array.from(get().features.values()).find(
            (f) =>
                ["junction", "tank", "reservoir"].includes(f.get("type")) &&
                f.getId() === nodeId
        );
    },

    snapshot: () => {
        const currentFeatures = Array.from(get().features.values());
        const clonedFeatures = currentFeatures.map(f => {
            const clone = f.clone();
            clone.setId(f.getId());
            return clone;
        });

        set((state) => ({
            past: [...state.past, clonedFeatures],
            future: []
        }));
    },

    undo: () => {
        const { past, future, features } = get();
        if (past.length === 0) return null;

        const previousState = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        const currentSnapshot = Array.from(features.values()).map(f => {
            const c = f.clone();
            c.setId(f.getId());
            return c;
        });

        const newFeaturesMap = new Map();
        previousState.forEach(f => newFeaturesMap.set(f.getId(), f));

        set({
            past: newPast,
            future: [currentSnapshot, ...future],
            features: newFeaturesMap,
            selectedFeature: null,
            selectedFeatureId: null
        });

        return previousState;
    },

    redo: () => {
        const { past, future, features } = get();
        if (future.length === 0) return null;

        const nextState = future[0];
        const newFuture = future.slice(1);

        const currentSnapshot = Array.from(features.values()).map(f => {
            const c = f.clone();
            c.setId(f.getId());
            return c;
        });

        const newFeaturesMap = new Map();
        nextState.forEach(f => newFeaturesMap.set(f.getId(), f));

        set({
            past: [...past, currentSnapshot],
            future: newFuture,
            features: newFeaturesMap,
            selectedFeature: null,
            selectedFeatureId: null
        });

        return nextState;
    }
}));