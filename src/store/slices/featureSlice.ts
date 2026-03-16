import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import { StateCreator } from 'zustand';

import { FeatureType, NetworkFeatureProperties, NetworkFeatureData } from '@/types/network';

import { NetworkState } from '../networkStore';

export interface FeatureSlice {
    features: Map<string, NetworkFeatureData>;
    selectedFeature: NetworkFeatureData | null;
    selectedFeatureId: string | null;
    selectedFeatureIds: string[];
    nextIdCounter: Record<FeatureType, number>;

    // Tracking
    version: number;
    deletedIds: Set<string>;
    modifiedIds: Set<string>;

    // Actions
    addFeature: (feature: NetworkFeatureData) => void;
    updateFeature: (id: string, updates: Partial<NetworkFeatureProperties> & { geometry?: any }) => void;
    removeFeature: (id: string) => void;
    selectFeature: (id: string | null) => void;
    setSelectedFeature: (feature: NetworkFeatureData | null) => void;

    // multiple-features
    addFeatures: (features: NetworkFeatureData[]) => void;
    updateFeatures: (updates: Record<string, Partial<NetworkFeatureProperties> & { geometry?: any }>) => void;
    selectFeatures: (ids: string[]) => void;
    clearFeatures: () => void;

    // Stuff: Nodes and connections
    getFeatureById: (id: string) => NetworkFeatureData | undefined;
    getFeaturesByType: (type: FeatureType) => NetworkFeatureData[];
    getConnectedLinks: (nodeId: string) => string[];
    findNodeById: (nodeId: string) => NetworkFeatureData | undefined;
    updateNodeConnections: (nodeId: string, linkId: string, action: "add" | "remove") => void;

    // Tacking
    markModified: (id: string | string[]) => void;
}

