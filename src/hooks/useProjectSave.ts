import GeoJSON from 'ol/format/GeoJSON';
import { useState } from 'react';
import { toast } from 'sonner';

import { useNetworkStore } from '@/store/networkStore';
import { ProjectService } from '@/lib/services/ProjService';
import { LineString, Point } from 'ol/geom';

export function useProjectSave(projectId: string) {
    const [isSaving, setIsSaving] = useState(false);

    const {
        features,
        settings,
        patterns,
        curves,
        controls,
        modifiedIds,
        deletedIds,
        markSaved
    } = useNetworkStore();

    const saveProject = async () => {
        if (!projectId) return;
        setIsSaving(true);

        try {
            // Serialize Features to GeoJSON
            const writer = new GeoJSON();

            // 1. Filter only Modified Features
            const rawChangedFeatures = Array.from(features.values()).filter(f => modifiedIds.has(f.getId() as string));

            // 2. Reconstruct Link Geometries to prevent "Drift"
            const featuresToSave = rawChangedFeatures.map(f => {
                const type = f.get('type');
                const props = f.getProperties();

                // Check if it's a Link (Pipe, Pump, Valve)
                if (['pipe', 'pump', 'valve'].includes(type)) {
                    // Try to find connected nodes in the FULL feature list
                    const sourceId = props.source || props.startNodeId || props.fromNode;
                    const targetId = props.target || props.endNodeId || props.toNode;

                    if (sourceId && targetId) {
                        const sNode = features.get(sourceId);
                        const tNode = features.get(targetId);

                        if (sNode && tNode) {
                            // Found both nodes! Rebuild geometry from scratch.
                            const sGeom = (sNode.getGeometry() as Point).getCoordinates();
                            const tGeom = (tNode.getGeometry() as Point).getCoordinates();

                            // Clone the feature so we don't mess up the live map during save
                            const clone = f.clone();
                            // Force a straight line between the two nodes
                            clone.setGeometry(new LineString([sGeom, tGeom]));
                            clone.setId(f.getId()); // Clone often drops ID
                            return clone;
                        }
                    }
                }
                // If it's a Node or unrelated feature, return as is
                return f;
            });

            // 3. Serialize (Auto-transform 3857 -> 4326)
            const geoJSON = writer.writeFeaturesObject(featuresToSave, {
                featureProjection: 'EPSG:3857',
                dataProjection: 'EPSG:4326'
            });

            // 4. Construct Payload
            const payload = {
                features: geoJSON.features,
                deletions: Array.from(deletedIds),
                // Always send metadata (it's small and ensures consistency)
                settings,
                patterns,
                curves,
                controls
            };

            // Send to API
            const success = await ProjectService.saveProject(projectId, payload);

            if (success) {
                markSaved();
                toast.success("Project saved successfully");
            } else {
                toast.error("Failed to save project");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while saving");
        } finally {
            setIsSaving(false);
        }
    };

    return { saveProject, isSaving };
} 