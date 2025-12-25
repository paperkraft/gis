import TileLayer from 'ol/layer/Tile';
import { TileWMS, XYZ } from 'ol/source';
import OSM from 'ol/source/OSM';
import Map from 'ol/Map';
import { mapbox_token, layerType } from '@/constants/map';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Fill, Stroke, Style } from 'ol/style';

export const createBaseLayers = (): TileLayer[] => {

    // Bhuvan Boundaries
    const bhuvanLayer = new TileLayer({
        source: new TileWMS({
            url: "https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms",
            params: {
                'LAYERS': "admin:world_final",
                'TILED': true,
                'TRANSPARENT': true,
                'FORMAT': 'image/png'
            },
            serverType: "geoserver",
            transition: 0,
        }),
        minZoom: 1,
        maxZoom: 12,
        zIndex: 1,
        visible: true,
        className: 'bhuvan-layer-filter',
        properties: { name: 'bhuvan', title: 'Bhuvan Boundaries', type: 'overlay' },

    });

    // 1. OSM (OpenStreetMap)
    const osmLayer = new TileLayer({
        source: new OSM(),
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
export const indiaBoundaryLayer = new VectorLayer({
    source: new VectorSource({
        // url: 'https://raw.githubusercontent.com/paperkraft/maps/main/india-osm.geojson',
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
    zIndex: 1, // Above base map, below network
    properties: { name: 'india-boundary', title: 'India Boundary', type: 'overlay' },
});