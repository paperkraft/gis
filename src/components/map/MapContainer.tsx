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

// Stores & Types
import { useMapStore } from "@/store/mapStore";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";

// Components
import { MapControls } from "./MapControls";
import { AttributeTable } from "./AttributeTable";
import { PropertyPanel } from "./PropertyPanel";
import { useSnapping } from "@/hooks/useSnapping";
import { DrawingToolbar } from "./DrawingToolbar";
import { StatusBar } from "./StatusBar";
import { DeleteConfirmationModal } from "../modals/DeleteConfirmationModal";
import { handleZoomToExtent } from "@/lib/interactions/map-controls";

export function MapContainer() {
  const mapRef = useRef<HTMLDivElement>(null);

  // Initialize Map & Layers
  const map = useMapStore((state) => state.map);
  const vectorSource = useMapStore((state) => state.vectorSource);

  const { vectorLayer } = useMapInitialization(mapRef);
  const {
    activeTool,
    deleteModalOpen,
    showAttributeTable,
    setDeleteModalOpen,
    setShowAttributeTable,
  } = useUIStore();

  // Get setSelectedFeature to update global state when selection changes
  const { selectedFeature, setSelectedFeature, features } = useNetworkStore();

  // --- SYNC FIX: Ensure map has features from store ---
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
  useMapInteractions({
    map,
    vectorSource,
  });

  // Handle Feature Selection
  useFeatureSelection({
    map,
    vectorLayer,
    enableHover: activeTool === "select",
    onFeatureSelect: setSelectedFeature,
  });

  // Handle Map Events (Coordinates, Fit)
  useMapEvents({ map });

  // Manage Layers & Styling
  useLayerManager({ vectorLayer });

  // Keyboard Shortcuts
  useKeyboardShortcuts();

  // Delete Handling
  const {
    handleDeleteRequestFromPanel,
    handleDeleteConfirm,
    cascadeInfo,
    deleteCount,
  } = useDeleteHandler();

  // Export Handling
  useNetworkExport();

  // History Manager (Undo/Redo)
  useHistoryManager();

  // Measurement
  useMeasurement();

  useSnapping();

  return (
    <div className="relative w-full h-full bg-gray-100 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        {/* Map Target */}
        <div ref={mapRef} className="w-full h-full" />

        <DrawingToolbar />
        <MapControls />

        {/* Panels */}
        <AttributeTable
          isOpen={showAttributeTable}
          onClose={() => setShowAttributeTable(false)}
          vectorSource={vectorSource || undefined}
        />

        {selectedFeature && activeTool === "select" && (
          <PropertyPanel
            properties={selectedFeature.getProperties() as any}
            onDeleteRequest={handleDeleteRequestFromPanel}
          />
        )}

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
