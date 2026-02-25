import { useEffect } from 'react';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';

export function useMapFeatureSync() {
    const { map } = useMapStore();

    useEffect(() => {
        if (!map) return;

        const networkLayer = map.getLayers().getArray().find(l => l.get('name') === 'network') as VectorLayer<VectorSource> | undefined;
        if (!networkLayer) return;

        const source = networkLayer.getSource();
        if (!source) return;

        // Perform initial sync
        const initialFeatures = useNetworkStore.getState().features;
        if (source.getFeatures().length === 0 && initialFeatures.size > 0) {
            source.addFeatures(Array.from(initialFeatures.values()));
        }

        let lastVersion = useNetworkStore.getState().version;

        const unsubscribe = useNetworkStore.subscribe((state, prevState) => {
            if (state.version === lastVersion) return;

            // Detect full reload (Undo/Redo/LoadProject)
            // state.features is completely replaced on Undo/Redo or load
            const isFullReload =
                state.features !== prevState.features ||
                (state.features.size === 0 && source.getFeatures().length > 0) ||
                Math.abs(state.features.size - source.getFeatures().length) > 50;

            if (isFullReload) {
                source.clear();
                // To avoid freezing UI entirely, we batch add
                source.addFeatures(Array.from(state.features.values()));
            } else {
                // Delta Sync
                // 1. Process deletions
                state.deletedIds.forEach(id => {
                    const f = source.getFeatureById(id);
                    if (f) source.removeFeature(f);
                });

                // 2. Process modified (adds and updates)
                state.modifiedIds.forEach(id => {
                    const storeFeature = state.features.get(id);
                    if (storeFeature) {
                        const mapFeature = source.getFeatureById(id);
                        if (!mapFeature) {
                            source.addFeature(storeFeature);
                        } else if (mapFeature !== storeFeature) {
                            const newGeom = storeFeature.getGeometry();
                            if (newGeom) mapFeature.setGeometry(newGeom.clone());
                            mapFeature.setProperties(storeFeature.getProperties());
                            mapFeature.changed();
                        }
                    }
                });
            }
            lastVersion = state.version;
        });

        return unsubscribe;

    }, [map]);
}