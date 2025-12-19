"use client";
import { Activity, Droplets, Gauge, Type, Waves, Zap } from "lucide-react";

import { useStyleStore } from "@/store/styleStore";
import { useUIStore } from "@/store/uiStore";
import { useSimulationStore } from "@/store/simulationStore";
import { ControlGroup, Divider, ToolBtn } from "./Shared";

interface SimulationControlsProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
}

export function SimulationControls({
  activeGroup,
  onToggle,
}: SimulationControlsProps) {
  const { colorMode, setColorMode, labelMode, setLabelMode } = useStyleStore();
  const { showLabels, setShowLabels } = useUIStore();
  const { results } = useSimulationStore();

  // Helper to switch label mode to 'result' and ensure they are visible
  const handleShowValues = () => {
    if (labelMode !== "result") {
      setLabelMode("result");
      if (!showLabels) setShowLabels(true);
    } else {
      setShowLabels(false); // Just toggle visibility if already in result mode
    }
  };

  const isSimActive = ["pressure", "head", "velocity", "flow"].includes(
    colorMode
  );

  return (
    <ControlGroup
      id="sim-results"
      icon={Activity}
      label="Simulation Results"
      isActiveGroup={isSimActive}
      activeGroup={activeGroup}
      onToggle={onToggle}
    >
      {/* Nodal Results */}
      <ToolBtn
        onClick={() => setColorMode("pressure")}
        isActive={colorMode === "pressure"}
        icon={Gauge}
        disabled={!results}
        title="Pressure (Nodes)"
        label="Pres"
      />
      <ToolBtn
        onClick={() => setColorMode("head")}
        isActive={colorMode === "head"}
        icon={Zap}
        disabled={!results}
        title="Total Head (Nodes)"
        label="Head"
      />

      <Divider />

      {/* Link Results */}
      <ToolBtn
        onClick={() => setColorMode("velocity")}
        isActive={colorMode === "velocity"}
        icon={Waves}
        disabled={!results}
        title="Velocity (Links)"
        label="Vel"
      />
      <ToolBtn
        onClick={() => setColorMode("flow")}
        isActive={colorMode === "flow"}
        icon={Droplets}
        disabled={!results}
        title="Flow Rate (Links)"
        label="Flow"
      />

      <Divider />

      {/* Result Labels Toggle */}
      <ToolBtn
        onClick={handleShowValues}
        isActive={showLabels && labelMode === "result"}
        icon={Type}
        disabled={!results}
        title="Show Result Values"
        label="Values"
      />
    </ControlGroup>
  );
}
