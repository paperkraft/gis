"use client";

import { useState, useRef } from "react";
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { FileImporter, ImportResult } from "@/lib/import/fileImporter";
import { useMapStore } from "@/store/mapStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importerRef = useRef<FileImporter | null>(null);

  const { vectorSource, map } = useMapStore();

  // Initialize importer
  if (!importerRef.current && vectorSource) {
    importerRef.current = new FileImporter(vectorSource);
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleImport = async (clearExisting: boolean = false) => {
    if (!selectedFile || !importerRef.current) return;

    setImporting(true);
    setResult(null);

    try {
      if (clearExisting) {
        if (confirm("This will clear the existing network. Continue?")) {
          importerRef.current.clearNetwork();
        } else {
          setImporting(false);
          return;
        }
      }

      // Pass the projection to the importer method
      const importResult = await importerRef.current.importFile(selectedFile);
      setResult(importResult);

      // Zoom to imported features if successful
      if (importResult.success && map && vectorSource) {
        setTimeout(() => {
          const extent = vectorSource.getExtent();
          if (extent && extent[0] !== Infinity) {
            map.getView().fit(extent, {
              padding: [100, 100, 100, 100],
              duration: 1000,
              maxZoom: 19,
            });
          }
        }, 300);
      }
    } catch (error) {
      setResult({
        success: false,
        features: [],
        message: error instanceof Error ? error.message : "Import failed",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Import Network
              </h2>
              <p className="text-xs text-gray-500">
                Load .inp, .geojson, or .zip (Shapefile)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          {/* File Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group",
              selectedFile
                ? "border-blue-500 bg-blue-50/30 dark:bg-blue-900/10"
                : "border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            )}
          >
            {selectedFile ? (
              <div className="flex items-center gap-4 w-full max-w-sm bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supported: .inp, .geojson, .zip
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".inp,.geojson,.json,.zip,.kml"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Import Result Message */}
          {result && (
            <div
              className={cn(
                "p-4 rounded-xl border flex items-start gap-3",
                result.success
                  ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                  : "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
              )}
            >
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={cn(
                    "text-sm font-bold mb-1",
                    result.success
                      ? "text-green-800 dark:text-green-200"
                      : "text-red-800 dark:text-red-200"
                  )}
                >
                  {result.success ? "Import Successful" : "Import Failed"}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {result.message}
                </p>

                {result.stats && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {Object.entries(result.stats).map(([key, val]) => (
                      <div
                        key={key}
                        className="bg-white/60 dark:bg-black/20 p-1.5 rounded text-center"
                      >
                        <span className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                          {val}
                        </span>
                        <span className="block text-[9px] uppercase text-gray-500">
                          {key}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-gray-50/80 dark:bg-gray-900/80 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-end gap-3 backdrop-blur-sm">
          <Button
            variant="outline"
            onClick={handleClose}
            className="hover:bg-white dark:hover:bg-gray-800"
          >
            Cancel
          </Button>

          {selectedFile && (
            <div className="flex gap-2">
              <Button
                onClick={() => handleImport(false)}
                disabled={importing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
              >
                {importing ? "Processing..." : "Merge Import"}
              </Button>
              <Button
                onClick={() => handleImport(true)}
                disabled={importing}
                variant="destructive"
                className="min-w-[120px]"
              >
                {importing ? "Processing..." : "Clear & Import"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
