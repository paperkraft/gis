import { create } from "zustand";
import Map from "ol/Map";
import VectorSource from "ol/source/Vector";
import { Feature } from "ol";

interface MapState {
    map: Map | null;
    vectorSource: VectorSource | null;
    isDrawingPipe: boolean;
    coordinates: string;

    setMap: (map: Map) => void;
    setCoordinates: (coord: string) => void;
    setVectorSource: (source: VectorSource) => void;
    setIsDrawingPipe: (isDrawing: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
    map: null,
    coordinates: "--.---- --.----",
    vectorSource: null,
    isDrawingPipe: false,

    setMap: (map) => set({ map }),
    setCoordinates: (coord) => set({ coordinates: coord }),
    setVectorSource: (source) => set({ vectorSource: source }),
    setIsDrawingPipe: (isDrawing) => set({ isDrawingPipe: isDrawing }),
}));
