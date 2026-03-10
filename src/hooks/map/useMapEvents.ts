import Map from 'ol/Map';
import { toLonLat } from 'ol/proj';
import { useEffect, useRef } from 'react';

import { handleZoomToExtent } from '@/lib/interactions/map-controls';
import { useMapStore } from '@/store/mapStore';

interface UseMapEventsProps {
    map: Map | null;
}

export function useMapEvents({ map }: UseMapEventsProps) {
    const setProjection = useMapStore((state) => state.setProjection);
    const setZoom = useMapStore((state) => state.setZoom);

    useEffect(() => {
        if (!map) return;

        // 1. Initial State
        const view = map.getView();
        setZoom(view.getZoom() || 0);
        setProjection(view.getProjection().getCode());

        const handleMoveEnd = () => {
            const z = map.getView().getZoom();
            if (z !== undefined) setZoom(z);
        };

        map.on('moveend', handleMoveEnd);

        // 2. Custom Event Listeners
        const handleFitToExtent = () => handleZoomToExtent(map);

        window.addEventListener('triggerFitToExtent', handleFitToExtent);
        window.addEventListener('fitToExtent', handleFitToExtent);

        return () => {
            window.removeEventListener('triggerFitToExtent', handleFitToExtent);
            window.removeEventListener('fitToExtent', handleFitToExtent);
        };
    }, [map, setZoom, setProjection]);
}