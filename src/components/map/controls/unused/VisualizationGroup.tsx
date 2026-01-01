"use client";
import { CircleDotDashed, Diameter, Palette, Settings2 } from "lucide-react";

import { useStyleStore } from "@/store/styleStore";
import { useUIStore } from "@/store/uiStore";

import { ControlGroup, Divider, ToolBtn } from "../Shared";

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

  return (
    <ControlGroup
      id="vis"
      icon={Palette}
      label="Visualization"
      isActiveGroup={colorMode == "diameter" || colorMode == "roughness"}
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
    </ControlGroup>
  );
}
