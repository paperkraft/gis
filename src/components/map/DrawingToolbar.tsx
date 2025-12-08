"use client";

import React from "react";
import {
  MousePointer2,
  Hand,
  Edit3,
  Circle,
  Square,
  Hexagon,
  Minus,
  Triangle,
  SquareDot,
} from "lucide-react";
import { useUIStore, ToolType } from "@/store/uiStore";
import { COMPONENT_TYPES } from "@/constants/networkComponents";
import { cn } from "@/lib/utils";

export function DrawingToolbar() {
  const { activeTool, setActiveTool } = useUIStore();

  const tools = [
    {
      id: "select",
      icon: MousePointer2,
      label: "Select",
      shortcut: "S",
    },
    {
      id: "pan",
      icon: Hand,
      label: "Pan",
      shortcut: "H",
    },
    {
      id: "modify",
      icon: Edit3,
      label: "Modify",
      shortcut: "M",
    },
    { type: "separator" },
    {
      id: "add-junction",
      icon: Circle,
      label: "Junction",
      color: COMPONENT_TYPES.junction.color,
      shortcut: "1",
    },
    {
      id: "add-tank",
      icon: Square,
      label: "Tank",
      color: COMPONENT_TYPES.tank.color,
      shortcut: "2",
    },
    {
      id: "add-reservoir",
      icon: Hexagon,
      label: "Reservoir",
      color: COMPONENT_TYPES.reservoir.color,
      shortcut: "3",
    },
    {
      id: "draw-pipe",
      icon: Minus,
      label: "Pipe",
      color: COMPONENT_TYPES.pipe.color,
      shortcut: "4",
    },
    {
      id: "add-pump",
      icon: Triangle,
      label: "Pump",
      color: COMPONENT_TYPES.pump.color,
      shortcut: "5",
    },
    {
      id: "add-valve",
      icon: SquareDot,
      label: "Valve",
      color: COMPONENT_TYPES.valve.color,
      shortcut: "6",
    },
  ];

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {tools.map((tool, index) => {
        if (tool.type === "separator") {
          return (
            <div
              key={`sep-${index}`}
              className="h-px bg-gray-200 dark:bg-gray-700 my-1 mx-2"
            />
          );
        }

        const isActive = activeTool === tool.id;
        const Icon: any = tool.icon;

        return (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id as ToolType)}
            className={cn(
              "w-10 h-10 flex items-center justify-center transition-colors relative group",
              isActive
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            )}
            title={`${tool.label} (${tool.shortcut})`}
          >
            <Icon
              className="w-5 h-5"
              style={{ color: isActive ? undefined : tool.color }}
            />

            {/* Tooltip on hover */}
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              {tool.label}{" "}
              <span className="text-gray-400">({tool.shortcut})</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
