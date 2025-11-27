import { Feature } from "ol";
import { Geometry } from "ol/geom";

export type NodeType = "junction" | "tank" | "reservoir";
export type LinkType = "pipe" | "pump" | "valve";
export type FeatureType = NodeType | LinkType;

export interface NetworkFeatureProperties {
    id: string;
    type: FeatureType;
    elevation?: number;
    demand?: number;
    capacity?: number;
    diameter?: number;
    length?: number;
    material?: string;
    roughness?: number;
    head?: number;
    headGain?: number;
    efficiency?: number;
    status?: string;
    startNodeId?: string;
    endNodeId?: string;
    connectedLinks?: string[];
    label?: string;
    isNew?: boolean;
    autoCreated?: boolean;
    [key: string]: any;
}

export interface NetworkFeature extends Feature<Geometry> {
    getProperties(): NetworkFeatureProperties;
    setProperties(properties: NetworkFeatureProperties): void;
}

export interface ComponentConfig {
    name: string;
    icon: string;
    color: string;
    description: string;
    defaultProperties: Record<string, any>;
    createsJunction?: boolean;
}

export interface NetworkValidation {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    type: string;
    message: string;
    featureId?: string;
}

export interface ValidationWarning {
    type: string;
    message: string;
    featureId?: string;
}
