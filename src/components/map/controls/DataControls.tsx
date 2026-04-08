"use client";
import { Database, Filter, Table2 } from "lucide-react";

import { useUIStore } from "@/store/uiStore";

import { ControlGroup, ToolBtn } from "./Shared";

interface DataControlsProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
  disabled?: boolean;
}

export function DataControls({ activeGroup, onToggle, disabled = false }: DataControlsProps) {
  const {
    activeModal,
    showAttributeTable,
    setShowAttributeTable,
    activeRightPanel,
    setActiveRightPanel,
    setActiveModal,
  } = useUIStore();

  const isActiveGroup = showAttributeTable || activeRightPanel === 'QUERY';

  return (
    <>
      <ControlGroup
        id="data"
        icon={Database}
        label="Data Tools"
        isActiveGroup={isActiveGroup}
        activeGroup={activeGroup}
        onToggle={onToggle}
        disabled={disabled}
      >
        <ToolBtn
          onClick={() => setShowAttributeTable(true)}
          isActive={showAttributeTable}
          icon={Table2}
          title="Attribute Table"
          label="Table"
          disabled={disabled}
        />

        <ToolBtn
          onClick={() => setActiveRightPanel(activeRightPanel === 'QUERY' ? 'NONE' : 'QUERY')}
          isActive={activeRightPanel === 'QUERY'}
          icon={Filter}
          title="Select by Attribute"
          label="Query"
          disabled={disabled}
        />
      </ControlGroup>
    </>
  );
}
