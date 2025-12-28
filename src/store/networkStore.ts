import { create } from "zustand";
import { Feature } from "ol";
import { FeatureType, NetworkControl, NetworkFeatureProperties, ProjectSettings, PumpCurve, TimePattern } from "@/types/network";
import { ParsedProjectData } from "@/lib/import/inpParser";
import { COMPONENT_TYPES } from "@/constants/networkComponents";
import GeoJSON from "ol/format/GeoJSON";

interface NetworkState {
    features: Map<string, Feature>;
    selectedFeature: Feature | null;
    selectedFeatureId: string | null;
    selectedFeatureIds: string[];
    nextIdCounter: Record<FeatureType, number>;

    // Tracking State
    hasUnsavedChanges: boolean;
    version: number;

    // Project Data
    settings: ProjectSettings;
    patterns: TimePattern[];
    curves: PumpCurve[];
    controls: NetworkControl[];

    // History
    past: Feature[][];
    future: Feature[][];

    // Tracking
    modifiedIds: Set<string>;
    deletedIds: Set<string>;

    // Actions
    markSaved: () => void;
    markUnSaved: () => void;
    markModified: (id: string | string[]) => void;

    setSelectedFeature: (feature: Feature | null) => void;
    addFeature: (feature: Feature) => void;
    addFeatures: (features: Feature[]) => void;
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
    loadProject: (data: ParsedProjectData, isUnsavedImport?: boolean) => void;

    setPatterns: (patterns: TimePattern[]) => void;
    setCurves: (curves: PumpCurve[]) => void;
    setControls: (controls: NetworkControl[]) => void;
    updateSettings: (settings: Partial<ProjectSettings>) => void;

    // History Actions
    snapshot: () => void;
    undo: () => Feature[] | null;
    redo: () => Feature[] | null;

    // Restore sim network
    setNetworkState: (featuresList: Feature[]) => void;
}

const DEFAULT_PATTERNS: TimePattern[] = [
    {
        id: "1",
        description: "Default Diurnal",
        multipliers: [0.5, 0.5, 0.6, 0.7, 0.9, 1.2, 1.5, 1.3, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.5, 0.6, 0.8, 1.1, 1.4, 1.2, 1.0, 0.8, 0.6]
    }
];

const DEFAULT_SETTINGS: ProjectSettings = {
    title: "Untitled",
    description: "",
    units: "GPM",
    headloss: "H-W",
    specificGravity: 1.0,
    viscosity: 1.0,
    trials: 40,
    accuracy: 0.001,
    demandMultiplier: 1.0,
    projection: "EPSG:3857"
};

