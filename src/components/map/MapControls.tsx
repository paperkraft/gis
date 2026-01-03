"use client";

import { Printer, Save } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { handlePrint } from "@/lib/interactions/map-controls";
import { ProjectService } from "@/lib/services/ProjectService";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/store/mapStore";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";

// Import Modals
import { ExportModal } from "../modals/ExportModal";
import { ImportModal } from "../modals/ImportModal";
import { QueryBuilderModal } from "../modals/QueryBuilderModal";

// Import Controls
import { DataControls } from "./controls/DataControls";
import { AnimationGroup } from "./controls/AnimationGroup";
import { EditingControls } from "./controls/EditingControls";
import { MeasurementGroup } from "./controls/MeasurementGroup";
import { LayerControls } from "./controls/LayerControls";
import { NavigationControls } from "./controls/NavigationControls";
import { StandaloneControl } from "./controls/Shared";
import { AssetSearch } from "./controls/AssetSearch";
import { LocationSearch } from "./LocationSearch";
import { BookmarkPanel } from "./BookmarkPanel";

export function MapControls() {
  const params = useParams();
  const map = useMapStore((state) => state.map);

  const { hasUnsavedChanges } = useNetworkStore();

  const {
    importModalOpen,
    exportModalOpen,
    setImportModalOpen,
    setExportModalOpen,
    setShowLocationSearch,
  } = useUIStore();

  const controlsRef = useRef<HTMLDivElement>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

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

  const handleSave = async () => {
    if (params.id) {
      await ProjectService.saveCurrentProject(params.id as string);
      toast.success("Project Saved");
    }
  };

  return (
    <>
      <div
        ref={controlsRef}
        className={cn(
          "absolute top-4 right-4 z-10 flex flex-col items-center",
          "rounded shadow-xl p-0.5 gap-0.5",
          "border border-white/20 dark:border-gray-700/50",
          "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md",
          "transition-all hover:bg-white/95 dark:hover:bg-gray-900/95"
        )}
      >
        <NavigationControls activeGroup={activeGroup} onToggle={toggleGroup} />
        <LayerControls activeGroup={activeGroup} onToggle={toggleGroup} />
        <EditingControls activeGroup={activeGroup} onToggle={toggleGroup} />
        <MeasurementGroup activeGroup={activeGroup} onToggle={toggleGroup} />
        <AnimationGroup activeGroup={activeGroup} onToggle={toggleGroup} />
        <DataControls activeGroup={activeGroup} onToggle={toggleGroup} />

        <StandaloneControl
          onClick={() => handlePrint(map)}
          icon={Printer}
          title="Print Map"
        />

        <StandaloneControl
          onClick={handleSave}
          icon={Save}
          title="Save Network"
          colorClass={
            hasUnsavedChanges
              ? "text-amber-600 dark:text-amber-500 animate-pulse"
              : ""
          }
        />
      </div>

      {/* Modals and Panel */}

      <AssetSearch />
      <BookmarkPanel />
      <LocationSearch />
      <QueryBuilderModal />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
    </>
  );
}
