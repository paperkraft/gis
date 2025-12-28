import { useEffect } from 'react';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import Feature from 'ol/Feature';
import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';

export function useMapFeatureSync() {
    const { map } = useMapStore();
    const features = useNetworkStore((state) => state.features);

    useEffect(() => {
        if (!map) return;

        // 1. Find the Network Layer
        const networkLayer = map.getLayers().getArray().find(l => l.get('name') === 'network') as VectorLayer<VectorSource>;
        if (!networkLayer) return;

        const source = networkLayer.getSource();
        if (!source) return;

        // 2. Index Current Canvas Features (Lookup Map)
        const sourceFeaturesById = new Map<string, Feature>();
        source.getFeatures().forEach((f) => {
            const id = f.getId();
            if (id) sourceFeaturesById.set(id.toString(), f);
        });

        const featuresToAdd: Feature[] = [];
        const featuresToRemove: Feature[] = [];

        // 3. Diff: Compare Store vs Canvas
        features.forEach((storeFeature, id) => {
            const sourceFeature = sourceFeaturesById.get(id);

            if (!sourceFeature) {
                // Case A: New in Store -> Add to Canvas
                featuresToAdd.push(storeFeature);
            } else {
                // Case B: Exists -> Check if updated
                // If the object reference changed (e.g. from Restore), replace it.
                if (sourceFeature !== storeFeature) {
                    featuresToRemove.push(sourceFeature);
                    featuresToAdd.push(storeFeature);
                }
                // Mark as valid (don't delete)
                sourceFeaturesById.delete(id);
            }
        });

        // 4. Identify Deletes
        // Anything left in sourceFeaturesById is on the Canvas but NOT in the Store
        sourceFeaturesById.forEach((f) => {
            featuresToRemove.push(f);
        });

        // 5. Batch Updates (Performance)
        if (featuresToRemove.length > 0) {
            featuresToRemove.forEach(f => source.removeFeature(f));
        }

        if (featuresToAdd.length > 0) {
            source.addFeatures(featuresToAdd);
        }

        // Optional Debug
        if (featuresToAdd.length > 0 || featuresToRemove.length > 0) {
            console.debug(`Map Sync: +${featuresToAdd.length} / -${featuresToRemove.length}`);
        }

    }, [map, features]);
}