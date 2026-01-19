import { Feature } from 'ol';
import { StateCreator } from 'zustand';

import { NetworkState } from '../networkStore';

export interface HistorySlice {
    past: Feature[][];
    future: Feature[][];
    snapshot: () => void;
    undo: () => void;
    redo: () => void;
}

export const createHistorySlice: StateCreator<NetworkState, [], [], HistorySlice> = (set, get) => ({
    past: [],
    future: [],

    snapshot: () => {
        const current = Array.from(get().features.values()).map(f => {
            const clone = f.clone();
            clone.setId(f.getId());
            return clone;
        });
        set((state) => ({ past: [...state.past, current], future: [] }));
    },

    undo: () => {
        const { past, features } = get();
        if (past.length === 0) return;

        const previousState = past[past.length - 1];
        const newPast = past.slice(0, -1);

        // Snapshot current state for Undo
        const currentSnapshot = Array.from(features.values()).map(f => {
            const c = f.clone();
            c.setId(f.getId());
            return c;
        });

        // Restore
        const newMap = new Map();
        previousState.forEach(f => newMap.set(f.getId(), f));

        set((state) => ({
            past: newPast,
            future: [currentSnapshot, ...state.future],
            features: newMap,
            hasUnsavedChanges: true
        }));
    },

    redo: () => {
        const { future, features } = get();
        if (future.length === 0) return null;

        const nextState = future[0];
        const newFuture = future.slice(1);

        // Snapshot current state for Redo
        const currentSnapshot = Array.from(features.values()).map(f => {
            const c = f.clone();
            c.setId(f.getId());
            return c;
        });

        // Restore
        const newMap = new Map();
        nextState.forEach(f => newMap.set(f.getId(), f));

        set((state) => ({
            past: [...state.past, currentSnapshot],
            future: newFuture,
            features: newMap,
            hasUnsavedChanges: true
        }))
    }
});