"use client";

import { useState, useEffect } from "react";
import { Activity, TrendingUp, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNetworkStore } from "@/store/networkStore";
import { TimePattern, PumpCurve } from "@/types/network";
import { cn } from "@/lib/utils";

// Import Sub-Components
import { DataList } from "./data-manager/DataList";
import { PatternEditor } from "./data-manager/PatternEditor";
import { CurveEditor } from "./data-manager/CurveEditor";

interface PanelProps {
  isMaximized?: boolean;
}

export function DataManagerPanel({ isMaximized = false }: PanelProps) {
  const { patterns, curves, setPatterns, setCurves } = useNetworkStore();

  const [activeTab, setActiveTab] = useState<"patterns" | "curves">("patterns");
  const [localPatterns, setLocalPatterns] = useState<TimePattern[]>([]);
  const [localCurves, setLocalCurves] = useState<PumpCurve[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync Store -> Local
  useEffect(() => {
    setLocalPatterns(JSON.parse(JSON.stringify(patterns)));
    setLocalCurves(JSON.parse(JSON.stringify(curves)));
    setHasChanges(false);
  }, [patterns, curves]);

  const handleSave = () => {
    setPatterns(localPatterns);
    setCurves(localCurves);
    setHasChanges(false);
  };

  const markChanged = () => setHasChanges(true);

  // --- HANDLERS ---
  const handleAdd = () => {
    if (activeTab === "patterns") {
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
      setEditingId(newId);
    } else {
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
      setEditingId(newId);
    }
    markChanged();
  };

  const handleDelete = (id: string) => {
    if (activeTab === "patterns")
      setLocalPatterns(localPatterns.filter((p) => p.id !== id));
    else setLocalCurves(localCurves.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(null);
    markChanged();
  };

  // --- HELPERS FOR EDITORS ---
  const handlePatternUpdate = (updated: TimePattern) => {
    setLocalPatterns(
      localPatterns.map((p) => (p.id === updated.id ? updated : p))
    );
    markChanged();
  };

  const handleCurveUpdate = (updated: PumpCurve) => {
    setLocalCurves(localCurves.map((c) => (c.id === updated.id ? updated : c)));
    markChanged();
  };

  const activePattern = localPatterns.find((p) => p.id === editingId);
  const activeCurve = localCurves.find((c) => c.id === editingId);

  // --- LAYOUT LOGIC ---
  const showList = isMaximized || !editingId;
  const showEditor = isMaximized ? !!editingId : !!editingId;

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="flex flex-1 overflow-hidden">
        <div
          className={cn(
            "w-full border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50/50 dark:bg-gray-900/50",
            !isMaximized && editingId && "hidden",
            isMaximized && "w-64"
          )}
        >
          <div className="flex border-b border-r border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setActiveTab("patterns");
                setEditingId(null);
              }}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "patterns"
                  ? "border-primary text-primary bg-white"
                  : "border-transparent text-gray-500 hover:bg-gray-100"
              }`}
            >
              Patterns
            </button>
            <button
              onClick={() => {
                setActiveTab("curves");
                setEditingId(null);
              }}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "curves"
                  ? "border-primary text-primary bg-white"
                  : "border-transparent text-gray-500 hover:bg-gray-100"
              }`}
            >
              Curves
            </button>
          </div>

          {/* 1. LIST VIEW */}
          {showList && (
            <div className={cn("transition-all h-full bg-background")}>
              <DataList
                items={activeTab === "patterns" ? localPatterns : localCurves}
                selectedId={editingId}
                typeLabel={activeTab === "patterns" ? "Pattern" : "Curve"}
                onSelect={setEditingId}
                onDelete={handleDelete}
                onAdd={handleAdd}
              />
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex-1 overflow-y-auto bg-background",
            !isMaximized && !editingId && "hidden"
          )}
        >
          {/* 2. EDITOR VIEW */}
          {showEditor && (
            <div
              className={cn(
                "flex-1 p-4 overflow-hidden h-full flex flex-col",
                isMaximized ? "block" : "w-full"
              )}
            >
              {activeTab === "patterns" && activePattern && (
                <PatternEditor
                  data={activePattern}
                  isMaximized={isMaximized}
                  onChange={handlePatternUpdate}
                  onBack={() => setEditingId(null)}
                />
              )}

              {activeTab === "curves" && activeCurve && (
                <CurveEditor
                  data={activeCurve}
                  isMaximized={isMaximized}
                  onChange={handleCurveUpdate}
                  onBack={() => setEditingId(null)}
                />
              )}
            </div>
          )}

          {/* 3. EMPTY STATE (Maximized) */}
          {isMaximized && !editingId && (
            <div className="flex-1 flex flex-col items-center justify-center h-full text-slate-400">
              <p className="text-xs">Select an item to edit</p>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="p-2 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
        {hasChanges ? (
          <span className="text-[10px] text-amber-600 flex items-center gap-1 font-medium px-2 animate-pulse">
            <AlertCircle size={12} /> Unsaved Changes
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 px-2">Ready</span>
        )}
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          size="sm"
          className={cn(
            "h-7 text-xs transition-all",
            hasChanges ? "bg-primary w-24" : "bg-slate-100 text-slate-400 w-20"
          )}
        >
          <Save className="w-3 h-3 mr-1.5" /> Save
        </Button>
      </div>
    </div>
  );
}
