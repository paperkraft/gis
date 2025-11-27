"use client";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { FileUp, Play } from "lucide-react";
// import { MapContainer } from "@/components/map/MapContainer";

const MapContainer = dynamic(
  () => import("@/components/map/MapContainer").then((mod) => mod.MapContainer),
  {
    ssr: false,
  }
);

export default function HomePage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className="border-b bg-white dark:bg-gray-900 flex items-center px-4">
            <button className="px-4 py-3 text-sm font-medium border-b-2 border-primary text-primary">
              Network Editor
            </button>
            <button className="px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900">
              <FileUp className="inline h-4 w-4 mr-1" />
              Import
            </button>
            <button className="px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900">
              <Play className="inline h-4 w-4 mr-1" />
              Simulation
            </button>
          </div>
          <div className="flex-1">
            <MapContainer />
          </div>
        </main>
      </div>
    </div>
  );
}
