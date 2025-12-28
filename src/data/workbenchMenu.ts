import { WorkbenchModalType } from "@/store/uiStore";
import {
    Layers, Box, Circle,
    Settings, FileText, PenTool, Edit3, Calculator,
    TrendingUp, Map, Droplets, BarChart3,
    Zap, Table2, MousePointer2,
    Minus,
    Pentagon,
    Hexagon,
    Square,
    Triangle
} from "lucide-react";

// 1. Schema Definition
export type MenuItem = {
    id: string;
    label: string;
    type: "SECTION" | "GROUP" | "ITEM";

    // Visuals
    icon?: any;
    count?: number; // For Groups
    status?: "ready" | "warning" | "empty"; // For Sections
    layerKey?: "pipe" | "junction" | "reservoir" | "tank" | "valve" | "pump";
    defaultOpen?: boolean;
    children?: MenuItem[];
    modalType?: WorkbenchModalType;
    modalPanel?: WorkbenchModalType | string;
};

// 2. The Real Data
export const WORKBENCH_MENU: MenuItem[] = [
    // --- ROOT 1: NETWORKS ---
    {
        id: "sec_networks",
        type: "SECTION",
        label: "Networks",
        status: "ready",
        defaultOpen: true,
        children: [
            {
                id: "grp_net_layers",
                type: "GROUP",
                label: "Network Layers",
                icon: Layers,
                children: [
                    { id: "itm_pipe", type: "ITEM", label: "Pipe", icon: Minus, layerKey: "pipe" },
                    { id: "itm_junction", type: "ITEM", label: "Junction", icon: Circle, layerKey: "junction" },
                    { id: "itm_reservoir", type: "ITEM", label: "Reservoir", icon: Hexagon, layerKey: "reservoir" },
                    { id: "itm_tank", type: "ITEM", label: "Tank", icon: Pentagon, layerKey: "tank" },
                    { id: "itm_valve", type: "ITEM", label: "Valve", icon: Square, layerKey: "valve" },
                    { id: "itm_pump", type: "ITEM", label: "Pump", icon: Triangle, layerKey: "pump" },
                ]
            },
            {
                id: "grp_net_settings",
                type: "GROUP",
                label: "Settings",
                icon: Settings,
                children: [
                    { id: "set_proj", type: "ITEM", label: "Project Settings" },
                    { id: "set_attr", type: "ITEM", label: "Default Attribute" },
                    { id: "set_time", type: "ITEM", label: "Time Pattern" },
                    { id: "set_demand", type: "ITEM", label: "Demand Pattern" },
                    { id: "set_data", type: "ITEM", label: "Data Tables (Pipe / Valve)" },
                ]
            },
            { id: "itm_headworks", type: "ITEM", label: "Headworks", icon: Box },
            { id: "itm_wtp", type: "ITEM", label: "WTP", icon: Droplets },
            { id: "itm_terrain", type: "ITEM", label: "Terrain (Layer)", icon: Map },
            { id: "itm_zone", type: "ITEM", label: "Zone", icon: MousePointer2 },
            { id: "itm_support", type: "ITEM", label: "Supporting Layers", icon: Layers },
            { id: "itm_select_sets", type: "ITEM", label: "Selection sets", icon: MousePointer2 },
            { id: "itm_net_reports", type: "ITEM", label: "Reports", icon: FileText },
        ]
    },

    // --- ROOT 2: TOOLS ---
    {
        id: "sec_tools",
        type: "SECTION",
        label: "Tools",
        status: "warning",
        defaultOpen: false,
        children: [
            {
                id: "grp_net_edit",
                type: "GROUP",
                label: "Network Editing",
                icon: Edit3,
                children: [
                    { id: "tool_append", type: "ITEM", label: "Append Network" },
                    { id: "tool_elev", type: "ITEM", label: "Assign Elevation" },
                    { id: "tool_trace", type: "ITEM", label: "Tracing Network" },
                    { id: "tool_numb", type: "ITEM", label: "Numbering Network" },
                    { id: "tool_iso", type: "ITEM", label: "Insert Isolation Valves" },
                    { id: "tool_loss", type: "ITEM", label: "Calculate Loss Coefficient" },
                    { id: "tool_loop", type: "ITEM", label: "Convert Loop To Branch" },
                ]
            },
            {
                id: "grp_planning",
                type: "GROUP",
                label: "Planning",
                icon: PenTool,
                children: [
                    {
                        id: "grp_pop_demand",
                        type: "GROUP",
                        label: "Population & Water Demand",
                        children: [
                            { id: "plan_forecast", type: "ITEM", label: "Forecast/Calculate" },
                            { id: "plan_design", type: "ITEM", label: "Design Stages & Water Demand" },
                            { id: "plan_alloc", type: "ITEM", label: "Allocate Towards" },
                            { id: "plan_assign", type: "ITEM", label: "Assign To Junction" },
                        ]
                    },
                    {
                        id: "grp_tank_zone",
                        type: "GROUP",
                        label: "Tank Zoning",
                        children: [
                            { id: "zone_create", type: "ITEM", label: "Create Zones" },
                            { id: "zone_import", type: "ITEM", label: "Import Zones" },
                            { id: "zone_dma", type: "ITEM", label: "Create DMAs" },
                        ]
                    }
                ]
            },
            {
                id: "grp_design",
                type: "GROUP",
                label: "Designing",
                icon: Calculator,
                children: [
                    {
                        id: "grp_cap_calc",
                        type: "GROUP",
                        label: "Capacity Calculations",
                        children: [
                            { id: "calc_head", type: "ITEM", label: "Headworks" },
                            { id: "calc_wtp", type: "ITEM", label: "WTP" },
                            { id: "calc_mass_ind", type: "ITEM", label: "Mass Curves (Individual)" },
                            { id: "calc_mass_bulk", type: "ITEM", label: "Mass Curves (Bulk)" },
                        ]
                    },
                    {
                        id: "grp_hyd_des",
                        type: "GROUP",
                        label: "Hydraulic Designs",
                        children: [
                            { id: "hyd_param", type: "ITEM", label: "Calculate Pipe Parameters" },
                            { id: "hyd_opt", type: "ITEM", label: "Optimise Diameter Of pipes" },
                            { id: "hyd_eco", type: "ITEM", label: "Economical pumping Main" },
                            { id: "hyd_est", type: "ITEM", label: "Estimate Pump Capacity" },
                        ]
                    },
                    { id: "des_ent_net", type: "ITEM", label: "Calculate Entire Network" }
                ]
            },
            { id: "tool_settings", type: "ITEM", label: "Settings", icon: Settings },
            { id: "tool_reports", type: "ITEM", label: "Reports", icon: FileText },
        ]
    },

    // --- ROOT 3: SIMULATIONS ---
    {
        id: "sec_simulations",
        type: "SECTION",
        label: "Simulations",
        status: "empty",
        children: [
            {
                id: "sim_config",
                type: "ITEM",
                label: "Configuration",
                icon: Settings,
                modalPanel: "SIMULATION_CONFIG"
            },
            {
                id: "grp_sim_sets",
                type: "GROUP",
                label: "Settings",
                icon: Settings,
                children: [
                    { id: "sim_opt", type: "ITEM", label: "Network Options" },
                    { id: "sim_meth", type: "ITEM", label: "Analysis Method" },
                    { id: "sim_dem_opt", type: "ITEM", label: "Demand Options" },
                    { id: "sim_curve", type: "ITEM", label: "Curves" },
                    { id: "sim_ctrl", type: "ITEM", label: "Controls" },
                ]
            },
            {
                id: "grp_sim_res",
                type: "GROUP",
                label: "Result/Reports",
                icon: BarChart3,
                children: [
                    { id: "res_sum", type: "ITEM", label: "Summary" },
                    { id: "res_graph", type: "ITEM", label: "Graphs", icon: TrendingUp },
                    { id: "res_table", type: "ITEM", label: "Tables", icon: Table2 },
                    { id: "res_full", type: "ITEM", label: "Full report" },
                    { id: "res_bal", type: "ITEM", label: "Water Balance" },
                    { id: "res_cost", type: "ITEM", label: "Energy Cost", icon: Zap },
                    { id: "res_react", type: "ITEM", label: "Reactions" },
                    { id: "res_comp", type: "ITEM", label: "Compare Field Data" },
                ]
            }
        ]
    }
];