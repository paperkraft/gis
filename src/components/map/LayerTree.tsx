"use client";
import React, { useEffect, useState } from "react";
import {
  Circle,
  Square,
  Hexagon,
  Triangle,
  SquareDot,
  Minus,
  Map as MapIcon,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";
import { COMPONENT_TYPES } from "@/constants/networkComponents";

interface LayerGroup {
  id: string;
  name: string;
  layers: LayerItem[];
}

interface LayerItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  visible: boolean;
  count?: number;
}

export function LayerTree() {
  const { features } = useNetworkStore();
  const {
    layerVisibility,
    setLayerVisibility,
    showPipeArrows,
    setShowPipeArrows,
  } = useUIStore();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["network-components", "network-pipes"])
  );

  // Calculate feature counts
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

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleLayerToggle = (layerId: string) => {
    if (layerId === "flow-arrows") {
      setShowPipeArrows(!showPipeArrows);
    } else {
      const newVisibility = !layerVisibility[layerId];
      setLayerVisibility(layerId, newVisibility);
    }
  };

  const layerGroups: LayerGroup[] = [
    {
      id: "network-components",
      name: "Network Components",
      layers: [
        {
          id: "junction",
          name: "Junctions",
          icon: <Circle className="w-4 h-4" />,
          color: COMPONENT_TYPES.junction.color,
          visible: layerVisibility.junction ?? true,
          count: layerCounts.junction,
        },
        {
          id: "tank",
          name: "Storage Tanks",
          icon: <Square className="w-4 h-4" />,
          color: COMPONENT_TYPES.tank.color,
          visible: layerVisibility.tank ?? true,
          count: layerCounts.tank,
        },
        {
          id: "reservoir",
          name: "Reservoirs",
          icon: <Hexagon className="w-4 h-4" />,
          color: COMPONENT_TYPES.reservoir.color,
          visible: layerVisibility.reservoir ?? true,
          count: layerCounts.reservoir,
        },
        {
          id: "pump",
          name: "Pump Stations",
          icon: <Triangle className="w-4 h-4" />,
          color: COMPONENT_TYPES.pump.color,
          visible: layerVisibility.pump ?? true,
          count: layerCounts.pump,
        },
        {
          id: "valve",
          name: "Valves",
          icon: <SquareDot className="w-4 h-4" />,
          color: COMPONENT_TYPES.valve.color,
          visible: layerVisibility.valve ?? true,
          count: layerCounts.valve,
        },
      ],
    },
    {
      id: "network-pipes",
      name: "Network Pipes",
      layers: [
        {
          id: "pipe",
          name: "Pipes",
          icon: <Minus className="w-4 h-4" />,
          color: COMPONENT_TYPES.pipe.color,
          visible: layerVisibility.pipe ?? true,
          count: layerCounts.pipe,
        },
        {
          id: "flow-arrows",
          name: "Flow Arrows",
          icon: <ArrowRight className="w-4 h-4" />,
          color: "#6B7280", // Gray
          visible: showPipeArrows ?? true,
          // No count for arrows
        },
      ],
    },
  ];

  return (
    <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-80 max-h-96 overflow-hidden z-10">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-primary" />
            <span>Layers 555</span>
          </h3>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {Array.from(features.values()).length} features
          </div>
        </div>
      </div>

      {/* Layer Groups */}
      <div className="overflow-y-auto max-h-80">
        {layerGroups.map((group) => (
          <div
            key={group.id}
            className="border-b border-gray-200 dark:border-gray-700 last:border-b-0"
          >
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {expandedGroups.has(group.id) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span>{group.name}</span>
              </div>
            </button>

            {/* Group Layers */}
            {expandedGroups.has(group.id) && (
              <div className="bg-gray-50 dark:bg-gray-900">
                {group.layers.map((layer) => (
                  <div
                    key={layer.id}
                    className={`px-4 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                      !layer.visible ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Layer Icon */}
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: `${layer.color}20`,
                        }}
                      >
                        <div style={{ color: layer.color }}>{layer.icon}</div>
                      </div>

                      {/* Layer Name */}
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {layer.name}
                      </span>

                      {/* Feature Count */}
                      {layer.count !== undefined && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          {layer.count}
                        </span>
                      )}

                      {/* Visibility Toggle */}
                      <button
                        onClick={() => handleLayerToggle(layer.id)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title={layer.visible ? "Hide layer" : "Show layer"}
                      >
                        {layer.visible ? (
                          <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400 dark:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
