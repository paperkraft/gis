"use client";
import { BoxSelect, Pentagon, Magnet, Undo2, Redo2, ListOrdered } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { ControlGroup, ToolBtn, Divider } from "./Shared";
import { useHistoryManager } from "@/hooks/useHistoryManager";

interface EditingControlsProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
}

export function EditingControls({
  activeGroup,
  onToggle,
}: EditingControlsProps) {
  const { activeTool, setActiveTool, isSnappingEnabled, setIsSnappingEnabled, setActiveModal } =
    useUIStore();
  const { undo, redo } = useHistoryManager();

  const handleUndo = () => undo();
  const handleRedo = () => redo();

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

      <Divider />

      <ToolBtn
        onClick={() => setActiveModal("NUMBERING")}
        icon={ListOrdered}
        title="Feature Numbering"
      />

      <ToolBtn
        onClick={() => setIsSnappingEnabled(!isSnappingEnabled)}
        isActive={isSnappingEnabled}
        icon={Magnet}
        title={isSnappingEnabled ? "Snapping On" : "Snapping Off"}
      />

      <Divider />

      <ToolBtn onClick={handleUndo} icon={Undo2} title="Undo" />
      <ToolBtn onClick={handleRedo} icon={Redo2} title="Redo" />
    </ControlGroup>
  );
}
