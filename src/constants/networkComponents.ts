import { ComponentConfig } from "@/types/network";
import { Circle, Hexagon, Minus, Pentagon, Square, Triangle } from "lucide-react";

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