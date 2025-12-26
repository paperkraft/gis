"use client";

import { Palette, RotateCcw, Type } from "lucide-react";
import React, { useEffect, useState } from "react";

import { useStyleStore } from "@/store/styleStore";
import { useUIStore } from "@/store/uiStore";

import { LabelTab } from "./style-tabs/LabelTab";
import { StyleTab } from "./style-tabs/StyleTab";

export function StyleSettingsPanel() {
  const { activeStyleLayer } = useUIStore();
  const { getStyle, resetStyle, layerStyles } = useStyleStore();

  // Local state to show immediate feedback in header color dot
  const [headerColor, setHeaderColor] = useState<string>("#999");
  const [activeTab, setActiveTab] = useState<"style" | "labels">("style");

  useEffect(() => {
    if (activeStyleLayer) {
      setHeaderColor(getStyle(activeStyleLayer).color);
    }
  }, [activeStyleLayer, layerStyles, getStyle]);

  if (!activeStyleLayer)
    return <div className="p-4 text-xs text-slate-500">No layer selected.</div>;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 1. HEADER (Compact) */}
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex gap-2 items-center sticky top-0 z-20 backdrop-blur-sm">
        {/* Tab Switcher */}
        <div className="flex-1 flex bg-muted-foreground/10 rounded-md p-0.5">
          <button
            onClick={() => setActiveTab("style")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-[10px] font-bold rounded transition-all ${
              activeTab === "style"
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Palette size={12} /> Style
          </button>
          <button
            onClick={() => setActiveTab("labels")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-[10px] font-bold rounded transition-all ${
              activeTab === "labels"
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Type size={12} /> Labels
          </button>
        </div>

        {/* Layer Indicator & Reset */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div
            className="size-3 rounded-full ring-1 ring-accent"
            style={{ backgroundColor: headerColor }}
          />
          <button
            onClick={() => resetStyle(activeStyleLayer)}
            className="p-1.5 text-slate-400 hover:text-primary hover:bg-white hover:shadow-sm rounded transition-all"
            title="Reset Layer to Defaults"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* 2. CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === "style" ? (
          <StyleTab layerId={activeStyleLayer} />
        ) : (
          <LabelTab layerId={activeStyleLayer} />
        )}
      </div>
    </div>
  );
}
