"use client";

import { ToolType, useUIStore } from "@/store/uiStore";
import { MapTools } from "@/constants/networkComponents";
import { ToolBtn } from "./controls/Shared";
import { cn } from "@/lib/utils";

export function MapToolbar() {
  const { activeTool, setActiveTool } = useUIStore();

  return (
    <div
      className={cn(
        "absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center",
        "rounded-md shadow-xl p-1 gap-1",
        "border border-white/20 dark:border-gray-700/50",
        "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md",
        "transition-all hover:bg-white/95 dark:hover:bg-gray-900/95"
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {MapTools.map((tool, idx) => {
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
