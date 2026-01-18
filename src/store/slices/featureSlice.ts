import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import { StateCreator } from 'zustand';

import { FeatureType, NetworkFeatureProperties } from '@/types/network';

import { NetworkState } from '../networkStore';

export interface FeatureSlice {
    features: Map<string, Feature>;
    selectedFeature: Feature | null;
    selectedFeatureId: string | null;
    selectedFeatureIds: string[];
    nextIdCounter: Record<FeatureType, number>;

    // Tracking
    version: number;
    deletedIds: Set<string>;
    modifiedIds: Set<string>;

    // Actions
    addFeature: (feature: Feature) => void;
    updateFeature: (id: string, updates: Partial<NetworkFeatureProperties>) => void;
    removeFeature: (id: string) => void;
    selectFeature: (id: string | null) => void;
    setSelectedFeature: (feature: Feature | null) => void;

    // multiple-features
    addFeatures: (features: Feature[]) => void;
    updateFeatures: (updates: Record<string, Partial<NetworkFeatureProperties>>) => void;
    selectFeatures: (ids: string[]) => void;
    clearFeatures: () => void;

    // Stuff: Nodes and connections
    getFeatureById: (id: string) => Feature | undefined;
    getFeaturesByType: (type: FeatureType) => Feature[];
    getConnectedLinks: (nodeId: string) => string[];
    findNodeById: (nodeId: string) => Feature | undefined;
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
    },

    // Tacking
    version: 0,
    deletedIds: new Set(),
    modifiedIds: new Set(),

    // Single Feature action
    addFeature: (feature) => set((state) => {
        const newFeatures = new Map(state.features);
        const id = feature.getId() as string;
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

        // 1. Apply Geometry
        if (geometry) applyGeometryUpdate(feature, geometry);

        // 2. Sanitize & Apply Properties
        const cleanProps = sanitizeProperties(rawProps);

        if (Object.keys(cleanProps).length > 0) {
            const currentProps = feature.getProperties();
            // Sanitize current props too (in case DB is already dirty)
            const safeCurrent = sanitizeProperties(currentProps);

            feature.setProperties({
                ...safeCurrent,
                ...cleanProps
            });
        }

        feature.changed(); // Trigger OpenLayers redraw

        // C. Mark as Modified
        set((state) => {
            const newModified = new Set(state.modifiedIds).add(id);
            return {
                hasUnsavedChanges: true,
                modifiedIds: newModified,
                version: state.version + 1
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
                deletedIds: newDeleted,
                version: state.version + 1
            };
        });
    },

    updateFeatures: (updatesMap) => {
        const modifiedIds = new Set(get().modifiedIds);
        let hasChanges = false;

        Object.entries(updatesMap).forEach(([id, updates]) => {
            const feature = get().features.get(id);
            if (!feature) return;

            const { geometry, ...rawProps } = updates;

            if (geometry) {
                applyGeometryUpdate(feature, geometry);
                hasChanges = true;
            }

            const cleanProps = sanitizeProperties(rawProps);

            if (Object.keys(cleanProps).length > 0) {
                const currentProps = feature.getProperties();
                const safeCurrent = sanitizeProperties(currentProps);

                feature.setProperties({
                    ...safeCurrent,
                    ...cleanProps
                });
                hasChanges = true;
            }

            feature.changed();
            modifiedIds.add(id);
        });

        if (hasChanges) {
            set((state) => ({
                hasUnsavedChanges: true,
                modifiedIds: modifiedIds,
                version: state.version + 1
            }));
        }
    },

    selectFeatures: (ids) => {
        set({
            selectedFeatureIds: ids,
            selectedFeatureId: ids.length > 0 ? ids[ids.length - 1] : null,
            selectedFeature: ids.length === 0 ? null : get().selectedFeature
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

    getFeaturesByType: (type) => Array.from(get().features.values()).filter((f) => f.get("type") === type),

    getConnectedLinks: (nodeId) => {
        const node = get().getFeatureById(nodeId);
        return node?.get("connectedLinks") || [];
    },

    findNodeById: (nodeId) => {
        return Array.from(get().features.values()).find((f) =>
            ["junction", "tank", "reservoir"].includes(f.get("type")) &&
            f.getId() === nodeId
        );
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
    const clean = { ...props };

    // Remove "geometry" if it snuck in
    delete clean.geometry;

    // Remove numeric keys that result from array spreading
    // e.g. { "0": [x,y], "1": [x,y] }
    Object.keys(clean).forEach(key => {
        // Check if key is a number (e.g. "0", "15")
        if (!isNaN(Number(key))) {
            delete clean[key];
        }
    });

    return clean;
};

// Helper to safely apply geometry updates
const applyGeometryUpdate = (feature: Feature, geometryData: any) => {
    if (!geometryData) return;

    // 1. Handle Array Updates (from Serializer/Loader/Tools)
    if (Array.isArray(geometryData)) {
        const currentType = feature.getGeometry()?.getType();

        if (currentType === 'LineString') {
            feature.setGeometry(new LineString(geometryData));
        } else if (currentType === 'Point') {
            feature.setGeometry(new Point(geometryData as number[]));
        }
    }
    // 2. Handle Raw Geometry Objects (Edge case)
    else if (typeof geometryData === 'object' && geometryData.getCoordinates) {
        feature.setGeometry(geometryData);
    }
};