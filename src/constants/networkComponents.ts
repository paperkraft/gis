import { ComponentConfig } from "@/types/network";
import { Circle, Hand, Hexagon, LucideIcon, Minus, MousePointer2, Pentagon, SplinePointer, Square, Triangle } from "lucide-react";

export const COMPONENT_TYPES: Record<string, ComponentConfig> = {
    junction: {
        name: "Junction",
        prefix: "J",
        icon: Circle,
        color: "#28a745",
        description: "Network connection point",
        defaultProperties: {
            elevation: 100,
            demand: 0,
            population: 0,
            status: "active",
        },
        createsJunction: false,
    },
    tank: {
        name: "Tank",
        prefix: "T",
        icon: Pentagon,
        color: "#0066cc",
        description: "Water storage facility",
        defaultProperties: {
            capacity: 500000,
            elevation: 120,
            diameter: 30,
            currentLevel: 400000,
            status: "active",
        },
        createsJunction: true,
    },
    reservoir: {
        name: "Reservoir",
        prefix: "R",
        icon: Hexagon,
        color: "#8b5cf6",
        description: "Infinite water source",
        defaultProperties: {
            head: 100,
            elevation: 150,
            status: "active",
        },
        createsJunction: true,
    },
    pump: {
        name: "Pump",
        prefix: "PU",
        icon: Triangle,
        color: "#ef4444",
        description: "Water pumping facility",
        defaultProperties: {
            capacity: 1000,
            headGain: 50,
            efficiency: 80,
            status: "open",
        },
        createsJunction: false,
    },
    valve: {
        name: "Valve",
        prefix: "V",
        icon: Square,
        color: "#f97316",
        description: "Flow control device",
        defaultProperties: {
            diameter: 8,
            status: "open",
            valveType: "PRV",
            setting: 40,
        },
        createsJunction: false,
    },
    pipe: {
        name: "Pipe",
        prefix: "P",
        icon: Minus,
        color: "#0066cc",
        description: "Water transmission line",
        defaultProperties: {
            diameter: 100,
            material: "PVC",
            roughness: 130,
            status: "open",
        },
        createsJunction: false,
    },
};

export const SNAPPING_TOLERANCE = 20;

export const BASE_LAYERS = {
    osm: "OpenStreetMap",
    mapbox: "Mapbox Streets",
    esriStreet: "ESRI World Street",
    esriImagery: "ESRI World Imagery",
};

interface ToolItem {
    type: "tool";
    id: string;
    icon: LucideIcon;
    label: string;
    color?: string;
    shortcut: string;
}

interface SeparatorItem {
    type: "separator";
}

type MapToolItem = ToolItem | SeparatorItem;


export const MapTools: MapToolItem[] = [
    { type: "tool", id: "select", icon: MousePointer2, label: "Select", shortcut: "S" },
    { type: "tool", id: "pan", icon: Hand, label: "Pan", shortcut: "H" },
    { type: "tool", id: "modify", icon: SplinePointer, label: "Modify", shortcut: "M" },
    { type: "separator" },
    {
        type: "tool",
        id: "draw-junction",
        icon: COMPONENT_TYPES.junction.icon,
        label: COMPONENT_TYPES.junction.name,
        color: COMPONENT_TYPES.junction.color,
        shortcut: "1",
    },
    {
        type: "tool",
        id: "draw-tank",
        icon: COMPONENT_TYPES.tank.icon,
        label: COMPONENT_TYPES.tank.name,
        color: COMPONENT_TYPES.tank.color,
        shortcut: "2",
    },
    {
        type: "tool",
        id: "draw-reservoir",
        icon: COMPONENT_TYPES.reservoir.icon,
        label: COMPONENT_TYPES.reservoir.name,
        color: COMPONENT_TYPES.reservoir.color,
        shortcut: "3",
    },
    {
        type: "tool",
        id: "draw-pipe",
        icon: COMPONENT_TYPES.pipe.icon,
        label: COMPONENT_TYPES.pipe.name,
        color: COMPONENT_TYPES.pipe.color,
        shortcut: "4",
    },
    {
        type: "tool",
        id: "draw-pump",
        icon: COMPONENT_TYPES.pump.icon,
        label: COMPONENT_TYPES.pump.name,
        color: COMPONENT_TYPES.pump.color,
        shortcut: "5",
    },
    {
        type: "tool",
        id: "draw-valve",
        icon: COMPONENT_TYPES.valve.icon,
        label: COMPONENT_TYPES.valve.name,
        color: COMPONENT_TYPES.valve.color,
        shortcut: "6",
    },
];