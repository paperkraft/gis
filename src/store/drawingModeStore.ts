import { create } from "zustand";

interface DrawingModeState {
    isDrawingPipeNetwork: boolean;
    startDrawingPipeNetwork: () => void;
    stopDrawingPipeNetwork: () => void;
}

export const useDrawingModeStore = create<DrawingModeState>((set) => ({
    isDrawingPipeNetwork: false,

    startDrawingPipeNetwork: () => {
        console.log("🎯 ENTERING PIPE DRAWING MODE");
        set({ isDrawingPipeNetwork: true });
    },

    stopDrawingPipeNetwork: () => {
        console.log("🛑 EXITING PIPE DRAWING MODE");
        set({ isDrawingPipeNetwork: false });
    },
}));