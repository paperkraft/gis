import { useCallback, useEffect, useRef, useMemo } from 'react';
import { Feature } from 'ol';
import { useNetworkStore } from '@/store/networkStore';
import { useUIStore } from '@/store/uiStore';
import { useMapStore } from '@/store/mapStore';
import { DeleteManager } from '@/lib/topology/deleteManager';

export function useDeleteHandler() {
    const vectorSource = useMapStore((state) => state.vectorSource);
    const {
        selectFeature,
        selectFeatures,
        setSelectedFeature,
        selectedFeatureIds,
        selectedFeatureId, // Import singular ID
        getFeatureById
    } = useNetworkStore();

    const { setDeleteModalOpen } = useUIStore();
    const deleteManagerRef = useRef<DeleteManager | null>(null);

    // Initialize DeleteManager
    useEffect(() => {
        if (!vectorSource) return;
        deleteManagerRef.current = new DeleteManager(vectorSource);

        // Connect callback for internal DeleteManager requests (e.g., keyboard)
        deleteManagerRef.current.onDeleteRequest = (feature: Feature) => {
            const id = feature.getId() as string;
            // Ensure selection is synced
            if (!selectedFeatureIds.includes(id)) {
                selectFeature(id);
                setSelectedFeature(feature);
            }
            setDeleteModalOpen(true);
        };

        return () => {
            deleteManagerRef.current?.cleanup();
        };
    }, [vectorSource, selectFeature, selectedFeatureIds, setDeleteModalOpen, setSelectedFeature]);

    // Handler for Panel button
    const handleDeleteRequestFromPanel = useCallback(() => {
        if (selectedFeatureIds.length > 0 || selectedFeatureId) {
            setDeleteModalOpen(true);
        }
    }, [selectedFeatureIds, selectedFeatureId, setDeleteModalOpen]);

    // Execute Delete for ALL selected features
    const handleDeleteConfirm = useCallback(() => {
        if (!deleteManagerRef.current) return;

        // Fallback to singular ID if array is empty.
        // In 'Draw' mode, the interaction often clears the multi-select array, 
        // but 'selectedFeatureId' remains set by the Context Menu.
        let idsToDelete = [...selectedFeatureIds];
        if (idsToDelete.length === 0 && selectedFeatureId) {
            idsToDelete = [selectedFeatureId];
        }

        if (idsToDelete.length === 0) {
            console.warn("[DeleteHandler] No features selected to delete.");
            setDeleteModalOpen(false);
            return;
        }

        idsToDelete.forEach(id => {
            // Try to find feature in store first, then map source
            let feature = getFeatureById(id);
            if (!feature && vectorSource) {
                feature = vectorSource.getFeatureById(id) as Feature;
            }

            if (feature) {
                deleteManagerRef.current?.executeDelete(feature);
            }
        });

        setDeleteModalOpen(false);

        // Clear all selections
        selectFeature(null);
        selectFeatures([]);
        setSelectedFeature(null);

    }, [selectedFeatureIds, selectedFeatureId, setDeleteModalOpen, selectFeature, selectFeatures, setSelectedFeature, getFeatureById, vectorSource]);

    // Calculate Cascade Info dynamically
    const cascadeInfo = useMemo(() => {
        if (!deleteManagerRef.current) return undefined;

        let idsToCheck = selectedFeatureIds;
        if (idsToCheck.length === 0 && selectedFeatureId) {
            idsToCheck = [selectedFeatureId];
        }

        if (idsToCheck.length === 0) return undefined;

        let willCascade = false;
        const features = idsToCheck.map(id => {
            return getFeatureById(id) || vectorSource?.getFeatureById(id);
        }).filter(f => f) as Feature[];

        // Check if ANY selected feature causes a cascade
        for (const feature of features) {
            const info = deleteManagerRef.current?.getCascadeInfo(feature);
            if (info?.willCascade) {
                willCascade = true;
                break;
            }
        }

        if (willCascade) {
            return {
                willCascade: true,
                message: idsToCheck.length > 1
                    ? "Deleting these items will also remove connected pipes or links."
                    : "Deleting this node will also remove connected pipes."
            };
        }

        return { willCascade: false, message: "" };

    }, [selectedFeatureIds, selectedFeatureId, getFeatureById, vectorSource]);

    return {
        handleDeleteRequestFromPanel,
        handleDeleteConfirm,
        cascadeInfo,
        deleteCount: Math.max(selectedFeatureIds.length, selectedFeatureId ? 1 : 0)
    };
}