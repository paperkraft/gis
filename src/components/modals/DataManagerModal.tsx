"use client";

import { useState } from "react";
import { X, Activity, TrendingUp, Plus, Trash2 } from "lucide-react";
import { useNetworkStore } from "@/store/networkStore";
import { Button } from "@/components/ui/button";
import { TimePattern } from "@/types/network";

interface DataManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DataManagerModal({ isOpen, onClose }: DataManagerModalProps) {
  const { patterns, curves, addPattern, deletePattern, updatePattern } =
    useNetworkStore();
  const [activeTab, setActiveTab] = useState<"patterns" | "curves">("patterns");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const activePattern = patterns.find((p) => p.id === selectedId);

  const handleAddPattern = () => {
    const newId = (patterns.length + 1).toString();
    addPattern({
      id: newId,
      description: "New Pattern",
      multipliers: Array(24).fill(1.0),
    });
    setSelectedId(newId);
  };

  const handleMultiplierChange = (index: number, val: string) => {
    if (!activePattern) return;
    const newMultipliers = [...activePattern.multipliers];
    newMultipliers[index] = parseFloat(val) || 0;
    updatePattern(activePattern.id, {
      ...activePattern,
      multipliers: newMultipliers,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between bg-gray-50 dark:bg-gray-900 rounded-t-xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Data Manager
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900/50">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab("patterns")}
                className={`flex-1 py-3 text-sm font-medium ${
                  activeTab === "patterns"
                    ? "bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500"
                }`}
              >
                Patterns
              </button>
              <button
                onClick={() => setActiveTab("curves")}
                className={`flex-1 py-3 text-sm font-medium ${
                  activeTab === "curves"
                    ? "bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500"
                }`}
              >
                Curves
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {activeTab === "patterns" &&
                patterns.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex justify-between group ${
                      selectedId === p.id
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span>
                      <strong>{p.id}</strong> - {p.description}
                    </span>
                    <span
                      className="opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePattern(p.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </span>
                  </button>
                ))}
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={handleAddPattern}
                className="w-full gap-2"
                variant="outline"
              >
                <Plus className="w-4 h-4" /> Add Pattern
              </Button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-gray-800">
            {activeTab === "patterns" && activePattern ? (
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ID
                    </label>
                    <input
                      value={activePattern.id}
                      onChange={(e) =>
                        updatePattern(activePattern.id, {
                          ...activePattern,
                          id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div className="flex-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <input
                      value={activePattern.description}
                      onChange={(e) =>
                        updatePattern(activePattern.id, {
                          ...activePattern,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Multipliers (00:00 - 23:00)
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {activePattern.multipliers.map((val, idx) => (
                      <div key={idx} className="flex flex-col gap-1">
                        <span className="text-[10px] text-gray-500 font-mono text-center">
                          {idx}:00
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          value={val}
                          onChange={(e) =>
                            handleMultiplierChange(idx, e.target.value)
                          }
                          className="px-2 py-1 text-sm border rounded-md text-center focus:ring-2 focus:ring-blue-500"
                        />
                        {/* Simple Bar Visualization */}
                        <div className="h-12 bg-gray-100 rounded-b-sm flex items-end justify-center overflow-hidden">
                          <div
                            className="w-full bg-blue-500/50"
                            style={{ height: `${Math.min(val * 30, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                Select an item to edit
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
