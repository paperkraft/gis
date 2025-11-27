"use client";

import React, { useState } from "react";
import {
  MousePointer2,
  Keyboard,
  Edit3,
  Network,
  Droplet,
  Container,
  Waves,
  Grid3x3,
  Gauge,
  Settings2,
  Eye,
  EyeOff,
  Layers,
  Upload,
  Download,
  Trash2,
  HelpCircle,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { KeyboardShortcutsModal } from "../modals/KeyboardShortcutsModal";

export function Sidebar() {
  const {
    activeTool,
    sidebarOpen,
    layerVisibility,
    showPipeArrows,
    keyboardShortcutsModalOpen,
    setActiveTool,
    setShowPipeArrows,
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
    { id: "junction", name: "Junctions", icon: Droplet, color: "#3B82F6" },
    { id: "tank", name: "Tanks", icon: Container, color: "#10B981" },
    { id: "reservoir", name: "Reservoirs", icon: Waves, color: "#8B5CF6" },
    { id: "pipe", name: "Pipes", icon: Grid3x3, color: "#EF4444" },
    { id: "pump", name: "Pumps", icon: Gauge, color: "#F59E0B" },
    { id: "valve", name: "Valves", icon: Settings2, color: "#EC4899" },
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

        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPipeArrows}
              onChange={(e) => setShowPipeArrows(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Show Flow Arrows</span>
          </label>
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
              const isVisible = layerVisibility[layer.id] !== false;

              return (
                <button
                  key={layer.id}
                  onClick={() => toggleLayerVisibility(layer.id)}
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

        {/* Keyboard Shortcuts Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Keyboard Shortcuts
            <HelpCircle
              className="size-4"
              onClick={() => setKeyboardShortcutsModalOpen(true)}
            />
          </h3>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600 dark:text-gray-400">
                Select Tool
              </span>
              <kbd className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 font-mono text-xs">
                S
              </kbd>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600 dark:text-gray-400">Modify</span>
              <kbd className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 font-mono text-xs">
                M
              </kbd>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600 dark:text-gray-400">Delete</span>
              <kbd className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 font-mono text-xs">
                Del
              </kbd>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600 dark:text-gray-400">
                Finish Drawing
              </span>
              <kbd className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 font-mono text-xs">
                Esc
              </kbd>
            </div>
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
