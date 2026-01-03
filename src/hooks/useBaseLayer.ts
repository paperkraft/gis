'use client'
import Graticule from 'ol/layer/Graticule';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { Stroke } from 'ol/style';
import { useCallback } from 'react';

import { useMapStore } from '@/store/mapStore';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.YOUR_TOKEN_HERE";

export type BaseLayerType = 'osm' | 'satellite' | 'light' | 'dark' | 'mapbox' | 'terrain' | 'blank';

export function useBaseLayer() {
    const map = useMapStore((state) => state.map);

    const setBaseLayer = useCallback((type: BaseLayerType) => {
        if (!map) return;
        const layers = map.getLayers();

        const defaultLayer = layers.item(0);
        if (defaultLayer instanceof TileLayer && !defaultLayer.get('isBaseLayer')) {
            defaultLayer.set('isBaseLayer', true);
            defaultLayer.set('baseType', 'osm');
            defaultLayer.setZIndex(0);
        }

        // 1. MANAGE GRATICULE (GRID)
        let gridLayer = layers.getArray().find(l => l.get('isGrid')) as Graticule;

        if (!gridLayer) {
            gridLayer = new Graticule({
                strokeStyle: new Stroke({ color: 'rgba(0,0,0,0.1)', width: 1 }),
                // showLabels: true,
                wrapX: false,
                zIndex: 1, // Just above base maps
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
            map.getTargetElement().style.backgroundColor = '';
        }

        // 2. MANAGE BASE LAYERS (Toggle Visibility)

        const getOrCreateLayer = (layerType: BaseLayerType): TileLayer<any> | null => {
            if (layerType === 'blank') return null; // Blank is handled by Graticule above

            // Check if layer exists
            const existing = layers.getArray().find(l => l.get('baseType') === layerType);
            if (existing) return existing as TileLayer<any>;

            // If not, create it
            let source;
            switch (layerType) {
                // 1. SATELLITE (Esri World Imagery)
                case 'satellite':
                    source = new XYZ({
                        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                        maxZoom: 19,
                        attributions: 'Tiles © Esri'
                    });
                    break;

                // 2. LIGHT (CartoDB Positron)
                case 'light':
                    source = new XYZ({
                        url: 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                        attributions: '© CARTO'
                    });
                    break;

                // 3. DARK (CartoDB Dark Matter)
                case 'dark':
                    source = new XYZ({
                        url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                        attributions: '© CARTO'
                    });
                    break;

                // 4. MAPBOX (Streets v11)
                case 'mapbox':
                    source = new XYZ({
                        // You can change 'streets-v11' to 'outdoors-v11', 'light-v10', etc.
                        url: `https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
                        tileSize: 512,
                        attributions: '© Mapbox',
                        // Mapbox 512px tiles offset fix
                        tileGrid: undefined // OL handles standard XYZ well, sometimes projection tweaking is needed for 512
                    });
                    break;

                // 5. TERRAIN (OpenTopoMap or Esri World Topo)
                case 'terrain':
                    source = new XYZ({
                        url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
                        maxZoom: 17,
                        attributions: 'Map data: © OpenStreetMap, SRTM | Map style: © OpenTopoMap'
                    });
                    break;

                // 6. STANDARD (OSM)
                case 'osm':
                default:
                    source = new OSM();
                    break;
            }

            const newLayer = new TileLayer({
                source,
                zIndex: 0, // Ensure it sits at the bottom
                visible: false, // Start hidden
                preload: Infinity, // Optional: aggressive caching
            });

            newLayer.set('baseType', layerType); // Tag it
            newLayer.set('isBaseLayer', true);   // Tag as base
            map.addLayer(newLayer);

            return newLayer;
        }

        // A. Ensure the target layer exists and is visible
        const targetLayer = getOrCreateLayer(type);
        layers.forEach((layer) => {
            // Skip the Grid and Network layers
            if (layer.get('isGrid') || layer.get('name') === 'network') return;

            // If it's the target, show it
            if (layer === targetLayer) {
                layer.setVisible(true);
            }
            // If it's ANY OTHER base layer (including the default one), hide it
            else if (layer instanceof TileLayer && (layer.get('isBaseLayer') || layer.getZIndex() === 0)) {
                layer.setVisible(false);
            }
        });
    }, [map]);

    return { setBaseLayer };
}