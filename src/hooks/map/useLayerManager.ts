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

        labelSettings,
        selectedProps,
        minMax,
        styleType,
        classCount,
        layerStyles,
        nodeClassification,
        linkClassification,
        nodeCustomBreaks,
        linkCustomBreaks,
        nodeReverse,
        linkReverse
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
        vectorLayer.setStyle((feature, resolution) => {
            const baseStyle = getFeatureStyle(feature as Feature, resolution) as any;

            if (isFlowAnimating && feature.get("type") === "pipe") {
                const animationTime = (Date.now() - startTimeRef.current) / 1000 * (flowAnimationSpeed || 1);

                const flowStyles = createCombinedFlowStyles(
                    feature as Feature,
                    animationTime,
                    {
                        showDashes: flowAnimationStyle === 'dashes' || flowAnimationStyle === 'combined',
                        showParticles: flowAnimationStyle === 'particles' || flowAnimationStyle === 'combined',
                        showGlow: flowAnimationStyle === 'glow' || flowAnimationStyle === 'combined',
                    }
                );

                return Array.isArray(baseStyle) ? [...baseStyle, ...flowStyles] : [baseStyle, ...flowStyles];
            }
            return baseStyle;
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

        labelSettings,
        selectedProps,

        minMax,
        styleType,
        classCount,
        layerStyles,
        nodeClassification,
        linkClassification,
        nodeCustomBreaks,
        linkCustomBreaks,
        nodeReverse,
        linkReverse
    ]);
}