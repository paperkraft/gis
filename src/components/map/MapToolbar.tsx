"use client";

import { 
  MousePointer2, 
  Hand, 
  CircleDot, 
  Activity, 
  Plus,
  ChevronDown 
} from "lucide-react";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MapToolbar() {
  // Assuming you might store 'interactionMode' in UI store or Network store
  // For now, let's mock the state or add it to UI Store
  const interactionMode: any = "SELECT"; // Replace with store selector
  const setInteractionMode = (mode: any) => console.log("Set mode", mode);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 p-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-slate-200/60 ring-1 ring-slate-900/5">
      
      {/* Group 1: Selection & Navigation */}
      <ToolbarBtn 
        active={interactionMode === "SELECT"} 
        onClick={() => setInteractionMode("SELECT")}
        tooltip="Select (V)"
      >
        <MousePointer2 size={18} />
      </ToolbarBtn>
      
      <ToolbarBtn 
        active={interactionMode === "PAN"} 
        onClick={() => setInteractionMode("PAN")}
        tooltip="Pan (H)"
      >
        <Hand size={18} />
      </ToolbarBtn>

      <Separator />

      {/* Group 2: Drawing Tools (Dropdown style like SimScale/CAD) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors outline-none",
            ["DRAW_PIPE", "DRAW_NODE"].includes(interactionMode) 
              ? "bg-blue-50 text-blue-600" 
              : "text-slate-600 hover:bg-slate-100"
          )}>
            <Plus size={16} />
            <span>Create</span>
            <ChevronDown size={12} className="opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48">
          <DropdownMenuItem onClick={() => setInteractionMode("DRAW_NODE")}>
            <CircleDot size={16} className="mr-2 text-slate-500" />
            <span>Add Junction</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setInteractionMode("DRAW_PIPE")}>
            <Activity size={16} className="mr-2 text-slate-500" />
            <span>Add Pipe</span>
          </DropdownMenuItem>
          {/* Add Tank/Reservoir/Pump here */}
        </DropdownMenuContent>
      </DropdownMenu>

    </div>
  );
}

// --- Helper Component ---
function ToolbarBtn({ active, onClick, children, tooltip }: any) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={cn(
        "p-1 rounded-md transition-all duration-200 outline-none",
        active 
          ? "bg-blue-50 text-blue-600 shadow-sm" 
          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
      )}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-5 bg-slate-200 mx-1" />;
}