"use client";

import { useState, useRef, useEffect } from "react";
import { useUIStore } from "@/store/uiStore";

// Import Controls
import { NavigationControls } from "./controls/NavigationControls";
import { EditingControls } from "./controls/EditingControls";
import { AnalysisControls } from "./controls/AnalysisControls";
import { DataControls } from "./controls/DataControls";

// Import Modals
import { ImportModal } from "../modals/ImportModal";
import { AutoElevationModal } from "../modals/AutoElevationModal";
import { ValidationModal } from "../modals/ValidationModal";
import { SimulationReportModal } from "../modals/SimulationReportModal";

export function MapControls() {
  const {
    importModalOpen,
    validationModalOpen,
    showAutoElevation,
    simulationReportModalOpen,

    setImportModalOpen,
    setValidationModalOpen,
    setShowAutoElevation,
    setSimulationReportModalOpen,
  } = useUIStore();

  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // Ref to track the controls container
  const controlsRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside the controls
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If a group is active AND the click target is NOT inside the controls container
      if (
        activeGroup &&
        controlsRef.current &&
        !controlsRef.current.contains(event.target as Node)
      ) {
        setActiveGroup(null);
      }
    };

    // Use mousedown to catch clicks before they might be swallowed by map interactions
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeGroup]);

  const toggleGroup = (group: string) => {
    setActiveGroup(activeGroup === group ? null : group);
  };

  return (
    <>
      <div
        ref={controlsRef}
        className="absolute top-4 right-4 flex flex-col gap-3 z-10"
      >
        <NavigationControls activeGroup={activeGroup} onToggle={toggleGroup} />
        <EditingControls activeGroup={activeGroup} onToggle={toggleGroup} />
        <AnalysisControls
          activeGroup={activeGroup}
          onToggle={toggleGroup}
          onOpenAutoElevation={() => setShowAutoElevation(true)}
        />
        <DataControls activeGroup={activeGroup} onToggle={toggleGroup} />
      </div>

      {/* Modals */}
      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />

      <AutoElevationModal
        isOpen={showAutoElevation}
        onClose={() => setShowAutoElevation(false)}
      />
      <ValidationModal
        isOpen={validationModalOpen}
        onClose={() => setValidationModalOpen(false)}
      />

      <SimulationReportModal
        isOpen={simulationReportModalOpen}
        onClose={() => setSimulationReportModalOpen(false)}
      />
    </>
  );
}
