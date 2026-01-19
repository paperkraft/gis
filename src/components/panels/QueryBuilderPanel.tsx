"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  X,
  Filter,
  Play,
  RefreshCw,
  Trash2,
  GripHorizontal,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNetworkStore } from "@/store/networkStore";
import { useSimulationStore } from "@/store/simulationStore";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { TABLE_CONFIG } from "@/config/attributeColumns";
import { useMapStore } from "@/store/mapStore";

// --- TYPES ---
type Operator = ">" | "<" | "=" | ">=" | "<=" | "!=";

interface QueryRule {
  id: string;
  field: string;
  operator: Operator;
  value: string;
}

export function QueryBuilderPanel() {
  // STORES
  const { features, selectFeatures } = useNetworkStore();
  const { results, status: simStatus } = useSimulationStore();
  const { activeModal } = useUIStore();
  const map = useMapStore((state) => state.map);

  // STATE
  const [targetType, setTargetType] = useState<string>("pipe");
  const [rules, setRules] = useState<QueryRule[]>([
    { id: "1", field: "diameter", operator: ">", value: "100" },
  ]);
  const [matchCount, setMatchCount] = useState<number | null>(null);

  // VISIBILITY CHECK
  if (activeModal !== "QUERY_BUILDER") return null;

  // --- QUERY ENGINE ---
  const availableFields = useMemo(() => {
    return TABLE_CONFIG[targetType] || [];
  }, [targetType]);

  const executeQuery = (dryRun = false) => {
    const matches: string[] = [];

    // Get features of the target type
    const candidates = Array.from(features.values()).filter(
      (f) => f.getProperties().type === targetType
    );

    candidates.forEach((f) => {
      const id = f.getId() as string;
      const props = f.getProperties();

      // Merge Results if available
      let combinedData = { ...props };
      if (simStatus === "completed" && results) {
        const res = ["junction", "tank", "reservoir"].includes(targetType)
          ? results.nodes[id]
          : results.links[id];
        if (res) combinedData = { ...combinedData, ...res };
      }

      // Check ALL rules (AND logic)
      const isMatch = rules.every((rule) => {
        const val = combinedData[rule.field];
        const target = parseFloat(rule.value);
        const actual = parseFloat(val);

        if (isNaN(target) || isNaN(actual)) return false; // Simple numeric check for now

        switch (rule.operator) {
          case ">":
            return actual > target;
          case "<":
            return actual < target;
          case "=":
            return actual === target;
          case ">=":
            return actual >= target;
          case "<=":
            return actual <= target;
          case "!=":
            return actual !== target;
            return false;
        }
      });

      if (isMatch) matches.push(id);
    });

    setMatchCount(matches.length);

    if (!dryRun) {
      //   matches.forEach(id => selectFeature(id));
      selectFeatures(matches);

      // Optional: Zoom to extent of matches
      if (matches.length > 0) {
        if (map) {
          const firstFeature = features.get(matches[0]);
          const extent = firstFeature?.getGeometry()?.getExtent().slice();
          if (extent) {
            matches.forEach((id) => {
              const f = features.get(id);
              const geom = f?.getGeometry();
              if (geom) {
                const e = geom.getExtent();
                import("ol/extent").then(({ extend }) => extend(extent, e));
              }
            });

            map.getView().fit(extent, {
              padding: [100, 100, 100, 100],
              duration: 800,
              maxZoom: 16,
            });
          }
        }
      }
    } else {
      selectFeatures([]);
    }
  };

  // --- UI HANDLERS ---
  const addRule = () => {
    setRules([
      ...rules,
      {
        id: Math.random().toString(),
        field: availableFields[0]?.key || "id",
        operator: ">",
        value: "",
      },
    ]);
  };

  const removeRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const updateRule = (id: string, key: keyof QueryRule, val: string) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
    setMatchCount(null); // Reset count on change
  };

  return (
    <div>
      {/*  BODY */}
      <div className="p-4 space-y-4">
        {/* Target Selection */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">
            Find
          </label>
          <select
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value);
              setMatchCount(null);
            }}
            className="w-full text-sm border border-slate-300 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-primary outline-none bg-slate-50"
          >
            <option value="junction">Junctions</option>
            <option value="pipe">Pipes</option>
            <option value="tank">Tanks</option>
            <option value="reservoir">Reservoirs</option>
            <option value="pump">Pumps</option>
            <option value="valve">Valves</option>
          </select>
        </div>

        {/* Rules List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              Where
            </label>
            <button
              onClick={() => setRules([])}
              className="text-[10px] text-destructive hover:underline"
            >
              Clear
            </button>
          </div>

          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex gap-1 items-center animate-in slide-in-from-left-2 duration-200"
            >
              {/* Field */}
              <select
                value={rule.field}
                onChange={(e) => updateRule(rule.id, "field", e.target.value)}
                className="w-28 text-xs border border-slate-300 rounded px-1.5 py-1.5 focus:border-primary outline-none"
              >
                {availableFields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>

              {/* Operator */}
              <select
                value={rule.operator}
                onChange={(e) =>
                  updateRule(rule.id, "operator", e.target.value as Operator)
                }
                className="w-14 text-xs border border-slate-300 rounded px-1 py-1.5 bg-slate-50 text-center font-mono focus:border-primary outline-none"
              >
                <option>{">"}</option>
                <option>{"<"}</option>
                <option>{"="}</option>
                <option>{">="}</option>
                <option>{"<="}</option>
              </select>

              {/* Value */}
              <input
                type="text"
                value={rule.value}
                onChange={(e) => updateRule(rule.id, "value", e.target.value)}
                className="flex-1 min-w-0 text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-primary outline-none"
                placeholder="Val"
              />

              {/* Delete */}
              <button
                onClick={() => removeRule(rule.id)}
                className="text-slate-400 hover:text-destructive p-1"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={addRule}
            className="w-full text-xs h-7 border-dashed border-slate-300 text-slate-500 hover:text-primary hover:border-blue-300"
          >
            + Add Condition
          </Button>
        </div>

        {/* Result Preview */}
        {matchCount !== null && (
          <div
            className={cn(
              "text-xs text-center py-2 rounded font-medium flex items-center justify-center gap-2",
              matchCount > 0
                ? "bg-green-50 text-green-700"
                : "bg-slate-100 text-slate-500"
            )}
          >
            {matchCount > 0 ? <CheckCircle2 size={14} /> : <Filter size={14} />}
            {matchCount === 0 ? "No items found" : `${matchCount} items match`}
          </div>
        )}
      </div>

      {/*  FOOTER ACTIONS */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 rounded-b-lg flex gap-2">
        <Button
          variant="ghost"
          onClick={() => executeQuery(true)}
          className="flex-1 text-slate-600 h-8 text-xs bg-white border border-slate-200 shadow-sm"
        >
          <RefreshCw size={12} className="mr-2 opacity-70" /> Check
        </Button>
        <Button
          onClick={() => executeQuery(false)}
          className="flex-1 bg-primary hover:bg-primary text-white h-8 text-xs shadow-md"
          disabled={rules.length === 0}
        >
          <Play size={12} className="mr-2" /> Select
        </Button>
      </div>
    </div>
  );
}
