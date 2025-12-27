"use client";

import { ArrowLeft, Loader2, Network, PanelLeft, Play } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { ProjectService } from "@/lib/services/ProjectService";
import { cn } from "@/lib/utils";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";

const MapContainer = dynamic(
  () => import("@/components/map/MapContainer").then((mod) => mod.MapContainer),
  { ssr: false }
);

const SimulationPanel = dynamic(
  () =>
    import("@/components/simulation/SimulationPanelOG").then(
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
  const { activeTab, setActiveTab, toggleSidebar, sidebarOpen } = useUIStore();

  // Subscribe to store title for the header
  const projectTitle = useNetworkStore((state) => state.settings.title);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initProject = async () => {
      if (params.id) {
        // Clear previous project data immediately
        useNetworkStore.getState().clearFeatures();

        try {
          const success = await ProjectService.loadProject(params.id as string);
          if (!success) {
            // Optional: Handle not found more gracefully
            router.replace("/");
            console.error("Project load returned false");
          }
        } catch (e) {
          console.error("Project load failed", e);
          router.replace("/");
        } finally {
          setLoading(false);
        }
      }
    };

    initProject();
  }, [params.id, router]);

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
    <>
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

            <button
              onClick={toggleSidebar}
              className={cn(
                "p-2 rounded-lg transition-colors",
                sidebarOpen
                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  : "text-gray-500 hover:bg-gray-100"
              )}
              title="Toggle Sidebar"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
                {projectTitle || "Untitled Project"}
              </h1>
              <span className="text-[10px] text-gray-500">Cloud Synced</span>
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
            <Button variant={"ghost"}>User</Button>
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
    </>
  );
}
