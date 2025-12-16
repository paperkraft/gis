import { useEffect } from 'react';
import { useSimulationStore } from '@/store/simulationStore';

export function useSimulationSync({ vectorLayer }: { vectorLayer: any }) {
    // Listen to these specific changes in the store
    const currentTimeIndex = useSimulationStore(state => state.currentTimeIndex);
    const isPlaying = useSimulationStore(state => state.isPlaying);
    const nextStep = useSimulationStore(state => state.nextStep);

    // 1. Playback Logic (If not already handled by your Panel)
    // If your Panel handles the interval, you can remove this useEffect.
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                nextStep();
            }, 1000); // Speed: 1 second per time step
        }
        return () => clearInterval(interval);
    }, [isPlaying, nextStep]);

    // 2. Map Redraw Logic (The Critical Part)
    // Whenever 'currentTimeIndex' changes (via slider or play), force the map to repaint.
    useEffect(() => {
        if (vectorLayer) {
            // This triggers the style function to run again for all features.
            // Your featureStyles.ts will then read the NEW data for the current time.
            vectorLayer.changed();
        }
    }, [currentTimeIndex, vectorLayer]);
}