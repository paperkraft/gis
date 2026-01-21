import { useCallback } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { useMapStore } from '@/store/mapStore';

export function useHistoryManager() {
    // 1. Store Actions
    const undoAction = useNetworkStore((state) => state.undo);
    const redoAction = useNetworkStore((state) => state.redo);
    const snapshot = useNetworkStore((state) => state.snapshot);
    const { startTransaction, commitTransaction, selectFeature, selectedFeatureId } = useNetworkStore();

    const vectorSource = useMapStore((state) => state.vectorSource);
    const map = useMapStore((state) => state.map);

    // Updates map features in-place to prevent flicker & retain state
    const syncMapWithStore = useCallback(() => {
        if (!vectorSource) return;

        const storeFeatures = useNetworkStore.getState().features; // Map<string, Feature>
        const mapFeatures = vectorSource.getFeatures();

        // 1. Track IDs processed to find deletions later
        const processedIds = new Set<string>();

        // 2. Update or Add Store Features -> Map
        storeFeatures.forEach((storeFeature, id) => {
            processedIds.add(id);
            const mapFeature = vectorSource.getFeatureById(id);

            if (mapFeature) {
                // A. Update Existing (Preserves object reference for interactions)
                const newGeom = storeFeature.getGeometry();
                if (newGeom) {
                    mapFeature.setGeometry(newGeom.clone()); // Update Coordinates
                }
                mapFeature.setProperties(storeFeature.getProperties(), true); // Update Props (silent)
            } else {
                // B. Add New
                // Clone to ensure Map gets its own instance separate from Store
                const clone = storeFeature.clone();
                clone.setId(id);
                vectorSource.addFeature(clone);
            }
        });

        // 3. Remove Map Features not in Store
        mapFeatures.forEach((f) => {
            const id = f.getId()?.toString();
            if (id && !processedIds.has(id)) {
                vectorSource.removeFeature(f);
            }
        });

        // 4. Restore Selection (UX Fix)
        // If the selected item still exists after Undo, make sure it looks selected
        if (selectedFeatureId) {
            const feature = vectorSource.getFeatureById(selectedFeatureId);
            if (feature) {
                // Trigger a re-selection logic if needed, or simply let the style function handle it
                // (Assuming your style function checks the store's selectedFeatureId)
                feature.changed();
            } else {
                // If the selected item was deleted by Undo, clear selection
                selectFeature(null);
            }
        }

    }, [vectorSource, selectedFeatureId, selectFeature]);

    // 1. UNDO
    const undo = useCallback(() => {
        undoAction();
        syncMapWithStore();
    }, [undoAction, syncMapWithStore]);

    // 2. REDO
    const redo = useCallback(() => {
        redoAction();
        syncMapWithStore();
    }, [redoAction, syncMapWithStore]);

    // 3. RECORD SINGLE CHANGE
    const recordChange = useCallback((action: () => void) => {
        snapshot(); // Snapshot BEFORE change
        action();   // Do change
        // No need to sync here usually, as React/Zustand reactivity 
        // usually handles forward updates. Only Undo/Redo needs forced sync.
    }, [snapshot]);

    return {
        undo,
        redo,
        recordChange,
        startTransaction,
        commitTransaction
    };
}