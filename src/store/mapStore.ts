import { create } from "zustand";
import Map from "ol/Map";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";

interface MapState {
    map: Map | null;
    vectorSource: VectorSource | null;
    vectorLayer: VectorLayer<VectorSource> | null;

    isDrawingPipe: boolean;
    coordinates: string;
    zoom: number;
    projection: string;

    setMap: (map: Map) => void;
    setVectorSource: (source: VectorSource) => void;
    setVectorLayer: (layer: VectorLayer<VectorSource>) => void;

    setCoordinates: (coord: string) => void;
    setZoom: (zoom: number) => void;
    setProjection: (proj: string) => void;
    setIsDrawingPipe: (isDrawing: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
    map: null,
    vectorSource: null,
    vectorLayer: null,

    coordinates: "--.---- --.----",
    isDrawingPipe: false,
    projection: "EPSG:3857",
    zoom: 0,

    setMap: (map) => set({ map }),
    setVectorLayer: (layer) => set({ vectorLayer: layer }),
    setVectorSource: (source) => set({ vectorSource: source }),

    setZoom: (zoom) => set({ zoom }),
    setProjection: (proj) => set({ projection: proj }),
    setCoordinates: (coord) => set({ coordinates: coord }),
    setIsDrawingPipe: (isDrawing) => set({ isDrawingPipe: isDrawing }),
}));
