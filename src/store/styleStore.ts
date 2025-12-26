import { create } from 'zustand';

// --- TYPES ---
export type ColorMode = 'none' | 'diameter' | 'roughness' | 'pressure' | 'velocity' | 'head' | 'flow' | 'elevation';
export type LabelMode = 'id' | 'elevation' | 'diameter' | 'result';
export type StyleType = 'continuous' | 'discrete';

export interface GradientStop {
    offset: number;
    color: string;
}

// NEW: Base Layer Style Definition
export interface LayerStyle {
    color: string;
    width?: number;       // For lines (Pipe, Pump, Valve)
    radius?: number;      // For points (Junction, Tank, Reservoir)
    strokeWidth?: number; // For points
    opacity: number;
    visible: boolean;
    autoScale?: boolean;
}

const DEFAULT_LAYER_STYLES: Record<string, LayerStyle> = {
    pipe: { color: '#3b82f6', width: 2, opacity: 1, visible: true, autoScale: true },
    junction: { color: '#10b981', radius: 5, strokeWidth: 1, opacity: 1, visible: true },
    reservoir: { color: '#8b5cf6', radius: 8, strokeWidth: 2, opacity: 1, visible: true },
    tank: { color: '#0066cc', radius: 8, strokeWidth: 2, opacity: 1, visible: true },
    valve: { color: '#f97316', width: 4, opacity: 1, visible: true },
    pump: { color: '#ef4444', width: 4, opacity: 1, visible: true },
};

interface StyleState {
    // --- Simulation Styles (Existing) ---
    colorMode: ColorMode;
    labelMode: LabelMode;
    minMax: Record<string, { min: number, max: number }>;
    gradientStops: GradientStop[];
    styleType: StyleType;
    classCount: number;

    // --- Base Symbology (New) ---
    layerStyles: Record<string, LayerStyle>;

    // --- Actions ---
    setColorMode: (mode: ColorMode) => void;
    setLabelMode: (mode: LabelMode) => void;
    updateMinMax: (metric: string, min: number, max: number) => void;
    setGradientStops: (stops: GradientStop[]) => void;
    setStyleType: (type: StyleType) => void;
    setClassCount: (count: number) => void;

    // For Symbology
    getStyle: (layerId: string) => LayerStyle;
    updateStyle: (layerId: string, style: Partial<LayerStyle>) => void;
    resetStyle: (layerId: string) => void;
}

export const useStyleStore = create<StyleState>((set, get) => ({
    // Defaults
    colorMode: 'none',
    labelMode: 'id',
    minMax: {
        pressure: { min: 0, max: 80 },
        velocity: { min: 0, max: 2 },
        diameter: { min: 0, max: 500 },
        roughness: { min: 80, max: 140 },
        flow: { min: 0, max: 100 },
        head: { min: 0, max: 100 }
    },
    gradientStops: [
        { offset: 25, color: '#3b528b' },
        { offset: 50, color: '#21918c' },
        { offset: 75, color: '#5ec962' },
        { offset: 100, color: '#fde725' }
    ],
    styleType: 'continuous',
    classCount: 5,

    // Initialize Base Styles
    layerStyles: JSON.parse(JSON.stringify(DEFAULT_LAYER_STYLES)),

    // Actions
    setColorMode: (mode) => set({ colorMode: mode }),
    setLabelMode: (mode) => set({ labelMode: mode }),
    updateMinMax: (metric, min, max) => set((state) => ({ minMax: { ...state.minMax, [metric]: { min, max } } })),
    setGradientStops: (stops) => set({ gradientStops: stops }),
    setStyleType: (type) => set({ styleType: type }),
    setClassCount: (count) => set({ classCount: Math.max(2, Math.min(8, count)) }),

    getStyle: (layerId) => {
        const state = get();
        return state.layerStyles[layerId] || DEFAULT_LAYER_STYLES[layerId] || DEFAULT_LAYER_STYLES['pipe'];
    },

    updateStyle: (layerId, updates) => set((state) => ({
        layerStyles: {
            ...state.layerStyles,
            [layerId]: { ...state.layerStyles[layerId], ...updates }
        }
    })),

    resetStyle: (layerId) => set((state) => ({
        layerStyles: {
            ...state.layerStyles,
            [layerId]: { ...DEFAULT_LAYER_STYLES[layerId] }
        }
    }))
}));