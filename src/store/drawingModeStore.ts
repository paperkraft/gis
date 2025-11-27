import { create } from "zustand";

interface DrawingModeState {
    isDrawingPipeNetwork: boolean;
    startDrawingPipeNetwork: () => void;
    stopDrawingPipeNetwork: () => void;
}

export const useDrawingModeStore = create<DrawingModeState>((set) => ({
    isDrawingPipeNetwork: false,

    startDrawingPipeNetwork: () => {
        set({ isDrawingPipeNetwork: true });
    },

    stopDrawingPipeNetwork: () => {
        set({ isDrawingPipeNetwork: false });
    },
}));