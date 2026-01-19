"use client";

import {
  AlertCircle,
  CheckCircle2,
  DownloadCloud,
  FileText,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FileImporter, ImportResult } from "@/lib/import/fileImporter";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/store/mapStore";

import { ModalDialog } from "../ui/modal-dialog";
import { useNetworkStore } from "@/store/networkStore";
import { useParams } from "next/navigation";
import { ProjectService } from "@/lib/services/ProjectService";

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

  const map = useMapStore((state) => state.map);
  const networkStore = useNetworkStore((state) => state);
  const vectorSource = useMapStore((state) => state.vectorSource);

  const params = useParams();
  const projectId = params?.id as string;

  useEffect(() => {
    if (vectorSource) {
      importerRef.current = new FileImporter(vectorSource);
    } else {
      importerRef.current = null;
    }
  }, [vectorSource]);

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
      if (importResult.success) {
        networkStore.markUnSaved();

        if (projectId) {
          console.log("Auto-saving imported data...");
          await ProjectService.saveCurrentProject(projectId);
        }
        // Force a small delay to ensure the render cycle completes
        setTimeout(() => {
          const extent = vectorSource?.getExtent();
          if (extent && extent[0] !== Infinity) {
            map?.getView().fit(extent, {
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

  const handleClose = () => {
    setSelectedFile(null);
    setResult(null);
    onClose();
  };

  const renderFooter = () => (
    <>
      <Button
        variant="outline"
        onClick={handleClose}
        className="hover:bg-white dark:hover:bg-gray-800"
      >
        Cancel
      </Button>

      {selectedFile && !result && (
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
      {result && (
        <Button onClick={handleClose} variant="secondary">
          Done
        </Button>
      )}
    </>
  );

  if (!isOpen) return null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Data"
      subtitle="Merge external files into current project"
      icon={DownloadCloud}
      footer={renderFooter()}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* File Upload Area */}
        <div
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
                  setResult(null);
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
                Click to upload
              </p>
              <p className="text-xs text-gray-500 mt-1">.inp, .geojson, .zip</p>
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
                ? "bg-green-50/50 dark:bg-green-900/10 border-green-200"
                : "bg-red-50/50 border-red-200"
            )}
          >
            {result.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={cn(
                  "text-sm font-bold mb-1",
                  result.success ? "text-green-800" : "text-red-800"
                )}
              >
                {result.success ? "Import Successful" : "Import Failed"}
              </p>
              <p className="text-xs text-gray-600">{result.message}</p>
              {result.stats && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {Object.entries(result.stats).map(([key, val]) => (
                    <div
                      key={key}
                      className="bg-white/60 dark:bg-black/20 p-1.5 rounded text-center"
                    >
                      <span className="block text-xs font-bold">{val}</span>
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
    </ModalDialog>
  );
}
