"use client";
import { Pause, Play, Zap, Waves, Sparkles, Wand2Icon } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { ControlGroup, Divider, ToolBtn } from "./Shared";

interface AnimationGroupProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
}

export function AnimationGroup({ activeGroup, onToggle }: AnimationGroupProps) {
  const {
    isFlowAnimating,
    flowAnimationSpeed,
    flowAnimationStyle,
    setFlowAnimationStyle,
    setFlowAnimationSpeed,
    setIsFlowAnimating,
  } = useUIStore();

  return (
    <ControlGroup
      id="anim"
      icon={isFlowAnimating ? Pause : Play}
      label="Flow Animation"
      isActiveGroup={isFlowAnimating}
      activeGroup={activeGroup}
      onToggle={onToggle}
    >
      <ToolBtn
        onClick={() => setIsFlowAnimating(!isFlowAnimating)}
        isActive={isFlowAnimating}
        icon={isFlowAnimating ? Pause : Play}
        title={isFlowAnimating ? "Pause" : "Play"}
      />

      <Divider />

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

      <span className="text-[10px] font-mono text-gray-400 mr-1">FX</span>
      <ToolBtn
        onClick={() => setFlowAnimationStyle("dashes")}
        isActive={flowAnimationStyle === "dashes"}
        icon={Waves}
        title="Dashes"
      />
      <ToolBtn
        onClick={() => setFlowAnimationStyle("particles")}
        isActive={flowAnimationStyle === "particles"}
        icon={Sparkles}
        title="Particles"
      />
      <ToolBtn
        onClick={() => setFlowAnimationStyle("combined")}
        isActive={flowAnimationStyle === "combined"}
        icon={Wand2Icon}
        title="Combined"
        label="All"
      />
    </ControlGroup>
  );
}
