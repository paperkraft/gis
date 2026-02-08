import { useEffect, useRef } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useMapStore } from '@/store/mapStore';
import { Style, Stroke, Circle, Fill } from 'ol/style';
import { Feature } from 'ol';

const STYLE_A = new Style({
    stroke: new Stroke({ color: '#a855f7', width: 6 }), // Tailwind Purple-500
    zIndex: 9999
});

const STYLE_B = new Style({
    stroke: new Stroke({ color: '#f97316', width: 6 }), // Tailwind Orange-500
    zIndex: 9999
});

const STYLE_NODE = new Style({
    image: new Circle({
        radius: 8,
        fill: new Fill({ color: '#ef4444' }), // Red
        stroke: new Stroke({ color: '#fff', width: 2 }),
    }),
    zIndex: 10000
});

export function useMergeHighlight() {
    const { mergeContext } = useUIStore();
    const { vectorSource } = useMapStore();
    const highlightedRef = useRef<{ feature: Feature, originalStyle: any }[]>([]);

    useEffect(() => {
        // Cleanup
        highlightedRef.current.forEach(({ feature }) => feature.setStyle(undefined));
        highlightedRef.current = [];

        if (!mergeContext || !vectorSource) return;

        const { pipeA, pipeB, node } = mergeContext;

        const apply = (f: Feature, style: Style) => {
            highlightedRef.current.push({ feature: f, originalStyle: null });
            f.setStyle(style);
        };

        if (pipeA) apply(pipeA, STYLE_A);
        if (pipeB) apply(pipeB, STYLE_B);
        if (node) apply(node, STYLE_NODE);

        return () => {
            highlightedRef.current.forEach(({ feature }) => feature.setStyle(undefined));
            highlightedRef.current = [];
        };
    }, [mergeContext, vectorSource]);
}