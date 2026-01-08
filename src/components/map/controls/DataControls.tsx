"use client";
import { Database, Filter, Table2 } from "lucide-react";

import { useUIStore } from "@/store/uiStore";

import { ControlGroup, ToolBtn } from "./Shared";

interface DataControlsProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
}

export function DataControls({ activeGroup, onToggle }: DataControlsProps) {
  const {
    activeModal,
    showAttributeTable,
    setShowAttributeTable,
    setActiveModal,
  } = useUIStore();

  const isActiveGroup = showAttributeTable || activeModal === "QUERY_BUILDER";

  return (
    <>
      <ControlGroup
        id="data"
        icon={Database}
        label="Data Tools"
        isActiveGroup={isActiveGroup}
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

        <ToolBtn
          onClick={() => setActiveModal("QUERY_BUILDER")}
          icon={Filter}
          title="Select by Attribute"
          label="Query"
        />
      </ControlGroup>
    </>
  );
}
