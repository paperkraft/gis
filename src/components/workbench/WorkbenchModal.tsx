"use client";

import { Maximize2, Minimize2, X } from "lucide-react";
import React, { useState } from "react";

import { WorkbenchModalType } from "@/store/uiStore";

import { MODAL_REGISTRY } from "./modal_registry";

interface WorkbenchModalProps {
  type: WorkbenchModalType;
  onClose: () => void;
  sidebarWidth: number;
}

export function WorkbenchModal({
  type,
  onClose,
  sidebarWidth,
}: WorkbenchModalProps) {
  // Determine if this specific type should default to maximized (e.g., Graphs)
  const defaultMaximized = type === "SIMULATION_GRAPHS";
  const [isMaximized, setIsMaximized] = useState(defaultMaximized);

  // --- GET CONFIGURATION ---
  const config = MODAL_REGISTRY[type];

  // Fallback if type not found
  if (!config) {
    return null;
  }

  const { title, icon: Icon, component: Component } = config;

  // --- DYNAMIC POSITIONING (POPOUT) ---
  const modalStyle: React.CSSProperties = isMaximized
    ? {
        position: "absolute",
        top: 12,
        left: sidebarWidth + 24,
        right: 12,
        bottom: 40,
        zIndex: 50,
      }
    : {
        position: "absolute",
        top: 12,
        left: sidebarWidth + 24,
        width: "320px",
        maxHeight: "calc(100vh - 100px)",
        zIndex: 50,
      };

  return (
    <div
      style={modalStyle}
      className="pointer-events-auto shadow-xl rounded-lg animate-in fade-in slide-in-from-left-4 duration-300 flex flex-col transition-all ease-out"
    >
      <div className="bg-background backdrop-blur-md rounded-lg overflow-hidden flex flex-col ring-1 ring-slate-900/5 h-full">
        {/* --- HEADER --- */}
        <div className="h-9 bg-muted border-b border-muted-foreground/10 flex items-center justify-between px-3 select-none shrink-0">
          <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            <Icon size={14} className="text-primary" />
            {title}
          </div>

          <div className="flex items-center gap-2 text-muted-foreground/50">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="hover:text-muted-foreground transition-colors"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
            <button
              onClick={onClose}
              className="hover:text-destructive transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* --- BODY --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
          {/* Render the mapped component dynamically */}
          <Component />
        </div>
      </div>
    </div>
  );
}
