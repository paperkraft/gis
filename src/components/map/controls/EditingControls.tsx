"use client";
import {
  Edit3,
  RotateCcw,
  RotateCw,
  MousePointer2,
  BoxSelect,
  Pentagon,
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
  const { activeTool, setActiveTool } = useUIStore();

  const handleUndo = () => window.dispatchEvent(new CustomEvent("undo"));
  const handleRedo = () => window.dispatchEvent(new CustomEvent("redo"));

  const isEditingActive = ["select", "select-box", "select-polygon"].includes(
    activeTool || ""
  );

  return (
    <ControlGroup
      id="edit"
      icon={Edit3}
      label="Editing"
      isActiveGroup={isEditingActive}
      activeGroup={activeGroup}
      onToggle={onToggle}
    >
      <ToolBtn onClick={handleUndo} icon={RotateCcw} title="Undo" />
      <ToolBtn onClick={handleRedo} icon={RotateCw} title="Redo" />
      <Divider />
      <ToolBtn
        onClick={() => setActiveTool("select")}
        isActive={activeTool === "select"}
        icon={MousePointer2}
        title="Select"
      />
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
