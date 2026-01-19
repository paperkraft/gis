"use client";

import {
  ArrowLeft,
  ArrowRight,
  Search,
  AlertOctagon,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ValidationError } from "@/lib/services/ValidationService";
import { cn } from "@/lib/utils";

interface ValidationInspectorProps {
  issue: ValidationError;
  currentFeatureId: string | null;
  featureIndex: number;
  totalFeatures: number;
  issueIndex: number;
  totalIssues: number;
  isMaximized: boolean;
  onNext: () => void;
  onPrev: () => void;
  onZoom: () => void;
  onBack: () => void;
}

export function ValidationInspector({
  issue,
  currentFeatureId,
  featureIndex,
  totalFeatures,
  issueIndex,
  totalIssues,
  isMaximized,
  onNext,
  onPrev,
  onZoom,
  onBack,
}: ValidationInspectorProps) {
  const isError = issue.type === "ERROR";

  return (
    <div className="flex flex-col h-full bg-slate-50/50 animate-in slide-in-from-right-4 duration-200">
      {/* Inspector Header */}
      <div className="bg-white border-b border-slate-200 p-2 flex items-center justify-between shrink-0">
        {!isMaximized ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-slate-500 hover:text-slate-800 h-7 pl-1 text-xs"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back list
          </Button>
        ) : (
          <div className="text-xs font-bold text-slate-700 px-2">
            Issue Details
          </div>
        )}
        <div className="text-[10px] font-mono text-slate-400 uppercase">
          Issue {issueIndex + 1} of {totalIssues}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {/* Detail Card */}
        <div
          className={cn(
            "p-4 rounded-lg border shadow-sm bg-white mb-4",
            isError ? "border-red-100" : "border-amber-100"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            {isError ? (
              <AlertOctagon className="text-red-500" size={18} />
            ) : (
              <AlertTriangle className="text-amber-500" size={18} />
            )}
            <h4
              className={cn(
                "font-bold text-sm",
                isError ? "text-red-700" : "text-amber-700"
              )}
            >
              {isError ? "Critical Error" : "Warning"}
            </h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {issue.message}
          </p>
        </div>

        {/* Navigation Controls */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 text-center">
            Affected Feature ({featureIndex + 1}/{Math.max(1, totalFeatures)})
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onPrev}
              title="Previous Feature"
            >
              <ArrowLeft size={14} />
            </Button>

            <div className="flex-1 text-center bg-slate-50 rounded border border-slate-100 py-1.5">
              {currentFeatureId ? (
                <span className="font-mono text-xs font-bold text-primary">
                  {currentFeatureId}
                </span>
              ) : (
                <span className="text-xs text-slate-400 italic">
                  Global Issue
                </span>
              )}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onNext}
              title="Next Feature"
            >
              <ArrowRight size={14} />
            </Button>
          </div>

          <div className="mt-2 text-center">
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-[10px] text-primary"
              onClick={onZoom}
            >
              <Search className="w-3 h-3 mr-1" /> Re-Zoom to Feature
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
