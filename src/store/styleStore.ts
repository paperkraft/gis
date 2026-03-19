import { create } from 'zustand';

// --- TYPES ---
export type NodeColorMode = 'none' | 'elevation' | 'pressure' | 'head' | 'demand';
export type LinkColorMode = 'none' | 'diameter' | 'roughness' | 'flow' | 'velocity' | 'headloss';

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

export const PRESETS = {
    SPECTRUM: CLASSIC_EPANET_GRADIENT,
    VIRIDIS: [
        { offset: 0, color: '#440154' },
        { offset: 25, color: '#3b528b' },
        { offset: 50, color: '#21918c' },
        { offset: 75, color: '#5ec962' },
        { offset: 100, color: '#fde725' }
    ],
    MAGMA: [
        { offset: 0, color: '#000004' },
        { offset: 25, color: '#3b0f70' },
        { offset: 50, color: '#8c2981' },
        { offset: 75, color: '#fe9b6d' },
        { offset: 100, color: '#fcfdbf' }
    ],
    PLASMA: [
        { offset: 0, color: '#0d0887' },
        { offset: 25, color: '#7e03a8' },
        { offset: 50, color: '#cb4679' },
        { offset: 75, color: '#f89441' },
        { offset: 100, color: '#f0f921' }
    ],
    COOL_WARM: [
        { offset: 0, color: '#3b82f6' },
        { offset: 50, color: '#f1f5f9' },
        { offset: 100, color: '#ef4444' }
    ]
};

interface StyleState {
    // --- Simulation Styles (Existing) ---
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
    setNodeColorMode: (mode: NodeColorMode) => void;
    setLinkColorMode: (mode: LinkColorMode) => void;

    setLabelMode: (mode: LabelMode) => void;
    updateMinMax: (metric: string, min: number, max: number) => void;

    setNodeGradient: (stops: GradientStop[]) => void;
    setLinkGradient: (stops: GradientStop[]) => void;
    setGradientPreset: (type: 'node' | 'link', preset: keyof typeof PRESETS) => void;

    setStyleType: (type: StyleType) => void;
    setClassCount: (count: number) => void;

    // For Symbology
    getStyle: (layerId: string) => LayerStyle;
    updateStyle: (layerId: string, style: Partial<LayerStyle>) => void;
    resetStyle: (layerId: string) => void;
}

export const useStyleStore = create<StyleState>((set, get) => ({
    // Defaults
    nodeColorMode: 'none',
    linkColorMode: 'none',

    labelMode: 'id',
    minMax: {
        pressure: { min: 0, max: 80 },
        velocity: { min: 0, max: 2 },
        diameter: { min: 0, max: 500 },
        roughness: { min: 80, max: 140 },
        flow: { min: 0, max: 100 },
        head: { min: 0, max: 100 },
        demand: { min: 0, max: 50 },
        elevation: { min: 0, max: 800 },
        headloss: { min: 0, max: 5 }
    },

    nodeGradient: CLASSIC_EPANET_GRADIENT,
    linkGradient: CLASSIC_EPANET_GRADIENT,

    styleType: 'discrete',
    classCount: 5,

    // Initialize Base Styles
    layerStyles: JSON.parse(JSON.stringify(DEFAULT_LAYER_STYLES)),

    // Actions
    setNodeColorMode: (mode) => set({ nodeColorMode: mode }),
    setLinkColorMode: (mode) => set({ linkColorMode: mode }),

    setLabelMode: (mode) => set({ labelMode: mode }),
    updateMinMax: (metric, min, max) => set((state) => ({ minMax: { ...state.minMax, [metric]: { min, max } } })),

    setNodeGradient: (stops) => set({ nodeGradient: stops }),
    setLinkGradient: (stops) => set({ linkGradient: stops }),
    setGradientPreset: (type: 'node' | 'link', preset: keyof typeof PRESETS) => set(state => ({
        [type === 'node' ? 'nodeGradient' : 'linkGradient']: PRESETS[preset]
    })),

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