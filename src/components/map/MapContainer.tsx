"use client";
import "ol/ol.css";
import React, { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { isEmpty } from "ol/extent";

// Hooks
import { useMapInitialization } from "@/hooks/map/useMapInitialization";
import { useMapInteractions } from "@/hooks/map/useMapInteractions";
import { useLayerManager } from "@/hooks/map/useLayerManager";
import { useFeatureSelection } from "@/hooks/map/useFeatureSelection";
import { useSelectionRouter } from "@/hooks/map/useSelectionRouter";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useHistoryManager } from "@/hooks/useHistoryManager";
import { useMeasurement } from "@/hooks/useMeasurement";
import { useMapFeatureSync } from "@/hooks/map/useMapFeatureSync";
import { useMapContextMenu } from "@/hooks/map/useMapContextMenu";
import { useDeleteHighlight } from "@/hooks/useDeleteHighlight";

// Stores & Types
import { useMapStore } from "@/store/mapStore";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";
import { useSimulationStore } from "@/store/simulationStore";

// Components
import { Legend } from "./Legend";
import { StatusBar } from "./StatusBar";
import { MapToolbar } from "./MapToolbar";
import { MapControls } from "./MapControls";
import { MapLayers } from "./MapLayers";
import { MapContextMenu } from "./MapContextMenu";

export function MapContainer() {
  const params = useParams();
  const projectId = params?.id as string;

  const mapRef = useRef<HTMLDivElement>(null);
  const hasZoomedRef = useRef(false);
  const initialFeatureCountRef = useRef<number | null>(null);

  // Initialize Map & Layers (includes map events)
  const map = useMapStore((state) => state.map);
  const vectorSource = useMapStore((state) => state.vectorSource);
  const { vectorLayer } = useMapInitialization(mapRef);

  // Network store
  const features = useNetworkStore((s) => s.features);
  const { activeTool } = useUIStore();

  // --- Auto-Zoom on Load ---
  useEffect(() => {
    hasZoomedRef.current = false;
    initialFeatureCountRef.current = null;
  }, [projectId]);

  useEffect(() => {
    if (!map || initialFeatureCountRef.current !== null) return;
    initialFeatureCountRef.current = features.size;
  }, [map, features.size]);

  useEffect(() => {
    if (!map || !vectorSource) return;
    if (!initialFeatureCountRef.current || initialFeatureCountRef.current === 0) return;
    if (hasZoomedRef.current) return;

    const timer = setTimeout(() => {
      if (vectorSource.getFeatures().length > 0) {
        const extent = vectorSource.getExtent();
        if (!isEmpty(extent)) {
          map.getView().fit(extent, {
            padding: [200, 200, 200, 200],
            duration: 1000,
            maxZoom: 22,
          });
          hasZoomedRef.current = true;
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [map, vectorSource, features.size, projectId]);

  // --- Interactions ---
  const { deleteManager, pipeDrawingManager } = useMapInteractions({
    map,
    vectorSource,
  });

  const contextMenu = useMapContextMenu(pipeDrawingManager, deleteManager);

  // --- Feature Selection ---
  useFeatureSelection({
    map,
    vectorLayer: vectorLayer as any,
    enableHover: activeTool === "select",
  });

  // --- Selection → Modal Routing ---
  useSelectionRouter();

  // --- Layers & Styling ---
  useLayerManager({ vectorLayer });

  // --- Global Hooks ---
  useKeyboardShortcuts();
  useHistoryManager();
  useMeasurement();
  useMapFeatureSync();
  useDeleteHighlight();

  // --- Load Simulation Results ---
  const { loadResults } = useSimulationStore();

  useEffect(() => {
    if (projectId) {
      loadResults(projectId);
    }
  }, [projectId, loadResults]);

  return (
    <div className="relative w-full h-full bg-gray-100 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <div ref={mapRef} className="w-full h-full" />

        <MapToolbar />
        <MapControls />
        <Legend />
        <MapLayers />

        {activeTool === 'modify' && (
          <MapContextMenu
            isVisible={contextMenu.isVisible}
            position={contextMenu.position}
            type={contextMenu.type}
            feature={contextMenu.feature}
            onClose={contextMenu.onClose}
            onAction={contextMenu.onAction}
            canMergeNode={contextMenu.canMergeNode}
          />
        )}
      </div>

      <StatusBar />
    </div>
  );
}
