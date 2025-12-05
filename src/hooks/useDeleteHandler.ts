import { Feature } from 'ol';
import { useCallback, useEffect, useRef } from 'react';

import { DeleteManager } from '@/lib/topology/deleteManager';
import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';
import { useUIStore } from '@/store/uiStore';

export function useDeleteHandler() {
    const map = useMapStore(state => state.map);
    const vectorSource = useMapStore(state => state.vectorSource);
    const { selectFeature, setSelectedFeature, selectedFeature } = useNetworkStore();
    const { setDeleteModalOpen } = useUIStore();

    const deleteManagerRef = useRef<DeleteManager | null>(null);

    // Initialize DeleteManager
    useEffect(() => {
        if (!map || !vectorSource) return;
        deleteManagerRef.current = new DeleteManager(map, vectorSource);

        // Connect callback
        deleteManagerRef.current.onDeleteRequest = (feature: Feature) => {
            setSelectedFeature(feature);
            setDeleteModalOpen(true);
        };

        return () => {
            deleteManagerRef.current?.cleanup();
        };
    }, [map, vectorSource, setSelectedFeature, setDeleteModalOpen]);

    // Handlers
    const handleDeleteRequestFromPanel = useCallback(() => {
        const { selectedFeatureId } = useNetworkStore.getState();
        if (!selectedFeatureId || !vectorSource) return;

        const feature = vectorSource.getFeatures().find((f) => f.getId() === selectedFeatureId);
        if (feature) {
            setSelectedFeature(feature);
            setDeleteModalOpen(true);
        }
    }, [vectorSource, setSelectedFeature, setDeleteModalOpen]);

    const handleDeleteConfirm = useCallback(() => {
        if (selectedFeature && deleteManagerRef.current) {
            deleteManagerRef.current.executeDelete(selectedFeature);
            setDeleteModalOpen(false);
            selectFeature(null);
            setSelectedFeature(null);
        }
    }, [selectedFeature, setDeleteModalOpen, selectFeature, setSelectedFeature]);

    // Get cascade info for modal
    const cascadeInfo = selectedFeature
        ? deleteManagerRef.current?.getCascadeInfo(selectedFeature)
        : undefined;

    return {
        handleDeleteRequestFromPanel,
        handleDeleteConfirm,
        cascadeInfo,
    };
}