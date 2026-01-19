"use client";

import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ValidationError } from "@/lib/services/ValidationService";

interface ValidationListProps {
  issues: ValidationError[] | null;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onRun: () => void;
}

export function ValidationList({
  issues,
  selectedIndex,
  onSelect,
  onRun,
}: ValidationListProps) {
  // Helpers for status
  const errCount = issues?.filter((i) => i.type === "ERROR").length || 0;
  const warnCount = issues?.filter((i) => i.type === "WARNING").length || 0;
  const isValid = issues !== null && errCount === 0;

  // Render the Status Header (Colored Box)
  const renderStatusHeader = () => {
    if (issues === null) return null;

    if (issues.length === 0) {
      return (
        <div className="bg-green-50 border-b border-green-100 p-4 flex flex-col items-center justify-center text-center space-y-2 shrink-0">
          <div className="bg-white p-2 rounded-full shadow-sm">
            <CheckCircle2 size={24} className="text-green-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-green-800">Network Valid</h3>
            <p className="text-[10px] text-green-600">Ready for simulation</p>
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "p-3 border-b flex items-center gap-3 shrink-0",
          errCount > 0
            ? "bg-red-50 border-red-100 text-red-800"
            : "bg-amber-50 border-amber-100 text-amber-800"
        )}
      >
        <div className="bg-white/60 p-1.5 rounded-full">
          {errCount > 0 ? (
            <AlertOctagon size={16} />
          ) : (
            <AlertTriangle size={16} />
          )}
        </div>
        <div>
          <h3 className="font-bold text-xs">
            {errCount > 0 ? "Validation Failed" : "Warnings Found"}
          </h3>
          <p className="text-[10px] opacity-80 font-mono uppercase">
            {errCount} Errors, {warnCount} Warnings
          </p>
        </div>
      </div>
    );
  };

  // Render the Main List Content
  const renderContent = () => {
    if (issues === null) {
      return (
        <div className="flex-1 flex flex-col py-8 items-center justify-center text-slate-400 text-xs italic space-y-3 opacity-60">
          <RotateCcw size={32} />
          <p>Click "Run" to analyze...</p>
        </div>
      );
    }

    if (issues.length === 0) {
      return (
        <div className="flex-1 bg-slate-50/30" />
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar bg-slate-50/50">
        {issues.map((issue, idx) => {
          const isError = issue.type === "ERROR";
          const isSelected = selectedIndex === idx;

          return (
            <div
              key={idx}
              onClick={() => onSelect(idx)}
              className={cn(
                "group p-3 rounded border text-xs cursor-pointer transition-all flex gap-3 relative overflow-hidden",
                isSelected
                  ? "bg-blue-50 border-blue-300 ring-1 ring-blue-100 shadow-sm"
                  : "bg-white hover:shadow-md",
                !isSelected && (isError ? "border-red-100" : "border-amber-100")
              )}
            >
              <div
                className={cn(
                  "absolute left-0 top-0 bottom-0 w-1",
                  isError ? "bg-red-500" : "bg-amber-500"
                )}
              />
              <div
                className={cn(
                  "mt-0.5",
                  isError ? "text-red-500" : "text-amber-500"
                )}
              >
                {isError ? (
                  <AlertOctagon size={14} />
                ) : (
                  <AlertTriangle size={14} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-700 truncate">
                  {issue.message}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase",
                      isError
                        ? "bg-red-50 text-red-600"
                        : "bg-amber-50 text-amber-600"
                    )}
                  >
                    {issue.type}
                  </span>
                  {issue.featureId && (
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-20">
                      ID: {issue.featureId}
                    </span>
                  )}
                </div>
              </div>
              <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight size={14} className="text-slate-400" />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 1. TOP HEADER (Action Button) */}
      <div className="p-3 border-b border-slate-100 shrink-0">
        <Button
          onClick={onRun}
          size="sm"
          className="w-full bg-blue-600 hover:bg-blue-700 h-8 text-xs shadow-sm"
        >
          <Play className="w-3 h-3 mr-2" /> Run Analysis
        </Button>
      </div>

      {/* 2. STATUS SUMMARY (If results exist) */}
      {renderStatusHeader()}

      {/* 3. SCROLLABLE LIST */}
      {renderContent()}
    </div>
  );
}
