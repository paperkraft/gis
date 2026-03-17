'use client';

import { useEffect, useState } from 'react';
import { LineString } from 'ol/geom';

import { ElevationService } from '@/lib/services/ElevationService';
import { createFeatureFromData } from '@/lib/utils/featureUtils';
import { sanitizeProperties } from '@/lib/utils/sanitize';
import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';
import { useSimulationStore } from '@/store/simulationStore';

// Re-export for any consumers that import sanitizeProperties from here
export { sanitizeProperties } from '@/lib/utils/sanitize';

export const usePropertyForm = () => {
    const { version, selectedFeature, selectedFeatureId, updateFeature, removeFeature, patterns, curves, settings } = useNetworkStore();
    const { history, currentTimeIndex } = useSimulationStore();
    const map = useMapStore(state => state.map);

    // Local state for form editing
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [hasChanges, setHasChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

    // Sync local state with store selection
    useEffect(() => {
        // 1. If feature changed (user selected another component), always reset
        if (selectedFeatureId !== lastSelectedId) {
            if (selectedFeature) {
                const initialData = sanitizeProperties(selectedFeature.properties);
                
                // --- ELEVATION INHERITANCE (One-time) ---
                if (['pump', 'valve'].includes(selectedFeature.type) && !initialData.elevation) {
                    const startId = initialData.startNodeId || initialData.source;
                    const endId = initialData.endNodeId || initialData.target;
                    
                    const features = useNetworkStore.getState().features;
                    const startNode = startId ? features.get(startId) : null;
                    const endNode = endId ? features.get(endId) : null;
                    
                    const elevations = [startNode?.properties?.elevation, endNode?.properties?.elevation].filter(e => typeof e === 'number');
                    if (elevations.length > 0) {
                        const avgElev = elevations.reduce((a, b) => a + b, 0) / elevations.length;
                        initialData.elevation = parseFloat(avgElev.toFixed(2));
                        updateFeature(selectedFeatureId!, { elevation: initialData.elevation });
                    }
                }

                setFormData(initialData);
                setHasChanges(false);
            } else {
                setFormData({});
            }
            setLastSelectedId(selectedFeatureId);
        } 
        // 2. If same feature but store changed AND we don't have local edits, sync to keep up
        else if (!hasChanges && selectedFeature) {
            setFormData(sanitizeProperties(selectedFeature.properties));
        }
    }, [selectedFeatureId, selectedFeature, version, hasChanges, lastSelectedId]);

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
    };

    const handleDelete = () => {
        if (!selectedFeatureId) return;

        // Delegate to DeleteManager so we get:
        // - Confirmation modal with impact summary
        // - Orphan node cleanup for pipes
        // - Pump/valve merge logic
        // - Cascade delete for node→connected pipes
        const dm = useMapStore.getState().deleteManager;
        if (dm) {
            // Ensure the feature is selected so deleteSelectedFeature picks it up
            useNetworkStore.getState().selectFeature(selectedFeatureId);
            dm.deleteSelectedFeature();
        } else {
            // Fallback if map isn't loaded yet
            if (confirm('Are you sure you want to delete this component?')) {
                removeFeature(selectedFeatureId);
                useNetworkStore.getState().selectFeature(null);
            }
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
                if (elevation !== null) handleChange('elevation', elevation);
            }
        } catch (e) {
            console.error('Elevation failed', e);
        } finally {
            setIsLoading(false);
        }
    };

    // --- LINK SPECIFIC ACTIONS ---
    const handleReverse = () => {
        if (!selectedFeature || !selectedFeatureId) return;
        if (!['pipe', 'pump', 'valve'].includes(selectedFeature.type)) return;

        // Delegate to pipeDrawingManager so geometry reversal also happens on the map
        const { vectorSource, deleteManager: _ } = useMapStore.getState();
        if (vectorSource) {
            const mapFeature = vectorSource.getFeatureById(selectedFeatureId);
            if (mapFeature) {
                // Import lazily to avoid circular dep — read from mapStore's vectorSource context
                // pipeDrawingManager is exposed via import in context menu; here we use the store OL feature directly
                const props = selectedFeature.properties;
                const newStart = props.endNodeId || props.target || props.toNode;
                const newEnd = props.startNodeId || props.source || props.fromNode;

                const geom = mapFeature.getGeometry();
                if (geom && geom.getType() === 'LineString') {
                    const reversed = [...(geom as LineString).getCoordinates()].reverse();
                    (geom as LineString).setCoordinates(reversed);

                    updateFeature(selectedFeatureId, {
                        geometry: reversed,
                        startNodeId: newStart,
                        endNodeId: newEnd,
                        source: newStart,
                        target: newEnd,
                    });
                    mapFeature.changed();
                } else {
                    // Point geometry (pump/valve) — property-only update
                    updateFeature(selectedFeatureId, {
                        startNodeId: newStart,
                        endNodeId: newEnd,
                        source: newStart,
                        target: newEnd,
                    });
                }

                setFormData(prev => ({ ...prev, startNodeId: newStart, endNodeId: newEnd, source: newStart, target: newEnd }));
                return;
            }
        }

        // Fallback: property-only update (store only, no OL geometry change)
        const newStart = formData.endNodeId || formData.target || formData.toNode;
        const newEnd = formData.startNodeId || formData.source || formData.fromNode;
        const updates = { startNodeId: newStart, endNodeId: newEnd, source: newStart, target: newEnd };
        updateFeature(selectedFeatureId, updates);
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const getConnectedInfo = () => {
        if (['junction', 'tank', 'reservoir'].includes(formData.type)) {
            const connectedLinks = formData.connectedLinks || [];
            return { type: 'node', count: connectedLinks.length, connections: connectedLinks };
        } else if (['pipe', 'pump', 'valve'].includes(formData.type)) {
            return { type: 'link', startNodeId: formData.startNodeId || formData.source, endNodeId: formData.endNodeId || formData.target, isPipe: formData.type === 'pipe' };
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
        handleReverse,
        patterns,
        curves,
        settings,
        history,
        currentTimeIndex
    };
};