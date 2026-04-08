import { create } from 'zustand';

import { layerType } from '@/constants/map';
import { WorkbenchModalType } from '@/components/workbench/modal_registry';
import { Feature } from 'ol';
import { WORKBENCH_MENU, MenuItem } from '@/data/workbenchMenu';
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

export type RightPanelType =
    | 'NONE'
    | 'DISPLAY'
    | 'QUERY'
    | 'BOOKMARK'
    | 'LOCATION'
    | 'PRINT_MAP'
    | 'EXPORT_PROJECT'

export interface ContextMenuState {
    x: number;
    y: number;
    type: 'layer' | 'feature';
    id: string; // layerKey or featureId
}

export interface MergeContext {
    node: Feature;
    pipeA: Feature;
    pipeB: Feature;
    onResolve: (chosenPipe: Feature) => void;
    onCancel: () => void;
}

interface DeleteContext {
    features: Feature[];
    impact: {
        totalCount: number;      // Total items to be removed
        cascadeCount: number;    // Items NOT selected but deleted automatically
        orphanCount: number;     // Nodes deleted because Pipe was deleted
        isMerge: boolean;        // Pump/Valve delete -> Merge Nodes?
        primaryType: string;     // e.g. "Junction", "Pipe", or "Mixed"
        affectedIds: string[];
    };
    onConfirm: () => void;
    onCancel: () => void;
}

export type MenuStatus = 'pending' | 'visited' | 'none';

interface UIState {

    // project refresh key
    projectRefreshKey: number;

    // Sidebar
    isCollapsed: boolean;
    sidebarWidth: number;

    // Symbology
    showLabels: boolean;
    showPipeArrows: boolean;
    showVertices: boolean;

    // Snapping
    isSnappingEnabled: boolean;

    // Modal states
    deleteModalOpen: boolean;

    showAutoElevation: boolean;
    simulationReportModalOpen: boolean;
    keyboardShortcutsModalOpen: boolean;

    // Panel and Modal
    activeModal: WorkbenchModalType;
    activePanel: WorkbenchPanelType;

    // Map control states
    activeTool: ToolType | null;
    measurementType: 'distance' | 'area';
    measurementActive: boolean;
    showAttributeTable: boolean;
    showAssetSearch: boolean;

    // Layer visibility
    layerVisibility: Record<string, boolean>;

    // Base layer
    baseLayer: layerType;

    // Animation
    isFlowAnimating: boolean;
    flowAnimationSpeed: number;
    flowAnimationStyle: FlowAnimationStyle;
    activeRightPanel: RightPanelType;

    // Context Menu & Styling State
    contextMenu: ContextMenuState | null;
    mergeContext: MergeContext | null;
    deleteContext: DeleteContext | null;

    activeStyleLayer: string | null;

    // Menu Status tracking (Hydrated from Project Settings)
    menuStatus: Record<string, MenuStatus>;
    setMenuStatus: (id: string, status: MenuStatus) => void;
    syncMenuStatusFromSettings: (statuses?: Record<string, 'pending' | 'visited'>) => void;
    initializeNewProjectMenuStatus: (projectId: string) => void;
    resetMenuStatus: () => void;


    // project refresh utility
    refreshProjects: () => void;

    // Actions - Sidebar
    toggleSidebar: () => void;
    setIsCollapsed: (collapse: boolean) => void;
    setSidebarWidth: (width: number) => void;

    setShowLabels: (show: boolean) => void;
    setShowPipeArrows: (show: boolean) => void;
    setShowVertices: (show: boolean) => void;

    // Actions - Modals
    setKeyboardShortcutsModalOpen: (open: boolean) => void;
    setSimulationReportModalOpen: (open: boolean) => void;
    setShowAutoElevation: (open: boolean) => void;
    setDeleteModalOpen: (open: boolean) => void;

    setActiveModal: (modal: WorkbenchModalType) => void;
    setActivePanel: (panel: WorkbenchPanelType) => void;
    setActiveRightPanel: (panel: RightPanelType) => void;

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
    

    // Actions - Tab navigation
    setContextMenu: (menu: ContextMenuState | null) => void;
    setMergeContext: (context: MergeContext | null) => void;
    setDeleteContext: (context: DeleteContext | null) => void;
    setActiveStyleLayer: (layer: string | null) => void;

    // Utility - Reset all tools
    resetAllTools: () => void;
    resetToDefaultState: () => void;

    // Derived State
    isProjectInitialized: () => boolean;
}

