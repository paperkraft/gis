"use client";

import { Plus, Minus, Maximize, Layers } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

export function MapNavigation() {
  // These should trigger OL Map hooks
  const handleZoomIn = () => console.log("Zoom In");
  const handleZoomOut = () => console.log("Zoom Out");
  const handleFit = () => console.log("Zoom Extents");
  
  const { toggleLayerVisibility } = useUIStore();

  return (
    <div className="absolute bottom-10 right-4 z-10 flex flex-col gap-2">
      
      {/* Layer Toggle (Mini FAB) */}
      <button 
        className="w-9 h-9 bg-white rounded-full shadow-md border border-slate-100 flex items-center justify-center text-slate-600 hover:text-blue-600 hover:scale-105 transition-all"
        title="Map Layers"
        onClick={() => toggleLayerVisibility("basemap")} // Example action
      >
        <Layers size={18} />
      </button>

      {/* Zoom Cluster */}
      <div className="flex flex-col bg-white/95 backdrop-blur rounded-lg shadow-md border border-slate-100 overflow-hidden">
        <NavBtn onClick={handleZoomIn} title="Zoom In">
           <Plus size={18} />
        </NavBtn>
        <div className="h-px w-full bg-slate-100" />
        <NavBtn onClick={handleZoomOut} title="Zoom Out">
           <Minus size={18} />
        </NavBtn>
        <div className="h-px w-full bg-slate-100" />
        <NavBtn onClick={handleFit} title="Fit to Screen">
           <Maximize size={16} />
        </NavBtn>
      </div>

    </div>
  );
}

function NavBtn({ onClick, children, title }: any) {
  return (
    <button 
      onClick={onClick}
      title={title}
      className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
    >
      {children}
    </button>
  );
}