import { defaults as defaultControls, ScaleLine } from 'ol/control';
import VectorLayer from 'ol/layer/Vector';
import Map from 'ol/Map';
import { fromLonLat } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import View from 'ol/View';
import { useEffect, useRef, useState } from 'react';

import { handleZoomToExtent } from '@/lib/interactions/map-controls';
import { createBaseLayers, indiaBoundaryLayer } from '@/lib/map/baseLayers';
import { getFeatureStyle } from '@/lib/styles/featureStyles';
import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';

export function useMapInitialization(mapTargetRef: React.RefObject<HTMLDivElement | null>) {

    const [vectorLayer, setVectorLayer] = useState<VectorLayer<any> | null>(null);
    const { features } = useNetworkStore();
    const { setMap, setVectorSource } = useMapStore();
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!mapTargetRef.current || initializedRef.current) return;

        // 1. Create Vector Source & Layer
        const vectorSource = new VectorSource();

        // Restore existing features
        if (features && features.size > 0) {
            vectorSource.addFeatures(Array.from(features.values()));
        }

        const vecLayer = new VectorLayer({
            source: vectorSource,
            style: (feature) => getFeatureStyle(feature as any),
            properties: { name: 'network' },
            updateWhileAnimating: true,
            updateWhileInteracting: true,
            zIndex: 100,
        });

        // 2. Initialize Base Layers
        const baseLayers = createBaseLayers();

        // 3. Create Map
        const map = new Map({
            target: mapTargetRef.current,
            layers: [...baseLayers, vecLayer, indiaBoundaryLayer],
            view: new View({
                center: fromLonLat([78.6677, 22.3511]),
                zoom: 5,
            }),
            controls: defaultControls({ zoom: false, attribution: true }).extend([
                new ScaleLine({ units: 'metric' }),
            ]),
        });

        // 4. Update Stores & State
        setMap(map);
        setVectorSource(vectorSource);
        setVectorLayer(vecLayer);
        initializedRef.current = true;

        // 5. Initial Zoom
        if (features.size > 0) {
            setTimeout(() => {
                handleZoomToExtent(map);
            }, 100);
        }

        return () => {
            map.setTarget(undefined);
            setMap(null as any);
            initializedRef.current = false;
        };
    }, []);

    return {
        vectorLayer,
    };
}