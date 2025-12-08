import { create } from "zustand";
import Map from "ol/Map";
import VectorSource from "ol/source/Vector";

interface MapState {
    map: Map | null;
    vectorSource: VectorSource | null;
    isDrawingPipe: boolean;
    coordinates: string;
    zoom: number;
    projection: string;

    setMap: (map: Map) => void;
    setCoordinates: (coord: string) => void;
    setZoom: (zoom: number) => void;
    setProjection: (proj: string) => void;
    setVectorSource: (source: VectorSource) => void;
    setIsDrawingPipe: (isDrawing: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
    map: null,
    coordinates: "--.---- --.----",
    vectorSource: null,
    isDrawingPipe: false,
    projection: "EPSG:3857",
    zoom: 0,

    setZoom: (zoom) => set({ zoom }),
    setProjection: (proj) => set({ projection: proj }),

    setMap: (map) => set({ map }),
    setCoordinates: (coord) => set({ coordinates: coord }),
    setVectorSource: (source) => set({ vectorSource: source }),
    setIsDrawingPipe: (isDrawing) => set({ isDrawingPipe: isDrawing }),
}));
