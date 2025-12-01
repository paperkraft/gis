import { Feature } from 'ol';
import Map from 'ol/Map';
import { toLonLat } from 'ol/proj';
import { useEffect } from 'react';

import { handleZoomToExtent } from '@/lib/interactions/map-controls';
import { isJunctionConnectedToLink } from '@/lib/styles/featureStyles';
import { useMapStore } from '@/store/mapStore';

interface UseMapEventsProps {
    map: Map | null;
}

export function useMapEvents({ map }: UseMapEventsProps) {
    const { setCoordinates } = useMapStore();

    useEffect(() => {
        if (!map) return;

        // 1. Coordinate Tracking
        const handlePointerMove = (event: any) => {
            const coord = event.coordinate;
            const [lon, lat] = toLonLat(coord);
            setCoordinates(`${lon.toFixed(4)}°N, ${lat.toFixed(4)}°E`);


            // Cursor and Tooltip logic for special junctions
            const feature = map.forEachFeatureAtPixel(
                event.pixel,
                (f) => f as Feature,
                { hitTolerance: 5 }
            );

            if (feature && feature.get('type') === 'junction') {
                const isLinkJunction = isJunctionConnectedToLink(feature);
                if (isLinkJunction) {
                    map.getViewport().style.cursor = 'not-allowed';
                    map.getViewport().title = 'This junction is part of a pump/valve. Move the pump/valve to reposition.';
                } else {
                    map.getViewport().style.cursor = 'pointer';
                    map.getViewport().title = '';
                }
            }
        };

        map.on('pointermove', handlePointerMove);

        // 2. Custom Event Listeners
        const handleFitToExtent = () => handleZoomToExtent(map);

        window.addEventListener('triggerFitToExtent', handleFitToExtent);
        window.addEventListener('fitToExtent', handleFitToExtent);

        return () => {
            map.un('pointermove', handlePointerMove);
            window.removeEventListener('triggerFitToExtent', handleFitToExtent);
            window.removeEventListener('fitToExtent', handleFitToExtent);
        };
    }, [map, setCoordinates]);
}