"use client";
import {
  Database,
  SettingsIcon,
  Settings2,
  Cpu,
  Save,
  Printer,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { ControlGroup, StandaloneControl, ToolBtn } from "./Shared";
import { useParams } from "next/navigation";
import { ProjectService } from "@/lib/services/ProjectService";
import { useNetworkStore } from "@/store/networkStore";
import { handlePrint } from "@/lib/interactions/map-controls";
import { useMapStore } from "@/store/mapStore";

interface SettingsProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
}

export function ProjectSettingsGroup({ activeGroup, onToggle }: SettingsProps) {
  const params = useParams();
  const projectTitle = useNetworkStore((state) => state.settings.title);
  const map = useMapStore((state) => state.map);

  const {
    dataManagerModalOpen,
    setDataManagerModalOpen,
    projectSettingsModalOpen,
    setProjectSettingsModalOpen,
    controlManagerModalOpen,
    setControlManagerModalOpen,
  } = useUIStore();

  const handleSave = () => {
    if (params.id) {
      ProjectService.saveCurrentProject(params.id as string, projectTitle);
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
      />
    </>
  );
}
