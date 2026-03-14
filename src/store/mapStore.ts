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
    showGrid: boolean; // NEW
    zoom: number;
    projection: string;

    setMap: (map: Map) => void;
    setVectorSource: (source: VectorSource) => void;
    setVectorLayer: (layer: VectorLayer<VectorSource>) => void;

    deleteManager: DeleteManager | null;
    setDeleteManager: (dm: DeleteManager | null) => void;

    setZoom: (zoom: number) => void;
    setShowGrid: (show: boolean) => void; // NEW
    setProjection: (proj: string) => void;
    setIsDrawingPipe: (isDrawing: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
    map: null,
    vectorSource: null,
    vectorLayer: null,
    deleteManager: null,

    isDrawingPipe: false,
    showGrid: false, // NEW
    projection: "EPSG:3857",
    zoom: 0,

    setMap: (map) => set({ map }),
    setVectorLayer: (layer) => set({ vectorLayer: layer }),
    setVectorSource: (source) => set({ vectorSource: source }),
    setDeleteManager: (dm) => set({ deleteManager: dm }),

    setZoom: (zoom) => set({ zoom }),
    setShowGrid: (show) => set({ showGrid: show }), // NEW
    setProjection: (proj) => set({ projection: proj }),
    setIsDrawingPipe: (isDrawing) => set({ isDrawingPipe: isDrawing }),
}));
