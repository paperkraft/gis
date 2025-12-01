import { create } from "zustand";
import { Feature } from "ol";
import { FeatureType, NetworkFeatureProperties } from "@/types/network";

interface NetworkState {
    features: Map<string, Feature>;
    selectedFeature: Feature | null;
    selectedFeatureId: string | null;
    selectedFeatureIds: string[];
    nextIdCounter: Record<FeatureType, number>;

    // History
    past: Feature[][];
    future: Feature[][];

    // Actions
    setSelectedFeature: (feature: Feature | null) => void;
    addFeature: (feature: Feature) => void;
    removeFeature: (id: string) => void;
    updateFeature: (id: string, properties: Partial<NetworkFeatureProperties>) => void;
    selectFeature: (id: string | null) => void;
    selectFeatures: (ids: string[]) => void;
    clearFeatures: () => void;
    getFeatureById: (id: string) => Feature | undefined;
    getFeaturesByType: (type: FeatureType) => Feature[];
    generateUniqueId: (type: FeatureType) => string;

    updateNodeConnections: (nodeId: string, linkId: string, action: "add" | "remove") => void;
    getConnectedLinks: (nodeId: string) => string[];
    findNodeById: (nodeId: string) => Feature | undefined;

    // History Actions
    snapshot: () => void;
    undo: () => Feature[] | null;
    redo: () => Feature[] | null;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
    features: new Map(),
    selectedFeatureId: null,
    selectedFeature: null,
    selectedFeatureIds: [],

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

    clearFeatures: () => set({ features: new Map() }),

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