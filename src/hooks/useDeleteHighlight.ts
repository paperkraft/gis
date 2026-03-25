import { useEffect, useRef } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useMapStore } from '@/store/mapStore';
import { Style, Stroke, Circle, Fill } from 'ol/style';
import { Feature } from 'ol';
import { createEmpty, extend } from 'ol/extent';

// Define the "Warning" Style
const HIGHLIGHT_STYLE = new Style({
    stroke: new Stroke({
        color: '#ef4444', // Tailwind Red-500
        width: 3,
        lineDash: [10, 10], // Dashed to indicate "to be cut"
    }),
    image: new Circle({
        radius: 6,
        fill: new Fill({ color: '#ef4444' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 }),
    }),
    zIndex: 9999, // Always on top
});

export function useDeleteHighlight() {
    const { deleteContext } = useUIStore();
    const { vectorSource, map } = useMapStore();

    // Keep track of which features we modified so we can clean them up
    const highlightedFeaturesRef = useRef<Feature[]>([]);

    useEffect(() => {
        // 1. CLEANUP PREVIOUS (Always revert styles first)
        highlightedFeaturesRef.current.forEach(f => f.setStyle(undefined)); // null = revert to layer style
        highlightedFeaturesRef.current = [];

        // 2. CHECK IF ACTIVE
        if (!deleteContext || !vectorSource || !map) return;

        const { affectedIds } = deleteContext.impact;

        // 3. APPLY NEW HIGHLIGHTS
        affectedIds.forEach(id => {
            const feature = vectorSource.getFeatureById(id);
            if (feature) {
                // Apply the red warning style
                feature.setStyle(HIGHLIGHT_STYLE);
                highlightedFeaturesRef.current.push(feature);
            }
        });

        // Cleanup function for when modal closes (cancel/confirm)
        return () => {
            highlightedFeaturesRef.current.forEach(f => f.setStyle(undefined));
            highlightedFeaturesRef.current = [];
        };

    }, [deleteContext, vectorSource]);
}