"use client";
import { Ruler, RulerDimensionLine, Square } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { ControlGroup, ToolBtn } from "./Shared";

interface MeasurementGroupProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
}

export function MeasurementGroup({
  activeGroup,
  onToggle,
}: MeasurementGroupProps) {
  const {
    measurementType,
    measurementActive,
    setMeasurementType,
    setMeasurementActive,
  } = useUIStore();

  const toggleMeasurement = (type: "distance" | "area") => {
    if (measurementActive && measurementType === type) {
      setMeasurementActive(false);
    } else {
      setMeasurementType(type);
      setMeasurementActive(true);
    }
  };

  return (
    <ControlGroup
      id="measure"
      icon={RulerDimensionLine}
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
  );
}
