"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  Globe,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useNetworkStore } from "@/store/networkStore";
import { NetworkExporter } from "@/lib/export/networkExporter";
import { Button } from "@/components/ui/button";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { features } = useNetworkStore();
  const [format, setFormat] = useState<"inp" | "geojson">("inp");
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    const featureList = Array.from(features.values());

    if (featureList.length === 0) {
      setResult({
        success: false,
        message: "Network is empty. Nothing to export.",
      });
      return;
    }

    const exportResult = NetworkExporter.export(featureList, format);

    if (exportResult.success) {
      setResult({
        success: true,
        message: `Successfully exported ${exportResult.count} features.`,
      });
      setTimeout(() => {
        onClose();
        setResult(null);
      }, 1500);
    } else {
      setResult({
        success: false,
        message: "Export failed. Check console for details.",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Export Network
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Format
            </label>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormat("inp")}
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${
                  format === "inp"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <FileText className="w-8 h-8 mb-2" />
                <span className="font-semibold">EPANET</span>
                <span className="text-xs opacity-70">.inp file</span>
              </button>

              <button
                onClick={() => setFormat("geojson")}
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${
                  format === "geojson"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                    : "border-gray-200 dark:border-gray-700 hover:border-green-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <Globe className="w-8 h-8 mb-2" />
                <span className="font-semibold">GeoJSON</span>
                <span className="text-xs opacity-70">.geojson file</span>
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
            {format === "inp"
              ? "Standard format for hydraulic simulation. Includes topology, properties, and simulation settings."
              : "Standard geospatial format. Good for GIS software and web mapping."}
          </div>

          {result && (
            <div
              className={`flex items-center gap-2 text-sm p-3 rounded ${
                result.success
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {result.success ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {result.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 rounded-b-xl">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}