const DEFAULT_STATE = {

    projectRefreshKey: 0,

    sidebarWidth: 260,
    isCollapsed: false,

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

    showAssetSearch: false,

    showAutoElevation: false,
    showAttributeTable: false,

    measurementType: 'distance' as const,
    measurementActive: false,

    isFlowAnimating: false,
    flowAnimationSpeed: 1.0,
    flowAnimationStyle: 'particles' as FlowAnimationStyle,

    activeTool: 'pan' as const,
    baseLayer: 'osm' as const,

    layerVisibility: {
        reservoir: true,
        junction: true,
        valve: true,
        tank: true,
        pipe: true,
        pump: true,
    },

    showLabels: false,
    showPipeArrows: false,
    showVertices: false,

    isSnappingEnabled: true,
    activeRightPanel: 'NONE' as RightPanelType,

    contextMenu: null,
    mergeContext: null,
    deleteContext: null,
    activeStyleLayer: null,

    menuStatus: {},
};

export const useUIStore = create<UIState>((set, get) => ({

    // default state
    ...DEFAULT_STATE,

    refreshProjects: () => set((state) => ({ projectRefreshKey: state.projectRefreshKey + 1 })),

    setSidebarWidth: (width) => set({ sidebarWidth: width }),

    // Context
    setContextMenu: (menu) => set({ contextMenu: menu }),
    setMergeContext: (context) => set({ mergeContext: context }),
    setDeleteContext: (context) => set({ deleteContext: context }),
    setActiveStyleLayer: (layer) => set({ activeStyleLayer: layer }),

    setMenuStatus: (id, status) => set((state) => ({
        menuStatus: { ...state.menuStatus, [id]: status }
    })),

    syncMenuStatusFromSettings: (statuses) => set({
        menuStatus: (statuses as Record<string, MenuStatus>) || {}
    }),

    resetMenuStatus: () => set({ menuStatus: {} }),

    initializeNewProjectMenuStatus: (projectId: string) => {
        const statuses: Record<string, MenuStatus> = {};
        
        const scan = (nodes: MenuItem[]) => {
            nodes.forEach(node => {
                if (node.isMandatory) {
                    statuses[node.id] = 'pending';
                }
                if (node.children) scan(node.children);
            });
        };
        
        scan(WORKBENCH_MENU);
        
        set({ menuStatus: statuses });
    },

    // Modal actions
    setKeyboardShortcutsModalOpen: (open) => set({ keyboardShortcutsModalOpen: open }),
    setSimulationReportModalOpen: (open) => set({ simulationReportModalOpen: open }),

    // Modal and Panel
    setActiveModal: (modal) => set({ activeModal: modal }),
    setActivePanel: (panel) => set({ activePanel: panel }),

    setIsFlowAnimating: (animate) => set({ isFlowAnimating: animate }),
    setShowLocationSearch: (open) => set({ activeRightPanel: open ? 'LOCATION' : 'NONE' }),
    setShowAssetSearch: (show) => set({ showAssetSearch: show }),
    setShowAutoElevation: (open) => set({ showAutoElevation: open }),

    setFlowAnimationSpeed: (speed) => set({ flowAnimationSpeed: speed }),
    setFlowAnimationStyle: (style) => set({ flowAnimationStyle: style }),

    setDeleteModalOpen: (open) => set({ deleteModalOpen: open }),

    setMeasurementType: (type) => set({ measurementType: type }),
    setShowPipeArrows: (show) => set({ showPipeArrows: show }),
    setShowLabels: (show) => set({ showLabels: show }),
    setShowVertices: (show) => set({ showVertices: show }),

    setIsSnappingEnabled: (enabled) => set({ isSnappingEnabled: enabled }),
    setActiveRightPanel: (panel) => set({ activeRightPanel: panel }),

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

    toggleSidebar: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
    setIsCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),

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

    // Utility actions
    resetAllTools: () => {
        set({
            activeTool: 'pan',
            measurementActive: false,
            showAttributeTable: false,
            keyboardShortcutsModalOpen: false,
        });
    },

    resetToDefaultState: () => set({ ...DEFAULT_STATE }),

    isProjectInitialized: () => {
        const { menuStatus } = get();
        
        // --- BACKEND-PERSISTED ISOLATION LOGIC ---
        // Every mandatory item is defined in the menu data.
        // We simply check if any of them are 'pending' in the current store,
        // which is hydrated from the project settings when the project loads.
        const mandatoryItems: string[] = [];
        const scan = (nodes: MenuItem[]) => {
            nodes.forEach(node => {
                if (node.isMandatory) mandatoryItems.push(node.id);
                if (node.children) scan(node.children);
            });
        };
        scan(WORKBENCH_MENU);
        
        // If there are no mandatory items defined, it's initialized
        if (mandatoryItems.length === 0) return true;
        
        // If we don't have any status record in the store (e.g. existing project with no pending data),
        // we consider it fully initialized/unlocked.
        if (Object.keys(menuStatus).length === 0) return true;
        
        // If any mandatory item is explicitly 'pending', the project stays locked.
        return !mandatoryItems.some(id => menuStatus[id] === 'pending');
    },
}));
