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
} from "lucide-react";
import { useValidationStore } from "@/store/validationStore";
import { useNetworkStore } from "@/store/networkStore";
import { useMapStore } from "@/store/mapStore";
import { ValidationError, ValidationWarning } from "@/types/network";

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
      };

    if (!lastValidation.isValid || lastValidation.errors.length > 0) {
      return {
        title: "Validation Failed",
        count: `${lastValidation.errors.length} Errors`,
        color: "text-red-600",
        icon: AlertOctagon,
      };
    }
    if (lastValidation.warnings.length > 0) {
      return {
        title: "Validation Warnings",
        count: `${lastValidation.warnings.length} Warnings`,
        color: "text-amber-600",
        icon: AlertTriangle,
      };
    }
    return {
      title: "Network Valid",
      count: "Ready for Simulation",
      color: "text-green-600",
      icon: CheckCircle,
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
          padding: [100, 100, 100, 100],
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

  if (viewMode === "inspect") {
    const currentIssue = allIssues[currentIssueIndex];
    const ids = getFeatureIds(currentIssue);
    const isError = currentIssue.severity === "error";

    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-full max-w-lg pointer-events-none">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-full pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full ${
                  isError
                    ? "bg-red-100 text-red-600"
                    : "bg-amber-100 text-amber-600"
                }`}
              >
                {isError ? (
                  <AlertOctagon className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Issue {currentIssueIndex + 1} of {allIssues.length}
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode("list")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500"
                title="Back to List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            {currentIssue.message}
          </p>
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevFeature}
                disabled={currentIssueIndex === 0 && currentFeatureIndex === 0}
                className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="text-xs font-mono text-center min-w-[100px]">
                {ids.length > 0 ? (
                  <>
                    <span className="text-gray-500">ID:</span>
                    <span className="font-bold ml-1 text-indigo-600 dark:text-indigo-400">
                      {ids[currentFeatureIndex]}
                    </span>
                    <div className="text-[10px] text-gray-400">
                      Feature {currentFeatureIndex + 1} / {ids.length}
                    </div>
                  </>
                ) : (
                  <span className="text-gray-400 italic">No specific ID</span>
                )}
              </div>
              <button
                onClick={handleNextFeature}
                disabled={
                  currentIssueIndex === allIssues.length - 1 &&
                  currentFeatureIndex === ids.length - 1
                }
                className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[10px] text-gray-400 uppercase font-semibold">
              {currentFeatureIndex === ids.length - 1 &&
              currentIssueIndex < allIssues.length - 1
                ? "Next: New Issue"
                : "Navigate"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { isValid, errors, warnings } = lastValidation;
  const HeaderIcon = headerState.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* DYNAMIC HEADER */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            <HeaderIcon className={`w-6 h-6 ${headerState.color}`} />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {headerState.title}
              </h2>
              <p
                className={`text-xs font-medium ${headerState.color} opacity-80`}
              >
                {headerState.count}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isValid && warnings.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-300">
                No topology or connectivity errors found. <br />
                The network is ready for simulation.
              </p>
            </div>
          )}

          {errors.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-red-600 uppercase tracking-wide flex items-center gap-2">
                <AlertOctagon className="w-4 h-4" />
                Critical Errors ({errors.length})
              </h3>
              <div className="space-y-2">
                {errors.map((error, idx) => (
                  <ValidationListItem
                    key={idx}
                    issue={error}
                    severity="error"
                    onInspect={() => handleInspect(idx)} // Correct index mapping needed if flattened
                  />
                ))}
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wide flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Warnings ({warnings.length})
              </h3>
              <div className="space-y-2">
                {warnings.map((warning, idx) => (
                  <ValidationListItem
                    key={idx}
                    issue={warning}
                    severity="warning"
                    onInspect={() => handleInspect(errors.length + idx)} // Offset index
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-component for clean rendering
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
      className={`p-3 rounded-lg border flex flex-col gap-2 transition-colors ${
        isError
          ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800"
          : "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 shrink-0 ${
            isError ? "text-red-600" : "text-amber-600"
          }`}
        >
          {isError ? (
            <AlertOctagon className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
        </div>
        <div className="flex-1">
          <p
            className={`text-sm font-medium ${
              isError
                ? "text-red-800 dark:text-red-200"
                : "text-amber-800 dark:text-amber-200"
            }`}
          >
            {issue.message}
          </p>
          {ids.length > 0 && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-500 bg-white/50 px-2 py-1 rounded">
                {ids.length} Feature{ids.length !== 1 ? "s" : ""} affected
              </span>
              <button
                onClick={onInspect}
                className={`text-xs flex items-center gap-1 font-bold uppercase tracking-wide hover:underline ${
                  isError ? "text-red-600" : "text-amber-600"
                }`}
              >
                <Search className="w-3 h-3" />
                Inspect
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
