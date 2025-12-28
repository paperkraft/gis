"use client";

import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Eye,
  EyeOff,
  FileText,
  Pause,
  Play,
  RefreshCcw,
  Save,
  Timer,
  Trash2,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { useSimulationStore } from "@/store/simulationStore";
import { useStyleStore } from "@/store/styleStore";
import { useUIStore } from "@/store/uiStore";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useScenarioStore } from "@/store/scenarioStore";
import { useNetworkStore } from "@/store/networkStore";
import { FormInput } from "../form-controls/FormInput";
import { FormGroup } from "../form-controls/FormGroup";
import { FormSelect } from "../form-controls/FormSelect";

export function ResultsView() {
  const {
    history,
    results,
    currentTimeIndex,
    setTimeIndex,
    resetSimulation,
    nextStep,
  } = useSimulationStore();
  const { scenarios, addScenario, removeScenario, toggleVisibility } =
    useScenarioStore();

  const { colorMode, setColorMode } = useStyleStore();
  const { setActiveModal } = useUIStore();

  // Get current network state to save it
  const { features, setNetworkState } = useNetworkStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [scenarioName, setScenarioName] = useState("");

  const handleSaveScenario = () => {
    if (!history || !scenarioName.trim()) return;
    // CONVERT MAP TO ARRAY for storage
    const featureList = Array.from(features.values());
    addScenario(scenarioName, history, featureList);
    setScenarioName("");
  };

  const handleRestoreScenario = (scenario: any) => {
    if (!confirm(`Promote "${scenario.name}" to current state?`)) return;
    // 1. Restore Network
    setNetworkState(scenario.networkSnapshot);
    // 2. Restore Results (Optional but recommended)
    useSimulationStore.setState({
      history: scenario.results,
      results:
        scenario.results.snapshots[scenario.results.snapshots.length - 1],
      status: "completed",
    });
  };

  // --- Animation Loop ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && history) {
      interval = setInterval(() => {
        nextStep(); // Use store action
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, history, nextStep]);

  // Stats Calculation
  const stats = useMemo(() => {
    if (!results || !history) return null;

    let rawTime = results.time;
    if (rawTime === undefined || rawTime === null) {
      rawTime = history.timestamps ? history.timestamps[currentTimeIndex] : 0;
    }

    let minP = Infinity,
      maxP = -Infinity,
      minV = Infinity,
      maxV = -Infinity;

    Object.values(results.nodes).forEach((n: any) => {
      const p = Number(n.pressure); // Ensure number
      if (p < minP) minP = p;
      if (p > maxP) maxP = p;
    });

    Object.values(results.links).forEach((l: any) => {
      const v = Number(l.velocity); // Ensure number
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    });

    // Handle completely empty network case
    if (minP === Infinity) {
      minP = 0;
      maxP = 0;
      minV = 0;
      maxV = 0;
    }

    return {
      minP: minP.toFixed(2),
      maxP: maxP.toFixed(2),
      minV: minV.toFixed(2),
      maxV: maxV.toFixed(2),
      time: Number(rawTime) || 0, // Final safety check
    };
  }, [results, history, currentTimeIndex]);

  // CSV Export Handler
  const handleDownloadReport = () => {
    if (!history) return;

    let csv =
      "Time(hr),NodeID,Pressure(m),Head(m),LinkID,Flow(LPS),Velocity(m/s)\n";

    history.snapshots.forEach((snap, index) => {
      let tVal = snap.time;
      if (tVal === undefined) tVal = history.timestamps[index] || 0;

      const tStr = (Number(tVal) / 3600).toFixed(2);

      const nodeKeys = Object.keys(snap.nodes);
      const linkKeys = Object.keys(snap.links);
      const maxRows = Math.max(nodeKeys.length, linkKeys.length);

      for (let i = 0; i < maxRows; i++) {
        const nId = nodeKeys[i] || "";
        const lId = linkKeys[i] || "";

        const n = snap.nodes[nId] || { pressure: "", head: "" };
        const l = snap.links[lId] || { flow: "", velocity: "" };

        csv += `${tStr},${nId},${n.pressure},${n.head},${lId},${l.flow},${l.velocity}\n`;
      }
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simulation_results_${Date.now()}.csv`;
    a.click();
  };

  if (!stats || !history) return null;

  const totalSteps = history.snapshots.length;
  const isEPS = totalSteps > 1;

  return (
    <div className="flex flex-col h-full bg-white text-slate-700 animate-in slide-in-from-left-4">
      {/* Results Header */}
      <div className="flex items-center gap-2 p-3 border-b border-slate-100 bg-green-50/50">
        <button
          onClick={resetSimulation}
          className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-green-800 transition-all"
        >
          <ArrowLeft size={14} />
        </button>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-green-800">
            Analysis Complete
          </h2>
          <p className="text-[10px] text-green-600">Converged Successfully</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        {/* Time Slider (EPS Only) */}
        {isEPS && (
          <div className="bg-primary-foreground p-3 rounded border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                <Timer size={12} className="text-blue-500" />{" "}
                <span>Time Step</span>
              </div>
              <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {(stats.time / 3600).toFixed(1)} hrs
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={totalSteps - 1}
              value={currentTimeIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setTimeIndex(parseInt(e.target.value));
              }}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-3"
            />

            {/* Control Buttons */}
            <div className="flex gap-2 justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTimeIndex(Math.max(0, currentTimeIndex - 1))}
                disabled={currentTimeIndex <= 0}
                className="h-8 w-8 p-0 rounded-full"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => setIsPlaying(!isPlaying)}
                size="icon-sm"
                className={cn(
                  "rounded-full transition-all active:scale-95",
                  isPlaying
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                )}
              >
                {isPlaying ? (
                  <Pause size={12} fill="currentColor" />
                ) : (
                  <Play size={12} fill="currentColor" />
                )}
                {/* {isPlaying ? "Pause" : "Play Loop"} */}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setTimeIndex(
                    Math.min(
                      history.timestamps.length - 1,
                      currentTimeIndex + 1
                    )
                  )
                }
                disabled={currentTimeIndex >= history.timestamps.length - 1}
                className="h-8 w-8 p-0 rounded-full"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div>
          <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2">
            Snapshot Summary
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <ResultCard
              label="Min Pressure"
              value={stats.minP}
              unit="m"
              color="text-amber-600"
            />
            <ResultCard
              label="Max Pressure"
              value={stats.maxP}
              unit="m"
              color="text-blue-600"
            />
            <ResultCard
              label="Min Velocity"
              value={stats.minV}
              unit="m/s"
              color="text-slate-600"
            />
            <ResultCard
              label="Max Velocity"
              value={stats.maxV}
              unit="m/s"
              color="text-purple-600"
            />
          </div>
        </div>

        {/* Map Visualization */}
        <FormGroup label="Visualization">
          <FormSelect
            label="Type"
            value={colorMode || ""}
            onChange={(v) => setColorMode(v)}
            options={[
              { label: "Pressure", value: "pressure" },
              { label: "Velocity", value: "velocity" },
              { label: "Total Head", value: "head" },
              { label: "Flow Rate", value: "flow" },
            ]}
          />
        </FormGroup>

        {/* --- SCENARIO MANAGER --- */}
        <div className="bg-primary-foreground p-3 rounded border border-slate-200">
          <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-2">
            Scenario Manager
          </h4>

          {/* Save Input */}
          <div className="flex gap-2 items-end mb-2">
            <FormInput
              label="Scenario Name"
              type="text"
              placeholder="Name"
              value={scenarioName || ""}
              onChange={(v) => setScenarioName(v)}
            />
            <Button
              size={"icon-sm"}
              onClick={handleSaveScenario}
              disabled={!scenarioName.trim()}
              title="Save current results as scenario"
            >
              <Save size={14} />
            </Button>
          </div>

          {/* Saved Scenarios List */}
          <div className="space-y-1.5">
            {scenarios.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded text-xs"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate font-medium text-slate-700">
                    {s.name}
                  </span>
                </div>
                <div className="flex gap-1">
                  {/* RESTORE BUTTON */}
                  <button
                    onClick={() => handleRestoreScenario(s)}
                    className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded"
                    title="Promote to Current (Restore Map)"
                  >
                    <CheckCircle2 size={14} />
                  </button>

                  <div className="w-px h-4 bg-slate-200 mx-1"></div>

                  <button
                    onClick={() => toggleVisibility(s.id)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    {s.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  <button
                    onClick={() => removeScenario(s.id)}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            {scenarios.length === 0 && (
              <div className="text-[10px] text-slate-400 text-center italic py-1">
                No saved scenarios
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <ActionButton
            icon={BarChart3}
            title="View Graphs"
            desc="Plot time series"
            color="blue"
            onClick={() => setActiveModal("SIMULATION_GRAPHS")}
          />
          <ActionButton
            icon={FileText}
            title="Export Report"
            desc="Download CSV"
            color="green"
            onClick={handleDownloadReport}
          />
        </div>
      </div>

      <div className="p-3 border-t border-slate-100 bg-slate-50">
        <button
          onClick={resetSimulation}
          className="w-full py-2 rounded text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
        >
          <RefreshCcw size={12} /> New Simulation
        </button>
      </div>
    </div>
  );
}

// --- Sub Components ---
const ResultCard = ({ label, value, unit, color }: any) => (
  <div className="p-2 bg-slate-50 border border-slate-100 rounded text-center">
    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wide">
      {label}
    </div>
    <div className={`text-lg font-bold ${color}`}>
      {value}{" "}
      <span className="text-[9px] text-slate-400 font-normal">{unit}</span>
    </div>
  </div>
);

const ActionButton = ({ icon: Icon, title, desc, color, onClick }: any) => {
  const bgClass =
    color === "blue"
      ? "bg-blue-100 text-blue-600 group-hover:bg-white"
      : "bg-green-100 text-green-600 group-hover:bg-white";
  const borderHover =
    color === "blue"
      ? "hover:border-blue-300 hover:bg-blue-50"
      : "hover:border-green-300 hover:bg-green-50";
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-2.5 rounded border border-slate-200 transition-all group ${borderHover}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded ${bgClass}`}>
          <Icon size={16} />
        </div>
        <div className="text-left">
          <div className="text-xs font-bold text-slate-700">{title}</div>
          <div className="text-[10px] text-slate-400">{desc}</div>
        </div>
      </div>
    </button>
  );
};

const VizButton = ({ label, onClick }: any) => (
  <button
    onClick={onClick}
    className="px-3 py-2 text-xs border rounded text-left hover:bg-slate-50 transition-colors"
  >
    {label}
  </button>
);
