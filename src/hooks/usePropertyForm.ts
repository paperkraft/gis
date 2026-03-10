'use client';

import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import { useEffect, useState } from 'react';

import { ElevationService } from '@/lib/services/ElevationService';
import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';
import { createFeatureFromData } from './map/useMapFeatureSync';

// Helper to prevent React crashes with OL objects
export const sanitizeProperties = (props: Record<string, any>): Record<string, any> => {
    if (!props) return {};
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
            setFormData(sanitizeProperties(selectedFeature.properties));
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
            setHasChanges(false);
        }
    };

    const handleReset = () => {
        if (selectedFeature) {
            setFormData(selectedFeature.properties);
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
        const olFeature = createFeatureFromData(selectedFeature);
        const geom = olFeature.getGeometry();
        if (geom) {
            map.getView().fit(geom.getExtent(), { padding: [100, 100, 100, 100], maxZoom: 18, duration: 500 });
        }
    };

    // --- NODE SPECIFIC ACTIONS ---
    const handleAutoElevate = async () => {
        if (!selectedFeature) return;
        setIsLoading(true);
        try {
            if (['junction', 'tank', 'reservoir'].includes(selectedFeature.type)) {
                const elevation = await ElevationService.getElevation(selectedFeature.geometry as number[]);
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

        if (['pipe', 'pump', 'valve'].includes(selectedFeature.type)) {
            // 2. Flip Data
            const newStart = formData.endNodeId || formData.target || formData.toNode;
            const newEnd = formData.startNodeId || formData.source || formData.fromNode;

            const updates = { startNodeId: newStart, endNodeId: newEnd, source: newStart, target: newEnd };
            updateFeature(selectedFeatureId, updates);
            setFormData(prev => ({ ...prev, ...updates }));
        }
    };

    const getConnectedInfo = () => {
        if (["junction", "tank", "reservoir"].includes(formData.type)) {
            const connectedLinks = formData.connectedLinks || [];
            return { type: "node", count: connectedLinks.length, connections: connectedLinks };
        } else if (["pipe", "pump", "valve"].includes(formData.type)) {
            return { type: "link", startNodeId: formData.startNodeId || formData.source, endNodeId: formData.endNodeId || formData.target, isPipe: formData.type === 'pipe' };
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