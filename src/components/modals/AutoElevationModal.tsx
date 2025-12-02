"use client";

import { useState } from "react";
import { Mountain, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useNetworkStore } from "@/store/networkStore";
import { ElevationService } from "@/lib/services/ElevationService";
import { Button } from "@/components/ui/button";
import { Point } from "ol/geom";

interface AutoElevationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AutoElevationModal({
  isOpen,
  onClose,
}: AutoElevationModalProps) {
  const { features, updateFeatures } = useNetworkStore();
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState({ total: 0, updated: 0 });

  if (!isOpen) return null;

  const handleRun = async () => {
    setStatus("loading");
    setMessage("Identifying nodes...");

    try {
      // 1. Identify Nodes (Junctions, Tanks, Reservoirs)
      const nodesToUpdate: { id: string; coordinate: number[] }[] = [];

      features.forEach((feature) => {
        const type = feature.get("type");
        if (["junction", "tank", "reservoir"].includes(type)) {
          const geom = feature.getGeometry();
          if (geom instanceof Point) {
            nodesToUpdate.push({
              id: feature.getId() as string,
              coordinate: geom.getCoordinates(),
            });
          }
        }
      });

      setStats({ total: nodesToUpdate.length, updated: 0 });

      if (nodesToUpdate.length === 0) {
        setStatus("error");
        setMessage("No nodes found in the network.");
        return;
      }

      setMessage(`Fetching elevation for ${nodesToUpdate.length} nodes...`);

      // 2. Fetch Elevations
      const elevationMap = await ElevationService.getElevations(nodesToUpdate);

      // 3. Update Store
      const updates: Record<string, any> = {};
      let updatedCount = 0;

      Object.entries(elevationMap).forEach(([id, elev]) => {
        if (elev !== null && elev !== undefined) {
          updates[id] = { elevation: elev };
          updatedCount++;
        }
      });

      // Take snapshot before bulk update
      window.dispatchEvent(new CustomEvent("takeSnapshot"));

      updateFeatures(updates);

      setStatus("success");
      setMessage(`Successfully updated ${updatedCount} nodes.`);
      setStats({ total: nodesToUpdate.length, updated: updatedCount });
    } catch (error) {
      setStatus("error");
      setMessage("Failed to fetch data from Open-Elevation API.");
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Mountain className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Auto-Elevation
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Automatically fetch elevation data for all nodes in your network
            using the Open-Elevation API.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
            <strong>Note:</strong> Existing elevation values will be
            overwritten.
          </div>

          {status === "loading" && (
            <div className="flex items-center justify-center py-4 text-indigo-600 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">{message}</span>
            </div>
          )}

          {status === "success" && (
            <div className="p-3 bg-green-50 text-green-700 rounded-lg flex items-start gap-2 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-medium">Success</p>
                <p>{message}</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-medium">Error</p>
                <p>{message}</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 rounded-b-xl">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {status !== "success" && (
            <Button
              onClick={handleRun}
              disabled={status === "loading"}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {status === "loading" ? "Processing..." : "Start Auto-Elevation"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
