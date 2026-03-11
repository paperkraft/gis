"use client";
import "ol/ol.css";
import React, { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { isEmpty } from "ol/extent";

// Hooks
import { useMapInitialization } from "@/hooks/map/useMapInitialization";
import { useMapEvents } from "@/hooks/map/useMapEvents";
import { useMapInteractions } from "@/hooks/map/useMapInteractions";
import { useLayerManager } from "@/hooks/map/useLayerManager";
import { useFeatureSelection } from "@/hooks/map/useFeatureSelection";
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
import { WorkbenchModalType } from "../workbench/modal_registry";

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
  const lastSelectedIdRef = useRef<string | null>(null);
  const hasZoomedRef = useRef(false);
  // Track whether the project data was already in the store when the map first mounted.
  // We only want to auto-zoom when the project was pre-loaded, NOT when the user
  // adds the very first feature on a blank project.
  const initialFeatureCountRef = useRef<number | null>(null);

  // Initialize Map & Layers
  const map = useMapStore((state) => state.map);
  const vectorSource = useMapStore((state) => state.vectorSource);

  // Initialize Map
  const { vectorLayer } = useMapInitialization(mapRef);

  // Network store
  const { selectedFeature, setSelectedFeature, features } = useNetworkStore();

  const { activeTool, activeModal, setActiveModal } = useUIStore();

  // Reset on project change
  useEffect(() => {
    hasZoomedRef.current = false;
    initialFeatureCountRef.current = null;
  }, [projectId]);

  // Capture the feature count at the moment the map becomes ready (i.e. on load).
  // This snapshot lets us distinguish "features that existed on load" from
  // "features the user just drew".
  useEffect(() => {
    if (!map || initialFeatureCountRef.current !== null) return;
    initialFeatureCountRef.current = features.size;
  }, [map, features.size]);

  useEffect(() => {
    // Wait until Map, Source, and Data are ready
    if (!map || !vectorSource) return;

    // Only auto-zoom if the project had features when it first loaded.
    // If initialFeatureCount is 0 or null, this is a blank project — skip zoom.
    if (!initialFeatureCountRef.current || initialFeatureCountRef.current === 0) return;

    // Only zoom once per project session
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

  // Setup Interactions
  const { deleteManager, pipeDrawingManager } = useMapInteractions({
    map,
    vectorSource,
  });

  const contextMenu = useMapContextMenu(pipeDrawingManager, deleteManager);

  // Handle Feature Selection
  useFeatureSelection({
    map,
    vectorLayer: vectorLayer as any,
    enableHover: activeTool === "select",
  });

  useEffect(() => {
    const currentId = selectedFeature
      // @ts-ignore
      ? selectedFeature.id || selectedFeature.getId()?.toString() || null
      : null;

    const protectedModals = ["VALIDATION", "AUTO_ELEVATION", "DATA_MANAGER"];

    if (protectedModals.includes(activeModal)) {
      // Just update the ref so we track the selection, but DO NOT change the modal.
      lastSelectedIdRef.current = currentId;
      return;
    }

    if (
      currentId &&
      currentId !== lastSelectedIdRef.current &&
      activeTool === "select"
    ) {

      const type = selectedFeature?.type || (selectedFeature as any)?.get("type");
      let modalType: WorkbenchModalType = "NONE";

      // Map Feature Types to Modal Types
      switch (type) {
        case "junction":
          modalType = "JUNCTION_PROP";
          break;
        case "reservoir":
          modalType = "RESERVOIR_PROP";
          break;
        case "tank":
          modalType = "TANK_PROP";
          break;
        case "pipe":
          modalType = "PIPE_PROP";
          break;
        case "pump":
          modalType = "PUMP_PROP";
          break;
        case "valve":
          modalType = "VALVE_PROP";
          break;
        default:
          modalType = "NONE";
      }

      if (modalType !== "NONE") {
        setActiveModal(modalType);
      }

      lastSelectedIdRef.current = currentId;
    } else if (!selectedFeature && lastSelectedIdRef.current !== null) {
      // If nothing is selected, close the property modal
      if (activeModal.endsWith("_PROP")) {
        setActiveModal("NONE");
      }

      lastSelectedIdRef.current = null;
    }
  }, [selectedFeature, activeTool, activeModal, setActiveModal]);

  // Handle Map Events (Coordinates)
  useMapEvents({ map });

  // Manage Layers & Styling
  useLayerManager({ vectorLayer });

  // Keyboard Shortcuts
  useKeyboardShortcuts();

  // History Manager (Undo/Redo)
  useHistoryManager();

  // Measurement
  useMeasurement();

  // Activate Synchronization
  useMapFeatureSync();

  useDeleteHighlight();

  // Simulation results from database
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
