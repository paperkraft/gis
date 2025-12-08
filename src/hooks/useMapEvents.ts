import { Feature } from 'ol';
import Map from 'ol/Map';
import { toLonLat } from 'ol/proj';
import { useEffect, useRef } from 'react';

import { handleZoomToExtent } from '@/lib/interactions/map-controls';
import { isJunctionConnectedToLink } from '@/lib/styles/featureStyles';
import { useMapStore } from '@/store/mapStore';

interface UseMapEventsProps {
    map: Map | null;
}

export function useMapEvents({ map }: UseMapEventsProps) {
    const setCoordinates = useMapStore((state) => state.setCoordinates); // Use selector
    const setZoom = useMapStore((state) => state.setZoom); // Use selector
    const setProjection = useMapStore((state) => state.setProjection); // Use selector
    const lastUpdate = useRef(0); // For throttling

    useEffect(() => {
        if (!map) return;

        // 1. Initial State
        const view = map.getView();
        setZoom(view.getZoom() || 0);
        setProjection(view.getProjection().getCode());

        // 1. Coordinate Tracking
        const handlePointerMove = (event: any) => {
            // 1. Throttle Coordinate Updates (e.g., max 20 times per second)
            const now = Date.now();
            if (now - lastUpdate.current > 50) {
                const coord = event.coordinate;
                const [lon, lat] = toLonLat(coord);
                setCoordinates(`${lon.toFixed(4)}°N, ${lat.toFixed(4)}°E`);
                lastUpdate.current = now;
            }

            // 2. Cursor Logic (Keep instantaneous for responsiveness)
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
            } else {
                // Reset cursor if not drawing/modifying
                // Note: Be careful not to override drawing cursors
                if (map.getViewport().style.cursor === 'not-allowed') {
                    map.getViewport().style.cursor = 'default';
                    map.getViewport().title = '';
                }
            }
        };

        const handleMoveEnd = () => {
            const z = map.getView().getZoom();
            if (z !== undefined) setZoom(z);
        };

        map.on('pointermove', handlePointerMove);
        map.on('moveend', handleMoveEnd);

        // 2. Custom Event Listeners
        const handleFitToExtent = () => handleZoomToExtent(map);

        window.addEventListener('triggerFitToExtent', handleFitToExtent);
        window.addEventListener('fitToExtent', handleFitToExtent);

        return () => {
            map.un('pointermove', handlePointerMove);
            window.removeEventListener('triggerFitToExtent', handleFitToExtent);
            window.removeEventListener('fitToExtent', handleFitToExtent);
        };
    }, [map, setCoordinates, setZoom, setProjection]);
}