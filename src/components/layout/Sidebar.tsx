"use client";

import { ArrowBigRight, Eye, EyeOff, Layers, Type } from "lucide-react";
import { useEffect, useState } from "react";

import { COMPONENT_TYPES } from "@/constants/networkComponents";
import { cn } from "@/lib/utils";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";

import { KeyboardShortcutsModal } from "../modals/KeyboardShortcutsModal";

export function Sidebar() {
  const {
    sidebarOpen,
    layerVisibility,
    showPipeArrows,
    showLabels,
    keyboardShortcutsModalOpen,

    setShowPipeArrows,
    setShowLabels,
    toggleLayerVisibility,
    setKeyboardShortcutsModalOpen,
  } = useUIStore();

  const { features } = useNetworkStore();

  const [layerCounts, setLayerCounts] = useState({
    junction: 0,
    tank: 0,
    reservoir: 0,
    pump: 0,
    valve: 0,
    pipe: 0,
  });

  useEffect(() => {
    const counts = {
      junction: 0,
      tank: 0,
      reservoir: 0,
      pump: 0,
      valve: 0,
      pipe: 0,
    };

    Array.from(features.values()).forEach((feature) => {
      const type = feature.get("type");
      if (counts.hasOwnProperty(type)) {
        counts[type as keyof typeof counts]++;
      }
    });

    setLayerCounts(counts);
  }, [features]);

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

  const layers = [
    {
      id: "junction",
      name: COMPONENT_TYPES.junction.name,
      icon: COMPONENT_TYPES.junction.icon,
      color: COMPONENT_TYPES.junction.color,
      count: layerCounts.junction,
    },
    {
      id: "tank",
      name: COMPONENT_TYPES.tank.name,
      icon: COMPONENT_TYPES.tank.icon,
      color: COMPONENT_TYPES.tank.color,
      count: layerCounts.tank,
    },
    {
      id: "reservoir",
      name: COMPONENT_TYPES.reservoir.name,
      icon: COMPONENT_TYPES.reservoir.icon,
      color: COMPONENT_TYPES.reservoir.color,
      count: layerCounts.reservoir,
    },
    {
      id: "pipe",
      name: COMPONENT_TYPES.pipe.name,
      icon: COMPONENT_TYPES.pipe.icon,
      color: COMPONENT_TYPES.pipe.color,
      count: layerCounts.pipe,
    },
    {
      id: "pump",
      name: COMPONENT_TYPES.pump.name,
      icon: COMPONENT_TYPES.pump.icon,
      color: COMPONENT_TYPES.pump.color,
      count: layerCounts.pump,
    },
    {
      id: "valve",
      name: COMPONENT_TYPES.valve.name,
      icon: COMPONENT_TYPES.valve.icon,
      color: COMPONENT_TYPES.valve.color,
      count: layerCounts.valve,
    },
    {
      id: "flow-arrows",
      name: "Flow Arrow",
      icon: ArrowBigRight,
      color: "#6B7280",
    },
    {
      id: "labels",
      name: "Label",
      icon: Type,
      color: "#6B7280",
    },
  ];

  return (
    <aside className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex flex-col">
      <div className="p-4 space-y-6">
        {/* LAYERS SECTION */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="size-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Layers & Legend
            </span>
          </div>

          <div className="space-y-1">
            {layers.map((layer) => {
              const Icon = layer.icon;
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
                      w-full flex items-center justify-center gap-3 px-3 py-2 rounded-md
                      transition-all duration-200 group relative
                      ${
                        isVisible
                          ? "hover:bg-gray-50 dark:hover:bg-gray-800"
                          : "opacity-50 hover:opacity-75"
                      }
                    `}
                  title={layer.name}
                >
                  <Icon
                    className={cn("size-4")}
                    style={{ color: layer.color }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 text-left">
                    {layer.name + "s"}
                  </span>
                  {layer.count !== undefined && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                      {layer.count}
                    </span>
                  )}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {isVisible ? (
                      <Eye className="size-3.5 text-gray-400" />
                    ) : (
                      <EyeOff className="size-3.5 text-gray-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 text-xs text-gray-400 text-center">
          Press&nbsp;
          <kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
            ?
          </kbd>{" "}
          for shortcuts
        </div>

        <KeyboardShortcutsModal
          isOpen={keyboardShortcutsModalOpen}
          onClose={() => setKeyboardShortcutsModalOpen(false)}
        />
      </div>
    </aside>
  );
}
