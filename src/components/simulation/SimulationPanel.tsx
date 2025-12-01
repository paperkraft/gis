"use client";

import {
  Play,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Activity,
  BarChart3,
  Droplets,
} from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useNetworkStore } from "@/store/networkStore";
import { Button } from "@/components/ui/button";

export function SimulationPanel() {
  const { features } = useNetworkStore();
  const { status, results, error, runSimulation, resetSimulation } =
    useSimulationStore();

  const handleRun = () => {
    const featureList = Array.from(features.values());
    runSimulation(featureList);
  };

  const getNodeCount = () => Object.keys(results?.nodes || {}).length;
  const getLinkCount = () => Object.keys(results?.links || {}).length;

  // Helper to get ranges
  const getPressureRange = () => {
    if (!results) return { min: 0, max: 0 };
    const pressures = Object.values(results.nodes).map((n) => n.pressure);
    return {
      min: Math.min(...pressures).toFixed(1),
      max: Math.max(...pressures).toFixed(1),
    };
  };

  return (
    <div className="absolute top-4 left-4 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden z-20">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-linear-to-r from-indigo-500 to-purple-600">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Hydraulic Simulation
        </h3>
        <p className="text-indigo-100 text-xs mt-1">Static Analysis Engine</p>
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <Button
            onClick={handleRun}
            disabled={status === "running" || features.size === 0}
            className={`flex-1 ${
              status === "completed"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {status === "running" ? (
              <>Running...</>
            ) : status === "completed" ? (
              <>
                <Play className="w-4 h-4 mr-2" /> Re-Run
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" /> Run Analysis
              </>
            )}
          </Button>

          {status !== "idle" && (
            <Button variant="outline" onClick={resetSimulation} size="icon">
              <RotateCcw className="w-4 h-4 text-gray-600" />
            </Button>
          )}
        </div>

        {/* Status Message */}
        {status === "error" && (
          <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results */}
      {status === "completed" && results && (
        <div className="p-0 overflow-y-auto max-h-[60vh]">
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Simulation Successful
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                  Nodes
                </div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {getNodeCount()}
                </div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
                <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1">
                  Links
                </div>
                <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                  {getLinkCount()}
                </div>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                System Metrics
              </h4>

              {/* Pressure */}
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-xs">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-500">System Pressure</span>
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                    PSI
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-lg font-semibold">
                    {getPressureRange().min}
                  </span>
                  <span className="text-xs text-gray-400 mb-1">to</span>
                  <span className="text-lg font-semibold">
                    {getPressureRange().max}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{ width: "75%" }}
                  ></div>
                </div>
              </div>

              {/* Flow Stats */}
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-xs">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-500">Flow Status</span>
                  <Droplets className="w-3 h-3 text-cyan-500" />
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-green-600">100%</span>
                  <span className="text-gray-500 ml-1">Converged</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4">
            <button className="w-full py-2 text-xs text-center text-gray-500 hover:text-gray-800 hover:underline">
              View Detailed Report
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {status === "idle" && (
        <div className="p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
            <Activity className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">
            Ready to simulate.
            <br />
            Click "Run Analysis" to begin.
          </p>
        </div>
      )}
    </div>
  );
}
