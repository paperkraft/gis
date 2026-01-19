"use client";

import { Layers } from "lucide-react";
import { useState } from "react";

import { BaseLayerType } from "@/hooks/useBaseLayer";
import { cn } from "@/lib/utils";

import { BaseLayerPicker } from "./BaseLayerPicker";
import { StandaloneControl } from "./controls/Shared";

export function MapLayers() {
  const [showLayerPicker, setShowLayerPicker] = useState(false);
  const [currentLayer, setCurrentLayer] = useState<BaseLayerType>("light");

  return (
    <div className="absolute bottom-10 right-2.5 z-30 flex flex-col gap-3 animate-in slide-in-from-right-4">
      <div className="relative">
        <BaseLayerPicker
          isOpen={showLayerPicker}
          onClose={() => setShowLayerPicker(false)}
          current={currentLayer}
          onChange={(type) => {
            setCurrentLayer(type);
            setShowLayerPicker(false);
          }}
        />

        <StandaloneControl
          onClick={() => setShowLayerPicker(!showLayerPicker)}
          icon={Layers}
          title="Switch Base Map"
          isActive={showLayerPicker}
          className={cn(
            "rounded-full shadow-lg bg-background transition-all border",
            showLayerPicker
              ? "bg-primary text-white border-primary ring-2 ring-blue-100"
              : "bg-white text-slate-600 border-slate-100 hover:text-primary hover:scale-105"
          )}
        />
      </div>
    </div>
  );
}
