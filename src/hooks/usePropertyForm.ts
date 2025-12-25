'use client';

import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import { useEffect, useState } from 'react';

import { ElevationService } from '@/lib/services/ElevationService';
import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';

// Helper to prevent React crashes with OL objects
export const sanitizeProperties = (props: Record<string, any>): Record<string, any> => {
    const clean: Record<string, any> = {};
    Object.keys(props).forEach(key => {
        const val = props[key];
        if (key === 'geometry') return;
        if (val instanceof Feature || (val && typeof val.getId === 'function')) {
            clean[key] = val.getId()?.toString() || "[Feature]";
        } else if (val && typeof val === 'object' && !Array.isArray(val)) {
            clean[key] = val.id || val.Id || val.ID || "[Object]";
        } else {
            clean[key] = val;
        }
    });
    return clean;
};

export const usePropertyForm = () => {
    const { version, selectedFeature, selectedFeatureId, updateFeature, removeFeature } = useNetworkStore();
    const map = useMapStore(state => state.map);

    // Local state for form editing
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [hasChanges, setHasChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Sync local state with store selection
    useEffect(() => {
        if (selectedFeature) {
            // setFormData(selectedFeature.getProperties());
            setFormData(sanitizeProperties(selectedFeature.getProperties()));
            setHasChanges(false);
        } else {
            setFormData({});
        }
    }, [selectedFeatureId, selectedFeature, version]);

    const handleChange = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = () => {
        if (selectedFeatureId) {
            updateFeature(selectedFeatureId, formData);
            // setHasChanges(false);
        }
    };

    const handleReset = () => {
        if (selectedFeature) {
            setFormData(selectedFeature.getProperties());
            setHasChanges(false);
        }
    }

    const handleDelete = () => {
        if (selectedFeatureId && confirm("Are you sure you want to delete this component?")) {
            removeFeature(selectedFeatureId);
            useNetworkStore.getState().selectFeature(null);
        }
    };

    const handleZoom = () => {
        if (!map || !selectedFeature) return;
        const geom = selectedFeature.getGeometry();
        if (geom) {
            map.getView().fit(geom.getExtent(), { padding: [100, 100, 100, 100], maxZoom: 18, duration: 500 });
        }
    };

    // --- NODE SPECIFIC ACTIONS ---
    const handleAutoElevate = async () => {
        if (!selectedFeature) return;
        setIsLoading(true);
        try {
            const geometry = selectedFeature.getGeometry();
            if (geometry instanceof Point) {
                const elevation = await ElevationService.getElevation(geometry.getCoordinates());
                if (elevation !== null) handleChange("elevation", elevation);
            }
        } catch (e) {
            console.error("Elevation failed", e);
        } finally {
            setIsLoading(false);
        }
    };

    // --- LINK SPECIFIC ACTIONS ---
    const handleReverse = () => {
        if (!selectedFeature || !selectedFeatureId) return;
        const geom = selectedFeature.getGeometry();
        if (geom instanceof LineString) {
            // 1. Flip Geometry
            const coords = geom.getCoordinates();
            geom.setCoordinates(coords.reverse());

            // 2. Flip Data
            const newStart = formData.endNodeId;
            const newEnd = formData.startNodeId;

            const updates = { startNodeId: newStart, endNodeId: newEnd };
            updateFeature(selectedFeatureId, updates);
            setFormData(prev => ({ ...prev, ...updates }));

            // 3. Force Render
            selectedFeature.changed();
        }
    };

    const getConnectedInfo = () => {
        if (["junction", "tank", "reservoir"].includes(formData.type)) {
            const connectedLinks = formData.connectedLinks || [];
            return { type: "node", count: connectedLinks.length, connections: connectedLinks };
        } else if (["pipe", "pump", "valve"].includes(formData.type)) {
            return { type: "link", startNodeId: formData.startNodeId, endNodeId: formData.endNodeId, isPipe: formData.type === 'pipe' };
        }
        return null;
    };

    const connectionInfo = getConnectedInfo();

    return {
        formData,
        hasChanges,
        isLoading,
        connectionInfo,
        selectedFeatureId,
        handleChange,
        handleSave,
        handleReset,
        handleDelete,
        handleZoom,
        handleAutoElevate,
        handleReverse
    };
};