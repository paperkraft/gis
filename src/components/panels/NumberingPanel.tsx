"use client";

import { Play, Share2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useNetworkStore } from "@/store/networkStore";
import { FormGroup } from "../form-controls/FormGroup";
import { FormInput } from "../form-controls/FormInput";
import { FormSelect } from "../form-controls/FormSelect";
import { cn } from "@/lib/utils";

export function NumberingPanel() {
  const { selectedFeatureIds, selectedFeatureId, features, renumberFeatures, selectFeatures } = useNetworkStore();

  const [targetType, setTargetType] = useState<string>("junction");
  const [scope, setScope] = useState<"selection" | "global">("global");
  const [sortMode, setSortMode] = useState<"topological" | "proximity" | "west-to-east">("topological");
  const [prefix, setPrefix] = useState("J-");
  const [startNumber, setStartNumber] = useState(101);
  const [manualStartId, setManualStartId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Default prefixes
  useEffect(() => {
    const prefixes: Record<string, string> = {
      junction: "J-",
      pipe: "P-",
      tank: "T-",
      reservoir: "R-",
      pump: "PU-",
      valve: "V-"
    };
    setPrefix(prefixes[targetType] || "");
  }, [targetType]);

  // Sync manual start with active selection
  useEffect(() => {
    if (selectedFeatureId && selectedFeatureIds.length === 1) {
      const feat = features.get(selectedFeatureId);
      if (feat) {
        setTargetType(feat.type);
        setManualStartId(selectedFeatureId);

        // Extract numeric part from ID if possible (e.g., "J-105" -> 105)
        const numPart = selectedFeatureId.replace(/^\D+/, '');
        const parsed = parseInt(numPart);
        if (!isNaN(parsed)) {
          setStartNumber(parsed);
        }
      }
    }
  }, [selectedFeatureId, selectedFeatureIds, features]);

  // Get ALL features of targetType for the dropdown
  const allFeaturesOfType = useMemo(() => {
    return Array.from(features.values())
      .filter(f => f.type === targetType)
      .map(f => f.id)
      .sort();
  }, [features, targetType]);

  const targetIds = useMemo(() => {
    if (scope === 'selection') return selectedFeatureIds.filter(id => features.get(id)?.type === targetType);
    return allFeaturesOfType;
  }, [scope, selectedFeatureIds, allFeaturesOfType, targetType, features]);

  const selectionCount = targetIds.length;

  // Multi-Strategy Sorting Logic
  const sortedIds = useMemo(() => {
    if (selectionCount <= 1) return targetIds;

    const rootId = manualStartId || targetIds[0];
    const rootFeature = features.get(rootId);
    const getPoint = (g: any) => Array.isArray(g?.[0]) ? g[0] : g;
    const rootCoord = getPoint(rootFeature?.geometry) || [0, 0];

    // --- STRATEGY 2: PROXIMITY (Euclidean Distance) ---
    if (sortMode === 'proximity') {
      return [...targetIds].sort((a, b) => {
        const featA = features.get(a);
        const featB = features.get(b);
        const coordA = getPoint(featA?.geometry) || [0, 0];
        const coordB = getPoint(featB?.geometry) || [0, 0];

        const distA = Math.sqrt(Math.pow(coordA[0] - rootCoord[0], 2) + Math.pow(coordA[1] - rootCoord[1], 2));
        const distB = Math.sqrt(Math.pow(coordB[0] - rootCoord[0], 2) + Math.pow(coordB[1] - rootCoord[1], 2));
        return distA - distB;
      });
    }

    // --- STRATEGY 3: WEST-TO-EAST (X Coordinate) ---
    if (sortMode === 'west-to-east') {
      return [...targetIds].sort((a, b) => {
        const featA = features.get(a);
        const featB = features.get(b);
        const coordA = getPoint(featA?.geometry) || [0, 0];
        const coordB = getPoint(featB?.geometry) || [0, 0];
        return (coordA[0] || 0) - (coordB[0] || 0);
      });
    }

    // --- STRATEGY 1: TOPOLOGICAL (Follow Path) ---
    const visited = new Set<string>();
    const sorted: string[] = [];
    const queue: string[] = [rootId];
    const targetSet = new Set(targetIds);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;

      const feature = features.get(currentId);
      if (!feature) continue;

      visited.add(currentId);
      if (targetSet.has(currentId)) {
        sorted.push(currentId);
      }

      // Find neighbors across the WHOLE network to maintain connectivity
      let neighbors: string[] = [];
      if (['pipe', 'pump', 'valve'].includes(feature.type)) {
        neighbors = [feature.properties.startNodeId, feature.properties.endNodeId].filter(id => !!id) as string[];
      } else {
        neighbors = feature.properties.connectedLinks || [];
      }

      for (const nId of neighbors) {
        if (!visited.has(nId)) {
          queue.push(nId);
        }
      }
    }

    // Append any orphaned features that weren't reached via BFS
    const orphans = targetIds.filter(id => !visited.has(id));
    return [...sorted, ...orphans];
  }, [targetIds, manualStartId, features, selectionCount, sortMode]);

  // Derived: Preview of new IDs using SORTED list
  const previewIds = useMemo(() => {
    if (selectionCount === 0) return [];
    return sortedIds.slice(0, 5).map((oldId, index) => {
      return {
        old: oldId,
        new: `${prefix}${startNumber + index}`
      };
    });
  }, [sortedIds, prefix, startNumber, selectionCount]);

  const handleTrace = () => {
    const startId = manualStartId || (targetIds.length > 0 ? targetIds[0] : null);
    if (!startId) {
      toast.error("Select a starting feature on the map first");
      return;
    }

    const visited = new Set<string>();
    const result: string[] = [];
    let queue: string[] = [startId];

    while (queue.length > 0 && result.length < 50) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;

      const feature = features.get(currentId);
      if (!feature) continue;

      visited.add(currentId);
      result.push(currentId);

      // Follow connections
      let neighbors: string[] = [];
      if (['pipe', 'pump', 'valve'].includes(feature.type)) {
        neighbors = [feature.properties.startNodeId, feature.properties.endNodeId].filter(id => !!id) as string[];
      } else {
        neighbors = feature.properties.connectedLinks || [];
      }
      queue.push(...neighbors.filter(n => !visited.has(n)));
    }

    selectFeatures(result);
    toast.success(`Traced and selected ${result.length} connected features`);
  };

  const handleApply = async () => {
    if (selectionCount === 0) {
      toast.error("No features selected for numbering");
      return;
    }

    setIsProcessing(true);
    try {
      await (renumberFeatures as any)(sortedIds, prefix, startNumber);
      toast.success(`Successfully re-numbered ${selectionCount} features`);
    } catch (error: any) {
      toast.error(error.message || "Failed to re-number features");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* Type & Scope Selection */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Target Type"
              value={targetType}
              onChange={setTargetType}
              options={[
                { label: "Junctions", value: "junction" },
                { label: "Pipes", value: "pipe" },
                { label: "Tanks", value: "tank" },
                { label: "Reservoirs", value: "reservoir" },
                { label: "Pumps", value: "pump" },
                { label: "Valves", value: "valve" },
              ]}
            />
            <FormSelect
              label="Sort Strategy"
              value={sortMode}
              onChange={(v) => setSortMode(v)}
              options={[
                { label: "Flow Logic (Path)", value: "topological" },
                { label: "Proximity (Distance)", value: "proximity" },
                { label: "West-to-East (X-Pos)", value: "west-to-east" },
              ]}
            // description="Strategy to order features."
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium">Re-number Scope</label>
            <div className="flex bg-slate-100 p-1 rounded-sm">
              <button
                onClick={() => setScope('global')}
                className={cn("flex-1 text-[10px] py-1 rounded-sm transition-all", scope === 'global' ? "bg-white shadow-sm font-bold text-primary" : "text-slate-500")}
              >Global (Whole Project)</button>
              <button
                onClick={() => setScope('selection')}
                className={cn("flex-1 text-[10px] py-1 rounded-sm transition-all", scope === 'selection' ? "bg-white shadow-sm font-bold text-primary" : "text-slate-500")}
              >Current Selection</button>
            </div>
          </div>

          <FormSelect
            label="Initial Numbering Point"
            value={manualStartId || ""}
            onChange={setManualStartId}
            options={[
              { label: "-- Select Start Feature --", value: "" },
              ...allFeaturesOfType.map(id => ({ label: id, value: id }))
            ]}
            description={`Pick ${targetType} to begin sequence.`}
          />

          {scope === 'selection' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTrace}
              disabled={!manualStartId}
              className="w-full h-8 text-[10px] gap-1.5 border-dashed hover:border-blue-400 hover:text-blue-600"
            >
              <Share2 className="w-3 h-3" />
              Auto-select from {manualStartId || 'start'}
            </Button>
          )}
        </div>

        {/* Configuration */}
        <div className="space-y-4 pt-2">
          <FormGroup label="Numbering Scheme">
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Prefix"
                type="text"
                value={prefix}
                onChange={setPrefix}
                placeholder="e.g. J-"
              />
              <FormInput
                label="Start From"
                type="number"
                value={startNumber}
                onChange={(v) => setStartNumber(parseInt(v) || 0)}
                placeholder="e.g. 101"
              />
            </div>
          </FormGroup>

          {/* Preview Section */}
          {selectionCount > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Preview</label>
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                {previewIds.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-[11px] hover:bg-slate-50/50 transition-colors">
                    <span className="text-slate-400 font-mono">{item.old}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-px w-4 bg-slate-200" />
                      <span className="text-blue-600 font-bold font-mono">{item.new}</span>
                    </div>
                  </div>
                ))}
                {selectionCount > 3 && (
                  <div className="p-2 text-center text-[10px] text-slate-400 italic bg-slate-50/30">
                    + {selectionCount - 3} more...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <Button
          onClick={handleApply}
          disabled={selectionCount === 0 || isProcessing}
          className={`w-full h-9 text-xs gap-2 transition-all duration-300 ${selectionCount > 0
            ? "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200"
            : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
        >
          <Play className={`w-3.5 h-3.5 ${isProcessing ? 'animate-pulse' : ''}`} />
          {isProcessing ? "Processing..." : "Apply Re-numbering"}
        </Button>
      </div>
    </div>
  );
}
