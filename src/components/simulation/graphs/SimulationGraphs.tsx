"use client";

import { Activity, GitCommit, TrendingUp, Zap } from "lucide-react";
import React, { useState } from "react";

import { useNetworkStore } from "@/store/networkStore";

import { HGLGraph } from "./HGLGraph";
import { PumpCurveGraph } from "./PumpCurveGraph";
import { SystemEnergyGraph } from "./SystemEnergyGraph";
import { TimeSeriesGraph } from "./TimeSeriesGraph";

type GraphMode = "TIME_SERIES" | "PUMP_CURVE" | "HGL" | "ENERGY";

export function SimulationGraphs() {
  const [mode, setMode] = useState<GraphMode>("TIME_SERIES");
  const { selectedFeatureId, features } = useNetworkStore();
  const selectedFeature = selectedFeatureId
    ? features.get(selectedFeatureId)
    : null;
  const isPumpSelected = selectedFeature?.get("type") === "pump";

  return (
    <div className="flex flex-col h-full bg-white p-2">
      {/* 1. Mode Switcher Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-100 pb-2 overflow-x-auto">
        <TabButton
          active={mode === "TIME_SERIES"}
          onClick={() => setMode("TIME_SERIES")}
          icon={Activity}
          label="Time Series"
        />
        <TabButton
          active={mode === "ENERGY"}
          onClick={() => setMode("ENERGY")}
          icon={Zap}
          label="System Energy"
        />
        <TabButton
          active={mode === "HGL"}
          onClick={() => setMode("HGL")}
          icon={TrendingUp}
          label="Hydraulic Grade"
        />
        <TabButton
          active={mode === "PUMP_CURVE"}
          onClick={() => setMode("PUMP_CURVE")}
          icon={GitCommit}
          label="Pump Curve"
          disabled={!isPumpSelected}
          title={!isPumpSelected ? "Select a pump to view curve" : ""}
        />
      </div>

      {/* 2. Content Area */}
      <div className="flex-1 min-h-0 w-full relative">
        {mode === "TIME_SERIES" && <TimeSeriesGraph />}
        {mode === "PUMP_CURVE" && selectedFeatureId && (
          <PumpCurveGraph pumpId={selectedFeatureId} />
        )}
        {mode === "ENERGY" && <SystemEnergyGraph />}
        {mode === "HGL" && <HGLGraph />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  disabled,
  title,
}: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium transition-all whitespace-nowrap
                ${
                  active
                    ? "bg-blue-50 text-blue-600 border border-blue-200"
                    : "text-gray-500 hover:bg-gray-50"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}
