"use client";

import { Mountain, Play, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ElevationControlsProps {
  loading: boolean;
  progress: number;
  totalTargets: number;
  useSelection: boolean;
  toggleSelection: (val: boolean) => void;
  overwrite: boolean;
  toggleOverwrite: (val: boolean) => void;
  onRun: () => void;
  selectionCount: number;
}

export function ElevationControls({
  loading,
  progress,
  totalTargets,
  useSelection,
  toggleSelection,
  overwrite,
  toggleOverwrite,
  onRun,
  selectionCount,
}: ElevationControlsProps) {
  return (
    <div className="flex flex-col h-full bg-white p-4 space-y-6 overflow-y-auto">
      {/* Header Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-800 space-y-2">
        <div className="flex items-center gap-2 font-bold">
          <Mountain size={16} />
          <span>Elevation Service</span>
        </div>
        <p className="opacity-80 leading-relaxed">
          Fetches topological data using the OpenTopoData API (SRTM 30m).
        </p>
      </div>

      {/* Configuration */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
          Configuration
        </h4>

        <div className="space-y-4">
          {/* Checkbox 1: Selection */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="chk-selection"
              checked={useSelection}
              onCheckedChange={(c) => toggleSelection(!!c)}
              disabled={loading || selectionCount === 0}
            />
            <div className="grid gap-1 leading-none">
              <label
                htmlFor="chk-selection"
                className={cn(
                  "text-xs font-medium leading-none",
                  selectionCount === 0 && "text-slate-400"
                )}
              >
                Process Selected Only
              </label>
              <p className="text-[10px] text-slate-500">
                {selectionCount === 0
                  ? "No items currently selected."
                  : `Restrict to ${selectionCount} selected nodes.`}
              </p>
            </div>
          </div>

          {/* Checkbox 2: Overwrite */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="chk-overwrite"
              checked={overwrite}
              onCheckedChange={(c) => toggleOverwrite(!!c)}
              disabled={loading}
            />
            <div className="grid gap-1 leading-none">
              <label
                htmlFor="chk-overwrite"
                className="text-xs font-medium leading-none"
              >
                Overwrite Existing Data
              </label>
              <p className="text-[10px] text-slate-500">
                Update nodes even if they already have elevation values.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status & Progress */}
      <div className="mt-auto pt-6 space-y-3">
        {loading ? (
          <div className="space-y-2 animate-in fade-in">
            <div className="flex justify-between text-[10px] font-medium text-slate-600">
              <span>Processing batches...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-50 p-2 rounded">
            <AlertCircle size={12} />
            <span>
              Targeting approx. <strong>{totalTargets}</strong> nodes based on
              current filters.
            </span>
          </div>
        )}

        <Button
          onClick={onRun}
          disabled={loading || totalTargets === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 h-9 text-xs shadow-sm"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {loading ? "Fetching..." : "Run Auto Elevation"}
        </Button>
      </div>
    </div>
  );
}
