"use client";

import { useState } from "react";
import { useNetworkStore } from "@/store/networkStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ElevationService } from "@/lib/services/AutoElevation";

// Sub-components
import { ElevationControls } from "./elevation/ElevationControls";
import { ElevationLogs } from "./elevation/ElevationLogs";

interface PanelProps {
  isMaximized?: boolean;
}

export function AutoElevationPanel({ isMaximized = false }: PanelProps) {
  const { features, updateFeature, selectedFeatureIds } = useNetworkStore();

  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Settings
  const [overwrite, setOverwrite] = useState(false);
  const [useSelection, setUseSelection] = useState(false);

  // --- HELPERS ---
  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev]);
  };

  // --- LOGIC: Calculate Targets for UI Preview ---
  // We do a "dry run" calculation to show the user how many nodes will be affected
  const getTargetCount = () => {
    let count = 0;
    features.forEach((f) => {
      const id = f.getId()?.toString();
      const type = f.get("type");
      if (!id || !["junction", "tank", "reservoir"].includes(type)) return;
      if (useSelection && !selectedFeatureIds.includes(id)) return;
      if (!overwrite) {
        const ele = f.get("elevation");
        if (ele !== undefined && ele !== null && ele !== 0) return;
      }
      count++;
    });
    return count;
  };

  const targetCount = getTargetCount();

  // --- ACTION: RUN PROCESS ---
  const handleRun = async () => {
    setLoading(true);
    setProgress(0);
    setLogs([]); // Reset logs
    addLog("Initialization started...");

    try {
      // 1. Identify Nodes
      const nodesToProcess = ElevationService.identifyNodes(
        features,
        useSelection,
        selectedFeatureIds,
        overwrite
      );

      if (nodesToProcess.length === 0) {
        addLog("Process aborted: No matching nodes found.");
        setLoading(false);
        return;
      }

      addLog(`Identified ${nodesToProcess.length} nodes to process.`);

      // 2. Batch Processing
      const BATCH_SIZE = 50;
      let processed = 0;
      let updatedCount = 0;

      for (let i = 0; i < nodesToProcess.length; i += BATCH_SIZE) {
        const batch = nodesToProcess.slice(i, i + BATCH_SIZE);

        try {
          // Service Call
          const results = await ElevationService.fetchBatch(batch);

          // Update Store
          if (Array.isArray(results)) {
            results.forEach((res: any, idx: number) => {
              // OpenTopoData returns array matching input order
              const originalNode = batch[idx];
              if (res && res.elevation !== null) {
                // Round to 2 decimals
                const elev = Math.round(res.elevation * 100) / 100;
                updateFeature(originalNode.id, { elevation: elev });
                updatedCount++;
              }
            });
          }

          processed += batch.length;
          setProgress(Math.round((processed / nodesToProcess.length) * 100));
          addLog(
            `Batch ${Math.ceil(processed / BATCH_SIZE)}: Processed ${
              batch.length
            } nodes.`
          );

          // Throttle slightly to be nice to API / UI
          await new Promise((r) => setTimeout(r, 100));
        } catch (err) {
          console.error(err);
          addLog(`Error in batch ${i}: ${(err as Error).message}`);
        }
      }

      addLog(`Complete! Updated ${updatedCount} nodes.`);
      toast.success(`Updated ${updatedCount} elevations`);
    } catch (error) {
      console.error(error);
      addLog(`Critical Error: ${(error as Error).message}`);
      toast.error("Process failed");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Controls (Always Visible) */}
        <div
          className={cn(
            "flex flex-col h-full bg-white transition-all",
            isMaximized ? "w-1/3 min-w-70 border-r border-slate-200" : "w-full"
          )}
        >
          <ElevationControls
            loading={loading}
            progress={progress}
            totalTargets={targetCount}
            useSelection={useSelection}
            toggleSelection={setUseSelection}
            overwrite={overwrite}
            toggleOverwrite={setOverwrite}
            onRun={handleRun}
            selectionCount={selectedFeatureIds.length}
          />
        </div>

        {/* RIGHT: Logs (Only Visible in Maximized) */}
        {isMaximized && (
          <div className="flex-1 h-full overflow-hidden bg-slate-900">
            <ElevationLogs logs={logs} onClear={() => setLogs([])} />
          </div>
        )}
      </div>
    </div>
  );
}
