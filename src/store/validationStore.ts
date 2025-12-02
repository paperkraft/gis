import { create } from "zustand";
import { NetworkValidation } from "@/types/network";

interface ValidationState {
    lastValidation: NetworkValidation | null;
    setValidationResult: (result: NetworkValidation) => void;
    clearValidationResult: () => void;
}

export const useValidationStore = create<ValidationState>((set) => ({
    lastValidation: null,

    setValidationResult: (result) => set({ lastValidation: result }),

    clearValidationResult: () => set({ lastValidation: null }),
}));