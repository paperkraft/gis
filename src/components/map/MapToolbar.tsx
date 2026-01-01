"use client";

import { MousePointer2, Hand, SplinePointer, LucideIcon } from "lucide-react";
import { ToolType, useUIStore } from "@/store/uiStore";
import { COMPONENT_TYPES } from "@/constants/networkComponents";
import { ToolBtn } from "./controls/Shared";
import { cn } from "@/lib/utils";

export function MapToolbar() {
  const { activeTool, setActiveTool } = useUIStore();

  const tools = [
    { id: "select", icon: MousePointer2, label: "Select", shortcut: "S" },
    { id: "pan", icon: Hand, label: "Pan", shortcut: "H" },
    { id: "modify", icon: SplinePointer, label: "Modify", shortcut: "M" },
    { type: "separator" },
    {
      id: "add-junction",
      icon: COMPONENT_TYPES.junction.icon,
      label: COMPONENT_TYPES.junction.name,
      color: COMPONENT_TYPES.junction.color,
      shortcut: "1",
    },
    {
      id: "add-tank",
      icon: COMPONENT_TYPES.tank.icon,
      label: COMPONENT_TYPES.tank.name,
      color: COMPONENT_TYPES.tank.color,
      shortcut: "2",
    },
    {
      id: "add-reservoir",
      icon: COMPONENT_TYPES.reservoir.icon,
      label: COMPONENT_TYPES.reservoir.name,
      color: COMPONENT_TYPES.reservoir.color,
      shortcut: "3",
    },
    {
      id: "draw-pipe",
      icon: COMPONENT_TYPES.pipe.icon,
      label: COMPONENT_TYPES.pipe.name,
      color: COMPONENT_TYPES.pipe.color,
      shortcut: "4",
    },
    {
      id: "add-pump",
      icon: COMPONENT_TYPES.pump.icon,
      label: COMPONENT_TYPES.pump.name,
      color: COMPONENT_TYPES.pump.color,
      shortcut: "5",
    },
    {
      id: "add-valve",
      icon: COMPONENT_TYPES.valve.icon,
      label: COMPONENT_TYPES.valve.name,
      color: COMPONENT_TYPES.valve.color,
      shortcut: "6",
    },
  ];

  return (
    <div
      className={cn(
        "absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center",
        "rounded-md shadow-xl p-1 gap-1",
        "border border-white/20 dark:border-gray-700/50",
        "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md",
        "transition-all hover:bg-white/95 dark:hover:bg-gray-900/95"
      )}
    >
      {tools.map((tool, idx) => {
        if (tool.type === "separator") {
          return (
            <div
              key={idx}
              className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1"
            />
          );
        }

        const isActive = activeTool === tool.id;
        const tooltip = `${tool.label} ${tool.shortcut}`;

        return (
          <ToolBtn
            key={tool.id}
            isActive={isActive}
            onClick={() => setActiveTool(tool.id as ToolType)}
            icon={tool.icon}
            title={tooltip}
            className="size-7"
            colorStyle={isActive ? "" : tool.color}
          />
        );
      })}
    </div>
  );
}
