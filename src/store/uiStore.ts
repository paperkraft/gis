import { layerType } from "@/constants/map";
import { create } from "zustand";

interface UIState {

    // Sidebar
    sidebarOpen: boolean;
    showPipeArrows: boolean;
    showLabels: boolean;
    sidebarCollapsed: boolean;
    propertyPanelOpen: boolean;

    // Tab navigation
    activeTab: string;

    // Modal states
    deleteModalOpen: boolean;
    importModalOpen: boolean;
    exportModalOpen: boolean;
    keyboardShortcutsModalOpen: boolean;
    componentSelectionModalOpen: boolean;
    simulationReportModalOpen: boolean;
    validationModalOpen: boolean;
    projectSettingsModalOpen: boolean;
    dataManagerModalOpen: boolean;
    controlManagerModalOpen: boolean;

    // Map control states
    activeTool: 'select' | 'select-box' | 'select-polygon' | 'modify' | 'draw' | 'pan' | null;
    measurementType: 'distance' | 'area';
    showBaseLayerMenu: boolean;
    measurementActive: boolean;
    showAttributeTable: boolean;
    showMeasurementMenu: boolean;

    // Layer visibility
    layerVisibility: Record<string, boolean>;

    // Base layer
    baseLayer: layerType;

    // Search
    searchFocused: boolean;

    // Actions - Sidebar
    setShowPipeArrows: (show: boolean) => void;
    setShowLabels: (show: boolean) => void;

    // Actions - Modals
    setComponentSelectionModalOpen: (open: boolean) => void;
    setKeyboardShortcutsModalOpen: (open: boolean) => void;
    setSimulationReportModalOpen: (open: boolean) => void;
    setDeleteModalOpen: (open: boolean) => void;
    setImportModalOpen: (open: boolean) => void;
    setExportModalOpen: (open: boolean) => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    togglePropertyPanel: () => void;
    setValidationModalOpen: (open: boolean) => void;
    setProjectSettingsModalOpen: (open: boolean) => void;
    setDataManagerModalOpen: (open: boolean) => void;
    setControlManagerModalOpen: (open: boolean) => void;

    // Actions - Map Controls
    setActiveTool: (tool: 'select' | 'select-box' | 'select-polygon' | 'modify' | 'draw' | 'pan' | null) => void;
    setMeasurementType: (type: 'distance' | 'area') => void;
    setShowBaseLayerMenu: (open: boolean) => void;
    setShowAttributeTable: (open: boolean) => void;
    setMeasurementActive: (active: boolean) => void;
    setShowMeasurementMenu: (open: boolean) => void;

    // Actions - Layers
    setBaseLayer: (layer: layerType) => void;
    toggleLayerVisibility: (layerId: string) => void;
    setLayerVisibility: (layerId: string, visible: boolean) => void;
    setAllLayersVisibility: (visible: boolean) => void;

    // Actions - Search
    setSearchFocused: (focused: boolean) => void;

    // Actions - Tab navigation
    setActiveTab: (tab: string) => void;

    // Utility - Reset all tools
    resetAllTools: () => void;
    resetToDefaultState: () => void;
}

const DEFAULT_STATE = {
    componentSelectionModalOpen: false,
    keyboardShortcutsModalOpen: false,
    simulationReportModalOpen: false,
    validationModalOpen: false,
    projectSettingsModalOpen: false,
    controlManagerModalOpen: false,
    dataManagerModalOpen: false,
    propertyPanelOpen: false,
    deleteModalOpen: false,
    importModalOpen: false,
    exportModalOpen: false,
    activeTool: 'pan' as const,
    measurementActive: false,
    measurementType: 'distance' as const,
    showAttributeTable: false,
    showBaseLayerMenu: false,
    showMeasurementMenu: false,
    sidebarCollapsed: false,
    layerVisibility: {
        junction: true,
        tank: true,
        reservoir: true,
        pipe: true,
        pump: true,
        valve: true,
    },
    baseLayer: 'osm' as const,
    searchFocused: false,
    sidebarOpen: true,
    showPipeArrows: true,
    showLabels: true,
    activeTab: 'network-editor',
};

export const useUIStore = create<UIState>((set, get) => ({
    ...DEFAULT_STATE,

    // Modal actions
    setComponentSelectionModalOpen: (open) => {
        set({ componentSelectionModalOpen: open });
    },

    setProjectSettingsModalOpen: (open) => set({ projectSettingsModalOpen: open }),

    setDataManagerModalOpen: (open) => set({ dataManagerModalOpen: open }),
    setControlManagerModalOpen: (open) => set({ controlManagerModalOpen: open }),

    setSimulationReportModalOpen: (open) => {
        set({ simulationReportModalOpen: open });
    },

    setValidationModalOpen: (open) => {
        set({ validationModalOpen: open });
    },

    setDeleteModalOpen: (open) => {
        set({ deleteModalOpen: open });
    },

    setImportModalOpen: (open) => {
        set({ importModalOpen: open });
    },

    setExportModalOpen: (open) => {
        set({ exportModalOpen: open });
    },

    setKeyboardShortcutsModalOpen: (open) => {
        set({ keyboardShortcutsModalOpen: open });
    },

    setShowPipeArrows: (show) => {
        set({ showPipeArrows: show });
    },

    setShowLabels: (show) => {
        set({ showLabels: show });
    },

    // Map control actions
    setActiveTool: (tool) => {
        const currentTool = get().activeTool;
        if (currentTool === tool) {
            return;
        }

        // Reset other tools when switching
        const updates: Partial<UIState> = {
            activeTool: tool,
        };

        // If switching away from pipe, close component selection
        if (currentTool === 'draw' && tool !== 'draw') {
            updates.componentSelectionModalOpen = false;
        }

        // Deactivate measurement when switching to other tools
        if (tool !== 'select' && get().measurementActive) {
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

    setMeasurementType: (type) => {
        set({ measurementType: type });
    },

    setShowAttributeTable: () => {
        set((state) => ({ showAttributeTable: !state.showAttributeTable }));
    },

    setShowBaseLayerMenu: () => {
        set((state) => ({ showBaseLayerMenu: !state.showBaseLayerMenu }));
    },

    setShowMeasurementMenu: () => {
        set((state) => ({ showMeasurementMenu: !state.showMeasurementMenu }));
    },

    setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
    },

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
    setBaseLayer: (layer: layerType) => {
        set({ baseLayer: layer });
    },

    // Search actions
    setSearchFocused: (focused) => {
        set({ searchFocused: focused });
    },

    // Tab navigation actions
    setActiveTab: (tab) => {
        set({ activeTab: tab });
    },

    // Utility actions
    resetAllTools: () => {
        set({
            activeTool: 'pan',
            measurementActive: false,
            componentSelectionModalOpen: false,
            showAttributeTable: false,
            propertyPanelOpen: false
        });

    },

    resetToDefaultState: () => {
        set({ ...DEFAULT_STATE });
    },

    togglePropertyPanel: () => set((state) => ({ propertyPanelOpen: !state.propertyPanelOpen })),

}));
