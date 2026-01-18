import { useEffect } from 'react';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';

export function useMapFeatureSync() {
    const { map } = useMapStore();
    const features = useNetworkStore((state) => state.features);

    useEffect(() => {
        if (!map) return;

        const networkLayer = map.getLayers().getArray().find(l => l.get('name') === 'network') as VectorLayer<VectorSource>;
        if (!networkLayer) return;

        const source = networkLayer.getSource();
        if (!source) return;

        const activeIds = new Set<string>();

        // 1. Sync Store -> Map
        features.forEach((storeFeature, id) => {
            activeIds.add(id);
            const mapFeature = source.getFeatureById(id);

            if (!mapFeature) {
                // CASE A: New Feature -> Add it
                source.addFeature(storeFeature);
            }
            else if (mapFeature !== storeFeature) {
                // CASE B: Feature exists but reference changed (e.g. Redo/Reload)
                const newGeom = storeFeature.getGeometry();
                const newProps = storeFeature.getProperties();

                // 1. Update Geometry (This restores vertices!)
                if (newGeom) {
                    mapFeature.setGeometry(newGeom.clone());
                }

                // 2. Update Properties
                mapFeature.setProperties(newProps);

                // 3. Force Redraw
                mapFeature.changed();
            }
        });

        // 2. Sync Map -> Store (Deletions)
        const featuresToRemove: Feature[] = [];
        source.forEachFeature((feature) => {
            const id = feature.getId();
            if (id && !activeIds.has(id.toString())) {
                // If it's on the map but not in the store, delete it
                featuresToRemove.push(feature as Feature);
            }
        });

        featuresToRemove.forEach(f => source.removeFeature(f));

    }, [map, features]);
}