"use client";
import { FileUp, Table2 } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { ControlGroup, StandaloneControl, ToolBtn } from "./Shared";

interface DataControlsProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
}

export function DataControls({ activeGroup, onToggle }: DataControlsProps) {
  const { showAttributeTable, setShowAttributeTable } = useUIStore();

  return (
    <>
      <StandaloneControl
        onClick={() => setShowAttributeTable(!showAttributeTable)}
        isActive={showAttributeTable}
        icon={Table2}
        title="Attribute Table"
      />
    </>
  );
}
