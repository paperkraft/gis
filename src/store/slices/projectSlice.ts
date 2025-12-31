import { StateCreator } from 'zustand';

import { COMPONENT_TYPES } from '@/constants/networkComponents';
import {
    FeatureType, NetworkControl, ProjectSettings, PumpCurve, TimePattern
} from '@/types/network';

import { NetworkState } from '../networkStore';

export interface ProjectSlice {
    settings: ProjectSettings;
    patterns: TimePattern[];
    curves: PumpCurve[];
    controls: NetworkControl[];
    nextIdCounter: Record<FeatureType, number>;
    hasUnsavedChanges: boolean;

    // Projects:
    updateSettings: (settings: Partial<ProjectSettings>) => void;
    generateUniqueId: (type: FeatureType) => string;
    markSaved: () => void;
    markUnSaved: () => void;

    // Parameters: Patterns, Curves, COntrols 
    setPatterns: (patterns: TimePattern[]) => void;
    setCurves: (curves: PumpCurve[]) => void;
    setControls: (controls: NetworkControl[]) => void;
}

const DEFAULT_SETTINGS: ProjectSettings = {
    title: "Untitled",
    units: "LPS",
    headloss: "H-W",
    projection: "EPSG:3857",

    // Extra fields
    specificGravity: 1.0,
    viscosity: 1.0,
    trials: 40,
    accuracy: 0.001,
    demandMultiplier: 1.0,
};

export const createProjectSlice: StateCreator<NetworkState, [], [], ProjectSlice> = (set, get) => ({
    settings: DEFAULT_SETTINGS,
    patterns: [],
    curves: [],
    controls: [],

    hasUnsavedChanges: false,
    nextIdCounter: { junction: 1, tank: 1, reservoir: 1, pipe: 1, pump: 1, valve: 1 },

    updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings },
        hasUnsavedChanges: true
    })),

    generateUniqueId: (type) => {
        const counter = get().nextIdCounter[type];
        set((state) => ({
            nextIdCounter: { ...state.nextIdCounter, [type]: counter + 1 }
        }));
        const prefix = COMPONENT_TYPES[type]?.prefix || type.toUpperCase();
        return `${prefix}-${counter}`;
    },

    markSaved: () => set({ hasUnsavedChanges: false, modifiedIds: new Set(), deletedIds: new Set() }),
    markUnSaved: () => set({ hasUnsavedChanges: true }),

    // ---------------- Patterns, Curves, COntrols ---------------- //

    setPatterns: (patterns) => set({ patterns, hasUnsavedChanges: true }),
    setCurves: (curves) => set({ curves, hasUnsavedChanges: true }),
    setControls: (controls) => set({ controls, hasUnsavedChanges: true }),

});