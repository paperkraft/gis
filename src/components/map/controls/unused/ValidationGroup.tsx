"use client";
import { CheckCircle, Mountain, Activity as ActivityIcon } from "lucide-react";
import { useTopologyValidation } from "@/hooks/useTopologyValidation";
import { ControlGroup, ToolBtn } from "../Shared";

interface ValidationGroupProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
  onOpenAutoElevation: () => void;
}

export function ValidationGroup({
  activeGroup,
  onToggle,
  onOpenAutoElevation,
}: ValidationGroupProps) {
  const { validate } = useTopologyValidation();

  return (
    <ControlGroup
      id="analysis-tools"
      icon={CheckCircle}
      label="Validation & Tools"
      activeGroup={activeGroup}
      onToggle={onToggle}
    >
      <ToolBtn
        onClick={onOpenAutoElevation}
        icon={Mountain}
        title="Auto Elevation"
        label="Elv"
      />

      <ToolBtn
        onClick={validate}
        icon={ActivityIcon}
        title="Validate Network"
        label="Check"
      />
    </ControlGroup>
  );
}
