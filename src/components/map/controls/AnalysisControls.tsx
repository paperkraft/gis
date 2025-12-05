"use client";
import {
  Ruler,
  Square,
  Mountain,
  ActivityIcon,
  Radar,
  ShieldCheck,
  Zap,
  Activity,
  Pause,
  Play,
  Wind,
  Sparkles,
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
    isFlowAnimating,
    flowAnimationSpeed,
    flowAnimationStyle,
    setFlowAnimationStyle,
    setFlowAnimationSpeed,
    setIsFlowAnimating,
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

      <ControlGroup
        id="anim"
        icon={isFlowAnimating ? Pause : Play}
        label="Flow Animation"
        isActiveGroup={isFlowAnimating}
        activeGroup={activeGroup}
        onToggle={onToggle}
      >
        {/* Play/Pause */}
        <ToolBtn
          onClick={() => setIsFlowAnimating(!isFlowAnimating)}
          isActive={isFlowAnimating}
          icon={isFlowAnimating ? Pause : Play}
          title={isFlowAnimating ? "Pause" : "Play"}
        />

        <Divider />

        {/* Speed Controls */}
        <span className="text-[10px] font-mono text-gray-400 mr-1">SPD</span>
        <ToolBtn
          onClick={() => setFlowAnimationSpeed(1.0)}
          isActive={flowAnimationSpeed === 1.0}
          icon={Zap}
          title="Normal Speed"
          label="1x"
        />
        <ToolBtn
          onClick={() => setFlowAnimationSpeed(2.0)}
          isActive={flowAnimationSpeed === 2.0}
          icon={Zap}
          title="Fast Speed"
          label="2x"
        />

        <Divider />

        {/* Style Controls */}
        <span className="text-[10px] font-mono text-gray-400 mr-1">FX</span>
        <ToolBtn
          onClick={() => setFlowAnimationStyle("dashes")}
          isActive={flowAnimationStyle === "dashes"}
          icon={Wind}
          title="Style: Dashes"
        />
        <ToolBtn
          onClick={() => setFlowAnimationStyle("particles")}
          isActive={flowAnimationStyle === "particles"}
          icon={Sparkles}
          title="Style: Particles"
        />
        <ToolBtn
          onClick={() => setFlowAnimationStyle("combined")}
          isActive={flowAnimationStyle === "combined"}
          icon={Activity}
          title="Style: Combined"
          label="All"
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
