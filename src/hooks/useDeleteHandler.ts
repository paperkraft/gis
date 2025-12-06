import { useCallback, useEffect, useRef, useMemo } from 'react';
import { Feature } from 'ol';
import { useNetworkStore } from '@/store/networkStore';
import { useUIStore } from '@/store/uiStore';
import { useMapStore } from '@/store/mapStore';
import { DeleteManager } from '@/lib/topology/deleteManager';

export function useDeleteHandler() {
    const map = useMapStore((state) => state.map);
    const vectorSource = useMapStore((state) => state.vectorSource);
    const {
        selectFeature,
        selectFeatures,
        setSelectedFeature,
        selectedFeatureIds,
        getFeatureById
    } = useNetworkStore();

    const { setDeleteModalOpen } = useUIStore();
    const deleteManagerRef = useRef<DeleteManager | null>(null);

    // Initialize DeleteManager
    useEffect(() => {
        if (!map || !vectorSource) return;
        deleteManagerRef.current = new DeleteManager(map, vectorSource);

        // Connect callback (Context menu requests usually send a single feature)
        deleteManagerRef.current.onDeleteRequest = (feature: Feature) => {
            // If right-clicked feature isn't in current selection, select only it
            if (!selectedFeatureIds.includes(feature.getId() as string)) {
                selectFeature(feature.getId() as string);
            }
            setDeleteModalOpen(true);
        };

        return () => {
            deleteManagerRef.current?.cleanup();
        };
    }, [map, vectorSource, selectFeature, selectedFeatureIds, setDeleteModalOpen]);

    // Handler for Panel button (usually single context, but safe to default to selection)
    const handleDeleteRequestFromPanel = useCallback(() => {
        if (selectedFeatureIds.length > 0) {
            setDeleteModalOpen(true);
        }
    }, [selectedFeatureIds, setDeleteModalOpen]);

    // Execute Delete for ALL selected features
    const handleDeleteConfirm = useCallback(() => {
        if (!deleteManagerRef.current) return;

        // Create a copy to avoid loop issues if state updates mid-loop
        const idsToDelete = [...selectedFeatureIds];

        idsToDelete.forEach(id => {
            const feature = getFeatureById(id);
            if (feature) {
                deleteManagerRef.current?.executeDelete(feature);
            }
        });

        setDeleteModalOpen(false);

        // Clear all selections
        selectFeature(null);
        selectFeatures([]);
        setSelectedFeature(null);

    }, [selectedFeatureIds, setDeleteModalOpen, selectFeature, selectFeatures, setSelectedFeature, getFeatureById]);

    // Calculate Cascade Info dynamically for the selection
    const cascadeInfo = useMemo(() => {
        if (selectedFeatureIds.length === 0 || !deleteManagerRef.current) {
            return undefined;
        }

        let willCascade = false;
        const features = selectedFeatureIds.map(id => getFeatureById(id)).filter(f => f) as Feature[];

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
                message: selectedFeatureIds.length > 1
                    ? "Deleting these items will also remove connected pipes or links."
                    : "Deleting this node will also remove connected pipes."
            };
        }

        return { willCascade: false, message: "" };

    }, [selectedFeatureIds, getFeatureById]);

    return {
        handleDeleteRequestFromPanel,
        handleDeleteConfirm,
        cascadeInfo,
        deleteCount: selectedFeatureIds.length
    };
}