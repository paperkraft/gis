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

        // 1. Sync Store -> Map (Additions & Updates)
        const activeIds = new Set<string>();

        features.forEach((storeFeature, id) => {
            activeIds.add(id);
            const existingFeature = source.getFeatureById(id);

            if (!existingFeature) {
                // New feature
                source.addFeature(storeFeature);
            } else if (existingFeature !== storeFeature) {
                // Feature reference changed (e.g. undo/redo)
                // We update the geometry/props by replacing the feature
                source.removeFeature(existingFeature);
                source.addFeature(storeFeature);
            }
        });

        // 2. Sync Map -> Store (Deletions)
        // Efficiently remove features present on Map but not in Store
        // We iterate source features once.
        const featuresToRemove: any[] = [];
        source.forEachFeature((feature) => {
            const id = feature.getId();
            if (id && !activeIds.has(id.toString())) {
                featuresToRemove.push(feature);
            }
        });

        if (featuresToRemove.length > 0) {
            featuresToRemove.forEach(f => source.removeFeature(f));
        }

    }, [map, features]);
}