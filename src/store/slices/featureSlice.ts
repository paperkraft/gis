import { Feature } from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import { StateCreator } from 'zustand';

import { FeatureType, NetworkFeatureProperties } from '@/types/network';

import { NetworkState } from '../networkStore';
import { useMapStore } from '../mapStore';
import { LineString, Point } from 'ol/geom';

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
        let feature = get().features.get(id);

        // Safety: Rescue logic
        if (feature && !(feature instanceof Feature)) {
            const source = useMapStore.getState().vectorSource;
            feature = source?.getFeatureById(id) as Feature;
        }

        if (feature) {
            const { geometry, ...propUpdates } = updates;

            if (geometry) {
                if (Array.isArray(geometry)) {
                    const type = feature.getGeometry()?.getType();

                    if (type === 'LineString') {
                        feature.setGeometry(new LineString(geometry as any[]));
                    } else if (type === 'Point') {
                        feature.setGeometry(new Point(geometry as number[]));
                    }
                }
            }

            // Handle Properties (Exclude geometry)
            if (Object.keys(propUpdates).length > 0) {
                const oldProps = feature.getProperties();
                delete oldProps.geometry; // Don't save array to props
                feature.setProperties({ ...oldProps, ...propUpdates });
            }

            feature.changed();

            set((state) => {
                const newModified = new Set(state.modifiedIds).add(id);
                return {
                    hasUnsavedChanges: true,
                    modifiedIds: newModified,
                    version: state.version + 1
                };
            });
        }

        // if (feature) {
        //     const oldProps = feature.getProperties();
        //     feature.setProperties({ ...oldProps, ...updates });
        //     feature.changed(); // Trigger OL redraw

        //     // Mutate tracking only, keep Map reference
        //     set((state) => {
        //         // const newFeatures = new Map(state.features);
        //         // newFeatures.set(id, feature);
        //         const newModified = new Set(state.modifiedIds).add(id);

        //         return {
        //             // features: newFeatures,
        //             hasUnsavedChanges: true,
        //             modifiedIds: newModified,
        //             version: state.version + 1
        //         }
        //     });
        // }
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

    updateFeatures: (updates) => {
        set((state) => {
            // const newFeatures = new Map(state.features);
            const newModified = new Set(state.modifiedIds);
            let hasChanges = false;

            const source = useMapStore.getState().vectorSource;

            Object.entries(updates).forEach(([id, props]) => {
                let feature = state.features.get(id);

                if (feature && !(feature instanceof Feature)) {
                    feature = source?.getFeatureById(id) as Feature;
                }

                if (feature) {
                    const { geometry, ...otherProps } = props;

                    // 1. Handle Geometry Class Update
                    if (geometry && Array.isArray(geometry)) {
                        if (Array.isArray(geometry)) {
                            const type = feature.getGeometry()?.getType();

                            if (type === 'LineString') {
                                // Re-create the Class Instance
                                feature.setGeometry(new LineString(geometry as any[]));
                            } else if (type === 'Point') {
                                feature.setGeometry(new Point(geometry as number[]));
                            }
                        }
                    }

                    // 2. Handle Properties (CLEANLY)
                    if (Object.keys(otherProps).length > 0) {
                        const currentProps = feature.getProperties();

                        // CRITICAL: Ensure we don't merge 'geometry' into the props bag
                        delete currentProps.geometry;

                        feature.setProperties({ ...currentProps, ...otherProps });
                    }

                    feature.changed(); // Force Redraw
                    newModified.add(id);
                    hasChanges = true;
                }
            });

            if (!hasChanges) return {};

            return {
                hasUnsavedChanges: true,
                modifiedIds: newModified,
                version: state.version + 1
            };
        });
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