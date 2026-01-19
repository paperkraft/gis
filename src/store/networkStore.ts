import { Feature } from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import { create } from 'zustand';

import { ParsedProjectData } from '@/lib/import/inpParser';
import { ProjectLoader } from '@/lib/services/ProjectLoader';

import { createFeatureSlice, FeatureSlice } from './slices/featureSlice';
import { createHistorySlice, HistorySlice } from './slices/historySlice';
import { createProjectSlice, ProjectSlice } from './slices/projectSlice';

export type NetworkState = ProjectSlice & HistorySlice & FeatureSlice & {
    loadProject: (data: ParsedProjectData, isUnsaved?: boolean) => void;
    setNetworkState: (geoJSON: any) => void;
}

export const useNetworkStore = create<NetworkState>()((...a) => ({
    ...createFeatureSlice(...a),
    ...createProjectSlice(...a),
    ...createHistorySlice(...a),

    // --- Aggregated Actions ---

    loadProject: (data, isUnsaved = false) => {

        const processed = ProjectLoader.processImport(data);
        const [set] = a;

        set({
            features: processed.features,
            nextIdCounter: processed.counters,
            settings: processed.settings,
            patterns: processed.patterns,
            curves: processed.curves,
            controls: processed.controls,

            // Reset History
            past: [],
            future: [],
            hasUnsavedChanges: isUnsaved,
            modifiedIds: isUnsaved ? new Set(processed.features.keys()) : new Set(),
        });
    },

    setNetworkState: (geoJSON) => {
        const reader = new GeoJSON();
        const features = reader.readFeatures(geoJSON);
        const [set, get] = a;

        const newMap = new Map<string, Feature>();
        const newDeleted = new Set(get().deletedIds);

        features.forEach(f => {
            const id = f.getId() as string;
            if (id) {
                newMap.set(id, f);
                newDeleted.delete(id);
            }
        });

        set({
            features: newMap,
            hasUnsavedChanges: true,
            deletedIds: newDeleted,
            modifiedIds: new Set(newMap.keys())
        });
    }

}));