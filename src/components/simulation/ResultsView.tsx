"use client";

import {
    AlertTriangle, ArrowLeft, BarChart3, ChevronLeft, ChevronRight, Download, FileText, Layers,
    Pause, Play, RefreshCcw, Save, Terminal, Timer
} from 'lucide-react';
import { useParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { useSimulationStore } from '@/store/simulationStore';
import { useStyleStore } from '@/store/styleStore';
import { useUIStore } from '@/store/uiStore';

import { FormGroup } from '../form-controls/FormGroup';
import { FormSelect } from '../form-controls/FormSelect';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

export function ResultsView() {
  const params = useParams();
  const projectId = params?.id as string;

  const {
    isPlaying,
    history,
    results,
    currentTimeIndex,
    setTimeIndex,
    resetSimulation,
    nextStep,
    togglePlayback,
    warnings,
    report,
    saveResultsToDB,
  } = useSimulationStore();

  const { nodeColorMode, setNodeColorMode, linkColorMode, setLinkColorMode } =
    useStyleStore();

  const { setActiveModal } = useUIStore();

  const [showLog, setShowLog] = useState(false);
  const hasWarnings = warnings && warnings.length > 0;

  const handleDownloadLog = () => {
    if (!report) return;

    // Combine warnings and report into one file content
    let content = "EPANET SIMULATION LOG\n=====================\n\n";

    if (warnings && warnings.length > 0) {
      content += "WARNINGS DETECTED:\n";
      warnings.forEach((w) => (content += `[!] ${w}\n`));
      content += "\n---------------------\n\n";
    }

    content += "FULL OUTPUT REPORT:\n";
    content += report;

    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simulation_log_${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // --- Animation Loop ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && history) {
      interval = setInterval(() => {
        nextStep();
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
      const p = Number(n.pressure);
      if (p < minP) minP = p;
      if (p > maxP) maxP = p;
    });

    Object.values(results.links).forEach((l: any) => {
      const v = Number(l.velocity);
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    });

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
      time: Number(rawTime) || 0,
    };
  }, [results, history, currentTimeIndex]);

  // CSV Export Handler
  const handleDownloadReport = () => {
    if (!history) return;
    let csv =
      "Time(hr),NodeID,Pressure(m),Head(m),LinkID,Flow(LPS),Velocity(m/s)\n";
    history.snapshots.forEach((snap, index) => {
      let tVal = snap.time ?? (history.timestamps[index] || 0);
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

  const handleBack = () => {
    resetSimulation();
    setNodeColorMode("none");
    setLinkColorMode("none");
  }

  if (!stats || !history) return null;

  const totalSteps = history.snapshots.length;
  const isEPS = totalSteps > 1;

  const nodeOptions = [
    { label: "Pressure", value: "pressure" },
    { label: "Total Head", value: "head" },
    { label: "Demand", value: "demand" },
    { label: "Elevation", value: "elevation" },
    { label: "None", value: "none" },
  ];

  const linkOptions = [
    { label: "Velocity", value: "velocity" },
    { label: "Flow Rate", value: "flow" },
    { label: "Headloss", value: "headloss" },
    { label: "Diameter", value: "diameter" },
    { label: "None", value: "none" },
  ];

  return (
    <div className="flex flex-col h-full bg-white text-slate-700 animate-in slide-in-from-left-4 relative">
      {/* --- HEADER --- */}
      <div
        className={cn(
          "flex items-center gap-2 p-3 border-b transition-colors",
          hasWarnings
            ? "bg-amber-50 border-amber-100"
            : "bg-green-50/50 border-slate-100"
        )}
      >
        <button
          onClick={handleBack}
          className="p-1.5 hover:bg-white/50 rounded text-slate-500 hover:text-slate-800 transition-all"
        >
          <ArrowLeft size={14} />
        </button>

        {/* Dynamic Status Text */}
        <div className="flex-1">
          <h2
            className={cn(
              "text-xs font-bold uppercase tracking-wider",
              hasWarnings ? "text-amber-700" : "text-green-800"
            )}
          >
            {hasWarnings ? "Completed with Warnings" : "Analysis Complete"}
          </h2>
          <p
            className={cn(
              "text-[10px]",
              hasWarnings ? "text-amber-600" : "text-green-600"
            )}
          >
            {hasWarnings
              ? `${warnings.length} issues detected`
              : "Converged Successfully"}
          </p>
        </div>

        {/* Header Action: View Log */}
        {hasWarnings && (
          <button
            onClick={() => setShowLog(true)}
            className="flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded text-[10px] font-bold transition-colors"
          >
            <AlertTriangle size={12} /> Log
          </button>
        )}
      </div>

      {/* --- SCROLLABLE CONTENT --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
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
                setTimeIndex(parseInt(e.target.value));
              }}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-3"
            />
            {/* Playback Controls */}
            <div className="flex gap-2 justify-center">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setTimeIndex(Math.max(0, currentTimeIndex - 1))}
                disabled={currentTimeIndex <= 0}
                className="h-8 w-8 p-0 rounded-full"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                onClick={() => togglePlayback()}
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
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <FormGroup label="Snapshot Summary">
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
        </FormGroup>

        {/* Map Visualization */}
        <FormGroup label="Visualization">
          <FormSelect
            label="Nodes"
            value={nodeColorMode}
            onChange={(v) => setNodeColorMode(v)}
            options={nodeOptions}
          />

          <FormSelect
            label="Links"
            value={linkColorMode}
            onChange={(v) => setLinkColorMode(v)}
            options={linkOptions}
          />
        </FormGroup>

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
            icon={Layers}
            title="Scenarios"
            desc="Save/Compare Results"
            color="purple"
            onClick={() => setActiveModal("SCENARIO_MANAGER")}
          />
          <ActionButton
            icon={Terminal}
            title="View Simulation Log"
            desc="System warnings & details"
            color="amber"
            onClick={() => setShowLog(true)}
          />
          <ActionButton
            icon={FileText}
            title="Export Report"
            desc="Download CSV"
            color="green"
            onClick={handleDownloadReport}
          />
          <ActionButton
            icon={Save}
            title="Save Results"
            desc="Save run to database"
            color="green"
            onClick={() => saveResultsToDB(projectId)}
          />
        </div>
      </div>

      <div className="p-2 border-t border-slate-100 bg-slate-50">
        <Button
          variant={"ghost"}
          size={"sm"}
          className="w-full text-xs"
          onClick={resetSimulation}
        >
          <RefreshCcw /> New Simulation
        </Button>
      </div>

      {/* --- REPORT DIALOG --- */}
      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-slate-50">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Terminal size={16} className="text-slate-500" /> Simulation
              Output Log
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto bg-slate-900 p-4 font-mono text-[11px] text-slate-300 leading-relaxed custom-scrollbar">
            {/* Warnings Section (Highlighted) */}
            {warnings && warnings.length > 0 && (
              <div className="mb-6 p-3 bg-amber-900/30 border border-amber-700/50 rounded text-amber-200">
                <div className="font-bold mb-2 flex items-center gap-2 text-amber-400 border-b border-amber-700/50 pb-1">
                  <AlertTriangle size={14} />
                  <span>Detected Warnings ({warnings.length})</span>
                </div>
                <ul className="list-disc pl-4 space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Full Report Text */}
            <div className="whitespace-pre-wrap">
              {report || (
                <span className="italic opacity-50 text-slate-500">
                  No report generated.
                </span>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadLog}
              disabled={!report}
              className="h-8 text-xs gap-2"
            >
              <Download size={14} /> Download .txt
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Sub Components ---
const ResultCard = ({ label, value, unit, color }: any) => (
  <div className="p-1 bg-slate-50 border border-slate-100 rounded text-center">
    <div className="text-[8px] text-slate-400 uppercase">{label}</div>
    <div className={`text-[10] font-bold ${color}`}>
      {value}{" "}
      <span className="text-[9px] text-slate-400 font-normal">{unit}</span>
    </div>
  </div>
);

const ActionButton = ({ icon: Icon, title, desc, color, onClick }: any) => {
  let bgClass = "bg-slate-100 text-slate-600";
  let borderHover = "hover:border-slate-300 hover:bg-slate-50";

  if (color === "blue") {
    bgClass = "bg-blue-100 text-blue-600 group-hover:bg-white";
    borderHover = "hover:border-blue-300 hover:bg-blue-50";
  }
  if (color === "green") {
    bgClass = "bg-green-100 text-green-600 group-hover:bg-white";
    borderHover = "hover:border-green-300 hover:bg-green-50";
  }
  if (color === "amber") {
    bgClass = "bg-amber-100 text-amber-600 group-hover:bg-white";
    borderHover = "hover:border-amber-300 hover:bg-amber-50";
  }
  if (color === "purple") {
    bgClass = "bg-purple-100 text-purple-600 group-hover:bg-white";
    borderHover = "hover:border-purple-300 hover:bg-purple-50";
  }

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