export const createFeatureSlice: StateCreator<NetworkState, [], [], FeatureSlice> = (set, get) => ({
    features: new Map(),
    selectedFeatureId: null,
    selectedFeature: null,
    selectedFeatureIds: [],

    nextIdCounter: {
        junction: 1,
        tank: 1,
        reservoir: 1,
        pump: 1,
        valve: 1,
        pipe: 1,
        visual: 1,
    },

    // Tacking
    version: 0,
    deletedIds: new Set(),
    modifiedIds: new Set(),

    // Single Feature action
    addFeature: (feature) => set((state) => {
        const newFeatures = new Map(state.features);
        const id = feature.id;
        if (id) newFeatures.set(id, feature);

        // TRACKING: Add to modified, ensure not in deleted
        const newModified = new Set(state.modifiedIds).add(id);
        const newDeleted = new Set(state.deletedIds);
        newDeleted.delete(id);

        return {
            features: newFeatures,
            hasUnsavedChanges: true,
            modifiedIds: newModified,
            deletedIds: newDeleted,
            version: state.version + 1
        };
    }),

    updateFeature: (id, updates) => {
        const feature = get().features.get(id);
        if (!feature) return;

        const { geometry, ...rawProps } = updates;

        const updatedFeature = { ...feature, properties: { ...feature.properties } };

        // 1. Apply Geometry
        if (geometry) {
            if (geometry.getCoordinates) {
                updatedFeature.geometry = geometry.getCoordinates();
            } else {
                updatedFeature.geometry = geometry;
            }
        }

        // 2. Sanitize & Apply Properties
        const cleanProps = sanitizeProperties({ ...rawProps });

        if (Object.keys(cleanProps).length > 0) {
            updatedFeature.properties = {
                ...updatedFeature.properties,
                ...cleanProps
            } as NetworkFeatureProperties;
        }

        // C. Mark as Modified
        set((state) => {
            const newFeatures = new Map(state.features);
            newFeatures.set(id, updatedFeature);
            const newModified = new Set(state.modifiedIds).add(id);
            return {
                features: newFeatures,
                hasUnsavedChanges: true,
                modifiedIds: newModified,
                version: state.version + 1,
                ...(state.selectedFeatureId === id ? { selectedFeature: updatedFeature } : {})
            };
        });
    },

    removeFeature: (id) => set((state) => {
        const newFeatures = new Map(state.features);
        newFeatures.delete(id);

        // TRACKING: Add to deleted, remove from modified (if it was new/unsaved)
        const newDeleted = new Set(state.deletedIds).add(id);
        const newModified = new Set(state.modifiedIds);
        newModified.delete(id); // Don't need to upsert if we are deleting it

        return {
            features: newFeatures,
            hasUnsavedChanges: true,
            selectedFeatureId: state.selectedFeatureId === id ? null : state.selectedFeatureId,
            selectedFeature: state.selectedFeatureId === id ? null : state.selectedFeature,
            deletedIds: newDeleted,
            modifiedIds: newModified,
            version: state.version + 1
        };
    }),

    selectFeature: (id) => set((state) => ({
        selectedFeatureId: id,
        selectedFeature: id ? state.features.get(id) || null : null
    })),

    setSelectedFeature: (feature) => set({ selectedFeature: feature }),

    // Multiple Feature action

    addFeatures: (features) => {
        set((state) => {
            const newFeatures = new Map(state.features);
            const newModified = new Set(state.modifiedIds);
            const newDeleted = new Set(state.deletedIds);

            features.forEach(f => {
                const id = f.id;
                if (id) {
                    newFeatures.set(id, f);
                    newModified.add(id);
                    newDeleted.delete(id);
                }
            });

            return {
                features: newFeatures,
                hasUnsavedChanges: true,
                modifiedIds: newModified,
                deletedIds: newDeleted,
                version: state.version + 1
            };
        });
    },

    updateFeatures: (updatesMap) => {
        const modifiedIds = new Set(get().modifiedIds);
        let hasChanges = false;
        const newFeatures = new Map(get().features);

        Object.entries(updatesMap).forEach(([id, updates]) => {
            const feature = newFeatures.get(id);
            if (!feature) return;

            const { geometry, ...rawProps } = updates;
            const updatedFeature = { ...feature, properties: { ...feature.properties } };

            if (geometry) {
                if (geometry.getCoordinates) {
                    updatedFeature.geometry = geometry.getCoordinates();
                } else {
                    updatedFeature.geometry = geometry;
                }
                hasChanges = true;
            }

            const cleanProps = sanitizeProperties(rawProps);

            if (Object.keys(cleanProps).length > 0) {
                updatedFeature.properties = {
                    ...sanitizeProperties(updatedFeature.properties),
                    ...cleanProps
                } as NetworkFeatureProperties;
                hasChanges = true;
            }

            if (hasChanges) {
                newFeatures.set(id, updatedFeature);
                modifiedIds.add(id);
            }
        });

        if (hasChanges) {
            set((state) => ({
                features: newFeatures,
                hasUnsavedChanges: true,
                modifiedIds: modifiedIds,
                version: state.version + 1,
                ...(state.selectedFeatureId && newFeatures.has(state.selectedFeatureId) ? { selectedFeature: newFeatures.get(state.selectedFeatureId) } : {})
            }));
        }
    },

    selectFeatures: (ids) => {
        set({
            selectedFeatureIds: ids,
            selectedFeatureId: ids.length > 0 ? ids[ids[ids.length - 1] ? ids.length - 1 : 0] : null,
            selectedFeature: ids.length > 0 ? get().features.get(ids[ids.length - 1]) || null : null
        });
    },

    clearFeatures: () => set({
        features: new Map(),
        past: [],
        future: [],
        hasUnsavedChanges: false,
        modifiedIds: new Set(),
        deletedIds: new Set(),
        selectedFeature: null,
        selectedFeatureId: null,
        selectedFeatureIds: [],
        version: 0
    }),

    // Stuff: Nodes and connections

    getFeatureById: (id) => get().features.get(id),

    getFeaturesByType: (type) => Array.from(get().features.values()).filter((f) => f.type === type),

    getConnectedLinks: (nodeId) => {
        const node = get().getFeatureById(nodeId);
        return node?.properties.connectedLinks || [];
    },

    findNodeById: (nodeId) => {
        return Array.from(get().features.values()).find((f) =>
            ["junction", "tank", "reservoir"].includes(f.type) &&
            f.id === nodeId
        );
    },

    updateNodeConnections: (nodeId, linkId, action) => {
        set((state) => {
            const node = state.features.get(nodeId);
            if (!node) return {};

            const props = node.properties;
            let links = props.connectedLinks || [];

            if (action === 'add') {
                if (!links.includes(linkId)) links = [...links, linkId];
            } else if (action === 'remove') {
                links = links.filter((id: string) => id !== linkId);
            }

            const newFeatures = new Map(state.features);
            newFeatures.set(nodeId, {
                ...node,
                properties: {
                    ...node.properties,
                    connectedLinks: links
                }
            });

            // 2. Mark as Modified so it gets Saved
            const newModified = new Set(state.modifiedIds);
            newModified.add(nodeId);

            return {
                features: newFeatures,
                hasUnsavedChanges: true, // Trigger "Unsaved Changes" UI
                modifiedIds: newModified,
                version: state.version + 1,
                ...(state.selectedFeatureId === nodeId ? { selectedFeature: newFeatures.get(nodeId) } : {})
            };
        });
    },

    // Modified
    markModified: (ids) => set((state) => {

        const idArray = Array.isArray(ids) ? ids : [ids];
        const needsUpdate = idArray.some(id => !state.modifiedIds.has(id));

        if (!needsUpdate) return {};

        const newModified = new Set(state.modifiedIds);
        const newDeleted = new Set(state.deletedIds);

        idArray.forEach(id => {
            newModified.add(id);
            newDeleted.delete(id);
        });

        return {
            modifiedIds: newModified,
            hasUnsavedChanges: true,
            deletedIds: newDeleted,
            version: state.version + 1
        };
    }),

});


// Helper: Scrub garbage coordinate keys ("0", "1", "2"...)
const sanitizeProperties = (props: Record<string, any>) => {
    if (!props) return {};
    const clean = { ...props };
    delete clean.geometry;
    return clean;
};

