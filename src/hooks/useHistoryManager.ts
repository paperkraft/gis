import { useCallback } from 'react';

import { useNetworkStore } from '@/store/networkStore';
import { useUIStore } from '@/store/uiStore';

/**
 * Manages undo/redo history and related cleanup.
 *
 * NOTE: Map synchronization after undo/redo is handled automatically by
 * `useMapFeatureSync` which subscribes to the network store. No manual
 * sync is needed here.
 */
export function useHistoryManager() {
    const undoAction = useNetworkStore((state) => state.undo);
    const redoAction = useNetworkStore((state) => state.redo);
    const snapshot = useNetworkStore((state) => state.snapshot);
    const { startTransaction, commitTransaction, selectFeature, selectFeatures, setSelectedFeature } = useNetworkStore();

    const { setDeleteContext, setMergeContext } = useUIStore();

    const triggerCleanup = useCallback(() => {
        setDeleteContext(null);
        setMergeContext(null);
        selectFeature(null);
        selectFeatures([]);
        setSelectedFeature(null);
    }, [setDeleteContext, setMergeContext, selectFeature, selectFeatures, setSelectedFeature]);

    const undo = useCallback(() => {
        undoAction();
        triggerCleanup();
    }, [undoAction, triggerCleanup]);

    const redo = useCallback(() => {
        redoAction();
        triggerCleanup();
    }, [redoAction, triggerCleanup]);

    const recordChange = useCallback((action: () => void) => {
        snapshot();
        action();
    }, [snapshot]);

    return {
        undo,
        redo,
        recordChange,
        startTransaction,
        commitTransaction
    };
}