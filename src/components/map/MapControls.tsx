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
import { ProjectSettingsModal } from "../modals/ProjectSettingsModal";
import { DataManagerModal } from "../modals/DataManagerModal";
import { ControlManagerModal } from "../modals/ControlManagerModal";
import { Settings } from "./controls/Settings";
import { ExportModal } from "../modals/ExportModal";
import { LocationSearch } from "./LocationSearch";
import { cn } from "@/lib/utils";

export function MapControls() {
  const {
    importModalOpen,
    exportModalOpen,
    showAutoElevation,
    validationModalOpen,
    dataManagerModalOpen,
    controlManagerModalOpen,
    projectSettingsModalOpen,
    simulationReportModalOpen,

    setImportModalOpen,
    setExportModalOpen,
    setShowAutoElevation,
    setValidationModalOpen,
    setDataManagerModalOpen,
    setSimulationReportModalOpen,
    setProjectSettingsModalOpen,
    setControlManagerModalOpen,
    setShowLocationSearch,
  } = useUIStore();

  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // Ref to track the controls container
  const controlsRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside the controls
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        activeGroup &&
        controlsRef.current &&
        !controlsRef.current.contains(event.target as Node)
      ) {
        setActiveGroup(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeGroup]);

  const toggleGroup = (group: string) => {
    if (activeGroup !== group) {
      setShowLocationSearch(false);
    }
    setActiveGroup(activeGroup === group ? null : group);
  };

  return (
    <>
      <div
        ref={controlsRef}
        className={cn(
          "absolute top-4 right-4 z-10 flex flex-col items-center",
          "p-1.5 gap-2 rounded-2xl shadow-2xl",
          "border border-white/20 dark:border-gray-700/50",
          "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md",
          "transition-all hover:bg-white/95 dark:hover:bg-gray-900/95"
        )}
      >
        <NavigationControls activeGroup={activeGroup} onToggle={toggleGroup} />
        <EditingControls activeGroup={activeGroup} onToggle={toggleGroup} />
        <AnalysisControls
          activeGroup={activeGroup}
          onToggle={toggleGroup}
          onOpenAutoElevation={() => setShowAutoElevation(true)}
        />
        <DataControls activeGroup={activeGroup} onToggle={toggleGroup} />
        <Settings activeGroup={activeGroup} onToggle={toggleGroup} />
      </div>

      {/* Modals */}
      <LocationSearch />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
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

      <ProjectSettingsModal
        isOpen={projectSettingsModalOpen}
        onClose={() => setProjectSettingsModalOpen(false)}
      />

      <DataManagerModal
        isOpen={dataManagerModalOpen}
        onClose={() => setDataManagerModalOpen(false)}
      />

      <ControlManagerModal
        isOpen={controlManagerModalOpen}
        onClose={() => setControlManagerModalOpen(false)}
      />
    </>
  );
}
