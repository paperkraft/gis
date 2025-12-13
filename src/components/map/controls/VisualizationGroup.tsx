"use client";
import {
  Activity as ActivityIcon,
  CircleDotDashed,
  Diameter,
  Palette,
  Settings2,
  Waves,
} from "lucide-react";

import { useStyleStore } from "@/store/styleStore";

import { ControlGroup, Divider, ToolBtn } from "./Shared";
import { useUIStore } from "@/store/uiStore";
import { useSimulationStore } from "@/store/simulationStore";

interface VisualizationGroupProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
}

export function VisualizationGroup({
  activeGroup,
  onToggle,
}: VisualizationGroupProps) {
  const { colorMode, setColorMode } = useStyleStore();
  const { setStyleSettingsModalOpen } = useUIStore();
  const { results } = useSimulationStore();

  return (
    <ControlGroup
      id="vis"
      icon={Palette}
      label="Visualization"
      isActiveGroup={colorMode !== "none"}
      activeGroup={activeGroup}
      onToggle={onToggle}
    >
      <ToolBtn
        onClick={() => setStyleSettingsModalOpen(true)}
        icon={Settings2}
        title="Configure Colors"
      />

      <Divider />

      <ToolBtn
        onClick={() => setColorMode("none")}
        isActive={colorMode === "none"}
        icon={Palette}
        title="None (Default)"
      />

      <ToolBtn
        onClick={() => setColorMode("diameter")}
        isActive={colorMode === "diameter"}
        icon={Diameter}
        title="Color by Diameter"
        label="Diam"
      />
      <ToolBtn
        onClick={() => setColorMode("roughness")}
        isActive={colorMode === "roughness"}
        icon={CircleDotDashed}
        title="Color by Roughness"
        label="Rough"
      />

      <Divider />

      <ToolBtn
        onClick={() => setColorMode("pressure")}
        isActive={colorMode === "pressure"}
        icon={ActivityIcon}
        disabled={!results}
        title="Pressure Map"
        label="Pres"
      />
      <ToolBtn
        onClick={() => setColorMode("velocity")}
        isActive={colorMode === "velocity"}
        icon={Waves}
        disabled={!results}
        title="Velocity Map"
        label="Vel"
      />
    </ControlGroup>
  );
}
