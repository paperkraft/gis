"use client";

import {
  MousePointer2,
  Edit3,
  Network,
  Eye,
  EyeOff,
  Layers,
  ArrowRight,
  Circle,
  Square,
  Hexagon,
  Triangle,
  SquareDot,
  Minus,
  Type,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { KeyboardShortcutsModal } from "../modals/KeyboardShortcutsModal";
import { COMPONENT_TYPES } from "@/constants/networkComponents";

export function Sidebar() {
  const {
    activeTool,
    sidebarOpen,
    layerVisibility,
    showPipeArrows,
    showLabels,
    keyboardShortcutsModalOpen,
    setActiveTool,
    setShowPipeArrows,
    setShowLabels,
    toggleLayerVisibility,
    setComponentSelectionModalOpen,
    setKeyboardShortcutsModalOpen,
  } = useUIStore();

  const handleToolClick = (toolId: string, action?: () => void) => {
    if (action) {
      action();
    } else {
      setActiveTool(toolId as any);
    }
  };

  const handleLayerToggle = (layerId: string) => {
    if (layerId === "flow-arrows") {
      setShowPipeArrows(!showPipeArrows);
    } else if (layerId === "labels") {
      setShowLabels(!showLabels);
    } else {
      toggleLayerVisibility(layerId);
    }
  };

  if (!sidebarOpen) return null;

  const tools = [
    {
      id: "select",
      name: "Select",
      icon: MousePointer2,
      description: "Select and inspect features",
      shortcut: "S",
    },
    {
      id: "modify",
      name: "Modify",
      icon: Edit3,
      description: "Edit feature geometry",
      shortcut: "M",
    },
    {
      id: "draw",
      name: "Draw Network",
      icon: Network,
      description: "Draw pipe network",
      action: () => setComponentSelectionModalOpen(true),
      shortcut: "P",
    },
  ];

  const layers = [
    {
      id: "junction",
      name: "Junctions",
      icon: Circle,
      color: COMPONENT_TYPES.junction.color,
    },
    {
      id: "tank",
      name: "Tanks",
      icon: Square,
      color: COMPONENT_TYPES.tank.color,
    },
    {
      id: "reservoir",
      name: "Reservoirs",
      icon: Hexagon,
      color: COMPONENT_TYPES.reservoir.color,
    },
    {
      id: "pipe",
      name: "Pipes",
      icon: Minus,
      color: COMPONENT_TYPES.pipe.color,
    },
    {
      id: "pump",
      name: "Pumps",
      icon: Triangle,
      color: COMPONENT_TYPES.pump.color,
    },
    {
      id: "valve",
      name: "Valves",
      icon: SquareDot,
      color: COMPONENT_TYPES.valve.color,
    },
    {
      id: "flow-arrows",
      name: "Flow Arrows",
      icon: ArrowRight,
      color: "#6B7280",
    },
    {
      id: "labels",
      name: "Labels",
      icon: Type,
      color: "#6B7280",
    },
  ];

  return (
    <aside className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex flex-col">
      <div className="p-4 space-y-6">
        {/* TOOLS SECTION */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <MousePointer2 className="size-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Tools
            </span>
          </div>

          <div className="space-y-2">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;

              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id, tool.action)}
                  className={`
                      w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg
                      transition-all duration-200 relative group
                      ${
                        isActive
                          ? "bg-blue-500 text-white shadow-md"
                          : "hover:bg-gray-100 text-gray-700"
                      }
                    `}
                  title={tool.name}
                >
                  <Icon className="w-5 h-5 shrink-0" />

                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{tool.name}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                        {tool.shortcut}
                      </span>
                    </div>
                    <div
                      className={`text-xs ${
                        isActive ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      {tool.description}
                    </div>
                  </div>

                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-blue-700 rounded-r-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* LAYERS SECTION */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="size-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Layers
            </span>
          </div>

          <div className="space-y-2">
            {layers.map((layer) => {
              const Icon = layer.icon;
              // Handle special case for flow arrows vs regular layers
              const isVisible =
                layer.id === "flow-arrows"
                  ? showPipeArrows
                  : layer.id === "labels"
                  ? showLabels
                  : layerVisibility[layer.id] !== false;

              return (
                <button
                  key={layer.id}
                  onClick={() => handleLayerToggle(layer.id)}
                  className={`
                      w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg
                      transition-all duration-200 group relative
                      ${
                        isVisible
                          ? "bg-gray-50 hover:bg-gray-100"
                          : "bg-gray-100 opacity-50 hover:opacity-75"
                      }
                    `}
                  title={layer.name}
                >
                  <div
                    className="w-3 h-3 rounded-full ring-2 ring-white shadow-sm shrink-0"
                    style={{ backgroundColor: layer.color }}
                  />

                  <Icon className="size-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700 flex-1 text-left">
                    {layer.name}
                  </span>
                  {isVisible ? (
                    <Eye className="size-4 text-gray-500" />
                  ) : (
                    <EyeOff className="size-4 text-gray-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tool Description */}
        {activeTool && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Active Tool
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {activeTool === "select" && "Select and inspect features"}
              {activeTool === "modify" && "Move and edit features"}
            </p>
          </div>
        )}

        <KeyboardShortcutsModal
          isOpen={keyboardShortcutsModalOpen}
          onClose={() => setKeyboardShortcutsModalOpen(false)}
        />
      </div>
    </aside>
  );
}