export const useNetworkStore = create<NetworkState>((set, get) => ({
    features: new Map(),
    selectedFeatureId: null,
    selectedFeature: null,
    selectedFeatureIds: [],

    hasUnsavedChanges: false,

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

    modifiedIds: new Set(),
    deletedIds: new Set(),
    version: 0,

    // ---------------- Project ---------------- //

    loadProject: (data, isUnsavedImport = false) => {
        const featureMap = new Map<string, Feature>();

        const newCounters = { ...get().nextIdCounter };

        // 1. Load Features & Update Counters
        data.features.forEach(f => {
            const id = f.getId() as string;
            const type = f.get('type') as FeatureType;

            if (id) {
                f.set('id', id);
                if (['junction', 'tank', 'reservoir'].includes(type)) {
                    f.set('connectedLinks', []);
                }

                featureMap.set(id, f);

                // Only update counters for known component types
                if (type && newCounters[type] !== undefined) {
                    const match = id.match(/^[a-zA-Z]+-(\d+)$/);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (!isNaN(num)) {
                            if (num >= newCounters[type]) {
                                newCounters[type] = num + 1;
                            }
                        }
                    }
                }
            }
        });

        // 2. REBUILD TOPOLOGY (Critical Fix)
        // Iterate links to populate 'connectedLinks' on nodes
        featureMap.forEach(f => {
            const type = f.get('type');
            if (['pipe', 'pump', 'valve'].includes(type)) {
                const linkId = f.getId() as string;
                const startNodeId = f.get('startNodeId') || f.get('source');
                const endNodeId = f.get('endNodeId') || f.get('target');

                [startNodeId, endNodeId].forEach(nodeId => {
                    if (nodeId) {
                        const node = featureMap.get(nodeId);
                        if (node) {
                            const links = node.get('connectedLinks') || [];
                            if (!links.includes(linkId)) {
                                links.push(linkId);
                                node.set('connectedLinks', links);
                            }
                        }
                    }
                });
            }
        });

        // IF IMPORTING, MARK ALL AS MODIFIED
        const initialModified = isUnsavedImport ? new Set(featureMap.keys()) : new Set<string>();

        set({
            features: featureMap,
            settings: data.settings,
            patterns: data.settings.patterns ?? DEFAULT_PATTERNS,
            curves: data.settings.curves || [],
            controls: data.controls || [],

            past: [],
            future: [],
            selectedFeature: null,
            selectedFeatureId: null,
            selectedFeatureIds: [],
            nextIdCounter: newCounters,

            hasUnsavedChanges: isUnsavedImport,
            modifiedIds: initialModified,
            deletedIds: new Set(),
        });
    },

    updateSettings: (newSettings) => {
        set((state) => ({
            settings: { ...state.settings, ...newSettings },
            hasUnsavedChanges: true
        }));
    },

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

    // ---------------- Patterns ---------------- //

    setPatterns: (patterns) => set({ patterns, hasUnsavedChanges: true }),
    addPattern: (pattern) => set((state) => ({ patterns: [...state.patterns, pattern], hasUnsavedChanges: true })),

    updatePattern: (id, updated) => set((state) => ({
        patterns: state.patterns.map(p => p.id === id ? updated : p),
        hasUnsavedChanges: true
    })),

    deletePattern: (id) => set((state) => ({
        patterns: state.patterns.filter(p => p.id !== id),
        hasUnsavedChanges: true
    })),

    // ---------------- Curves ---------------- //

    setCurves: (curves) => set({ curves, hasUnsavedChanges: true }),
    addCurve: (curve) => set((state) => ({ curves: [...state.curves, curve], hasUnsavedChanges: true })),

    updateCurve: (id, updated) => set((state) => ({
        curves: state.curves.map(c => c.id === id ? updated : c),
        hasUnsavedChanges: true
    })),

    deleteCurve: (id) => set((state) => ({
        curves: state.curves.filter(c => c.id !== id),
        hasUnsavedChanges: true
    })),

    // ---------------- Controls ---------------- //

    setControls: (controls) => set({ controls, hasUnsavedChanges: true }),
    addControl: (control) => set((state) => ({ controls: [...state.controls, control], hasUnsavedChanges: true })),

    updateControl: (id, updated) => set((state) => ({
        controls: state.controls.map(c => c.id === id ? updated : c),
        hasUnsavedChanges: true
    })),

    deleteControl: (id) => set((state) => ({
        controls: state.controls.filter(c => c.id !== id),
        hasUnsavedChanges: true
    })),

    // ---------------- Features ---------------- //

    setSelectedFeature: (feature) => set({ selectedFeature: feature }),

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

    getFeaturesByType: (type) => Array.from(get().features.values()).filter((f) => f.get("type") === type),

    addFeature: (feature) => {
        const id = feature.getId() as string;
        if (id) {
            feature.set('id', id);
        }

        set((state) => {
            const newFeatures = new Map(state.features);
            newFeatures.set(id, feature);

            // TRACKING: Add to modified, ensure not in deleted
            const newModified = new Set(state.modifiedIds).add(id);
            const newDeleted = new Set(state.deletedIds);
            newDeleted.delete(id);

            return {
                features: newFeatures,
                hasUnsavedChanges: true,
                modifiedIds: newModified,
                deletedIds: newDeleted
            };
        });
    },

    addFeatures: (features) => {
        set((state) => {
            const newFeatures = new Map(state.features);
            const newModified = new Set(state.modifiedIds);
            const newDeleted = new Set(state.deletedIds);

            features.forEach(f => {
                const id = f.getId() as string;
                if (id) {
                    f.set('id', id);
                    newFeatures.set(id, f);
                    newModified.add(id);
                    newDeleted.delete(id);
                }
            });


            return {
                features: newFeatures,
                hasUnsavedChanges: true,
                modifiedIds: newModified,
                deletedIds: newDeleted
            };
        });
    },

    updateFeature: (id, properties) => {
        const feature = get().features.get(id);
        if (feature) {
            feature.setProperties({ ...feature.getProperties(), ...properties });

            feature.changed();

            set((state) => {
                const newFeatures = new Map(state.features);
                newFeatures.set(id, feature);
                const newModified = new Set(state.modifiedIds).add(id);
                return {
                    features: newFeatures,
                    hasUnsavedChanges: true,
                    modifiedIds: newModified,
                    version: state.version + 1
                };
            });
        }
    },

    updateFeatures: (updates) => {
        set((state) => {
            const newFeatures = new Map(state.features);
            const newModified = new Set(state.modifiedIds);
            let hasChanges = false;

            Object.entries(updates).forEach(([id, props]) => {
                const feature = newFeatures.get(id);
                if (feature) {
                    feature.setProperties({ ...feature.getProperties(), ...props });
                    newModified.add(id);
                    feature.changed();
                    hasChanges = true;
                }
            });

            return hasChanges ? { features: newFeatures, hasUnsavedChanges: true, modifiedIds: newModified, version: state.version + 1 } : {};
        });
    },

    clearFeatures: () => set({
        features: new Map(),
        past: [],
        future: [],
        settings: DEFAULT_SETTINGS,
        patterns: DEFAULT_PATTERNS,
        curves: [],
        controls: [],
        hasUnsavedChanges: false,
        modifiedIds: new Set(),
        deletedIds: new Set(),
        selectedFeature: null,
        selectedFeatureId: null,
        selectedFeatureIds: []
    }),

    removeFeature: (id) => {
        set((state) => {
            const newFeatures = new Map(state.features);
            newFeatures.delete(id);

            // TRACKING: Add to deleted, remove from modified (if it was new/unsaved)
            const newDeleted = new Set(state.deletedIds).add(id);
            const newModified = new Set(state.modifiedIds);
            newModified.delete(id); // Don't need to upsert if we are deleting it

            return {
                features: newFeatures,
                hasUnsavedChanges: true,
                deletedIds: newDeleted,
                modifiedIds: newModified
            };
        });
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
        // Topology updates count as modifications!
        get().markModified(nodeId);
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

    // ---------------- Actions ---------------- //

    markSaved: () => set({
        hasUnsavedChanges: false,
        modifiedIds: new Set(),
        deletedIds: new Set()
    }),

    markUnSaved: () => set({ hasUnsavedChanges: true }),

    markModified: (ids) => set((state) => {
        const newModified = new Set(state.modifiedIds);
        const idArray = Array.isArray(ids) ? ids : [ids];

        idArray.forEach(id => newModified.add(id));

        // Ensure we don't track deleted items as modified
        const newDeleted = new Set(state.deletedIds);
        idArray.forEach(id => newDeleted.delete(id));

        return { modifiedIds: newModified, hasUnsavedChanges: true, deletedIds: newDeleted };
    }),

    setNetworkState: (geoJSON) => {
        // 1. CONVERT Plain GeoJSON -> Real OpenLayers Features
        const reader = new GeoJSON();
        const restoredFeatures = reader.readFeatures(geoJSON);

        // 2. Rebuild the Map
        const newMap = new Map<string, Feature>();
        const newModified = new Set(get().modifiedIds);
        const newDeleted = new Set(get().deletedIds);

        restoredFeatures.forEach((f) => {
            const id = f.getId() as string;
            if (id) {
                newMap.set(id.toString(), f);
                newModified.add(id);
                newDeleted.delete(id);
            }
        });

        // 3. Update State
        set({
            features: newMap,
            hasUnsavedChanges: true,
            modifiedIds: newModified,
            deletedIds: newDeleted,
            selectedFeatureId: null,
            selectedFeature: null,
            selectedFeatureIds: []
        });

        console.log(`Restored ${newMap.size} features from GeoJSON.`);
    },

    // ---------------- History ---------------- //

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
            selectedFeatureId: null,
            selectedFeatureIds: [],
            hasUnsavedChanges: true
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
            selectedFeatureId: null,
            selectedFeatureIds: [],
            hasUnsavedChanges: true
        });

        return nextState;
    }
}));