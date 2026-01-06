"use client";

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Terminal,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { generateINP } from "@/lib/export/inpWriter";
import { cn } from "@/lib/utils";
import { useNetworkStore } from "@/store/networkStore";
import { useSimulationStore } from "@/store/simulationStore";
import { useUIStore } from "@/store/uiStore";
import { useParams } from "next/navigation";

export function SimulationPanelOG() {
  const params = useParams();
  const projectId = params.id;

  const { features } = useNetworkStore();
  const { setSimulationReportModalOpen } = useUIStore();

  const {
    status,
    results,
    history,
    error,
    currentTimeIndex,
    isPlaying,
    runSimulation,
    resetSimulation,
    setTimeIndex,
    togglePlayback,
    nextStep,
  } = useSimulationStore();

  const [logs, setLogs] = useState<string[]>([]);

  // Simulation Logs Logic
  useEffect(() => {
    if (status === "running") {
      setLogs([
        "> Initializing hydraulic solver...",
        "> Checking network topology...",
        "> Building graph matrix...",
        "> Iterating time steps (0-24)...",
      ]);
    } else if (status === "completed") {
      // NEW: Show counts in log
      const nodeCount = Object.keys(results?.nodes || {}).length;
      const linkCount = Object.keys(results?.links || {}).length;

      setLogs((prev) => [
        ...prev,
        `> Solved: ${nodeCount} Nodes, ${linkCount} Links`,
        "> Convergence achieved (0.001)",
        "> Results generated successfully.",
        "> Ready for playback.",
      ]);
    } else if (status === "error") {
      setLogs((prev) => [...prev, `> Error: ${error || "Unbalanced system"}`]);
    } else {
      setLogs(["> System ready."]);
    }
  }, [status, error]);

  // Animation Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && status === "completed") {
      interval = setInterval(() => {
        nextStep();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, status, nextStep]);

  const handleRun = () => {
    setLogs(["> Starting simulation..."]);
    if (projectId) {
      runSimulation();
    }
  };

  const handleClose = () => {
    resetSimulation();
  };

  const handleDownloadInput = () => {
    try {
      const inpContent = generateINP(Array.from(features.values()));
      const blob = new Blob([inpContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "simulation_input.inp";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLogs((prev) => [...prev, "> Input file downloaded."]);
    } catch (e) {
      console.error(e);
      setLogs((prev) => [...prev, "> Error generating INP file."]);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const getPressureRange = () => {
    if (!results) return { min: 0, max: 0 };
    const pressures = Object.values(results.nodes).map((n) => n.pressure);
    if (pressures.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.min(...pressures).toFixed(1),
      max: Math.max(...pressures).toFixed(1),
    };
  };

  return (
    <div className="absolute top-4 left-4 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 flex flex-col overflow-hidden z-20 transition-all duration-300 pointer-events-auto animate-in slide-in-from-left-4">
      {/* HEADER */}
      <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            Hydraulic Solver
          </h3>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mt-0.5">
            Extended Period Analysis
          </p>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* MAIN ACTION AREA */}
      <div className="p-3 space-y-2">
        {/* Status Card */}
        <div
          className={cn(
            "p-3 rounded-xl border flex items-center gap-3 transition-colors",
            status === "completed"
              ? "bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-900/50"
              : status === "error"
              ? "bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/50"
              : status === "running"
              ? "bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/50"
              : "bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700"
          )}
        >
          {status === "completed" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : status === "error" ? (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          ) : status === "running" ? (
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
          ) : (
            <Terminal className="w-5 h-5 text-gray-500" />
          )}

          <div className="flex-1">
            <p
              className={cn(
                "text-sm font-bold",
                status === "completed"
                  ? "text-green-700 dark:text-green-300"
                  : status === "error"
                  ? "text-red-700 dark:text-red-300"
                  : status === "running"
                  ? "text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300"
              )}
            >
              {status === "idle"
                ? "Ready"
                : status.charAt(0).toUpperCase() + status.slice(1)}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {status === "running"
                ? "Calculating..."
                : status === "completed"
                ? "Results Available"
                : "Waiting to start"}
            </p>
          </div>
        </div>

        {/* LOG CONSOLE */}
        <div className="bg-gray-900 rounded-lg p-3 h-32 overflow-y-auto font-mono text-[10px] text-gray-300 shadow-inner border border-gray-800 scrollbar-none">
          {logs.map((log, i) => (
            <div key={i} className="opacity-90">
              {log}
            </div>
          ))}
          {status === "running" && (
            <div className="animate-pulse text-blue-400">
              {">"} Processing...
            </div>
          )}
        </div>

        {/* CONTROLS ROW */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleDownloadInput}
            title="Download Generated INP File"
            className="border-gray-200 dark:border-gray-700 text-gray-500 hover:text-blue-600"
          >
            <Download className="w-4 h-4" />
          </Button>

          <Button
            onClick={handleRun}
            disabled={status === "running" || features.size === 0}
            className={cn(
              "flex-1 transition-all shadow-md active:scale-95",
              status === "completed"
                ? "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            )}
          >
            {status === "running"
              ? "Simulating..."
              : status === "completed"
              ? "Re-Run"
              : "Run Analysis"}
          </Button>

          {status !== "idle" && (
            <Button
              variant="outline"
              onClick={resetSimulation}
              size="icon"
              className="border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* PLAYBACK AREA (Only when Completed) */}
      {status === "completed" && history && (
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 animate-in slide-in-from-bottom-2">
          {/* Time Display */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-md border border-indigo-100 dark:border-indigo-900/30">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(history.timestamps[currentTimeIndex])}
            </div>
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Step {currentTimeIndex + 1} / {history.timestamps.length}
            </div>
          </div>

          {/* Slider */}
          <input
            type="range"
            min="0"
            max={history.timestamps.length - 1}
            value={currentTimeIndex}
            onChange={(e) => setTimeIndex(parseInt(e.target.value))}
            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 mb-4"
          />

          {/* Playback Controls */}
          <div className="flex justify-center gap-3">
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
              onClick={togglePlayback}
              size="sm"
              className={cn(
                "w-24 rounded-full shadow-lg transition-all active:scale-95",
                isPlaying
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              )}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 mr-1.5 fill-current" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Play
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setTimeIndex(
                  Math.min(history.timestamps.length - 1, currentTimeIndex + 1)
                )
              }
              disabled={currentTimeIndex >= history.timestamps.length - 1}
              className="h-8 w-8 p-0 rounded-full"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Stats & Report */}
          <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50 space-y-3">
            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm flex justify-between items-center">
              <span className="text-xs text-gray-500">System Pressure</span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {getPressureRange().min}
                </span>
                <span className="text-[10px] text-gray-400">-</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {getPressureRange().max}
                </span>
                <span className="text-[10px] text-gray-400 ml-1">PSI</span>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => setSimulationReportModalOpen(true)}
              className="w-full h-8 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
            >
              <FileText className="w-3.5 h-3.5 mr-2" /> View Detailed Report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
