import GeoJSON from 'ol/format/GeoJSON';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import Map from 'ol/Map';
import { XYZ } from 'ol/source';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { Stroke, Style } from 'ol/style';

import { layerType, mapbox_token } from '@/constants/map';

export const createBaseLayers = (): TileLayer[] => {

    // 1. OSM (OpenStreetMap)
    const osmLayer = new TileLayer({
        source: new OSM({
            crossOrigin: 'anonymous'
        }),
        visible: true, // Default visible
        properties: { name: 'osm', title: 'OpenStreetMap', type: 'base' },
        zIndex: 0
    });

    // 2. Mapbox Streets
    const mapboxLayer = new TileLayer({
        source: new XYZ({
            url: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${mapbox_token}`,
            crossOrigin: 'anonymous',
            attributions: "Tiles © Mapbox",
        }),
        visible: false,
        properties: { name: 'mapbox', title: 'Mapbox Streets', type: 'base' },
        zIndex: 0
    });

    // 3. Satellite (Esri World Imagery)
    const satelliteLayer = new TileLayer({
        source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            crossOrigin: 'anonymous',
            attributions: "Tiles © Esri",
        }),
        visible: false,
        properties: { name: 'satellite', title: 'Satellite', type: 'base' },
        zIndex: 0
    });

    // 4. Terrain (Esri World Topo)
    const terrainLayer = new TileLayer({
        source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
            crossOrigin: 'anonymous',
            attributions: "Tiles © Esri",
        }),
        visible: false,
        properties: { name: 'terrain', title: 'Terrain', type: 'base' },
        zIndex: 0
    });

    // Return all layers
    return [osmLayer, mapboxLayer, satelliteLayer, terrainLayer];
};

/**
 * Efficiently switches the active base layer by toggling visibility
 */
export const switchBaseLayer = (map: Map, activeLayerId: layerType) => {
    const layers = map.getLayers().getArray();

    layers.forEach((layer) => {
        // Only target layers marked as 'base'
        if (layer.get('type') === 'base') {
            const layerName = layer.get('name');
            // Set visible if names match
            layer.setVisible(layerName === activeLayerId);
        }
    });
};


// India Boundary Layer (Vector GeoJSON)
export const BoundaryLayer = new VectorLayer({
    source: new VectorSource({
        url: '/india-osm.geojson',
        format: new GeoJSON(),
    }),
    style: new Style({
        stroke: new Stroke({
            // color: '#707070',
            color: 'rgb(191 170 185)',
            width: 1.5,
        }),
    }),
    zIndex: 5, // Above base map, below network
    visible: true,
    properties: { name: 'india-boundary', title: 'India Boundary', type: 'overlay' },
});