'use client';

import { defaults as defaultControls, ScaleLine } from 'ol/control';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';
import DragRotateAndZoom from 'ol/interaction/DragRotateAndZoom.js';
import VectorLayer from 'ol/layer/Vector';
import Map from 'ol/Map';
import { fromLonLat } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import View from 'ol/View';
import { useEffect, useRef, useState } from 'react';

import { createBaseLayers, indiaBoundaryLayer } from '@/lib/map/baseLayers';
import { getFeatureStyle } from '@/lib/styles/featureStyles';
import { useMapStore } from '@/store/mapStore';

export function useMapInitialization(mapTargetRef: React.RefObject<HTMLDivElement | null>) {

    const [vectorLayer, setVectorLayer] = useState<VectorLayer<any> | null>(null);
    const { setMap, setVectorSource } = useMapStore();

    const initializedRef = useRef(false);

    useEffect(() => {
        if (!mapTargetRef.current || initializedRef.current) return;

        // 1. Create Vector Source & Layer
        const vectorSource = new VectorSource();

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
                zoom: 4.5,
            }),
            controls: defaultControls({ zoom: false, attribution: true }).extend([
                new ScaleLine({ units: 'metric' }),
            ]),
            // interactions: defaultInteractions().extend([new DragRotateAndZoom()]),
        });

        // 4. Update Stores & State
        setMap(map);
        setVectorSource(vectorSource);
        setVectorLayer(vecLayer);
        initializedRef.current = true;


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