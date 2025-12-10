"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Search,
  ArrowRight,
  ArrowLeft,
  List,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { useValidationStore } from "@/store/validationStore";
import { useNetworkStore } from "@/store/networkStore";
import { useMapStore } from "@/store/mapStore";
import { ValidationError, ValidationWarning } from "@/types/network";
import { cn } from "@/lib/utils";

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CombinedIssue = (ValidationError | ValidationWarning) & {
  severity: "error" | "warning";
};

export function ValidationModal({ isOpen, onClose }: ValidationModalProps) {
  const { lastValidation } = useValidationStore();
  const { selectFeature } = useNetworkStore();
  const { map, vectorSource } = useMapStore();

  const [viewMode, setViewMode] = useState<"list" | "inspect">("list");
  const [currentIssueIndex, setCurrentIssueIndex] = useState(0);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);

  const allIssues = useMemo<CombinedIssue[]>(() => {
    if (!lastValidation) return [];
    return [
      ...lastValidation.errors.map((e) => ({
        ...e,
        severity: "error" as const,
      })),
      ...lastValidation.warnings.map((w) => ({
        ...w,
        severity: "warning" as const,
      })),
    ];
  }, [lastValidation]);

  // --- DYNAMIC HEADER LOGIC ---
  const headerState = useMemo(() => {
    if (!lastValidation)
      return {
        title: "Validating...",
        color: "text-gray-500",
        icon: CheckCircle,
        bg: "bg-gray-100 dark:bg-gray-800",
      };

    if (!lastValidation.isValid || lastValidation.errors.length > 0) {
      return {
        title: "Validation Failed",
        count: `${lastValidation.errors.length} Errors`,
        color: "text-red-600 dark:text-red-400",
        icon: AlertOctagon,
        bg: "bg-red-50 dark:bg-red-900/20",
      };
    }
    if (lastValidation.warnings.length > 0) {
      return {
        title: "Validation Warnings",
        count: `${lastValidation.warnings.length} Warnings`,
        color: "text-amber-600 dark:text-amber-400",
        icon: AlertTriangle,
        bg: "bg-amber-50 dark:bg-amber-900/20",
      };
    }
    return {
      title: "Network Valid",
      count: "Ready for Simulation",
      color: "text-green-600 dark:text-green-400",
      icon: CheckCircle2,
      bg: "bg-green-50 dark:bg-green-900/20",
    };
  }, [lastValidation]);
  // ----------------------------

  useEffect(() => {
    if (!isOpen) {
      setViewMode("list");
      setCurrentIssueIndex(0);
      setCurrentFeatureIndex(0);
    }
  }, [isOpen]);

  const getFeatureIds = (issue: CombinedIssue) => {
    if (!issue.featureId) return [];
    return issue.featureId
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const zoomToFeature = (id: string) => {
    if (!id || !map || !vectorSource) return;
    const feature = vectorSource.getFeatureById(id);
    if (feature) {
      selectFeature(id);
      const geometry = feature.getGeometry();
      if (geometry) {
        map.getView().fit(geometry.getExtent(), {
          padding: [150, 150, 150, 150],
          maxZoom: 19,
          duration: 500,
        });
      }
    }
  };

  useEffect(() => {
    if (viewMode === "inspect" && allIssues[currentIssueIndex]) {
      const ids = getFeatureIds(allIssues[currentIssueIndex]);
      if (ids.length > 0 && ids[currentFeatureIndex]) {
        zoomToFeature(ids[currentFeatureIndex]);
      }
    }
  }, [viewMode, currentIssueIndex, currentFeatureIndex, allIssues]);

  const handleInspect = (index: number) => {
    setCurrentIssueIndex(index);
    setCurrentFeatureIndex(0);
    setViewMode("inspect");
  };

  const handleNextFeature = () => {
    const ids = getFeatureIds(allIssues[currentIssueIndex]);
    if (currentFeatureIndex < ids.length - 1) {
      setCurrentFeatureIndex((prev) => prev + 1);
    } else if (currentIssueIndex < allIssues.length - 1) {
      setCurrentIssueIndex((prev) => prev + 1);
      setCurrentFeatureIndex(0);
    }
  };

  const handlePrevFeature = () => {
    if (currentFeatureIndex > 0) {
      setCurrentFeatureIndex((prev) => prev - 1);
    } else if (currentIssueIndex > 0) {
      const prevIssueIndex = currentIssueIndex - 1;
      const prevIds = getFeatureIds(allIssues[prevIssueIndex]);
      setCurrentIssueIndex(prevIssueIndex);
      setCurrentFeatureIndex(Math.max(0, prevIds.length - 1));
    }
  };

  if (!isOpen || !lastValidation) return null;

  // --- INSPECT MODE UI ---
  if (viewMode === "inspect") {
    const currentIssue = allIssues[currentIssueIndex];
    const ids = getFeatureIds(currentIssue);
    const isError = currentIssue.severity === "error";

    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-full max-w-lg pointer-events-none">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-5 w-full pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
          
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full shadow-sm",
                  isError
                    ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                )}
              >
                {isError ? (
                  <AlertOctagon className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Issue {currentIssueIndex + 1} of {allIssues.length}
                </span>
                <h4 className={cn("text-xs font-bold", isError ? "text-red-600" : "text-amber-600")}>
                    {isError ? "Critical Error" : "Warning"}
                </h4>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode("list")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors"
                title="Back to List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-5 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50">
            {currentIssue.message}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={handlePrevFeature}
                disabled={currentIssueIndex === 0 && currentFeatureIndex === 0}
                className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              
              <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800/80 rounded-lg py-1.5 px-3 border border-gray-200 dark:border-gray-700/50">
                {ids.length > 0 ? (
                  <>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-gray-500">ID:</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {ids[currentFeatureIndex]}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium">
                      Item {currentFeatureIndex + 1} of {ids.length}
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-gray-400 italic">Global Issue</span>
                )}
              </div>

              <button
                onClick={handleNextFeature}
                disabled={
                  currentIssueIndex === allIssues.length - 1 &&
                  currentFeatureIndex === ids.length - 1
                }
                className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { isValid, errors, warnings } = lastValidation;
  const HeaderIcon = headerState.icon;

  // --- LIST MODE UI ---
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-4">
            <div className={cn("p-2.5 rounded-xl shadow-sm", headerState.bg)}>
                <HeaderIcon className={cn("w-6 h-6", headerState.color)} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {headerState.title}
              </h2>
              <p className={cn("text-xs font-semibold uppercase tracking-wide", headerState.color)}>
                {headerState.count}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          
          {isValid && warnings.length === 0 && (
            <div className="text-center py-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100/50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 text-green-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-medium text-lg">All Systems Go</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-xs leading-relaxed">
                No errors found. The network topology is valid and ready for simulation.
              </p>
            </div>
          )}

          {errors.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-2 pl-1">
                <AlertOctagon className="w-3.5 h-3.5" />
                Critical Errors ({errors.length})
              </h3>
              <div className="space-y-2">
                {errors.map((error, idx) => (
                  <ValidationListItem
                    key={idx}
                    issue={error}
                    severity="error"
                    onInspect={() => handleInspect(idx)}
                  />
                ))}
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2 pl-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Warnings ({warnings.length})
              </h3>
              <div className="space-y-2">
                {warnings.map((warning, idx) => (
                  <ValidationListItem
                    key={idx}
                    issue={warning}
                    severity="warning"
                    onInspect={() => handleInspect(errors.length + idx)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50/80 dark:bg-gray-900/80 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-end backdrop-blur-sm">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-all shadow-sm hover:shadow"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-component with Glass styles
function ValidationListItem({
  issue,
  severity,
  onInspect,
}: {
  issue: ValidationError | ValidationWarning;
  severity: "error" | "warning";
  onInspect: () => void;
}) {
  const isError = severity === "error";
  const ids = issue.featureId
    ? issue.featureId.split(",").filter((s) => s.trim().length)
    : [];

  return (
    <div
      className={cn(
        "p-3 rounded-xl border flex flex-col gap-2 transition-all hover:shadow-md",
        isError
          ? "bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 hover:border-red-200"
          : "bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 hover:border-amber-200"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 shrink-0",
            isError ? "text-red-500" : "text-amber-500"
          )}
        >
          {isError ? (
            <AlertOctagon className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              isError
                ? "text-red-900 dark:text-red-200"
                : "text-amber-900 dark:text-amber-200"
            )}
          >
            {issue.message}
          </p>
          
          <div className="mt-2.5 flex items-center justify-between">
            {ids.length > 0 ? (
                <span className="text-[10px] font-medium text-gray-500 bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-800">
                    {ids.length} Feature{ids.length !== 1 ? "s" : ""}
                </span>
            ) : (
                <span className="text-[10px] text-gray-400 italic">System Issue</span>
            )}
            
            {ids.length > 0 && (
                <button
                    onClick={onInspect}
                    className={cn(
                        "text-[10px] flex items-center gap-1 font-bold uppercase tracking-wide transition-colors px-2 py-1 rounded hover:bg-white/50 dark:hover:bg-white/10",
                        isError ? "text-red-600 hover:text-red-700" : "text-amber-600 hover:text-amber-700"
                    )}
                >
                    <Search className="w-3 h-3" />
                    Inspect
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}