import { create } from 'zustand';

import { layerType } from '@/constants/map';
import { WorkbenchModalType } from '@/components/workbench/modal_registry';
export type FlowAnimationStyle = 'dashes' | 'particles' | 'glow' | 'combined';

export type ToolType =
    | 'select'
    | 'select-box'
    | 'select-polygon'
    | 'modify'
    | 'pan'
    | 'zoom-box'
    // Drawing tools
    | 'draw-pipe'
    | 'draw-junction'
    | 'draw-reservoir'
    | 'draw-tank'
    | 'draw-pump'
    | 'draw-valve';

export type WorkbenchPanelType =
    | 'NONE'
    | 'PROJECT_DETAILS'
    | 'SIMULATION_SETUP'

export interface ContextMenuState {
    x: number;
    y: number;
    type: 'layer' | 'feature';
    id: string; // layerKey or featureId
}

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
    queryBuilderModalOpen: boolean;

    // Panel and Modal
    activeModal: WorkbenchModalType;
    activePanel: WorkbenchPanelType;


    // Map control states
    activeTool: ToolType | null;
    measurementType: 'distance' | 'area';
    measurementActive: boolean;
    showAttributeTable: boolean;
    showLocationSearch: boolean;
    showAssetSearch: boolean;

    // Layer visibility
    layerVisibility: Record<string, boolean>;

    // Base layer
    baseLayer: layerType;

    // Animation
    isFlowAnimating: boolean;
    flowAnimationSpeed: number;
    flowAnimationStyle: FlowAnimationStyle;
    styleSettingsModalOpen: boolean;

    // Context Menu & Styling State
    contextMenu: ContextMenuState | null;
    activeStyleLayer: string | null;


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
    setQueryBuilderModalOpen: (open: boolean) => void;

    setActiveModal: (modal: WorkbenchModalType) => void;
    setActivePanel: (panel: WorkbenchPanelType) => void;

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
    setShowAssetSearch: (show: boolean) => void;

    // Snapping
    setIsSnappingEnabled: (enabled: boolean) => void;

    // Action - Animation
    setIsFlowAnimating: (animating: boolean) => void;
    setFlowAnimationSpeed: (speed: number) => void;
    setFlowAnimationStyle: (style: FlowAnimationStyle) => void;
    setStyleSettingsModalOpen: (open: boolean) => void;

    // Actions - Tab navigation
    setActiveTab: (tab: string) => void;
    setContextMenu: (menu: ContextMenuState | null) => void;
    setActiveStyleLayer: (layer: string | null) => void;

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
    queryBuilderModalOpen: false,

    activePanel: 'NONE' as WorkbenchPanelType,
    activeModal: "NONE" as WorkbenchModalType,

    importModalOpen: false,
    exportModalOpen: false,

    showLocationSearch: false,
    showAssetSearch: false,

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

    showLabels: false,
    showPipeArrows: true,

    isSnappingEnabled: true,
    styleSettingsModalOpen: false,

    contextMenu: null,
    activeStyleLayer: null,

};

export const useUIStore = create<UIState>((set, get) => ({

    // default state
    ...DEFAULT_STATE,

    setContextMenu: (menu) => set({ contextMenu: menu }),
    setActiveStyleLayer: (layer) => set({ activeStyleLayer: layer }),

    // Modal actions
    setComponentSelectionModalOpen: (open) => set({ componentSelectionModalOpen: open }),
    setKeyboardShortcutsModalOpen: (open) => set({ keyboardShortcutsModalOpen: open }),
    setSimulationReportModalOpen: (open) => set({ simulationReportModalOpen: open }),
    setProjectSettingsModalOpen: (open) => set({ projectSettingsModalOpen: open }),
    setControlManagerModalOpen: (open) => set({ controlManagerModalOpen: open }),
    setDataManagerModalOpen: (open) => set({ dataManagerModalOpen: open }),
    setQueryBuilderModalOpen: (open) => set({ queryBuilderModalOpen: open }),

    // Modal and Panel
    setActiveModal: (modal) => set({ activeModal: modal }),
    setActivePanel: (panel) => set({ activePanel: panel }),

    setIsFlowAnimating: (animate) => set({ isFlowAnimating: animate }),
    setShowLocationSearch: (open) => set({ showLocationSearch: open }),
    setShowAssetSearch: (show) => set({ showAssetSearch: show }),
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
    setStyleSettingsModalOpen: (open) => set({ styleSettingsModalOpen: open }),

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
            keyboardShortcutsModalOpen: false,
        });
    },

    resetToDefaultState: () => set({ ...DEFAULT_STATE }),
}));
