import GeoJSON from 'ol/format/GeoJSON';
import { useState } from 'react';
import { toast } from 'sonner';

import { useNetworkStore } from '@/store/networkStore';
import { ProjectService } from '@/lib/services/ProjService';

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
            // Get Changed Features
            const changedFeatures = Array.from(features.values()).filter(f => modifiedIds.has(f.getId() as string));

            // TRANSFORM COORDINATES (The Fix)
            // featureProjection: What the map uses (Web Mercator / Meters)
            // dataProjection: What the DB wants (WGS84 / Lat/Lon)
            const geoJSON = writer.writeFeaturesObject(changedFeatures, {
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