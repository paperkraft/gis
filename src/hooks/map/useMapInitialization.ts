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
import DragRotate from 'ol/interaction/DragRotate';
import { altKeyOnly } from 'ol/events/condition';
import { useEffect, useRef, useState } from 'react';

import { BoundaryLayer } from '@/lib/map/baseLayers';
import { getFeatureStyle } from '@/lib/styles/featureStyles';
import { handleZoomToExtent } from '@/lib/interactions/map-controls';
import { useMapStore } from '@/store/mapStore';
import TileLayer from 'ol/layer/Tile';
import { OSM, XYZ } from 'ol/source';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function useMapInitialization(mapTargetRef: React.RefObject<HTMLDivElement | null>) {

    const [vectorLayer, setVectorLayer] = useState<VectorLayer<VectorSource> | null>(null);
    const { setMap, setVectorSource, setZoom, setProjection } = useMapStore();

    const initializedRef = useRef(false);

    // --- 1. Create Map Instance ---
    useEffect(() => {
        if (!mapTargetRef.current || initializedRef.current) return;

        // Create Vector Source & Layer
        const source = new VectorSource();

        const networkLayer = new VectorLayer({
            source: source,
            style: (feature) => getFeatureStyle(feature as Feature<any>),
            properties: { name: 'network' },
            zIndex: 10,
        });

        const baseLayer = new TileLayer({
            source: new XYZ({
                url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
                crossOrigin: 'anonymous',
                attributions: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>',
                tileSize: 512,
            }),
            properties: {
                isBaseLayer: true,
                baseType: 'light'
            }
        });

        const layer = baseLayer || new TileLayer({
            source: new OSM({
                crossOrigin: 'anonymous'
            }),
            zIndex: 0,
            properties: {
                isBaseLayer: true,
                baseType: 'osm'
            }
        });

        // Create Map
        const map = new Map({
            target: mapTargetRef.current,

            layers: [
                layer,
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
                new DragRotate({
                    condition: altKeyOnly,
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

    // --- 2. Map Events (merged from useMapEvents) ---
    const map = useMapStore((s) => s.map);

    useEffect(() => {
        if (!map) return;

        // Initial state
        const view = map.getView();
        setZoom(view.getZoom() || 0);
        setProjection(view.getProjection().getCode());

        // Track zoom changes
        const handleMoveEnd = () => {
            const z = map.getView().getZoom();
            if (z !== undefined) setZoom(z);
        };
        map.on('moveend', handleMoveEnd);

        // Fit-to-extent custom events
        const handleFitToExtent = () => handleZoomToExtent(map);
        window.addEventListener('triggerFitToExtent', handleFitToExtent);
        window.addEventListener('fitToExtent', handleFitToExtent);

        return () => {
            map.un('moveend', handleMoveEnd);
            window.removeEventListener('triggerFitToExtent', handleFitToExtent);
            window.removeEventListener('fitToExtent', handleFitToExtent);
        };
    }, [map, setZoom, setProjection]);

    return {
        vectorLayer,
    };
}