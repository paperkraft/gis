"use client";

import {
  Activity,
  BarChart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Droplets,
  LineChart,
  Table,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ResultExporter } from "@/lib/export/resultExporter";
import { cn } from "@/lib/utils";
import { useSimulationStore } from "@/store/simulationStore";
import { ResultChart } from "../simulation/ResultChart";

interface SimulationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportMode = "instant" | "summary";

// Metric Definitions (Matches PropertyPanel)
const NODE_METRICS = [
  { value: "pressure", label: "Pressure", unit: "psi", color: "#0ea5e9" },
  { value: "head", label: "Hydraulic Head", unit: "ft", color: "#10b981" },
  { value: "demand", label: "Demand", unit: "GPM", color: "#f59e0b" },
];

const LINK_METRICS = [
  { value: "flow", label: "Flow Rate", unit: "GPM", color: "#8b5cf6" },
  { value: "velocity", label: "Velocity", unit: "ft/s", color: "#ec4899" },
];

export function SimulationReportModal({
  isOpen,
  onClose,
}: SimulationReportModalProps) {
  const { results, history, currentTimeIndex, setTimeIndex } =
    useSimulationStore();

  // Hooks
  const [activeTab, setActiveTab] = useState<"nodes" | "links">("nodes");
  const [reportMode, setReportMode] = useState<ReportMode>("instant");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Chart Selection State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<string>("");

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset selection on tab change
  useEffect(() => {
    setSelectedId(null);
  }, [activeTab]);

  // Set default metric when an item is selected
  useEffect(() => {
    if (selectedId) {
      if (
        activeTab === "nodes" &&
        !NODE_METRICS.find((m) => m.value === chartMetric)
      ) {
        setChartMetric("pressure");
      } else if (
        activeTab === "links" &&
        !LINK_METRICS.find((m) => m.value === chartMetric)
      ) {
        setChartMetric("flow");
      }
    }
  }, [selectedId, activeTab, chartMetric]);

  // Format time
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  // Memoized Summary Data
  const summaryData = useMemo(() => {
    if (reportMode !== "summary" || !history || history.snapshots.length === 0)
      return null;

    const nodeStats: Record<
      string,
      { minPres: number; maxPres: number; avgPres: number }
    > = {};
    const linkStats: Record<string, { maxFlow: number; maxVel: number }> = {};
    const firstSnap = history.snapshots[0];

    // Init
    Object.values(firstSnap.nodes).forEach((n) => {
      nodeStats[n.id] = {
        minPres: n.pressure,
        maxPres: n.pressure,
        avgPres: 0,
      };
    });
    Object.values(firstSnap.links).forEach((l) => {
      linkStats[l.id] = { maxFlow: Math.abs(l.flow), maxVel: l.velocity };
    });

    // Accumulate
    history.snapshots.forEach((snap) => {
      Object.values(snap.nodes).forEach((n) => {
        const s = nodeStats[n.id];
        if (s) {
          s.minPres = Math.min(s.minPres, n.pressure);
          s.maxPres = Math.max(s.maxPres, n.pressure);
          s.avgPres += n.pressure;
        }
      });
      Object.values(snap.links).forEach((l) => {
        const s = linkStats[l.id];
        if (s) {
          s.maxFlow = Math.max(s.maxFlow, Math.abs(l.flow));
          s.maxVel = Math.max(s.maxVel, l.velocity);
        }
      });
    });

    // Average
    const count = history.snapshots.length;
    Object.values(nodeStats).forEach((s) => (s.avgPres /= count));

    return { nodes: nodeStats, links: linkStats };
  }, [history, reportMode]);

  // Export Handlers
  const handleExportCurrent = () => {
    if (results) {
      ResultExporter.exportSnapshotCSV(results);
      setShowExportMenu(false);
    }
  };

  const handleExportAll = () => {
    if (history) {
      ResultExporter.exportHistoryCSV(history);
      setShowExportMenu(false);
    }
  };

  if (!isOpen || !results || !history) return null;

  const getValueColor = (value: number, type: "pressure" | "velocity") => {
    if (type === "pressure") {
      if (value < 20) return "text-red-600 font-bold";
      if (value > 100) return "text-orange-600 font-bold";
      return "text-green-600";
    }
    if (type === "velocity") {
      if (value > 5) return "text-red-600 font-bold";
      if (value < 0.5) return "text-orange-600 font-bold";
      return "text-green-600";
    }
    return "text-gray-900 dark:text-gray-300";
  };

  const currentNodeList = Object.values(results.nodes);
  const currentLinkList = Object.values(results.links);

  // Helper for Chart Data
  const currentMetricOptions =
    activeTab === "nodes" ? NODE_METRICS : LINK_METRICS;
  const activeMetricConfig =
    currentMetricOptions.find((m) => m.value === chartMetric) ||
    currentMetricOptions[0];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-xl shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Table className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Simulation Report
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{history.snapshots.length} Time Steps</span>
                  <span>•</span>
                  <span>
                    Duration:{" "}
                    {formatTime(
                      history.timestamps[history.timestamps.length - 1]
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* --- EXPORT BUTTON --- */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Results
                  <ChevronDown className="w-3 h-3 opacity-80" />
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                    <div className="p-1">
                      <button
                        onClick={handleExportCurrent}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                      >
                        Current Time Step ({formatTime(results.timeStep)})
                      </button>
                      <button
                        onClick={handleExportAll}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                      >
                        Full Report (All Steps)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setReportMode("instant")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    reportMode === "instant"
                      ? "bg-white dark:bg-gray-600 text-indigo-600 shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                  )}
                >
                  Time Step
                </button>
                <button
                  onClick={() => setReportMode("summary")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    reportMode === "summary"
                      ? "bg-white dark:bg-gray-600 text-indigo-600 shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                  )}
                >
                  Summary
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* CONTROLS & TABLE */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between shrink-0">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("nodes")}
              className={cn(
                "pb-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                activeTab === "nodes"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <Activity className="w-4 h-4" />
              Nodes
              <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                {currentNodeList.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("links")}
              className={cn(
                "pb-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                activeTab === "links"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <Droplets className="w-4 h-4" />
              Links
              <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                {currentLinkList.length}
              </span>
            </button>
          </div>

          {reportMode === "instant" && (
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setTimeIndex(Math.max(0, currentTimeIndex - 1))}
                disabled={currentTimeIndex <= 0}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 min-w-20 justify-center text-sm font-mono font-medium text-indigo-700 dark:text-indigo-300">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(history.timestamps[currentTimeIndex])}
              </div>

              <button
                onClick={() =>
                  setTimeIndex(
                    Math.min(
                      history.timestamps.length - 1,
                      currentTimeIndex + 1
                    )
                  )
                }
                disabled={currentTimeIndex >= history.timestamps.length - 1}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {reportMode === "summary" && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <BarChart className="w-4 h-4" />
              <span>Aggregated over 24h</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-100 dark:bg-gray-900 sticky top-0 z-10 shadow-xs">
              {activeTab === "nodes" ? (
                <tr>
                  <th className="px-6 py-3 w-32">Node ID</th>
                  {reportMode === "instant" ? (
                    <>
                      <th className="px-6 py-3">Demand (GPM)</th>
                      <th className="px-6 py-3">Head (ft)</th>
                      <th className="px-6 py-3">Pressure (psi)</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3">Min Pressure</th>
                      <th className="px-6 py-3">Max Pressure</th>
                      <th className="px-6 py-3">Avg Pressure</th>
                    </>
                  )}
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-3 w-32">Link ID</th>
                  <th className="px-6 py-3">Status</th>
                  {reportMode === "instant" ? (
                    <>
                      <th className="px-6 py-3">Flow (GPM)</th>
                      <th className="px-6 py-3">Velocity (fps)</th>
                      <th className="px-6 py-3">Headloss</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3">Max Flow</th>
                      <th className="px-6 py-3">Max Velocity</th>
                      <th className="px-6 py-3">Peak Status</th>
                    </>
                  )}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {activeTab === "nodes" &&
                currentNodeList.map((node) => {
                  const stats = summaryData?.nodes[node.id];
                  const isSelected = selectedId === node.id;
                  return (
                    <tr
                      key={node.id}
                      onClick={() => setSelectedId(node.id)}
                      className="bg-white dark:bg-gray-800 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors"
                    >
                      <td className="px-6 py-3 font-semibold text-gray-900 dark:text-white border-r border-gray-100 dark:border-gray-700">
                        {node.id}
                      </td>
                      {reportMode === "instant" ? (
                        <>
                          <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                            {node.demand.toFixed(2)}
                          </td>
                          <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                            {node.head.toFixed(2)}
                          </td>
                          <td
                            className={`px-6 py-3 font-mono ${getValueColor(
                              node.pressure,
                              "pressure"
                            )}`}
                          >
                            {node.pressure.toFixed(2)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td
                            className={`px-6 py-3 font-mono ${getValueColor(
                              stats?.minPres || 0,
                              "pressure"
                            )}`}
                          >
                            {stats?.minPres.toFixed(2)}
                          </td>
                          <td
                            className={`px-6 py-3 font-mono ${getValueColor(
                              stats?.maxPres || 0,
                              "pressure"
                            )}`}
                          >
                            {stats?.maxPres.toFixed(2)}
                          </td>
                          <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                            {stats?.avgPres.toFixed(2)}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              {activeTab === "links" &&
                currentLinkList.map((link) => {
                  const stats = summaryData?.links[link.id];
                  const isSelected = selectedId === link.id;
                  return (
                    <tr
                      key={link.id}
                      onClick={() => setSelectedId(link.id)}
                      className="bg-white dark:bg-gray-800 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors"
                    >
                      <td className="px-6 py-3 font-semibold text-gray-900 dark:text-white border-r border-gray-100 dark:border-gray-700">
                        {link.id}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${
                            link.status === "Open"
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {link.status}
                        </span>
                      </td>
                      {reportMode === "instant" ? (
                        <>
                          <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                            {Math.abs(link.flow).toFixed(2)}
                          </td>
                          <td
                            className={`px-6 py-3 font-mono ${getValueColor(
                              link.velocity,
                              "velocity"
                            )}`}
                          >
                            {link.velocity.toFixed(2)}
                          </td>
                          <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                            {link.headloss.toFixed(4)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-3 font-mono text-gray-700 dark:text-gray-300 font-bold">
                            {stats?.maxFlow.toFixed(2)}
                          </td>
                          <td
                            className={`px-6 py-3 font-mono ${getValueColor(
                              stats?.maxVel || 0,
                              "velocity"
                            )}`}
                          >
                            {stats?.maxVel.toFixed(2)}
                          </td>
                          <td className="px-6 py-3 text-gray-400 text-xs italic">
                            -
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* --- CHART PANEL (Visible when Row Selected) --- */}
        {selectedId && (
          <div className="shrink-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 animate-in slide-in-from-bottom-10 duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-indigo-500" />
                  Performance Analysis:{" "}
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {selectedId}
                  </span>
                </h3>

                {/* Metric Selector */}
                <div className="flex items-center bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-0.5">
                  {currentMetricOptions.map((metric) => (
                    <button
                      key={metric.value}
                      onClick={() => setChartMetric(metric.value)}
                      className={cn(
                        "px-2 py-1 text-[10px] uppercase font-bold rounded transition-all",
                        chartMetric === metric.value
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                          : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                      )}
                    >
                      {metric.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setSelectedId(null)}
              >
                <XCircle className="w-4 h-4 text-gray-400 hover:text-red-500" />
              </Button>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
              <ResultChart
                key={`${selectedId}-${chartMetric}`} // Force re-render
                featureId={selectedId}
                type={activeTab === "nodes" ? "node" : "link"}
                history={history}
                dataType={activeMetricConfig.value as any}
                color={activeMetricConfig.color}
                unit={activeMetricConfig.unit}
                activeIndex={currentTimeIndex}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-900 rounded-b-xl shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close Report
          </Button>
        </div>
      </div>
    </div>
  );
}
