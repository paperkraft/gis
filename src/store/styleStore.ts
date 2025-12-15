import { create } from 'zustand';

export type ColorMode = 'none' | 'diameter' | 'roughness' | 'pressure' | 'velocity' | 'head' | 'flow';
export type LabelMode = 'id' | 'elevation' | 'diameter' | 'result';
export type StyleType = 'continuous' | 'discrete';

export interface GradientStop {
    offset: number; // 0 to 100
    color: string;  // Hex code "#RRGGBB"
}

interface StyleState {
    colorMode: ColorMode;
    labelMode: LabelMode;

    // Ranges for auto-scaling colors
    minMax: Record<string, { min: number, max: number }>;

    //Gradient Configuration
    gradientStops: GradientStop[];
    styleType: StyleType;
    classCount: number; // 2 to 8

    setColorMode: (mode: ColorMode) => void;
    setLabelMode: (mode: LabelMode) => void;
    updateMinMax: (metric: string, min: number, max: number) => void;
    setGradientStops: (stops: GradientStop[]) => void;
    setStyleType: (type: StyleType) => void;
    setClassCount: (count: number) => void;
}

export const useStyleStore = create<StyleState>((set) => ({
    colorMode: 'none',
    labelMode: 'id',
    minMax: {
        pressure: { min: 0, max: 80 },  // Typical PSI range
        velocity: { min: 0, max: 2 },   // Typical m/s range
        diameter: { min: 0, max: 500 }, // mm
        roughness: { min: 80, max: 140 }, // C-factor
        flow: { min: 0, max: 100 },      // GPM/LPS
        head: { min: 0, max: 100 }
    },

    gradientStops: [
        { offset: 0, color: '#440154' },
        { offset: 25, color: '#3b528b' },
        { offset: 50, color: '#21918c' },
        { offset: 75, color: '#5ec962' },
        { offset: 100, color: '#fde725' }
    ],

    styleType: 'continuous',
    classCount: 5,

    setColorMode: (mode) => set({ colorMode: mode }),
    setLabelMode: (mode) => set({ labelMode: mode }),

    updateMinMax: (metric, min, max) => set((state) => ({
        minMax: {
            ...state.minMax,
            [metric]: { min, max }
        }
    })),

    setGradientStops: (stops) => set({ gradientStops: stops }),
    setStyleType: (type) => set({ styleType: type }),
    setClassCount: (count) => set({ classCount: Math.max(2, Math.min(8, count)) })
}));