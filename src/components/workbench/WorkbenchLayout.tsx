"use client";
import { ReactNode, useCallback, useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore, WorkbenchPanelType } from "@/store/uiStore";

import { ContextMenu } from "./ContextMenu";
import { PANEL_REGISTRY } from "./panel_registry";
import { ProjectTreePanel } from "./ProjectTreePanel";
import { WorkbenchModal } from "./WorkbenchModal";
import { AttributeTable } from "../panels/AttributeTablePanel";

export default function WorkbenchLayout({ children }: { children: ReactNode }) {
  const [isResizing, setIsResizing] = useState(false);

  const {
    activeModal,
    activePanel,
    sidebarWidth,
    isCollapsed,
    showAttributeTable,
    setActiveModal,
    setSidebarWidth,
    setIsCollapsed,
    setShowAttributeTable,
  } = useUIStore();

  const settings = useNetworkStore((state) => state.settings);

  // --- DYNAMIC COMPONENT RESOLUTION ---
  const SidebarComponent =
    PANEL_REGISTRY[activePanel as WorkbenchPanelType] || ProjectTreePanel;

  // --- RESIZING LOGIC ---
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        e.preventDefault();
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        const newWidth = e.clientX - 16;
        if (isCollapsed && newWidth > 60) {
          setIsCollapsed(false);
          setSidebarWidth(Math.max(260, newWidth));
        } else if (!isCollapsed && newWidth < 80) {
          setIsCollapsed(true);
        } else if (!isCollapsed) {
          setSidebarWidth(Math.min(400, Math.max(260, newWidth)));
        }
      } else {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    },
    [isResizing, isCollapsed]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div className="h-screen w-screen bg-slate-50 overflow-hidden flex flex-col font-sans text-slate-700">
      <Header
        isWorkbench
        projectName={settings.title}
        description={settings.description}
      />

      <div className="flex-1 relative overflow-hidden">
        {/* Sidebar Container */}
        <div className="absolute inset-0 z-10 pointer-events-none p-2 pb-9 flex justify-between">
          <div
            className="relative pointer-events-auto flex transition-all duration-300 ease-in-out"
            style={{ width: isCollapsed ? 0 : sidebarWidth }}
          >
            <div
              className={`flex-1 bg-background border border-slate-200 rounded-md shadow-[2px_0_8px_rgba(0,0,0,0.12)] overflow-hidden transition-opacity duration-300 ${
                isCollapsed ? "opacity-0" : "opacity-100"
              }`}
            >
              <SidebarComponent />
            </div>

            {/* Resize Handle */}
            <div
              className="absolute top-0 bottom-0 -right-2 w-4 z-50 cursor-col-resize flex items-center justify-center group touch-none"
              onMouseDown={startResizing}
              onClick={(e) => {
                if (!isResizing) setIsCollapsed(!isCollapsed);
              }}
              title={
                isCollapsed ? "Click to Expand (Ctrl+B)" : "Drag to Resize"
              }
            >
              <div
                className={`w-1 h-12 rounded-full transition-all duration-200 ${
                  isResizing
                    ? "bg-primary h-16"
                    : "bg-slate-400 group-hover:bg-primary"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="absolute inset-0 z-0 bg-slate-200">
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            {children}
          </div>
        </div>

        {activeModal !== "NONE" && (
          <WorkbenchModal
            key={activeModal}
            type={activeModal}
            onClose={() => setActiveModal("NONE")}
            sidebarWidth={isCollapsed ? 0 : sidebarWidth}
          />
        )}

        <ContextMenu />
      </div>

      <AttributeTable
        isOpen={showAttributeTable}
        onClose={() => setShowAttributeTable(false)}
      />
    </div>
  );
}
