import { useCallback } from 'react';

import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';
import { useUIStore } from '@/store/uiStore';

export function useHistoryManager() {
    // 1. Store Actions
    const undoAction = useNetworkStore((state) => state.undo);
    const redoAction = useNetworkStore((state) => state.redo);
    const snapshot = useNetworkStore((state) => state.snapshot);
    const { startTransaction, commitTransaction, selectFeature, selectFeatures, setSelectedFeature } = useNetworkStore();

    const { setDeleteContext, setMergeContext } = useUIStore();
    const vectorSource = useMapStore((state) => state.vectorSource);

    // Updates map features in-place to prevent flicker & retain state
    const syncMapWithStore = useCallback(() => {
        if (!vectorSource) return;

        const storeFeatures = useNetworkStore.getState().features;
        const mapFeatures = vectorSource.getFeatures();

        // 1. Track IDs processed to find deletions later
        const processedIds = new Set<string>();

        // 2. Update or Add Store Features -> Map
        storeFeatures.forEach((storeFeature, id) => {
            processedIds.add(id);
            let mapFeature = vectorSource.getFeatureById(id);

            if (mapFeature) {
                // A. Update Existing
                const newGeom = storeFeature.getGeometry();
                if (newGeom) mapFeature.setGeometry(newGeom.clone());
                mapFeature.setProperties(storeFeature.getProperties(), true);
            } else {
                // B. Add New (Restoring from Delete)
                mapFeature = storeFeature.clone();
                mapFeature.setId(id);
                vectorSource.addFeature(mapFeature);
            }
            if (mapFeature) {
                mapFeature.setStyle(undefined);
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
        // if (selectedFeatureId) {
        //     const feature = vectorSource.getFeatureById(selectedFeatureId);
        //     if (feature) {
        //         feature.changed();
        //     } else {
        //         selectFeature(null);
        //     }
        // }

    }, [vectorSource]);

    const triggerCleanup = useCallback(() => {
        // Clear UI contexts which might trigger hooks
        setDeleteContext(null);
        setMergeContext(null);

        // Clear Selection state
        selectFeature(null);
        selectFeatures([]);
        setSelectedFeature(null);
    }, [setDeleteContext, setMergeContext, selectFeature, selectFeatures, setSelectedFeature]);

    // 1. UNDO
    const undo = useCallback(() => {
        undoAction();
        syncMapWithStore();
        triggerCleanup();
    }, [undoAction, syncMapWithStore, triggerCleanup]);

    // 2. REDO
    const redo = useCallback(() => {
        redoAction();
        syncMapWithStore();
        triggerCleanup();
    }, [redoAction, syncMapWithStore, triggerCleanup]);

    // 3. RECORD SINGLE CHANGE
    const recordChange = useCallback((action: () => void) => {
        snapshot(); // Snapshot BEFORE change
        action();   // Do change
    }, [snapshot]);

    return {
        undo,
        redo,
        recordChange,
        startTransaction,
        commitTransaction
    };
}