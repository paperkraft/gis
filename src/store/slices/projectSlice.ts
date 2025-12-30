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

    // Patterns
    setPatterns: (patterns: TimePattern[]) => void;
    addPattern: (pattern: TimePattern) => void;
    updatePattern: (id: string, pattern: TimePattern) => void;
    deletePattern: (id: string) => void;

    // Curves
    setCurves: (curves: PumpCurve[]) => void;
    addCurve: (curve: PumpCurve) => void;
    updateCurve: (id: string, curve: PumpCurve) => void;
    deleteCurve: (id: string) => void;

    // Controls
    setControls: (controls: NetworkControl[]) => void;
    addControl: (control: NetworkControl) => void;
    updateControl: (id: string, control: NetworkControl) => void;
    deleteControl: (id: string) => void;
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

    // ---------------- Patterns ---------------- //

    setPatterns: (patterns) => set({ patterns, hasUnsavedChanges: true }),
    addPattern: (pattern) => set((state) => ({ patterns: [...state.patterns, pattern], hasUnsavedChanges: true })),

    updatePattern: (id, updated) => set((state) => ({
        patterns: state.patterns.map(p => p.id === id ? updated : p),
        hasUnsavedChanges: true
    })),

    deletePattern: (id) => set((state) => ({
        patterns: state.patterns.filter(p => p.id !== id),
        hasUnsavedChanges: true
    })),

    // ---------------- Curves ---------------- //

    setCurves: (curves) => set({ curves, hasUnsavedChanges: true }),
    addCurve: (curve) => set((state) => ({ curves: [...state.curves, curve], hasUnsavedChanges: true })),

    updateCurve: (id, updated) => set((state) => ({
        curves: state.curves.map(c => c.id === id ? updated : c),
        hasUnsavedChanges: true
    })),

    deleteCurve: (id) => set((state) => ({
        curves: state.curves.filter(c => c.id !== id),
        hasUnsavedChanges: true
    })),

    // ---------------- Controls ---------------- //

    setControls: (controls) => set({ controls, hasUnsavedChanges: true }),
    addControl: (control) => set((state) => ({ controls: [...state.controls, control], hasUnsavedChanges: true })),

    updateControl: (id, updated) => set((state) => ({
        controls: state.controls.map(c => c.id === id ? updated : c),
        hasUnsavedChanges: true
    })),

    deleteControl: (id) => set((state) => ({
        controls: state.controls.filter(c => c.id !== id),
        hasUnsavedChanges: true
    })),


});