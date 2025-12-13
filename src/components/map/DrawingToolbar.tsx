"use client";

import { Hand, MousePointer2, SplinePointer } from 'lucide-react';
import React from 'react';

import { COMPONENT_TYPES } from '@/constants/networkComponents';
import { cn } from '@/lib/utils';
import { ToolType, useUIStore } from '@/store/uiStore';

export function DrawingToolbar() {
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
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-row items-center p-1.5 gap-1 rounded-2xl shadow-2xl border border-white/20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md transition-all hover:bg-white/95 dark:hover:bg-gray-900/95">
      {tools.map((tool, index) => {
        if (tool.type === "separator") {
          return (
            <div
              key={`sep-${index}`}
              className="w-0.5 h-6 bg-gray-300 dark:bg-gray-700 mx-1"
            />
          );
        }

        const isActive = activeTool === tool.id;
        const Icon = tool.icon as React.ComponentType<
          React.SVGProps<SVGSVGElement>
        >;

        return (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id as ToolType)}
            className={cn(
              "relative group flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200",
              isActive
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
            )}
          >
            <Icon
              className="size-4"
              style={{ color: isActive ? "white" : tool.color }}
              strokeWidth={2.5}
            />

            {/* Hover Tooltip */}
            <div className="absolute top-full mt-3 px-2 py-1 bg-gray-900 text-white text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl transform translate-y-1 group-hover:translate-y-0">
              {tool.label}{" "}
              <span className="opacity-60 ml-1">{tool.shortcut}</span>
              {/* Little arrow pointing up */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
