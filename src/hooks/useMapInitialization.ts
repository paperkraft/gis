'use client';

import { Feature } from 'ol';
import { defaults as defaultControls, ScaleLine } from 'ol/control';
import { Geometry } from 'ol/geom';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';
import DragPan from 'ol/interaction/DragPan';
import Kinetic from 'ol/Kinetic';
import VectorLayer from 'ol/layer/Vector';
import Map from 'ol/Map';
import { fromLonLat } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import View from 'ol/View';
import { useEffect, useRef, useState } from 'react';

import { BoundaryLayer } from '@/lib/map/baseLayers';
import { getFeatureStyle } from '@/lib/styles/featureStyles';
import { useMapStore } from '@/store/mapStore';
import TileLayer from 'ol/layer/Tile';
import { OSM } from 'ol/source';

export function useMapInitialization(mapTargetRef: React.RefObject<HTMLDivElement | null>) {

    const [vectorLayer, setVectorLayer] = useState<VectorLayer<any> | null>(null);
    const { setMap, setVectorSource } = useMapStore();

    const initializedRef = useRef(false);

    useEffect(() => {
        if (!mapTargetRef.current || initializedRef.current) return;

        // Create Vector Source & Layer
        const source = new VectorSource();

        const networkLayer = new VectorLayer({
            source: source,
            style: (feature) => getFeatureStyle(feature as Feature<Geometry>),
            properties: { name: 'network' },
            updateWhileAnimating: true,
            updateWhileInteracting: true,
            zIndex: 10,
        });

        // Create Map
        const map = new Map({
            target: mapTargetRef.current,

            layers: [
                new TileLayer({
                    source: new OSM(),
                    zIndex: 0,
                    properties: {
                        isBaseLayer: true,
                        baseType: 'osm',
                    }
                }),
                networkLayer,
                BoundaryLayer
            ],

            view: new View({
                center: fromLonLat([78.6677, 22.3511]),
                zoom: 4.5,
            }),

            controls: defaultControls({ zoom: false, attribution: true }).extend([
                new ScaleLine({ units: 'metric' }),
            ]),

            interactions: defaultInteractions({ dragPan: false, }).extend([
                new DragPan({
                    kinetic: new Kinetic(
                        0.005,   // decay: Friction (lower = slides longer)
                        1 / 10,  // minVelocity: Must flick faster than 0.1 px/ms to trigger
                        100      // delay: Time window to calculate flick speed
                    ),
                }),
            ]),
        });

        // Update Stores & State
        setMap(map);
        setVectorSource(source);
        setVectorLayer(networkLayer);
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