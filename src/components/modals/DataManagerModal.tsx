"use client";

import { useState, useEffect } from "react";
import { X, Activity, Plus, Trash2, Save } from "lucide-react";
import { useNetworkStore } from "@/store/networkStore";
import { Button } from "@/components/ui/button";
import { TimePattern, PumpCurve } from "@/types/network";

interface DataManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DataManagerModal({ isOpen, onClose }: DataManagerModalProps) {
  // Store Access
  const storePatterns = useNetworkStore((state) => state.patterns);
  const storeCurves = useNetworkStore((state) => state.curves);
  const setPatterns = useNetworkStore((state) => state.setPatterns);
  const setCurves = useNetworkStore((state) => state.setCurves);

  // Local State (Buffers)
  const [localPatterns, setLocalPatterns] = useState<TimePattern[]>([]);
  const [localCurves, setLocalCurves] = useState<PumpCurve[]>([]);
  const [activeTab, setActiveTab] = useState<"patterns" | "curves">("patterns");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load data when opening
  useEffect(() => {
    if (isOpen) {
      setLocalPatterns(JSON.parse(JSON.stringify(storePatterns))); // Deep copy
      setLocalCurves(JSON.parse(JSON.stringify(storeCurves)));
      setHasChanges(false);
      setSelectedId(null);
    }
  }, [isOpen, storePatterns, storeCurves]);

  if (!isOpen) return null;

  // --- ACTIONS (Local) ---

  const handleSave = () => {
    setPatterns(localPatterns);
    setCurves(localCurves);
    setHasChanges(false);
    onClose();
  };

  const markChanged = () => setHasChanges(true);

  const handleAddPattern = () => {
    let idCounter = localPatterns.length + 1;
    let newId = idCounter.toString();
    while (localPatterns.find((p) => p.id === newId)) {
      idCounter++;
      newId = idCounter.toString();
    }

    const newPattern: TimePattern = {
      id: newId,
      description: "New Pattern",
      multipliers: Array(24).fill(1.0),
    };
    setLocalPatterns([...localPatterns, newPattern]);
    setSelectedId(newId);
    markChanged();
  };

  const handleAddCurve = () => {
    let idCounter = localCurves.length + 1;
    let newId = `C-${idCounter}`;
    while (localCurves.find((c) => c.id === newId)) {
      idCounter++;
      newId = `C-${idCounter}`;
    }

    const newCurve: PumpCurve = {
      id: newId,
      description: "New Pump Curve",
      type: "PUMP",
      points: [{ x: 0, y: 100 }],
    };
    setLocalCurves([...localCurves, newCurve]);
    setSelectedId(newId);
    markChanged();
  };

  const handleDelete = (id: string) => {
    if (activeTab === "patterns") {
      setLocalPatterns(localPatterns.filter((p) => p.id !== id));
    } else {
      setLocalCurves(localCurves.filter((c) => c.id !== id));
    }
    if (selectedId === id) setSelectedId(null);
    markChanged();
  };

  const updateLocalPattern = (id: string, updated: TimePattern) => {
    setLocalPatterns(localPatterns.map((p) => (p.id === id ? updated : p)));
    markChanged();
  };

  const updateLocalCurve = (id: string, updated: PumpCurve) => {
    setLocalCurves(localCurves.map((c) => (c.id === id ? updated : c)));
    markChanged();
  };

  // --- RENDERERS ---

