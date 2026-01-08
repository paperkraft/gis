"use client";

import { FileDown, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { handlePrint } from "@/lib/interactions/map-controls";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/store/mapStore";
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
import { ExportPanel } from "./ExportPanel";

export function MapControls() {
  const map = useMapStore((state) => state.map);

  const {
    activeModal,
    importModalOpen,
    exportModalOpen,
    setImportModalOpen,
    setExportModalOpen,
    setShowLocationSearch,
    setActiveModal,
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

  return (
    <>
      <div
        ref={controlsRef}
        className={cn(
          "absolute top-2.5 right-2 z-10 flex flex-col items-center",
          "rounded-sm shadow-xl p-0.5 gap-1",
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
          icon={FileDown}
          title="Export Network"
          isActive={activeModal === "EXPORT_PROJECT"}
          onClick={() => setActiveModal("EXPORT_PROJECT")}
        />
      </div>

      {/* Modals and Panel */}

      <AssetSearch />
      <BookmarkPanel />
      <LocationSearch />
      <QueryBuilderModal />
      <ExportPanel />

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
