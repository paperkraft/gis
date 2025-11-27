import { useEffect, useRef, useState } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { AnimatedFlowRenderer } from '@/lib/styles/animatedFlowStyles';

export interface FlowAnimationOptions {
    enabled: boolean;
    speed: number; // 0.5 to 3.0
    style: 'dashes' | 'particles' | 'glow' | 'combined';
}

/**
 * Hook to manage animated water flow in pipes
 */
export function useFlowAnimation(
    vectorLayer: VectorLayer<VectorSource> | null,
    initialOptions: FlowAnimationOptions = {
        enabled: false,
        speed: 1,
        style: 'dashes',
    }
) {
    const [options, setOptions] = useState<FlowAnimationOptions>(initialOptions);
    const [animationTime, setAnimationTime] = useState(0);
    const rendererRef = useRef<AnimatedFlowRenderer | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Initialize renderer
    useEffect(() => {
        if (vectorLayer && !rendererRef.current) {
            rendererRef.current = new AnimatedFlowRenderer(vectorLayer);
        }
    }, [vectorLayer]);

    // Start/stop animation based on enabled state
    useEffect(() => {
        if (!rendererRef.current) return;

        if (options.enabled) {
            startAnimation();
        } else {
            stopAnimation();
        }

        return () => stopAnimation();
    }, [options.enabled, options.speed]);

    const startAnimation = () => {
        if (animationFrameRef.current) return;

        const startTime = Date.now();

        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000; // seconds
            setAnimationTime(elapsed * options.speed);

            if (rendererRef.current) {
                rendererRef.current.setSpeed(2 * options.speed);
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        if (rendererRef.current) {
            rendererRef.current.startAnimation();
        }

        animate();
    };

    const stopAnimation = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (rendererRef.current) {
            rendererRef.current.stopAnimation();
        }
    };

    const toggleAnimation = () => {
        setOptions(prev => ({ ...prev, enabled: !prev.enabled }));
    };

    const setSpeed = (speed: number) => {
        setOptions(prev => ({ ...prev, speed: Math.max(0.1, Math.min(3, speed)) }));
    };

    const setStyle = (style: FlowAnimationOptions['style']) => {
        setOptions(prev => ({ ...prev, style }));
    };

    const getCurrentOffset = (): number => {
        return rendererRef.current?.getOffset() || 0;
    };

    return {
        options,
        animationTime,
        isAnimating: options.enabled,
        toggleAnimation,
        setSpeed,
        setStyle,
        startAnimation,
        stopAnimation,
        getCurrentOffset,
    };
}
