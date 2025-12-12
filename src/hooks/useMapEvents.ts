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
    const setCoordinates = useMapStore((state) => state.setCoordinates);
    const setZoom = useMapStore((state) => state.setZoom);
    const setProjection = useMapStore((state) => state.setProjection);

    // Throttle Refs
    const lastCoordUpdate = useRef(0);
    const lastCursorUpdate = useRef(0);

    useEffect(() => {
        if (!map) return;

        // 1. Initial State
        const view = map.getView();
        setZoom(view.getZoom() || 0);
        setProjection(view.getProjection().getCode());

        // 1. Coordinate Tracking
        const handlePointerMove = (event: any) => {

            // A. Update Coordinates (Throttle ~20fps)
            const now = Date.now();
            if (now - lastCoordUpdate.current > 50) {
                const coord = event.coordinate;
                const [lon, lat] = toLonLat(coord);
                setCoordinates(`${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);
                lastCoordUpdate.current = now;
            }

            // B. Cursor Logic (Throttle ~30fps - heavy hit detection)
            if (now - lastCursorUpdate.current > 32) {

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
                    if (map.getViewport().style.cursor === 'not-allowed') {
                        map.getViewport().style.cursor = 'default';
                        map.getViewport().title = '';
                    }
                }

                lastCursorUpdate.current = now;
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