import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import { useEffect } from 'react';

import { createCombinedFlowStyles } from '@/lib/styles/animatedFlowStyles';
import { getFeatureStyle } from '@/lib/styles/featureStyles';
import { useSimulationStore } from '@/store/simulationStore';
import { useUIStore } from '@/store/uiStore';

interface UseLayerManagerProps {
    vectorLayer: VectorLayer<any> | null;
    flowAnimation: {
        isAnimating: boolean;
        animationTime: number;
        options: { style: 'dashes' | 'particles' | 'glow' | 'combined' };
    };
}

export function useLayerManager({ vectorLayer, flowAnimation }: UseLayerManagerProps) {
    const { layerVisibility, showPipeArrows, showLabels } = useUIStore();
    const { results } = useSimulationStore(); // Listen to results

    useEffect(() => {
        if (!vectorLayer) return;

        const source = vectorLayer.getSource();
        if (!source) return;

        // 1. Update Visibility Property
        source.getFeatures().forEach((feature: any) => {
            const featureType = feature.get('type');
            if (featureType) {
                const isVisible = layerVisibility[featureType] !== false;
                feature.set('hidden', !isVisible);
            }
        });

        // 2. Apply Styles (including animation)
        vectorLayer.setStyle((feature) => {
            const styles = [];
            const baseStyles = getFeatureStyle(feature as Feature);

            if (Array.isArray(baseStyles)) {
                styles.push(...baseStyles);
            } else {
                styles.push(baseStyles);
            }

            // Apply Flow Animation Overlays
            if (
                feature.get('type') === 'pipe' &&
                flowAnimation.isAnimating &&
                !feature.get('hidden')
            ) {
                const animStyles = createCombinedFlowStyles(
                    feature as Feature,
                    flowAnimation.animationTime,
                    {
                        showDashes: ['dashes', 'combined'].includes(flowAnimation.options.style),
                        showParticles: ['particles', 'combined'].includes(flowAnimation.options.style),
                        showGlow: ['glow', 'combined'].includes(flowAnimation.options.style),
                    }
                );
                styles.push(...animStyles);
            }
            return styles;
        });

        // FORCE REDRAW when results change
        vectorLayer.changed();
    }, [
        vectorLayer,
        layerVisibility,
        showPipeArrows,
        showLabels,
        flowAnimation.isAnimating,
        flowAnimation.animationTime,
        flowAnimation.options.style,
        results
    ]);
}