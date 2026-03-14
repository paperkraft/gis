import { useEffect } from 'react';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Point, LineString } from 'ol/geom';
import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';
import { createFeatureFromData } from '@/lib/utils/featureUtils';

// Re-export for backwards compatibility — prefer importing from @/lib/utils/featureUtils directly
export { createFeatureFromData } from '@/lib/utils/featureUtils';

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
            const olFeatures = Array.from(initialFeatures.values()).map(createFeatureFromData);
            source.addFeatures(olFeatures);
        }

        let lastVersion = useNetworkStore.getState().version;

        const unsubscribe = useNetworkStore.subscribe((state, prevState) => {
            if (state.version === lastVersion) return;

            // Detect full reload (Undo/Redo/LoadProject)
            const isFullReload =
                state.features !== prevState.features ||
                (state.features.size === 0 && source.getFeatures().length > 0) ||
                Math.abs(state.features.size - source.getFeatures().length) > 50;

            if (isFullReload) {
                source.clear();
                const olFeatures = Array.from(state.features.values()).map(createFeatureFromData);
                source.addFeatures(olFeatures);
            } else {
                // Delta Sync
                // 1. Process deletions in bulk
                if (state.deletedIds.size > 0) {
                    const featuresToRemove: any[] = [];
                    state.deletedIds.forEach(id => {
                        const f = source.getFeatureById(id);
                        if (f) featuresToRemove.push(f);
                    });
                    if (featuresToRemove.length > 0) {
                        featuresToRemove.forEach(f => source.removeFeature(f));
                    }
                }

                // 2. Process modified (adds and updates)
                if (state.modifiedIds.size > 0) {
                    const featuresToAdd: any[] = [];
                    state.modifiedIds.forEach(id => {
                        const storeFeatureData = state.features.get(id);
                        if (storeFeatureData) {
                            const mapFeature = source.getFeatureById(id);
                            if (!mapFeature) {
                                featuresToAdd.push(createFeatureFromData(storeFeatureData));
                            } else {
                                // Optimized update check: Only update if not currently being interacted with in UI
                                if (!mapFeature.get('isModifying') && !mapFeature.get('isDragging')) {
                                    const currentGeom = mapFeature.getGeometry();
                                    const newCoords = storeFeatureData.geometry;

                                    if (storeFeatureData.type === 'pipe' || storeFeatureData.type === 'visual') {
                                        if (currentGeom && currentGeom.getType() === 'LineString') {
                                            (currentGeom as LineString).setCoordinates(newCoords as number[][]);
                                        } else {
                                            mapFeature.setGeometry(new LineString(newCoords as number[][]));
                                        }
                                    } else {
                                        if (currentGeom && currentGeom.getType() === 'Point') {
                                            (currentGeom as Point).setCoordinates(newCoords as number[]);
                                        } else {
                                            mapFeature.setGeometry(new Point(newCoords as number[]));
                                        }
                                    }
                                }

                                // Attribute update (only if properties actually changed or were forced)
                                mapFeature.setProperties(storeFeatureData.properties);
                            }
                        }
                    });

                    if (featuresToAdd.length > 0) {
                        source.addFeatures(featuresToAdd);
                    }
                }
            }
            lastVersion = state.version;
        });

        return unsubscribe;

    }, [map]);
}