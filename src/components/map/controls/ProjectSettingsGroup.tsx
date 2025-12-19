"use client";
import { Database, Printer, Save, Settings2, SettingsIcon } from "lucide-react";
import { useParams } from "next/navigation";

import { handlePrint } from "@/lib/interactions/map-controls";
import { ProjectService } from "@/lib/services/ProjectService";
import { useMapStore } from "@/store/mapStore";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";

import { ControlGroup, StandaloneControl, ToolBtn } from "./Shared";

interface SettingsProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
}

export function ProjectSettingsGroup({ activeGroup, onToggle }: SettingsProps) {
  const params = useParams();
  const map = useMapStore((state) => state.map);

  const {
    dataManagerModalOpen,
    projectSettingsModalOpen,
    setDataManagerModalOpen,
    setProjectSettingsModalOpen,
  } = useUIStore();

  const { hasUnsavedChanges } = useNetworkStore();

  const handleSave = async () => {
    if (params.id) {
      await ProjectService.saveCurrentProject(params.id as string);
      alert("Project Saved!");
    }
  };

  return (
    <>
      <ControlGroup
        id="settings"
        icon={Settings2}
        label="Project Settings"
        activeGroup={activeGroup}
        onToggle={onToggle}
      >
        <ToolBtn
          onClick={() => setProjectSettingsModalOpen(true)}
          isActive={projectSettingsModalOpen}
          icon={SettingsIcon}
          title="Project Settings"
        />

        <ToolBtn
          onClick={() => setDataManagerModalOpen(true)}
          isActive={dataManagerModalOpen}
          icon={Database}
          title="Data Manager"
        />

        <ToolBtn
          onClick={() => handlePrint(map)}
          icon={Printer}
          title="Print Map"
        />
      </ControlGroup>

      <StandaloneControl
        onClick={handleSave}
        isActive={false}
        icon={Save}
        title="Save Network"
        colorClass={
          hasUnsavedChanges
            ? "text-amber-600 dark:text-amber-500 animate-pulse"
            : ""
        }
      />
    </>
  );
}
