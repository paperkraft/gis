"use client";

import { useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  Activity,
  Clock,
  ChevronRight,
  ChevronLeft,
  FileText,
} from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";

export function SimulationPanel() {
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
    runSimulation(Array.from(features.values()));
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
    <div className="absolute top-4 left-4 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden z-20 transition-all duration-300 pointer-events-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-linear-to-r from-indigo-500 to-purple-600">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Hydraulic Simulation
        </h3>
        <p className="text-indigo-100 text-xs mt-1">Extended Period Analysis</p>
      </div>

      {/* Main Controls */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <Button
            onClick={handleRun}
            disabled={status === "running" || features.size === 0}
            className={`flex-1 ${
              status === "completed"
                ? "bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {status === "running"
              ? "Simulating..."
              : status === "completed"
              ? "Re-Run Analysis"
              : "Run Analysis"}
          </Button>

          {status !== "idle" && (
            <Button
              variant="outline"
              onClick={resetSimulation}
              size="icon"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4 text-gray-600" />
            </Button>
          )}
        </div>

        {status === "error" && (
          <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Time Series Controls */}
      {status === "completed" && history && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
              <Clock className="w-4 h-4 text-indigo-500" />
              {formatTime(history.timestamps[currentTimeIndex])}
            </div>
            <div className="text-xs text-gray-500 font-mono">
              Step {currentTimeIndex + 1} / {history.timestamps.length}
            </div>
          </div>

          <input
            type="range"
            min="0"
            max={history.timestamps.length - 1}
            value={currentTimeIndex}
            onChange={(e) => setTimeIndex(parseInt(e.target.value))}
            disabled={history.timestamps.length <= 1}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mb-4 disabled:opacity-50"
          />

          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTimeIndex(Math.max(0, currentTimeIndex - 1))}
              disabled={currentTimeIndex <= 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Button
              onClick={togglePlayback}
              disabled={history.timestamps.length <= 1}
              className={`w-24 ${
                isPlaying
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" /> Play
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setTimeIndex(
                  Math.min(history.timestamps.length - 1, currentTimeIndex + 1)
                )
              }
              disabled={currentTimeIndex >= history.timestamps.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {status === "completed" && results && (
        <div className="p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/50 flex-1 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-xs">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500 uppercase font-semibold">
                System Pressure
              </span>
              <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                PSI
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-xl font-bold text-gray-800 dark:text-white">
                {getPressureRange().min}
              </span>
              <span className="text-xs text-gray-400 mb-1 mx-1">to</span>
              <span className="text-xl font-bold text-gray-800 dark:text-white">
                {getPressureRange().max}
              </span>
            </div>
          </div>

          {/* RESTORED: Detailed Report Button */}
          <button
            onClick={() => setSimulationReportModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 mt-2 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <FileText className="w-3 h-3" />
            View Detailed Report
          </button>
        </div>
      )}
    </div>
  );
}
