"use client";
import { Database, Table, FileUp } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { ControlGroup, ToolBtn } from "./Shared";

interface DataControlsProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
}

export function DataControls({ activeGroup, onToggle }: DataControlsProps) {
  const { showAttributeTable, setShowAttributeTable, setImportModalOpen } =
    useUIStore();

  return (
    <ControlGroup
      id="data"
      icon={Database}
      label="Data & Import"
      activeGroup={activeGroup}
      onToggle={onToggle}
    >
      <ToolBtn
        onClick={() => setShowAttributeTable(!showAttributeTable)}
        isActive={showAttributeTable}
        icon={Table}
        title="Attribute Table"
      />
      <ToolBtn
        onClick={() => setImportModalOpen(true)}
        icon={FileUp}
        title="Import File"
      />
    </ControlGroup>
  );
}
