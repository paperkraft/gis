"use client";
import "ol/ol.css";
import React, { useRef } from "react";

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
import { FeatureType } from "@/types/network";

// Components
import { MapControls } from "./MapControls";
import { LocationSearch } from "./LocationSearch";
import { AttributeTable } from "./AttributeTable";
import { PropertyPanel } from "./PropertyPanel";
import { ComponentSelectionModal } from "@/components/modals/ComponentSelectionModal";
import { DeleteConfirmationModal } from "../modals/DeleteConfirmationModal";
import { Cordinates } from "./Cordinates";

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
    componentSelectionModalOpen,
    setActiveTool,
    setDeleteModalOpen,
    setShowAttributeTable,
    setComponentSelectionModalOpen,
  } = useUIStore();

  // Get setSelectedFeature to update global state when selection changes
  const { selectedFeature, setSelectedFeature } = useNetworkStore();

  // Setup Interactions (Drawing, Modifying, Managers)
  const { pipeDrawingManager, startComponentPlacement } = useMapInteractions({
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

  // --- Handlers ---

  const handleComponentSelection = (componentType: FeatureType | "skip") => {
    setComponentSelectionModalOpen(false);
    setActiveTool("draw");

    if (componentType === "skip") {
      pipeDrawingManager?.startDrawing();
    } else {
      startComponentPlacement(componentType);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Map Target */}
      <div ref={mapRef} className="w-full h-full" />

      <MapControls />
      <Cordinates />

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

      {/* Modals */}
      <ComponentSelectionModal
        isOpen={componentSelectionModalOpen}
        onClose={() => setComponentSelectionModalOpen(false)}
        onSelectComponent={handleComponentSelection}
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
  );
}
