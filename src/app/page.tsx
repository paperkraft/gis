"use client";

import { Network, Play } from "lucide-react";
import dynamic from "next/dynamic";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";

const MapContainer = dynamic(
  () => import("@/components/map/MapContainer").then((mod) => mod.MapContainer),
  { ssr: false }
);

const tabs = [
  { id: "network-editor", label: "Network Editor", icon: Network },
  { id: "simulation", label: "Simulation", icon: Play },
];

export default function HomePage() {
  const { activeTab, setActiveTab } = useUIStore();

  return (
    <div className="h-screen flex flex-col overflow-auto">
      <Header />
      <div className="flex-1 flex overflow-auto">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className="border-b bg-white dark:bg-gray-900 flex items-center px-4">
            {tabs.map((tab) => {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-4 py-3 text-sm font-medium",
                    activeTab === tab.id
                      ? "border-b-2 border-primary text-primary"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <tab.icon className="inline mr-2" size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="flex-1">
            {activeTab === "network-editor" && <MapContainer />}
            {activeTab === "simulation" && (
              <div className="p-4">Simulation under development</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
