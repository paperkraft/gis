"use client";
import "ol/ol.css";
import React, { useRef } from "react";

// Hooks
import { useMapInitialization } from "@/hooks/useMapInitialization";
import { useMapEvents } from "@/hooks/useMapEvents";
import { useMapInteractions } from "@/hooks/useMapInteractions";
import { useLayerManager } from "@/hooks/useLayerManager";
import { useFlowAnimation } from "@/hooks/useFlowAnimation";
import { useFeatureSelection } from "@/hooks/useFeatureSelection";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useDeleteHandler } from "@/hooks/useDeleteHandler";
import { useNetworkExport } from "@/hooks/useNetworkExport";

// Stores & Types
import { useMapStore } from "@/store/mapStore";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";
import { FeatureType } from "@/types/network";

// Components
import { MapControls } from "./MapControls";
import { LocationSearch } from "./LocationSearch";
import { FlowAnimationControls } from "./FlowAnimationControls";
import { AttributeTable } from "./AttributeTable";
import { PropertyPanel } from "./PropertyPanel";
import { ComponentSelectionModal } from "@/components/modals/ComponentSelectionModal";
import { DeleteConfirmationModal } from "../modals/DeleteConfirmationModal";
import { Cordinates } from "./Cordinates";
import { useHistoryManager } from "@/hooks/useHistoryManager";
import { SimulationReportModal } from "../modals/SimulationReportModal";

export function MapContainer() {
  const mapRef = useRef<HTMLDivElement>(null);

  // 1. Initialize Map & Layers
  const { vectorLayer } = useMapInitialization(mapRef);
  const { map, vectorSource } = useMapStore();
  const {
    activeTool,
    showAttributeTable,
    setShowAttributeTable,
    componentSelectionModalOpen,
    simulationReportModalOpen,
    setSimulationReportModalOpen,
    setComponentSelectionModalOpen,
    deleteModalOpen,
    setDeleteModalOpen,
    setActiveTool,
  } = useUIStore();

  // Get setSelectedFeature to update global state when selection changes
  const { selectedFeature, setSelectedFeature } = useNetworkStore();

  // 2. Setup Interactions (Drawing, Modifying, Managers)
  const { pipeDrawingManager, startComponentPlacement } = useMapInteractions({
    map,
    vectorSource,
  });

  // 3. Handle Feature Selection
  useFeatureSelection({
    map,
    vectorLayer,
    enableHover: activeTool === "select",
    onFeatureSelect: setSelectedFeature,
  });

  // 4. Handle Map Events (Coordinates, Fit)
  useMapEvents({ map });

  // 5. Setup Flow Animation
  const flowAnimation = useFlowAnimation(vectorLayer, {
    enabled: false,
    speed: 1,
    style: "dashes",
  });

  // 6. Manage Layers & Styling
  useLayerManager({ vectorLayer, flowAnimation });

  // 7. Keyboard Shortcuts
  useKeyboardShortcuts();

  // 8. Delete Handling
  const { handleDeleteRequestFromPanel, handleDeleteConfirm, cascadeInfo } =
    useDeleteHandler();

  // 9. Export Handling (New)
  useNetworkExport();

  // 10. History Manager (Undo/Redo)
  useHistoryManager();

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

      {/* Overlays & Controls */}
      <MapControls />
      <LocationSearch />

      <FlowAnimationControls
        isAnimating={flowAnimation.isAnimating}
        speed={flowAnimation.options.speed}
        style={flowAnimation.options.style}
        onToggle={flowAnimation.toggleAnimation}
        onSpeedChange={flowAnimation.setSpeed}
        onStyleChange={flowAnimation.setStyle}
      />

      <AttributeTable
        isOpen={showAttributeTable}
        onClose={() => setShowAttributeTable(false)}
        vectorSource={vectorSource || undefined}
      />

      {/* Panels */}
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
        featureName={selectedFeature?.get("label") || "Unknown"}
        featureType={selectedFeature?.get("type") || "Feature"}
        featureId={selectedFeature?.getId()?.toString() || "Unknown"}
        cascadeInfo={cascadeInfo}
      />

      <SimulationReportModal
        isOpen={simulationReportModalOpen}
        onClose={() => setSimulationReportModalOpen(false)}
      />

      {/* Coordinate Display */}
      <Cordinates />
    </div>
  );
}
