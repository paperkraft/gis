import { create } from 'zustand';

import { layerType } from '@/constants/map';
export type FlowAnimationStyle = 'dashes' | 'particles' | 'glow' | 'combined';

export type ToolType =
    | 'select'
    | 'select-box'
    | 'select-polygon'
    | 'modify'
    | 'pan'
    | 'zoom-box'
    // Add specific drawing tools
    | 'draw'
    | 'draw-pipe'
    | 'add-junction'
    | 'add-reservoir'
    | 'add-tank'
    | 'add-pump'
    | 'add-valve';

interface UIState {

    // Sidebar
    showLabels: boolean;
    sidebarOpen: boolean;
    showPipeArrows: boolean;
    sidebarCollapsed: boolean;

    // Tab navigation
    activeTab: string;

    // Snapping
    isSnappingEnabled: boolean;

    // Modal states
    deleteModalOpen: boolean;
    importModalOpen: boolean;
    exportModalOpen: boolean;
    showAutoElevation: boolean;
    validationModalOpen: boolean;
    dataManagerModalOpen: boolean;
    controlManagerModalOpen: boolean;
    projectSettingsModalOpen: boolean;
    simulationReportModalOpen: boolean;
    keyboardShortcutsModalOpen: boolean;
    componentSelectionModalOpen: boolean;

    // Map control states
    activeTool: ToolType | null;
    measurementType: 'distance' | 'area';
    measurementActive: boolean;
    showAttributeTable: boolean;
    showLocationSearch: boolean;

    // Layer visibility
    layerVisibility: Record<string, boolean>;

    // Base layer
    baseLayer: layerType;

    // Animation
    isFlowAnimating: boolean;
    flowAnimationSpeed: number;
    flowAnimationStyle: FlowAnimationStyle;

    // Actions - Sidebar
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    setShowLabels: (show: boolean) => void;
    setShowPipeArrows: (show: boolean) => void;

    // Actions - Modals
    setComponentSelectionModalOpen: (open: boolean) => void;
    setKeyboardShortcutsModalOpen: (open: boolean) => void;
    setSimulationReportModalOpen: (open: boolean) => void;
    setShowAutoElevation: (open: boolean) => void;
    setDeleteModalOpen: (open: boolean) => void;
    setImportModalOpen: (open: boolean) => void;
    setExportModalOpen: (open: boolean) => void;
    setValidationModalOpen: (open: boolean) => void;
    setProjectSettingsModalOpen: (open: boolean) => void;
    setDataManagerModalOpen: (open: boolean) => void;
    setControlManagerModalOpen: (open: boolean) => void;

    // Actions - Map Controls
    setActiveTool: (tool: ToolType | null) => void;
    setShowAttributeTable: (open: boolean) => void;

    setMeasurementType: (type: 'distance' | 'area') => void;
    setMeasurementActive: (active: boolean) => void;

    // Actions - Layers
    setBaseLayer: (layer: layerType) => void;
    toggleLayerVisibility: (layerId: string) => void;
    setLayerVisibility: (layerId: string, visible: boolean) => void;
    setAllLayersVisibility: (visible: boolean) => void;

    // Actions - Search
    setShowLocationSearch: (focused: boolean) => void;

    // Snapping
    setIsSnappingEnabled: (enabled: boolean) => void;

    // Action - Animation
    setIsFlowAnimating: (animating: boolean) => void;
    setFlowAnimationSpeed: (speed: number) => void;
    setFlowAnimationStyle: (style: FlowAnimationStyle) => void;

    // Actions - Tab navigation
    setActiveTab: (tab: string) => void;

    // Utility - Reset all tools
    resetAllTools: () => void;
    resetToDefaultState: () => void;
}

const DEFAULT_STATE = {

    // Modal
    componentSelectionModalOpen: false,
    keyboardShortcutsModalOpen: false,
    simulationReportModalOpen: false,
    controlManagerModalOpen: false,
    projectSettingsModalOpen: false,
    dataManagerModalOpen: false,
    validationModalOpen: false,
    deleteModalOpen: false,

    importModalOpen: false,
    exportModalOpen: false,

    showLocationSearch: false,
    showAutoElevation: false,
    showAttributeTable: false,

    measurementType: 'distance' as const,
    measurementActive: false,

    isFlowAnimating: false,
    flowAnimationSpeed: 1.0,
    flowAnimationStyle: 'dashes' as FlowAnimationStyle,

    activeTab: 'network-editor',
    activeTool: 'pan' as const,
    baseLayer: 'osm' as const,
    sidebarOpen: true,
    sidebarCollapsed: false,

    layerVisibility: {
        reservoir: true,
        junction: true,
        valve: true,
        tank: true,
        pipe: true,
        pump: true,
    },
    showLabels: true,
    showPipeArrows: true,

    isSnappingEnabled: true,
};

