"use client";

import { useEffect, useRef } from "react";
import { Palette, Eye, EyeOff, Maximize, Settings, Trash2 } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

export function ContextMenu() {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    contextMenu,
    setContextMenu,
    toggleLayerVisibility,
    layerVisibility,
    setActiveStyleLayer,
    setActiveModal,
  } = useUIStore();

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [setContextMenu]);

  if (!contextMenu) return null;

  const { x, y, id, type } = contextMenu;
  const isLayer = type === "layer";
  const isVisible = isLayer ? layerVisibility[id] : true;

  // --- ACTIONS ---
  const handleEditStyle = () => {
    setActiveStyleLayer(id);
    setActiveModal("STYLE_SETTINGS");
    setContextMenu(null);
  };

  const handleToggleVisibility = () => {
    toggleLayerVisibility(id);
    setContextMenu(null);
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1 text-slate-700 animate-in fade-in zoom-in-95 duration-100"
      style={{ top: y, left: x }}
    >
      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
        {id.toUpperCase()} Options
      </div>

      <MenuItem
        icon={Palette}
        label="Edit Symbology"
        onClick={handleEditStyle}
      />

      <MenuItem
        icon={isVisible ? EyeOff : Eye}
        label={isVisible ? "Hide Layer" : "Show Layer"}
        onClick={handleToggleVisibility}
      />

      <MenuItem
        icon={Maximize}
        label="Zoom to Layer"
        onClick={() => {
          console.log("Zoom to", id);
          setContextMenu(null);
        }}
      />

      <div className="h-px bg-slate-100 my-1" />

      <MenuItem
        icon={Settings}
        label="Properties"
        onClick={() => setContextMenu(null)}
      />
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: any) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors text-left
        ${danger ? "text-red-600 hover:bg-red-50" : "text-slate-600"}
      `}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
