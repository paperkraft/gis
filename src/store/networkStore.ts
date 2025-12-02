import { create } from "zustand";
import { Feature } from "ol";
import { FeatureType, NetworkFeatureProperties, ProjectSettings, PumpCurve, TimePattern } from "@/types/network";

interface NetworkState {
    features: Map<string, Feature>;
    settings: ProjectSettings;
    selectedFeature: Feature | null;
    selectedFeatureId: string | null;
    selectedFeatureIds: string[];
    nextIdCounter: Record<FeatureType, number>;

    // Data Tables
    patterns: TimePattern[];
    curves: PumpCurve[];

    // History
    past: Feature[][];
    future: Feature[][];

    // Actions
    setSelectedFeature: (feature: Feature | null) => void;
    updateSettings: (settings: Partial<ProjectSettings>) => void;
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

    updateNodeConnections: (nodeId: string, linkId: string, action: "add" | "remove") => void;
    getConnectedLinks: (nodeId: string) => string[];
    findNodeById: (nodeId: string) => Feature | undefined;

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
    settings: DEFAULT_SETTINGS,
    selectedFeatureId: null,
    selectedFeature: null,
    selectedFeatureIds: [],

    patterns: DEFAULT_PATTERNS,
    curves: [],

    past: [],
    future: [],

    nextIdCounter: {
        junction: 100,
        tank: 100,
        reservoir: 100,
        pump: 100,
        valve: 100,
        pipe: 100,
    },

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

    clearFeatures: () => set({
        features: new Map(),
        past: [],
        future: [],
        settings: DEFAULT_SETTINGS,
        patterns: DEFAULT_PATTERNS,
        curves: []
    }),

    setSelectedFeature: (feature) => set({ selectedFeature: feature }),

    addFeature: (feature) => {
        const id = feature.getId() as string;

        // FIX: Explicitly set 'id' in properties to match TypeScript interface and ensure availability
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

    // NEW: Batch update function
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
        return `${type.toUpperCase()}-${counter}`;
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

    // --- History Implementation ---

    snapshot: () => {
        const currentFeatures = Array.from(get().features.values());
        // Clone features to preserve their state at this moment
        const clonedFeatures = currentFeatures.map(f => {
            const clone = f.clone();
            clone.setId(f.getId()); // Clone doesn't always copy ID automatically
            return clone;
        });

        set((state) => ({
            past: [...state.past, clonedFeatures],
            future: [] // Clear future on new action
        }));

        console.log("📸 Snapshot taken. History size:", get().past.length);
    },

    undo: () => {
        const { past, future, features } = get();
        if (past.length === 0) return null;

        const previousState = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        // Save current state to future
        const currentSnapshot = Array.from(features.values()).map(f => {
            const c = f.clone();
            c.setId(f.getId());
            return c;
        });

        // Rebuild map
        const newFeaturesMap = new Map();
        previousState.forEach(f => newFeaturesMap.set(f.getId(), f));

        set({
            past: newPast,
            future: [currentSnapshot, ...future],
            features: newFeaturesMap,
            selectedFeature: null, // Clear selection to avoid ghost references
            selectedFeatureId: null
        });

        return previousState;
    },

    redo: () => {
        const { past, future, features } = get();
        if (future.length === 0) return null;

        const nextState = future[0];
        const newFuture = future.slice(1);

        // Save current to past
        const currentSnapshot = Array.from(features.values()).map(f => {
            const c = f.clone();
            c.setId(f.getId());
            return c;
        });

        // Rebuild map
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