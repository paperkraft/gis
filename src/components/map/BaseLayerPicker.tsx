"use client";

import { Check, Grid3X3 } from "lucide-react";
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
    <div className="absolute bottom-0 right-12 z-50 mb-0 animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="bg-background p-3 rounded-md shadow-xl border border-slate-200 grid grid-cols-3 gap-3 w-60">
        {/* 1. OSM */}
        <LayerOption
          label="Standard"
          active={current === "osm"}
          onClick={() => handleSelect("osm")}
        >
          <div className="w-full h-full bg-[#f2efe9] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-[#aad3df]" />
            <div className="absolute top-2 left-2 w-full h-2 bg-[#f7c97e] -rotate-12" />
          </div>
        </LayerOption>

        {/* 2. Mapbox (Streets style) */}
        <LayerOption
          label="Mapbox"
          active={current === "mapbox"}
          onClick={() => handleSelect("mapbox")}
        >
          <div className="w-full h-full bg-[#eef0f5] relative overflow-hidden">
            {/* Distinctive Mapbox Blue/Black roads */}
            <div className="absolute top-3 left-0 w-full h-1.5 bg-slate-800 -rotate-6" />
            <div className="absolute bottom-3 left-0 w-full h-1 bg-[#4264fb] rotate-12" />
            <div className="absolute top-0 right-0 w-8 h-8 bg-[#c6e2b8] rounded-bl-xl" />
          </div>
        </LayerOption>

        {/* 3. Satellite */}
        <LayerOption
          label="Satellite"
          active={current === "satellite"}
          onClick={() => handleSelect("satellite")}
        >
          <div className="w-full h-full bg-[#3a4a38] relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30" />
            <div className="absolute top-0 right-0 w-1/2 h-full bg-[#1e2f23] blur-sm" />
          </div>
        </LayerOption>

        {/* 4. Terrain */}
        <LayerOption
          label="Terrain"
          active={current === "terrain"}
          onClick={() => handleSelect("terrain")}
        >
          <div className="w-full h-full bg-[#e8e6e1] relative overflow-hidden flex flex-col justify-center items-center">
            {/* Contour Lines effect */}
            <div className="w-12 h-8 border border-slate-400/40 rounded-[50%] absolute top-2 -left-2.5" />
            <div className="w-16 h-10 border border-slate-400/40 rounded-[60%] absolute top-4 left-2" />
            <div className="w-10 h-6 border border-slate-400/40 rounded-[40%] absolute bottom-2 right-[-5px]" />
            {/* Hillshade */}
            <div className="absolute inset-0 bg-linear-to-tr from-slate-400/20 to-transparent pointer-events-none" />
          </div>
        </LayerOption>

        {/* 5. Light */}
        <LayerOption
          label="Light"
          active={current === "light"}
          onClick={() => handleSelect("light")}
        >
          <div className="w-full h-full bg-slate-50 relative border border-slate-100">
            <div className="absolute top-2 left-0 w-full h-px bg-slate-300 -rotate-12" />
          </div>
        </LayerOption>

        {/* 6. Dark */}
        <LayerOption
          label="Dark"
          active={current === "dark"}
          onClick={() => handleSelect("dark")}
        >
          <div className="w-full h-full bg-[#1a1a1a] relative">
            <div className="absolute top-2 left-0 w-full h-px bg-[#333] -rotate-12" />
          </div>
        </LayerOption>

        {/* BLANK (Schematic) */}
        <LayerOption
          label="Blank"
          active={current === "blank"}
          onClick={() => handleSelect("blank")}
        >
          <div className="w-full h-full bg-white relative border border-slate-100 flex items-center justify-center text-slate-200">
            <Grid3X3 size={24} strokeWidth={1} />
          </div>
        </LayerOption>
      </div>

      {/* Arrow */}
      <div className="absolute -right-1.5 bottom-4 w-3 h-3 bg-background transform rotate-45 border-r border-t border-slate-200" />
    </div>
  );
}

function LayerOption({ active, onClick, children, label }: any) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2 outline-none"
    >
      <div
        className={cn(
          "w-16 h-16 rounded-md overflow-hidden border-2 transition-all shadow-sm relative bg-slate-100",
          active
            ? "border-primary ring-2 ring-blue-100 ring-offset-1"
            : "border-slate-200 hover:border-slate-300 hover:shadow-md"
        )}
      >
        {children}
        {active && (
          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
            <div className="bg-primary rounded-full p-0.5 shadow-sm">
              <Check size={12} className="text-white" />
            </div>
          </div>
        )}
      </div>
      <span
        className={cn(
          "text-[10px] font-medium transition-colors",
          active ? "text-blue-700" : "text-slate-500 group-hover:text-slate-700"
        )}
      >
        {label}
      </span>
    </button>
  );
}