export const useUIStore = create<UIState>((set, get) => ({

    // default state
    ...DEFAULT_STATE,

    // Modal actions
    setComponentSelectionModalOpen: (open) => set({ componentSelectionModalOpen: open }),
    setKeyboardShortcutsModalOpen: (open) => set({ keyboardShortcutsModalOpen: open }),
    setSimulationReportModalOpen: (open) => set({ simulationReportModalOpen: open }),
    setProjectSettingsModalOpen: (open) => set({ projectSettingsModalOpen: open }),
    setControlManagerModalOpen: (open) => set({ controlManagerModalOpen: open }),
    setDataManagerModalOpen: (open) => set({ dataManagerModalOpen: open }),

    setIsFlowAnimating: (animate) => set({ isFlowAnimating: animate }),
    setShowLocationSearch: (open) => set({ showLocationSearch: open }),
    setShowAutoElevation: (open) => set({ showAutoElevation: open }),

    setValidationModalOpen: (open) => set({ validationModalOpen: open }),
    setFlowAnimationSpeed: (speed) => set({ flowAnimationSpeed: speed }),
    setFlowAnimationStyle: (style) => set({ flowAnimationStyle: style }),

    setDeleteModalOpen: (open) => set({ deleteModalOpen: open }),
    setImportModalOpen: (open) => set({ importModalOpen: open }),
    setExportModalOpen: (open) => set({ exportModalOpen: open }),
    setMeasurementType: (type) => set({ measurementType: type }),
    setShowPipeArrows: (show) => set({ showPipeArrows: show }),
    setShowLabels: (show) => set({ showLabels: show }),
    setIsSnappingEnabled: (enabled) => set({ isSnappingEnabled: enabled }),

    // Map control actions
    setActiveTool: (tool) => {
        const currentTool = get().activeTool;
        const isMeasuring = get().measurementActive;

        if (currentTool === tool && !isMeasuring) {
            return;
        }

        // Reset other tools when switching
        const updates: Partial<UIState> = {
            activeTool: tool,
        };

        // If switching away from pipe, close component selection
        if (currentTool === 'draw-pipe' && tool !== 'draw-pipe') {
            updates.componentSelectionModalOpen = false;
        }

        // ALWAYS disable measurement if explicitly switching tools
        if (isMeasuring) {
            updates.measurementActive = false;
        }
        set(updates);
    },

    setMeasurementActive: (active) => {
        if (active && get().activeTool !== 'pan') {
            set({ activeTool: 'pan' });
        }

        set({ measurementActive: active });
    },

    setShowAttributeTable: () => {
        set((state) => ({ showAttributeTable: !state.showAttributeTable }));
    },

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

    // Layer actions
    toggleLayerVisibility: (layerId) => {
        set((state) => {
            const newVisibility = !state.layerVisibility[layerId];

            return {
                layerVisibility: {
                    ...state.layerVisibility,
                    [layerId]: newVisibility,
                },
            };
        });
    },

    setLayerVisibility: (layerId, visible) => {
        set((state) => ({
            layerVisibility: {
                ...state.layerVisibility,
                [layerId]: visible,
            },
        }));
    },

    setAllLayersVisibility: (visible) => {
        set((state) => {
            const layerVisibility: Record<string, boolean> = {};
            Object.keys(state.layerVisibility).forEach((key) => {
                layerVisibility[key] = visible;
            });
            return { layerVisibility };
        });
    },

    // Base layer actions
    setBaseLayer: (layer: layerType) => set({ baseLayer: layer }),

    // Tab navigation actions
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Utility actions
    resetAllTools: () => {
        set({
            activeTool: 'pan',
            measurementActive: false,
            showAttributeTable: false,
            componentSelectionModalOpen: false,
        });
    },

    resetToDefaultState: () => set({ ...DEFAULT_STATE }),
}));
