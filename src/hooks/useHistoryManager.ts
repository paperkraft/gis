import { useCallback } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { useMapStore } from '@/store/mapStore';

export function useHistoryManager() {
    // 1. Get Actions from Store
    const undo = useNetworkStore((state) => state.undo);
    const redo = useNetworkStore((state) => state.redo);
    const snapshot = useNetworkStore((state) => state.snapshot);
    const { startTransaction, commitTransaction } = useNetworkStore();

    // 2. Get Map Source
    const vectorSource = useMapStore((state) => state.vectorSource);

    // 3. Synchronization Helper
    const syncMapWithStore = useCallback(() => {
        if (!vectorSource) return;
        const currentFeatures = Array.from(useNetworkStore.getState().features.values());
        vectorSource.clear();
        vectorSource.addFeatures(currentFeatures);
    }, [vectorSource]);

    // 4. Wrapper Actions
    const handleUndo = useCallback(() => {
        undo();
        syncMapWithStore();
    }, [undo, syncMapWithStore]);

    const handleRedo = useCallback(() => {
        redo();
        syncMapWithStore();
    }, [redo, syncMapWithStore]);

    const recordChange = useCallback((action: () => void) => {
        snapshot();
        action();
    }, [snapshot]);

    return {
        undo: handleUndo,
        redo: handleRedo,
        recordChange,
        snapshot,
        startTransaction,
        commitTransaction
    };
}