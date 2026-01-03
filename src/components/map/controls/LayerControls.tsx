"use client";

import { Compass, MapPinnedIcon, RotateCcw, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

import {
  handleResetNorth,
  handleRotateLeft,
  handleRotateRight,
} from "@/lib/interactions/map-controls";
import { useMapStore } from "@/store/mapStore";

import { ControlGroup, ToolBtn } from "./Shared";

interface LayerControlsProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
}

export function LayerControls({ activeGroup, onToggle }: LayerControlsProps) {
  const map = useMapStore((state) => state.map);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!map) return;

    const view = map.getView();
    const listener = () => {
      setRotation(view.getRotation());
    };

    // OpenLayers event for view property changes
    view.on("change:rotation", listener);
    return () => view.un("change:rotation", listener);
  }, [map]);

  return (
    <ControlGroup
      id="layers"
      icon={MapPinnedIcon}
      label="Layer Controls"
      activeGroup={activeGroup}
      onToggle={onToggle}
      isActiveGroup={rotation !== 0}
    >
      <ToolBtn
        onClick={() => handleResetNorth(map)}
        isActive={rotation !== 0}
        disabled={rotation == 0}
        icon={Compass}
        title="Reset Rotation"
      />

      <ToolBtn
        onClick={() => handleRotateLeft(map)}
        icon={RotateCcw}
        title="Rotate Left (45°)"
      />
      <ToolBtn
        onClick={() => handleRotateRight(map)}
        icon={RotateCw}
        title="Rotate Right (45°)"
      />
    </ControlGroup>
  );
}
