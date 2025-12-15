"use client";
import {
  Edit3,
  RotateCcw,
  RotateCw,
  MousePointer2,
  BoxSelect,
  Pentagon,
  Magnet,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { ControlGroup, ToolBtn, Divider } from "./Shared";

interface EditingControlsProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
}

export function EditingControls({
  activeGroup,
  onToggle,
}: EditingControlsProps) {
  const { activeTool, setActiveTool, isSnappingEnabled, setIsSnappingEnabled } =
    useUIStore();

  const handleUndo = () => window.dispatchEvent(new CustomEvent("undo"));
  const handleRedo = () => window.dispatchEvent(new CustomEvent("redo"));

  const isEditingActive = ["select-box", "select-polygon"].includes(
    activeTool || ""
  );

  return (
    <ControlGroup
      id="edit"
      icon={BoxSelect}
      label="Selection & Editing"
      isActiveGroup={isEditingActive}
      activeGroup={activeGroup}
      onToggle={onToggle}
    >
      <ToolBtn onClick={handleUndo} icon={RotateCcw} title="Undo" />
      <ToolBtn onClick={handleRedo} icon={RotateCw} title="Redo" />

      <Divider />

      <ToolBtn
        onClick={() => setIsSnappingEnabled(!isSnappingEnabled)}
        isActive={isSnappingEnabled}
        icon={Magnet}
        title={isSnappingEnabled ? "Snapping On" : "Snapping Off"}
        colorClass="text-purple-600"
      />

      <Divider />

      <ToolBtn
        onClick={() => setActiveTool("select-box")}
        isActive={activeTool === "select-box"}
        icon={BoxSelect}
        title="Box Select"
      />
      <ToolBtn
        onClick={() => setActiveTool("select-polygon")}
        isActive={activeTool === "select-polygon"}
        icon={Pentagon}
        title="Polygon Select"
      />
    </ControlGroup>
  );
}
