"use client";

import { useState, useEffect } from "react";
import { useNetworkStore } from "@/store/networkStore";
import { useMapStore } from "@/store/mapStore";
import {
  ValidationError,
  ValidationService,
} from "@/lib/services/ValidationService";
import { cn } from "@/lib/utils";

import { ValidationList } from "./validation/ValidationList";
import { ValidationInspector } from "./validation/ValidationInspector";

interface PanelProps {
  isMaximized?: boolean;
}

export function NetworkValidationPanel({ isMaximized = false }: PanelProps) {
  const { selectFeature, features } = useNetworkStore();
  const { map, vectorSource } = useMapStore();

  const [issues, setIssues] = useState<ValidationError[] | null>(null);
  const [activeIssueIndex, setActiveIssueIndex] = useState<number | null>(null);
  const [subFeatureIndex, setSubFeatureIndex] = useState(0);

  const runValidation = () => {
    const featureArray = Array.from(features.values());
    const results = ValidationService.validate(featureArray);
    setIssues(results);
    setActiveIssueIndex(null);
    setSubFeatureIndex(0);
  };

  const getFeatureIds = (issue: ValidationError) => {
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

  const currentIssue =
    activeIssueIndex !== null && issues ? issues[activeIssueIndex] : null;
  const currentIds = currentIssue ? getFeatureIds(currentIssue) : [];
  const currentFeatureId =
    currentIds.length > 0 ? currentIds[subFeatureIndex] : null;

  useEffect(() => {
    if (currentFeatureId) zoomToFeature(currentFeatureId);
  }, [activeIssueIndex, subFeatureIndex]);

  const handleSelectIssue = (index: number) => {
    setActiveIssueIndex(index);
    setSubFeatureIndex(0);
  };

  const handleNext = () => {
    if (subFeatureIndex < currentIds.length - 1) {
      setSubFeatureIndex((prev) => prev + 1);
    } else if (
      issues &&
      activeIssueIndex !== null &&
      activeIssueIndex < issues.length - 1
    ) {
      setActiveIssueIndex((prev) => (prev !== null ? prev + 1 : 0));
      setSubFeatureIndex(0);
    }
  };

  const handlePrev = () => {
    if (subFeatureIndex > 0) {
      setSubFeatureIndex((prev) => prev - 1);
    } else if (activeIssueIndex !== null && activeIssueIndex > 0) {
      const prevIndex = activeIssueIndex - 1;
      const prevIds = getFeatureIds(issues![prevIndex]);
      setActiveIssueIndex(prevIndex);
      setSubFeatureIndex(Math.max(0, prevIds.length - 1));
    }
  };

  const showList = isMaximized || activeIssueIndex === null;
  const showInspector = isMaximized
    ? !!currentIssue
    : activeIssueIndex !== null;

  return (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden relative">
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANE */}
        {showList && (
          <div
            className={cn(
              "flex flex-col h-full bg-white transition-all",
              isMaximized
                ? "w-1/3 min-w-70 border-r border-slate-200"
                : "w-full"
            )}
          >
            <ValidationList
              issues={issues}
              selectedIndex={activeIssueIndex}
              onSelect={handleSelectIssue}
              onRun={runValidation}
            />
          </div>
        )}

        {/* RIGHT PANE */}
        {showInspector && currentIssue && (
          <div
            className={cn(
              "flex flex-col h-full overflow-hidden bg-slate-50/50",
              isMaximized ? "flex-1" : "w-full bg-white"
            )}
          >
            <ValidationInspector
              issue={currentIssue}
              currentFeatureId={currentFeatureId}
              featureIndex={subFeatureIndex}
              totalFeatures={currentIds.length}
              issueIndex={activeIssueIndex!}
              totalIssues={issues?.length || 0}
              isMaximized={isMaximized}
              onNext={handleNext}
              onPrev={handlePrev}
              onZoom={() => currentFeatureId && zoomToFeature(currentFeatureId)}
              onBack={() => setActiveIssueIndex(null)}
            />
          </div>
        )}

        {/* EMPTY STATE (Maximized only) */}
        {isMaximized && !currentIssue && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50/30">
            <p className="text-xs">Select an issue from the list</p>
          </div>
        )}
      </div>
    </div>
  );
}
