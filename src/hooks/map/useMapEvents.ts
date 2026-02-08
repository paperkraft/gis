import Map from 'ol/Map';
import { toLonLat } from 'ol/proj';
import { useEffect, useRef } from 'react';

import { handleZoomToExtent } from '@/lib/interactions/map-controls';
import { useMapStore } from '@/store/mapStore';

interface UseMapEventsProps {
    map: Map | null;
}

export function useMapEvents({ map }: UseMapEventsProps) {
    const setCoordinates = useMapStore((state) => state.setCoordinates);
    const setProjection = useMapStore((state) => state.setProjection);
    const setZoom = useMapStore((state) => state.setZoom);

    // Throttle Refs
    const lastCoordUpdate = useRef(0);

    useEffect(() => {
        if (!map) return;

        // 1. Initial State
        const view = map.getView();
        setZoom(view.getZoom() || 0);
        setProjection(view.getProjection().getCode());

        // 2. Coordinate Tracking
        const handlePointerMove = (event: any) => {

            // A. Update Coordinates (Throttle ~20fps)
            const now = Date.now();
            if (now - lastCoordUpdate.current > 50) {
                const coord = event.coordinate;
                const [lon, lat] = toLonLat(coord);
                setCoordinates(`${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);
                lastCoordUpdate.current = now;
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