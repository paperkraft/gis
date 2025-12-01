"use client";

import { useState } from "react";
import { X, Table, Activity, Droplets } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";

interface SimulationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SimulationReportModal({
  isOpen,
  onClose,
}: SimulationReportModalProps) {
  const { results } = useSimulationStore();
  const [activeTab, setActiveTab] = useState<"nodes" | "links">("nodes");

  if (!isOpen || !results) return null;

  const nodes = Object.values(results.nodes);
  const links = Object.values(results.links);

  // Helper for color coding values
  const getValueColor = (value: number, type: "pressure" | "velocity") => {
    if (type === "pressure") {
      if (value < 20) return "text-red-600 font-bold";
      if (value > 100) return "text-orange-600 font-bold";
      return "text-green-600";
    }
    if (type === "velocity") {
      if (value > 3) return "text-red-600 font-bold";
      if (value < 0.1) return "text-orange-600 font-bold";
      return "text-green-600";
    }
    return "text-gray-900";
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-t-xl shrink-0">
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Simulation Report
              </h2>
              <p className="text-xs text-gray-500">
                {new Date(results.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <button
            onClick={() => setActiveTab("nodes")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === "nodes"
                ? "border-indigo-500 text-indigo-600 bg-indigo-50/50"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Activity className="w-4 h-4" />
            Nodes ({nodes.length})
          </button>
          <button
            onClick={() => setActiveTab("links")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === "links"
                ? "border-blue-500 text-blue-600 bg-blue-50/50"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Droplets className="w-4 h-4" />
            Links ({links.length})
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-auto p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
              {activeTab === "nodes" ? (
                <tr>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Elevation (ft)</th>
                  <th className="px-6 py-3">Demand (GPM)</th>
                  <th className="px-6 py-3">Head (ft)</th>
                  <th className="px-6 py-3">Pressure (psi)</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Flow (GPM)</th>
                  <th className="px-6 py-3">Velocity (fps)</th>
                  <th className="px-6 py-3">Headloss (ft/kft)</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {activeTab === "nodes"
                ? nodes.map((node) => (
                    <tr
                      key={node.id}
                      className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">
                        {node.id}
                      </td>
                      {/* Note: We don't have elevation in results, normally you'd merge with static props */}
                      <td className="px-6 py-3 text-gray-500">-</td>
                      <td className="px-6 py-3 text-gray-500">
                        {node.demand.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {node.head.toFixed(2)}
                      </td>
                      <td
                        className={`px-6 py-3 ${getValueColor(
                          node.pressure,
                          "pressure"
                        )}`}
                      >
                        {node.pressure.toFixed(2)}
                      </td>
                    </tr>
                  ))
                : links.map((link) => (
                    <tr
                      key={link.id}
                      className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">
                        {link.id}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            link.status === "Open"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {link.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {link.flow.toFixed(2)}
                      </td>
                      <td
                        className={`px-6 py-3 ${getValueColor(
                          link.velocity,
                          "velocity"
                        )}`}
                      >
                        {link.velocity.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {link.headloss.toFixed(4)}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-b-xl">
          <span className="text-xs text-gray-500">
            {activeTab === "nodes"
              ? `${nodes.length} nodes`
              : `${links.length} links`}{" "}
            loaded
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 text-gray-700"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
