"use client";
import { AlertCircle, CheckCircle2, Loader2, MousePointer2 } from 'lucide-react';
import React from 'react';

import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';
import { useSimulationStore } from '@/store/simulationStore';

export function StatusBar() {
  const { coordinates, zoom, projection } = useMapStore();
  const { selectedFeatureId, selectedFeatureIds, features, hasUnsavedChanges } = useNetworkStore();
  const { status: simStatus } = useSimulationStore();

  const selectedIds = selectedFeatureIds || (selectedFeatureId ? [selectedFeatureId] : []);
  
  return (
    <div className="absolute bottom-0 left-0 right-0 h-7 bg-white/95 dark:bg-gray-900/95 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between px-3 text-[10px] font-medium text-gray-600 dark:text-gray-400 backdrop-blur-sm z-20 select-none">
      {/* LEFT: System Status */}
      <div className="flex items-center gap-4">
        {hasUnsavedChanges && (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Unsaved Changes</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {simStatus === "running" ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              <span className="text-blue-600">Simulating...</span>
            </>
          ) : simStatus === "error" ? (
            <>
              <AlertCircle className="w-3 h-3 text-red-500" />
              <span className="text-red-600">Simulation Failed</span>
            </>
          ) : simStatus === "completed" ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span className="text-green-600">Results Available</span>
            </>
          ) : (
            <span className="text-gray-400">Ready</span>
          )}
        </div>

        <div className="h-3 w-px bg-gray-300 dark:bg-gray-700" />

        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">Items:</span>
          <span className="text-gray-800 dark:text-gray-200">
            {features.size}
          </span>
        </div>
      </div>

      {/* CENTER: Selection Context */}
      <div className="flex items-center gap-2">
        {selectedFeatureId ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
            <MousePointer2 className="w-3 h-3" />
            <span>
              Selected: <span className="font-bold">{selectedIds.join(', ')}</span>
            </span>
          </div>
        ) : (
          <span className="text-gray-400 italic">No Selection</span>
        )}
      </div>

      {/* RIGHT: Map Info */}
      <div className="flex items-center gap-4 font-mono">
        <div className="flex items-center gap-1">
          <span className="text-gray-400">Zoom:</span>
          <span>{zoom.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1 min-w-30 justify-end">
          <span className="text-gray-800 dark:text-gray-200">
            {coordinates}
          </span>
        </div>
        <div className="text-xs px-1.5 py-px bg-gray-100 dark:bg-gray-800 rounded text-gray-500">
          {projection}
        </div>
      </div>
    </div>
  );
}
