import { useCallback, useEffect, useRef } from 'react';
import { Feature } from 'ol';
import { useNetworkStore } from '@/store/networkStore';
import { useUIStore } from '@/store/uiStore';
import { useMapStore } from '@/store/mapStore';
import { DeleteManager } from '@/lib/topology/deleteManager';

export function useDeleteHandler() {
    const { map, vectorSource } = useMapStore();
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