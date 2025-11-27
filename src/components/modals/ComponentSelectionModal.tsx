"use client";
import React, { useState } from "react";
import {
  X,
  Circle,
  Square,
  Hexagon,
  Triangle,
  SquareDot,
  Minus,
  ArrowRight,
} from "lucide-react";
import { COMPONENT_TYPES } from "@/constants/networkComponents";
import { FeatureType } from "@/types/network";
import { Button } from "@/components/ui/button";

interface ComponentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectComponent: (componentType: FeatureType | "skip") => void;
}

const componentIcons: Record<string, React.ReactNode> = {
  junction: <Circle className="w-5 h-5" />,
  tank: <Square className="w-5 h-5" />,
  reservoir: <Hexagon className="w-5 h-5" />,
  pump: <Triangle className="w-5 h-5" />,
  valve: <SquareDot className="w-5 h-5" />,
};

export function ComponentSelectionModal({
  isOpen,
  onClose,
  onSelectComponent,
}: ComponentSelectionModalProps) {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(
    null
  );

  if (!isOpen) return null;

  const handleComponentClick = (componentType: string) => {
    setSelectedComponent(componentType);
    setTimeout(() => {
      onSelectComponent(componentType as FeatureType | "skip");
      setSelectedComponent(null);
    }, 150);
  };

  const allComponents = Object.entries(COMPONENT_TYPES)
    .filter(([type]) => type !== "pipe")
    .map(([type, config]) => ({ type, ...config }));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-linear-to-r from-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Circle className="w-5 h-5 text-primary" />
                Start Drawing Pipe Network
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Select a starting component or skip to draw standalone pipes
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
          {/* All Components */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {allComponents.map((component) => (
              <ComponentCard
                key={component.type}
                component={component}
                icon={componentIcons[component.type]}
                isSelected={selectedComponent === component.type}
                onClick={() => handleComponentClick(component.type)}
              />
            ))}
          </div>

          {/* Skip Option */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => handleComponentClick("skip")}
              className={`w-full p-4 rounded-lg border-2 border-dashed transition-all ${
                selectedComponent === "skip"
                  ? "border-primary bg-primary/5 scale-[0.98]"
                  : "border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                  <Minus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900 dark:text-white">
                    Skip - Draw Pipe Only
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Draw pipes and add nodes later via right-click context menu
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              💡 Tip: After placing your first component, pipes will draw
              automatically as you click
            </div>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component Card (same as before)
interface ComponentCardProps {
  component: { type: string; name: string; color: string; description: string };
  icon: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
}

function ComponentCard({
  component,
  icon,
  isSelected,
  onClick,
}: ComponentCardProps) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border-2 transition-all text-left ${
        isSelected
          ? "border-primary bg-primary/5 shadow-md scale-[0.98]"
          : "border-gray-200 dark:border-gray-700 hover:border-primary hover:shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${component.color}20` }}
        >
          <div style={{ color: component.color }}>{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 dark:text-white mb-1">
            {component.name}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
            {component.description}
          </div>
        </div>
      </div>
      {isSelected && (
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-primary">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Selected
        </div>
      )}
    </button>
  );
}
