"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProjectService } from "@/lib/services/ProjectService";
import {
  Network,
  Play,
  Save,
  ArrowLeft,
  Loader2,
  SettingsIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { useNetworkStore } from "@/store/networkStore";

const MapContainer = dynamic(
  () => import("@/components/map/MapContainer").then((mod) => mod.MapContainer),
  { ssr: false }
);

const SimulationPanel = dynamic(
  () =>
    import("@/components/simulation/SimulationPanel").then(
      (mod) => mod.SimulationPanel
    ),
  { ssr: false }
);

const tabs = [
  { id: "network-editor", label: "Network Editor", icon: Network },
  { id: "simulation", label: "Simulation", icon: Play },
];

export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { activeTab, setActiveTab } = useUIStore();

  // Subscribe to store title for the header
  const projectTitle = useNetworkStore((state) => state.settings.title);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Re-hydrate state from local storage based on ID
    if (params.id) {
      const id = params.id as string;
      const success = ProjectService.loadProject(id);

      setLoading(false);

      if (!success) {
        router.replace("/");
      }
    }
  }, [params.id, router]);

  const handleSave = () => {
    if (params.id) {
      ProjectService.saveCurrentProject(params.id as string, projectTitle);
      alert("Project Saved!");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-500">Loading Project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Custom Editor Header */}
      <header className="h-14 border-b bg-white dark:bg-gray-900 flex items-center justify-between px-4 shadow-sm z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
              {projectTitle || "Untitled Project"}
            </h1>
            <span className="text-xs text-gray-500">Last saved: Just now</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                activeTab === tab.id
                  ? "bg-white dark:bg-gray-700 text-blue-600 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Add Settings Button Here for convenience */}
          <button
            onClick={() =>
              useUIStore.getState().setProjectSettingsModalOpen(true)
            }
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            title="Project Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col relative">
          <div className="flex-1 relative">
            <MapContainer />
            {activeTab === "simulation" && (
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="pointer-events-auto">
                  <SimulationPanel />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
