import { create } from "zustand";
import Map from "ol/Map";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import type { DeleteManager } from "@/lib/topology/deleteManager";

interface MapState {
    map: Map | null;
    vectorSource: VectorSource | null;
    vectorLayer: VectorLayer<VectorSource> | null;

    isDrawingPipe: boolean;
    zoom: number;
    projection: string;

    setMap: (map: Map) => void;
    setVectorSource: (source: VectorSource) => void;
    setVectorLayer: (layer: VectorLayer<VectorSource>) => void;

    deleteManager: DeleteManager | null;
    setDeleteManager: (dm: DeleteManager | null) => void;

    setZoom: (zoom: number) => void;
    setProjection: (proj: string) => void;
    setIsDrawingPipe: (isDrawing: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
    map: null,
    vectorSource: null,
    vectorLayer: null,
    deleteManager: null,

    isDrawingPipe: false,
    projection: "EPSG:3857",
    zoom: 0,

    setMap: (map) => set({ map }),
    setVectorLayer: (layer) => set({ vectorLayer: layer }),
    setVectorSource: (source) => set({ vectorSource: source }),
    setDeleteManager: (dm) => set({ deleteManager: dm }),

    setZoom: (zoom) => set({ zoom }),
    setProjection: (proj) => set({ projection: proj }),
    setIsDrawingPipe: (isDrawing) => set({ isDrawingPipe: isDrawing }),
}));
