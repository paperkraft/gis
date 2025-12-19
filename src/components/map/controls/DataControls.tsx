"use client";
import { Database, FileUp, Filter, Table2 } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { ControlGroup, StandaloneControl, ToolBtn } from "./Shared";

interface DataControlsProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
}

export function DataControls({ activeGroup, onToggle }: DataControlsProps) {
  const {
    showAttributeTable,
    setShowAttributeTable,
    setQueryBuilderModalOpen,
  } = useUIStore();

  return (
    <>
      <ControlGroup
        id="data"
        icon={Database}
        label="Data Tools"
        isActiveGroup={showAttributeTable}
        activeGroup={activeGroup}
        onToggle={onToggle}
      >
        <ToolBtn
          onClick={() => setShowAttributeTable(true)}
          isActive={showAttributeTable}
          icon={Table2}
          title="Attribute Table"
          label="Table"
        />

        {/* NEW: Query Builder Button */}
        <ToolBtn
          onClick={() => setQueryBuilderModalOpen(true)}
          icon={Filter}
          title="Select by Attribute"
          label="Query"
        />
      </ControlGroup>

      {/* <StandaloneControl
        onClick={() => setShowAttributeTable(!showAttributeTable)}
        isActive={showAttributeTable}
        icon={Table2}
        title="Attribute Table"
      /> */}
    </>
  );
}
