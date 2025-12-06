import { useEffect } from 'react';
import Snap from 'ol/interaction/Snap';
import { useMapStore } from '@/store/mapStore';
import { useUIStore } from '@/store/uiStore';

export function useSnapping() {
    const map = useMapStore((state) => state.map);
    const vectorSource = useMapStore((state) => state.vectorSource);
    const { isSnappingEnabled } = useUIStore();

    useEffect(() => {
        if (!map || !vectorSource || !isSnappingEnabled) return;

        // Create Snap interaction
        const snap = new Snap({
            source: vectorSource,
            pixelTolerance: 10, // Sensitivity
            // We can filter if needed, but snapping to everything is usually fine
        });

        map.addInteraction(snap);

        return () => {
            map.removeInteraction(snap);
        };
    }, [map, vectorSource, isSnappingEnabled]);
}