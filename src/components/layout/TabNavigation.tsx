"use client";
import React from "react";
import { Edit3, FileUp, Play, Save, Download } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const tabs: Tab[] = [
  {
    id: "network-editor",
    label: "Network Editor",
    icon: Edit3,
    description: "Draw and edit water network components",
  },
  {
    id: "import",
    label: "Import",
    icon: FileUp,
    description: "Import network data from various formats",
  },
  {
    id: "simulation",
    label: "Simulation",
    icon: Play,
    description: "Run hydraulic simulations and analysis",
  },
];

export function TabNavigation() {
  const { activeTab, setActiveTab } = useUIStore();

  return (
    <div className="border-b bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2",
                  isActive
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
                title={tab.description}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 py-2">
          <button
            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1.5"
            title="Save project"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save</span>
          </button>
          <button
            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1.5"
            title="Export network"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  );
}
