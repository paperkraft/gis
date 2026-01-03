"use client";
import "ol/ol.css";
import React, { useEffect, useRef } from "react";

// Hooks
import { useMapInitialization } from "@/hooks/useMapInitialization";
import { useMapEvents } from "@/hooks/useMapEvents";
import { useMapInteractions } from "@/hooks/useMapInteractions";
import { useLayerManager } from "@/hooks/useLayerManager";
import { useFeatureSelection } from "@/hooks/useFeatureSelection";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useDeleteHandler } from "@/hooks/useDeleteHandler";
import { useNetworkExport } from "@/hooks/useNetworkExport";
import { useHistoryManager } from "@/hooks/useHistoryManager";
import { useMeasurement } from "@/hooks/useMeasurement";
import { useSnapping } from "@/hooks/useSnapping";
import { useMapFeatureSync } from "@/hooks/useMapFeatureSync";

// Stores & Types
import { useMapStore } from "@/store/mapStore";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";
import { WorkbenchModalType } from "../workbench/modal_registry";

import { handleZoomToExtent } from "@/lib/interactions/map-controls";

// Components
import { Legend } from "./Legend";
import { StatusBar } from "./StatusBar";
import { MapToolbar } from "./MapToolbar";
import { MapControls } from "./MapControls";
import { AttributeTable } from "./AttributeTable";
import { DeleteConfirmationModal } from "../modals/DeleteConfirmationModal";
import { MapLayers } from "./MapLayers";

export function MapContainer() {
  const mapRef = useRef<HTMLDivElement>(null);
  const lastSelectedIdRef = useRef<string | null>(null);

  // Initialize Map & Layers
  const map = useMapStore((state) => state.map);
  const vectorSource = useMapStore((state) => state.vectorSource);

  // Initialize Map
  const { vectorLayer } = useMapInitialization(mapRef);

  // Network store
  const { selectedFeature, setSelectedFeature, features } = useNetworkStore();

  const {
    activeTool,
    deleteModalOpen,
    showAttributeTable,
    activeModal,
    setActiveModal,
    setDeleteModalOpen,
    setShowAttributeTable,
  } = useUIStore();

  // --- Ensure map has features from store ---
  useEffect(() => {
    if (
      vectorSource &&
      features.size > 0 &&
      vectorSource.getFeatures().length === 0
    ) {
      vectorSource.addFeatures(Array.from(features.values()));

      // Auto-zoom after sync
      if (map) {
        setTimeout(() => {
          handleZoomToExtent(map);
        }, 200);
      }
    }
  }, [vectorSource, features, map]);

  // Setup Interactions
  useMapInteractions({ map, vectorSource });

  // Handle Feature Selection
  useFeatureSelection({
    map,
    vectorLayer,
    enableHover: activeTool === "select",
    onFeatureSelect: setSelectedFeature,
  });

  useEffect(() => {
    const currentId = selectedFeature
      ? selectedFeature.getId()?.toString() || null
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
      const type = selectedFeature?.get("type");
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

  // Handle Map Events (Coordinates, Fit)
  useMapEvents({ map });

  // Manage Layers & Styling
  useLayerManager({ vectorLayer });

  // Keyboard Shortcuts
  useKeyboardShortcuts();

  // Delete Handling
  const { cascadeInfo, deleteCount, handleDeleteConfirm } = useDeleteHandler();

  // Export Handling
  useNetworkExport();

  // History Manager (Undo/Redo)
  useHistoryManager();

  // Measurement
  useMeasurement();

  // Snapping
  useSnapping();

  // Activate Synchronization
  useMapFeatureSync();

  return (
    <div className="relative w-full h-full bg-gray-100 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        {/* Map Target */}
        <div ref={mapRef} className="w-full h-full" />

        <MapToolbar />
        <MapControls />
        <Legend />

        <MapLayers />

        {/* Panels */}
        <AttributeTable
          isOpen={showAttributeTable}
          onClose={() => setShowAttributeTable(false)}
          vectorSource={vectorSource || undefined}
        />

        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          count={deleteCount}
          featureName={selectedFeature?.get("label") || "Unknown"}
          featureType={selectedFeature?.get("type") || "Feature"}
          featureId={selectedFeature?.getId()?.toString() || "Unknown"}
          cascadeInfo={cascadeInfo}
        />
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
