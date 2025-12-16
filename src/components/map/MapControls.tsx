"use client";

import { useState, useRef, useEffect } from "react";
import { useUIStore } from "@/store/uiStore";

// Import Controls
import { ProjectSettingsGroup } from "./controls/ProjectSettingsGroup";
import { NavigationControls } from "./controls/NavigationControls";
import { VisualizationGroup } from "./controls/VisualizationGroup";
import { MeasurementGroup } from "./controls/MeasurementGroup";
import { EditingControls } from "./controls/EditingControls";
import { ValidationGroup } from "./controls/ValidationGroup";
import { AnimationGroup } from "./controls/AnimationGroup";
import { LabelControls } from "./controls/LabelControls";
import { DataControls } from "./controls/DataControls";

// Import Modals
import { SimulationReportModal } from "../modals/SimulationReportModal";
import { ProjectSettingsModal } from "../modals/ProjectSettingsModal";
import { ControlManagerModal } from "../modals/ControlManagerModal";
import { AutoElevationModal } from "../modals/AutoElevationModal";
import { StyleSettingsModal } from "../modals/StyleSettingsModal";
import { DataManagerModal } from "../modals/DataManagerModal";
import { ValidationModal } from "../modals/ValidationModal";
import { ImportModal } from "../modals/ImportModal";
import { ExportModal } from "../modals/ExportModal";
import { LocationSearch } from "./LocationSearch";

import { cn } from "@/lib/utils";
import { SimulationControls } from "./controls/SimulationControls";
import { useSimulationStore } from "@/store/simulationStore";
import { QueryBuilderModal } from "../modals/QueryBuilderModal";

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

  const { results } = useSimulationStore();

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

        <MeasurementGroup activeGroup={activeGroup} onToggle={toggleGroup} />
        <VisualizationGroup activeGroup={activeGroup} onToggle={toggleGroup} />
        <LabelControls activeGroup={activeGroup} onToggle={toggleGroup} />
        <AnimationGroup activeGroup={activeGroup} onToggle={toggleGroup} />

        {results && (
          <SimulationControls
            activeGroup={activeGroup}
            onToggle={toggleGroup}
          />
        )}

        <ValidationGroup
          activeGroup={activeGroup}
          onToggle={toggleGroup}
          onOpenAutoElevation={() => setShowAutoElevation(true)}
        />

        <DataControls activeGroup={activeGroup} onToggle={toggleGroup} />
        <ProjectSettingsGroup
          activeGroup={activeGroup}
          onToggle={toggleGroup}
        />
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

      <StyleSettingsModal />

      <QueryBuilderModal />
    </>
  );
}
