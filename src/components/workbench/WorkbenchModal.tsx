"use client";

import { Maximize2, Minimize2, X } from 'lucide-react';
import React, { useState } from 'react';

import { MODAL_REGISTRY, WorkbenchModalType } from './modal_registry';

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
  // --- GET CONFIGURATION ---
  const config = MODAL_REGISTRY[type];

  // Fallback if type not found
  if (!config) {
    return null;
  }

  const { title, icon: Icon, component: Component, defaultMaximized } = config;

  // Initialize State with Config
  const [isMaximized, setIsMaximized] = useState(defaultMaximized);

  // --- DYNAMIC POSITIONING (POPOUT) ---
  const modalStyle: React.CSSProperties = isMaximized
    ? {
        position: "absolute",
        top: 10,
        left: sidebarWidth + 18,
        right: 12,
        bottom: 40,
        zIndex: 50,
      }
    : {
        position: "absolute",
        top: 10,
        left: sidebarWidth + 18,
        width: "320px",
        maxHeight: "calc(100vh - 100px)",
        zIndex: 50,
      };

  return (
    <div
      style={modalStyle}
      className="pointer-events-auto shadow-xl rounded-sm animate-in fade-in slide-in-from-left-4 duration-300 flex flex-col transition-all ease-out"
    >
      <div className="bg-background backdrop-blur-md rounded-sm overflow-hidden flex flex-col ring-1 ring-slate-900/5 h-full">
        {/* --- HEADER --- */}
        <div className="h-9 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-3 select-none shrink-0">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <Icon size={14} />
            {title}
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="hover:text-slate-700 transition-colors"
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
          <Component isMaximized={isMaximized} />
        </div>
      </div>
    </div>
  );
}
