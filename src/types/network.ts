import { LucideIcon } from 'lucide-react';
import { Feature } from 'ol';
import { Geometry } from 'ol/geom';

export type NodeType = "junction" | "tank" | "reservoir";
export type LinkType = "pipe" | "pump" | "valve";
export type FeatureType = NodeType | LinkType;

export type FlowUnit = 'CFS' | 'GPM' | 'MGD' | 'IMGD' | 'AFD' | 'LPS' | 'LPM' | 'MLD' | 'CMH' | 'CMD';
export type HeadlossFormula = 'H-W' | 'D-W' | 'C-M';

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
    icon: LucideIcon;
    color: string;
    description: string;
    defaultProperties: Record<string, any>;
    createsJunction?: boolean;
    prefix: string;
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
export interface ProjectSettings {
    title: string;
    description?: string;
    units: FlowUnit;
    headloss: HeadlossFormula;
    specificGravity: number;
    viscosity: number;
    trials: number;
    accuracy: number;
    demandMultiplier: number;
    projection: string;

    patterns?: TimePattern[];
    curves?: PumpCurve[];
    controls?: NetworkControl[];
}
export interface TimePattern {
    id: string;
    description?: string;
    multipliers: number[];
}
export interface PumpCurve {
    id: string;
    description?: string;
    type: 'PUMP' | 'VOLUME' | 'HEADLOSS';
    points: { x: number; y: number }[];
}

export type ControlType = 'LOW LEVEL' | 'HI LEVEL' | 'TIMER' | 'TIMEOFDAY';
export type ControlAction = 'OPEN' | 'CLOSED' | 'ACTIVE';

export interface NetworkControl {
    id: string;
    linkId: string;
    status: ControlAction;
    nodeId?: string;
    value: number;
    type: ControlType;
}