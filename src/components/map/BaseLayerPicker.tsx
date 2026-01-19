"use client";

import { Check, Grid3X3, Mountain, Moon, Sun, Satellite } from "lucide-react";
import { cn } from "@/lib/utils";
import { BaseLayerType, useBaseLayer } from "@/hooks/useBaseLayer";

interface BaseLayerPickerProps {
  current: BaseLayerType;
  onChange: (type: BaseLayerType) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function BaseLayerPicker({
  current,
  onChange,
  isOpen,
}: BaseLayerPickerProps) {
  const { setBaseLayer } = useBaseLayer();

  if (!isOpen) return null;

  const handleSelect = (type: BaseLayerType) => {
    setBaseLayer(type);
    onChange(type);
  };

  return (
    <div className="absolute bottom-0 right-11 z-50 mb-0 animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="bg-background p-2 py-3 rounded-sm shadow-lg grid grid-cols-3 gap-1 w-64 ring-1 ring-slate-900/5">
        {/* 1. STREETS (Standard) */}
        <LayerOption
          label="Streets"
          active={current === "streets"}
          onClick={() => handleSelect("streets")}
        >
          <div className="w-full h-full bg-[#f6f6f4] relative overflow-hidden">
            {/* Roads */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-[#dde5ed]" />
            <div className="absolute top-2 left-[-10%] w-[120%] h-2 bg-[#ffffff] border-y border-[#cfcfcf] -rotate-12" />
            <div className="absolute bottom-2 right-[-10%] w-[120%] h-3 bg-[#fbb03b] border-y border-[#d69632] -rotate-45" />
          </div>
        </LayerOption>

        {/* 2. OUTDOORS (Terrain) */}
        <LayerOption
          label="Outdoors"
          active={current === "outdoors"}
          onClick={() => handleSelect("outdoors")}
        >
          <div className="w-full h-full bg-[#eef0f5] relative overflow-hidden">
            {/* Green Park Area */}
            <div className="absolute top-0 right-0 w-2/3 h-2/3 bg-[#cdeebb] rounded-bl-3xl" />
            {/* Contour Line Hint */}
            <div className="absolute bottom-2 left-2 w-8 h-8 border border-slate-300/50 rounded-full" />
            <div className="absolute -bottom-2.5 -left-2.5 w-16 h-16 border border-slate-300/50 rounded-full" />
            <Mountain
              size={14}
              className="absolute bottom-1 right-1 text-slate-400 opacity-50"
            />
          </div>
        </LayerOption>

        {/* 3. SATELLITE (Pure Imagery) */}
        <LayerOption
          label="Satellite"
          active={current === "satellite"}
          onClick={() => handleSelect("satellite")}
        >
          <div className="w-full h-full bg-[#3a4a38] relative overflow-hidden">
            {/* Texture Pattern */}
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-slate-600 to-slate-900" />
            {/* Green patches */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-[#1e2f23] blur-md" />
            <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-[#2a3c2e] blur-sm" />
          </div>
        </LayerOption>

        {/* 4. HYBRID (Satellite + Streets) */}
        <LayerOption
          label="Hybrid"
          active={current === "satellite-streets"}
          onClick={() => handleSelect("satellite-streets")}
        >
          <div className="w-full h-full bg-[#2c3e2d] relative overflow-hidden">
            {/* Dark base */}
            <div className="absolute inset-0 bg-black/20" />
            {/* Roads overlay */}
            <div className="absolute top-4 left-[-10%] w-[120%] h-1.5 bg-white/90 -rotate-12 shadow-sm" />
            <div className="absolute bottom-3 right-[-10%] w-[120%] h-1 bg-[#fbb03b] -rotate-45" />
            <Satellite
              size={12}
              className="absolute top-1 right-1 text-white/50"
            />
          </div>
        </LayerOption>

        {/* 5. LIGHT (Clean) */}
        <LayerOption
          label="Light"
          active={current === "light"}
          onClick={() => handleSelect("light")}
        >
          <div className="w-full h-full bg-[#f8f9fa] relative border border-slate-100">
            <div className="absolute top-4 left-[-10%] w-[120%] h-px bg-slate-300 -rotate-6" />
            <div className="absolute bottom-4 right-[-10%] w-[120%] h-px bg-slate-300 -rotate-6" />
            <Sun size={12} className="absolute top-1 right-1 text-slate-400" />
          </div>
        </LayerOption>

        {/* 6. DARK (Night) */}
        <LayerOption
          label="Dark"
          active={current === "dark"}
          onClick={() => handleSelect("dark")}
        >
          <div className="w-full h-full bg-[#1a1a1a] relative">
            <div className="absolute top-4 left-[-10%] w-[120%] h-px bg-[#333] -rotate-6" />
            <div className="absolute bottom-4 right-[-10%] w-[120%] h-px bg-[#444] -rotate-6" />
            <Moon size={12} className="absolute top-1 right-1 text-slate-600" />
          </div>
        </LayerOption>

        {/* 7. BLANK (Schematic) */}
        <div className="col-span-3 pt-2 border-t border-slate-200 mt-1">
          <LayerOption
            label="No Base Map (Grid Only)"
            active={current === "blank"}
            onClick={() => handleSelect("blank")}
            wide
          >
            <div className="w-full h-full bg-background relative flex items-center gap-3 px-3">
              <Grid3X3 size={18} />
              <div className="flex flex-col items-start">
                <span className="text-xs font-bold text-slate-700">
                  Schematic Mode
                </span>
                <span className="text-[9px] text-muted-foreground">
                  White background with grid
                </span>
              </div>
            </div>
          </LayerOption>
        </div>
      </div>

      {/* Pointer Arrow */}
      <div className="absolute -right-1.5 bottom-3 size-3 bg-background transform rotate-45 border-r border-t border-slate-900/5" />
    </div>
  );
}

// --- SUB COMPONENT ---

interface LayerOptionProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
  wide?: boolean; // For the "Blank" option at bottom
}

function LayerOption({
  active,
  onClick,
  children,
  label,
  wide,
}: LayerOptionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center gap-1.5 outline-none transition-all",
        wide ? "flex-row w-full" : ""
      )}
    >
      <div
        className={cn(
          "overflow-hidden transition-all shadow-sm relative bg-slate-100",
          wide
            ? "w-full h-10 rounded border hover:border-slate-300"
            : "w-16 h-16 rounded-lg border-2",

          active && !wide
            ? "border-primary ring-2 ring-blue-100 ring-offset-1"
            : !wide &&
                "border-slate-200 group-hover:border-slate-300 group-hover:shadow-md",

          active && wide ? "border-primary bg-blue-50/50" : ""
        )}
      >
        {children}

        {/* Active Badge (Only for square cards) */}
        {active && !wide && (
          <div className="absolute inset-0 bg-blue-900/10 flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-primary rounded-full p-0.5 shadow-sm">
              <Check size={12} className="text-white" />
            </div>
          </div>
        )}
      </div>

      {!wide && (
        <span
          className={cn(
            "text-[10px] font-medium transition-colors",
            active
              ? "text-primary font-bold"
              : "text-slate-500 group-hover:text-slate-700"
          )}
        >
          {label}
        </span>
      )}
    </button>
  );
}
