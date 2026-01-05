import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import { useEffect, useRef } from 'react';

import { createCombinedFlowStyles } from '@/lib/styles/animatedFlowStyles';
import { getFeatureStyle } from '@/lib/styles/featureStyles';
import { useSimulationStore } from '@/store/simulationStore';
import { useUIStore } from '@/store/uiStore';
import { useStyleStore } from '@/store/styleStore';

interface UseLayerManagerProps {
    vectorLayer: VectorLayer<any> | null;
}

export function useLayerManager({ vectorLayer }: UseLayerManagerProps) {

    // 1. Get Animation State from Global Store
    const {
        layerVisibility,
        showPipeArrows,
        showLabels,
        isFlowAnimating,
        flowAnimationSpeed,
        flowAnimationStyle,
    } = useUIStore();

    // 2. Get Simulation & Style State
    const { results: simulationResults } = useSimulationStore();
    const {
        nodeColorMode,
        linkColorMode,
        nodeGradient,
        linkGradient,

        labelMode,
        minMax,
        styleType,
        classCount,
        layerStyles
    } = useStyleStore();

    // Local State for Animation
    const animationRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(Date.now());

    // 2. Animation Loop Logic
    useEffect(() => {
        if (!vectorLayer || !isFlowAnimating) {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            return;
        }

        // Reset start time on activation to prevent large jumps
        startTimeRef.current = Date.now();

        const animate = () => {
            if (vectorLayer) {
                vectorLayer.changed();
            }
            animationRef.current = requestAnimationFrame(animate);
        };

        // Start loop
        animate();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        };
    }, [isFlowAnimating, vectorLayer]);


    // 3. Style Application
    useEffect(() => {
        if (!vectorLayer) return;

        // Apply Visibility
        const source = vectorLayer.getSource();
        if (source) {
            source.getFeatures().forEach((feature: any) => {
                const featureType = feature.get('type');
                if (featureType) {
                    const isVisible = layerVisibility[featureType] !== false;
                    feature.set('hidden', !isVisible);
                }
            });
        }

        // Define Style Function
        vectorLayer.setStyle((feature) => {
            const styles = [];

            // A. Base Static Style
            const baseStyles = getFeatureStyle(feature as Feature);
            if (Array.isArray(baseStyles)) styles.push(...baseStyles);
            else styles.push(baseStyles);

            // B. Animated Flow Style
            if (
                feature.get('type') === 'pipe' &&
                isFlowAnimating &&
                !feature.get('hidden')
            ) {
                // Calculate Offset: (Elapsed Time * Speed * 20px/sec)
                const elapsed = (Date.now() - startTimeRef.current) / 1000;
                const animationOffset = elapsed * flowAnimationSpeed * 10;

                const animStyles = createCombinedFlowStyles(
                    feature as Feature,
                    animationOffset,
                    {
                        showDashes: ['dashes', 'combined'].includes(flowAnimationStyle),
                        showParticles: ['particles', 'combined'].includes(flowAnimationStyle),
                        showGlow: ['glow', 'combined'].includes(flowAnimationStyle),
                    }
                );
                styles.push(...animStyles);
            }
            return styles;
        });

        // Initial redraw to apply visibility changes immediately
        vectorLayer.changed();
    }, [
        vectorLayer,
        layerVisibility,
        showPipeArrows,
        showLabels,
        isFlowAnimating,
        flowAnimationSpeed,
        flowAnimationStyle,

        simulationResults,

        nodeColorMode,
        linkColorMode,
        nodeGradient,
        linkGradient,

        labelMode,
        minMax,
        styleType,
        classCount,
        layerStyles
    ]);
}