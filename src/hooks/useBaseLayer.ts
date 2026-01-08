'use client'
import Graticule from 'ol/layer/Graticule';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { Stroke } from 'ol/style';
import { useCallback } from 'react';

import { useMapStore } from '@/store/mapStore';

export const MapboxStyle = {
    STREETS: 'mapbox/streets-v12',
    OUTDOORS: 'mapbox/outdoors-v12',
    LIGHT: 'mapbox/light-v11',
    DARK: 'mapbox/dark-v11',
    SATELLITE: 'mapbox/satellite-v9',
    SATELLITE_STREETS: 'mapbox/satellite-streets-v12',
};

export type BaseLayerType = 'streets' | 'satellite' | 'satellite-streets' | 'light' | 'dark' | 'outdoors' | 'blank' | 'osm';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function useBaseLayer() {
    const map = useMapStore((state) => state.map);

    const setBaseLayer = useCallback((type: BaseLayerType) => {
        if (!map) return;
        const layers = map.getLayers();

        // 1. MANAGE GRATICULE (GRID)
        let gridLayer = layers.getArray().find(l => l.get('isGrid')) as Graticule;
        if (!gridLayer) {
            gridLayer = new Graticule({
                strokeStyle: new Stroke({ color: 'rgba(0,0,0,0.1)', width: 1 }),
                wrapX: false,
                zIndex: 1,
                visible: false,
            });
            gridLayer.set('isGrid', true);
            map.addLayer(gridLayer);
        }

        if (type === 'blank') {
            gridLayer.setVisible(true);
            map.getTargetElement().style.backgroundColor = '#ffffff';
        } else {
            gridLayer.setVisible(false);
            map.getTargetElement().style.backgroundColor = '#eef0f4';
        }

        // 2. CREATE LAYER (With Fallback)
        const getOrCreateLayer = (layerType: BaseLayerType): TileLayer<any> | null => {
            if (layerType === 'blank') return null;

            // Check if layer already exists in the stack
            const existing = layers.getArray().find(l => l.get('baseType') === layerType);
            if (existing) return existing as TileLayer<any>;

            let source;

            // If user wants Mapbox but no token is found, fallback to OSM
            const isMapboxType = ['streets', 'outdoors', 'light', 'dark', 'satellite', 'satellite-streets'].includes(layerType);

            if (isMapboxType && !MAPBOX_TOKEN) {
                console.warn(`Mapbox Token missing. Falling back to OSM for layer: ${layerType}`);
                // For Satellite, OSM doesn't have a direct equivalent, so we map to OSM Standard (better than blank)
                // Or you could use a free satellite provider like Esri World Imagery here if you prefer.
                source = new OSM();
            }
            else if (layerType === 'osm') {
                source = new OSM();
            }
            else {
                // We have a token, or it's a type we can handle
                let styleId = MapboxStyle.STREETS;
                switch (layerType) {
                    case 'satellite': styleId = MapboxStyle.SATELLITE; break;
                    case 'satellite-streets': styleId = MapboxStyle.SATELLITE_STREETS; break;
                    case 'light': styleId = MapboxStyle.LIGHT; break;
                    case 'dark': styleId = MapboxStyle.DARK; break;
                    case 'outdoors': styleId = MapboxStyle.OUTDOORS; break;
                    case 'streets': default: styleId = MapboxStyle.STREETS; break;
                }

                source = new XYZ({
                    url: `https://api.mapbox.com/styles/v1/${styleId}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
                    attributions: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>',
                    tileSize: 512,
                });
            }

            const newLayer = new TileLayer({
                source: source,
                zIndex: 0,
                visible: false,
                preload: Infinity,
                properties: {
                    baseType: layerType,
                    isBaseLayer: true
                }
            });

            map.addLayer(newLayer);
            return newLayer;
        };

        // 3. TOGGLE VISIBILITY
        const targetLayer = getOrCreateLayer(type);

        layers.forEach((layer) => {
            if (!layer.get('isBaseLayer')) return;
            if (layer === targetLayer) {
                layer.setVisible(true);
            } else {
                layer.setVisible(false);
            }
        });

    }, [map]);

    return { setBaseLayer };
}