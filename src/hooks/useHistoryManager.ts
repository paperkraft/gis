// src/hooks/useHistoryManager.ts
import { useEffect } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { useMapStore } from '@/store/mapStore';
import { Feature } from 'ol';

export function useHistoryManager() {
    const { undo, redo, snapshot } = useNetworkStore();
    const { vectorSource } = useMapStore();

    // Sync function: Update OpenLayers source to match the feature list
    const syncMapSource = (features: Feature[]) => {
        if (!vectorSource) return;

        vectorSource.clear();
        vectorSource.addFeatures(features);

        // Re-attach styles if necessary, though 'addFeatures' usually preserves them 
        // if they are set on the feature itself. 
        // If styles are on the layer based on properties, we are good.
    };

    useEffect(() => {
        const handleUndo = () => {
            const restoredFeatures = undo();
            if (restoredFeatures) {
                syncMapSource(restoredFeatures);
            }
        };

        const handleRedo = () => {
            const restoredFeatures = redo();
            if (restoredFeatures) {
                syncMapSource(restoredFeatures);
            }
        };

        // Listen for custom events
        window.addEventListener('undo', handleUndo);
        window.addEventListener('redo', handleRedo);
        window.addEventListener('takeSnapshot', snapshot); // Allow other components to trigger snapshot easily

        return () => {
            window.removeEventListener('undo', handleUndo);
            window.removeEventListener('redo', handleRedo);
            window.removeEventListener('takeSnapshot', snapshot);
        };
    }, [undo, redo, snapshot, vectorSource]);

    return { snapshot };
}