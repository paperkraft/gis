import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import Map from 'ol/Map';
import { fromLonLat } from 'ol/proj';
import { XYZ } from 'ol/source';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import View from 'ol/View';
import { useEffect, useRef, useState } from 'react';

import { mapbox_token } from '@/constants/map';
import { handleZoomToExtent } from '@/lib/interactions/map-controls';
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

        // 2. Initialize Base Layers (All hidden except default)
        // OSM (Default)
        const osmLayer = new TileLayer({
            source: new OSM(),
            visible: true,
            properties: { name: 'osm', title: 'OpenStreetMap', type: 'base' },
        });

        // Satellite (Esri World Imagery)
        const satelliteLayer = new TileLayer({
            source: new XYZ({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            }),
            visible: false,
            properties: { name: 'satellite', title: 'Satellite', type: 'base' },
        });

        // Terrain (Esri World Topo)
        const terrainLayer = new TileLayer({
            source: new XYZ({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
                // url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
            }),
            visible: false,
            properties: { name: 'terrain', title: 'Terrain', type: 'base' },
        });

        // Mapbox
        const mapboxLayer = new TileLayer({
            source: new XYZ({
                url: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${mapbox_token}`,
                crossOrigin: 'anonymous',
            }),
            visible: false,
            properties: { name: 'mapbox', title: 'Mapbox Streets', type: 'base' },
        });

        // 3. Create Map
        const map = new Map({
            target: mapTargetRef.current,
            layers: [osmLayer, satelliteLayer, mapboxLayer, terrainLayer, vecLayer],
            view: new View({
                center: fromLonLat([74.2381, 16.7012]),
                zoom: 16,
            }),
            controls: [], // Custom controls only
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