  const renderPatternEditor = () => {
    const pattern = localPatterns.find((p) => p.id === selectedId);
    if (!pattern)
      return (
        <div className="text-gray-400 text-center mt-20">
          Select a pattern to edit
        </div>
      );

    const updateVal = (idx: number, val: string) => {
      const newMultipliers = [...pattern.multipliers];
      newMultipliers[idx] = parseFloat(val) || 0;
      updateLocalPattern(pattern.id, {
        ...pattern,
        multipliers: newMultipliers,
      });
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex gap-4">
          <div className="w-1/4">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              ID
            </label>
            <input
              value={pattern.id}
              onChange={(e) => {
                // Handle ID rename (complex logic skipped for brevity, keeping simple update)
                // Ideally check duplicates here.
                updateLocalPattern(pattern.id, {
                  ...pattern,
                  id: e.target.value,
                });
                setSelectedId(e.target.value);
              }}
              className="w-full px-3 py-2 border rounded-md font-mono bg-gray-50"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              Description
            </label>
            <input
              value={pattern.description}
              onChange={(e) =>
                updateLocalPattern(pattern.id, {
                  ...pattern,
                  description: e.target.value,
                })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase mb-3">
            Multipliers (24 Hours)
          </label>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {pattern.multipliers.map((val, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-400 text-center font-mono">
                  {idx.toString().padStart(2, "0")}:00
                </span>
                <div className="relative group">
                  <input
                    type="number"
                    step="0.1"
                    value={val}
                    onChange={(e) => updateVal(idx, e.target.value)}
                    className="w-full px-1 py-1 text-sm text-center border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none z-10 relative bg-transparent"
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 rounded-b-md overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full"
                      style={{ width: `${Math.min(val * 50, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCurveEditor = () => {
    const curve = localCurves.find((c) => c.id === selectedId);
    if (!curve)
      return (
        <div className="text-gray-400 text-center mt-20">
          Select a curve to edit
        </div>
      );

    const updatePoint = (idx: number, field: "x" | "y", val: string) => {
      const newPoints = [...curve.points];
      newPoints[idx] = { ...newPoints[idx], [field]: parseFloat(val) || 0 };
      updateLocalCurve(curve.id, { ...curve, points: newPoints });
    };

    const addPoint = () => {
      updateLocalCurve(curve.id, {
        ...curve,
        points: [...curve.points, { x: 0, y: 0 }],
      });
    };

    const removePoint = (idx: number) => {
      const newPoints = curve.points.filter((_, i) => i !== idx);
      updateLocalCurve(curve.id, { ...curve, points: newPoints });
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex gap-4">
          <div className="w-1/4">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              ID
            </label>
            <input
              value={curve.id}
              onChange={(e) => {
                updateLocalCurve(curve.id, { ...curve, id: e.target.value });
                setSelectedId(e.target.value);
              }}
              className="w-full px-3 py-2 border rounded-md font-mono bg-gray-50"
            />
          </div>
          <div className="w-1/4">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              Type
            </label>
            <select
              value={curve.type}
              onChange={(e) =>
                updateLocalCurve(curve.id, {
                  ...curve,
                  type: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border rounded-md bg-white"
            >
              <option value="PUMP">Pump (H-Q)</option>
              <option value="VOLUME">Volume</option>
              <option value="HEADLOSS">Headloss</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              Description
            </label>
            <input
              value={curve.description}
              onChange={(e) =>
                updateLocalCurve(curve.id, {
                  ...curve,
                  description: e.target.value,
                })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-xs font-medium text-gray-500 uppercase">
              Data Points (Flow vs Head)
            </label>
            <Button
              size="sm"
              variant="outline"
              onClick={addPoint}
              className="h-7 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" /> Add Point
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Flow (X)</th>
                  <th className="px-4 py-2 font-medium">Head (Y)</th>
                  <th className="px-4 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {curve.points.map((pt, idx) => (
                  <tr key={idx} className="group hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={pt.x}
                        onChange={(e) => updatePoint(idx, "x", e.target.value)}
                        className="w-full bg-transparent outline-none focus:text-indigo-600 font-mono"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={pt.y}
                        onChange={(e) => updatePoint(idx, "y", e.target.value)}
                        className="w-full bg-transparent outline-none focus:text-indigo-600 font-mono"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => removePoint(idx)}
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" /> Data Manager
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setActiveTab("patterns");
                  setSelectedId(null);
                }}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "patterns"
                    ? "border-indigo-600 text-indigo-600 bg-white"
                    : "border-transparent text-gray-500 hover:bg-gray-100"
                }`}
              >
                Patterns
              </button>
              <button
                onClick={() => {
                  setActiveTab("curves");
                  setSelectedId(null);
                }}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "curves"
                    ? "border-indigo-600 text-indigo-600 bg-white"
                    : "border-transparent text-gray-500 hover:bg-gray-100"
                }`}
              >
                Curves
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {activeTab === "patterns"
                ? localPatterns.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm flex justify-between items-center group transition-colors ${
                        selectedId === p.id
                          ? "bg-indigo-100 text-indigo-700"
                          : "hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      <span className="truncate flex-1 font-mono">
                        {p.id}{" "}
                        <span className="font-sans opacity-80 text-xs ml-2">
                          {p.description}
                        </span>
                      </span>
                      <span
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ))
                : localCurves.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm flex justify-between items-center group transition-colors ${
                        selectedId === c.id
                          ? "bg-indigo-100 text-indigo-700"
                          : "hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      <span className="truncate flex-1 font-mono">
                        {c.id}{" "}
                        <span className="font-sans opacity-80 text-xs ml-2">
                          {c.description}
                        </span>
                      </span>
                      <span
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(c.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ))}
            </div>
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={
                  activeTab === "patterns" ? handleAddPattern : handleAddCurve
                }
                className="w-full gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm"
                variant="outline"
              >
                <Plus className="w-4 h-4" /> Add New
              </Button>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-y-auto bg-white dark:bg-gray-800">
            {activeTab === "patterns"
              ? renderPatternEditor()
              : renderCurveEditor()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" /> Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
