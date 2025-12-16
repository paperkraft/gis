"use client";
import { CircleDot, Mountain, Tag, Type } from "lucide-react";

import { useStyleStore } from "@/store/styleStore";
import { useUIStore } from "@/store/uiStore";

import { ControlGroup, Divider, ToolBtn } from "./Shared";

interface LabelControlsProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
}

export function LabelControls({ activeGroup, onToggle }: LabelControlsProps) {
  const { showLabels, setShowLabels } = useUIStore();
  const { labelMode, setLabelMode } = useStyleStore();

  return (
    <ControlGroup
      id="labels"
      icon={Type}
      label="Lables"
      isActiveGroup={showLabels}
      activeGroup={activeGroup}
      onToggle={onToggle}
    >
      <ToolBtn
        onClick={() => setShowLabels(!showLabels)}
        isActive={showLabels}
        icon={Type}
        title={showLabels ? "Hide Labels" : "Show Labels"}
        label="Labels"
      />

      {/* Label Mode Sub-menu */}
      {showLabels && (
        <>
          <Divider />

          <ToolBtn
            onClick={() => setLabelMode("id")}
            isActive={labelMode === "id"}
            icon={Tag}
            title="Show Component IDs"
            label="ID"
          />
          <ToolBtn
            onClick={() => setLabelMode("elevation")}
            isActive={labelMode === "elevation"}
            icon={Mountain}
            title="Show Node Elevation"
            label="Elev"
          />
          <ToolBtn
            onClick={() => setLabelMode("diameter")}
            isActive={labelMode === "diameter"}
            icon={CircleDot}
            title="Show Pipe Diameter"
            label="Diam"
          />
        </>
      )}
    </ControlGroup>
  );
}
