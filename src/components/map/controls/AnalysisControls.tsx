"use client";
import {
  Ruler,
  Square,
  Mountain,
  ActivityIcon,
  Radar,
  ShieldCheck,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useTopologyValidation } from "@/hooks/useTopologyValidation";
import { ControlGroup, ToolBtn, Divider } from "./Shared";

interface AnalysisControlsProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
  onOpenAutoElevation: () => void;
}

export function AnalysisControls({
  activeGroup,
  onToggle,
  onOpenAutoElevation,
}: AnalysisControlsProps) {
  const {
    measurementType,
    measurementActive,
    setMeasurementType,
    setMeasurementActive,
  } = useUIStore();

  const { validate } = useTopologyValidation();

  const toggleMeasurement = (type: "distance" | "area") => {
    if (measurementActive && measurementType === type) {
      setMeasurementActive(false);
    } else {
      setMeasurementType(type);
      setMeasurementActive(true);
    }
  };

  return (
    <>
      {/* Measurement */}
      <ControlGroup
        id="measure"
        icon={Ruler}
        label="Measurement"
        isActiveGroup={measurementActive}
        activeGroup={activeGroup}
        onToggle={onToggle}
      >
        <ToolBtn
          onClick={() => toggleMeasurement("distance")}
          isActive={measurementActive && measurementType === "distance"}
          icon={Ruler}
          title="Measure Distance"
          label="Dist"
        />
        <ToolBtn
          onClick={() => toggleMeasurement("area")}
          isActive={measurementActive && measurementType === "area"}
          icon={Square}
          title="Measure Area"
          label="Area"
        />
      </ControlGroup>

      {/* Tools */}
      <ControlGroup
        id="analysis-tools"
        icon={ActivityIcon}
        label="Validation & Tools"
        activeGroup={activeGroup}
        onToggle={onToggle}
      >
        <ToolBtn
          onClick={onOpenAutoElevation}
          icon={Mountain}
          title="Auto Elevation"
        />
        <ToolBtn
          onClick={validate}
          icon={ShieldCheck}
          title="Validate Network"
        />
      </ControlGroup>
    </>
  );
}
