import GeoJSON from 'ol/format/GeoJSON';
import { useState } from 'react';
import { toast } from 'sonner';

import { useNetworkStore } from '@/store/networkStore';
import { ProjectService } from '@/lib/services/ProjService';
import { createFeatureFromData } from './map/useMapFeatureSync';

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
            const rawChangedFeatures = Array.from(features.values()).filter(f => modifiedIds.has(f.id));

            // 2. Reconstruct Link Geometries to prevent "Drift"
            const featuresToSave = rawChangedFeatures.map(f => {
                const type = f.type;
                const props = f.properties;
                const fData = { ...f };

                // Check if it's a Link (Pipe, Pump, Valve)
                if (['pipe', 'pump', 'valve'].includes(type)) {
                    // Try to find connected nodes in the FULL feature list
                    const sourceId = props.source || props.startNodeId || props.fromNode;
                    const targetId = props.target || props.endNodeId || props.toNode;

                    if (sourceId && targetId) {
                        const sNode = features.get(sourceId as string);
                        const tNode = features.get(targetId as string);

                        if (sNode && tNode) {
                            const sGeom = sNode.geometry as number[];
                            const tGeom = tNode.geometry as number[];

                            // 1. GET CURRENT SHAPE (Start + Vertices + End)
                            let coords = f.geometry ? [...(f.geometry as number[][])] : [];

                            // 2. SNAP ENDPOINTS ONLY (Preserve Middle Vertices)
                            if (coords.length >= 2) {
                                coords[0] = sGeom;                 // Snap Start
                                coords[coords.length - 1] = tGeom; // Snap End
                            } else {
                                // Fallback (should rarely happen)
                                coords = [sGeom, tGeom];
                            }

                            fData.geometry = coords;
                        }
                    }
                }

                return createFeatureFromData(fData);
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