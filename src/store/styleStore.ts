import { create } from 'zustand';

// --- TYPES ---
export type NodeColorMode = 'none' | 'elevation' | 'pressure' | 'head' | 'demand';
export type LinkColorMode = 'none' | 'diameter' | 'roughness' | 'flow' | 'velocity' | 'headloss';

// export type ColorMode = 'none' | 'diameter' | 'roughness' | 'pressure' | 'velocity' | 'head' | 'flow' | 'elevation';
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

const CLASSIC_EPANET_GRADIENT = [
    { offset: 0, color: '#0000FF' },   // Blue
    { offset: 25, color: '#00FFFF' },  // Cyan
    { offset: 50, color: '#00FF00' },  // Green
    { offset: 75, color: '#FFFF00' },  // Yellow
    { offset: 100, color: '#FF0000' }  // Red
];

interface StyleState {
    // --- Simulation Styles (Existing) ---
    // colorMode: ColorMode;
    nodeColorMode: NodeColorMode;
    linkColorMode: LinkColorMode;

    labelMode: LabelMode;
    minMax: Record<string, { min: number, max: number }>;

    nodeGradient: GradientStop[];
    linkGradient: GradientStop[];

    styleType: StyleType;
    classCount: number;

    // --- Base Symbology (New) ---
    layerStyles: Record<string, LayerStyle>;

    // --- Actions ---
    // setColorMode: (mode: ColorMode) => void;
    setNodeColorMode: (mode: NodeColorMode) => void;
    setLinkColorMode: (mode: LinkColorMode) => void;

    setLabelMode: (mode: LabelMode) => void;
    updateMinMax: (metric: string, min: number, max: number) => void;

    setNodeGradient: (stops: GradientStop[]) => void;
    setLinkGradient: (stops: GradientStop[]) => void;

    setStyleType: (type: StyleType) => void;
    setClassCount: (count: number) => void;

    // For Symbology
    getStyle: (layerId: string) => LayerStyle;
    updateStyle: (layerId: string, style: Partial<LayerStyle>) => void;
    resetStyle: (layerId: string) => void;
}

export const useStyleStore = create<StyleState>((set, get) => ({
    // Defaults
    // colorMode: 'none',
    nodeColorMode: 'none',
    linkColorMode: 'none',

    labelMode: 'id',
    minMax: {
        pressure: { min: 0, max: 80 },
        velocity: { min: 0, max: 2 },
        diameter: { min: 0, max: 500 },
        roughness: { min: 80, max: 140 },
        flow: { min: 0, max: 100 },
        head: { min: 0, max: 100 }
    },

    nodeGradient: CLASSIC_EPANET_GRADIENT,
    linkGradient: CLASSIC_EPANET_GRADIENT,

    styleType: 'discrete',
    classCount: 5,

    // Initialize Base Styles
    layerStyles: JSON.parse(JSON.stringify(DEFAULT_LAYER_STYLES)),

    // Actions
    // setColorMode: (mode) => set({ colorMode: mode }),
    setNodeColorMode: (mode) => set({ nodeColorMode: mode }),
    setLinkColorMode: (mode) => set({ linkColorMode: mode }),

    setLabelMode: (mode) => set({ labelMode: mode }),
    updateMinMax: (metric, min, max) => set((state) => ({ minMax: { ...state.minMax, [metric]: { min, max } } })),

    setNodeGradient: (stops) => set({ nodeGradient: stops }),
    setLinkGradient: (stops) => set({ linkGradient: stops }),

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