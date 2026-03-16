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
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FileImporter, ImportResult } from "@/lib/import/fileImporter";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/store/mapStore";
import { useNetworkStore } from "@/store/networkStore";
import { ProjectService } from "@/lib/services/ProjectService";
import { useUIStore } from "@/store/uiStore";
import { FloatingPanel } from "./FloatingPanel";

export function ImportPanel() {
  const { activeModal, setActiveModal } = useUIStore();
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

      const importResult = await importerRef.current.importFile(selectedFile, {
        merge: !clearExisting
      });
      setResult(importResult);

      if (importResult.success) {
        networkStore.markUnSaved();

        if (projectId) {
          await ProjectService.saveCurrentProject(projectId);
        }
        
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
    setActiveModal("NONE");
  };

  return (
    <FloatingPanel
      title="Import Data"
      icon={DownloadCloud}
      isOpen={activeModal === "IMPORT_PROJECT"}
      onClose={handleClose}
      footer={
        <div className="flex gap-2 w-full justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-xs"
          >
            Cancel
          </Button>

          {selectedFile && !result && (
            <>
              <Button
                size="sm"
                onClick={() => handleImport(false)}
                disabled={importing}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {importing ? "Processing..." : "Merge"}
              </Button>
              <Button
                size="sm"
                onClick={() => handleImport(true)}
                disabled={importing}
                variant="destructive"
                className="text-xs"
              >
                {importing ? "Processing..." : "Clear & Import"}
              </Button>
            </>
          )}
          {result && (
            <Button size="sm" onClick={handleClose} variant="secondary" className="text-xs">
              Done
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Merge external model files (.inp, .geojson) into your current network workspace.
        </p>

        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group",
            selectedFile
              ? "border-blue-500 bg-blue-50/20 dark:bg-blue-900/10"
              : "border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          )}
        >
          {selectedFile ? (
            <div className="flex items-center gap-3 w-full bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-[9px] text-slate-500 uppercase">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setResult(null);
                }}
                className="p-1 hover:text-red-500 text-slate-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                Choose File
              </p>
              <p className="text-[9px] text-slate-400 mt-1">.inp, .geojson, .zip</p>
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

        {result && (
          <div
            className={cn(
              "p-3 rounded-lg border flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2",
              result.success
                ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
                : "bg-red-50/50 border-red-200 text-red-800"
            )}
          >
            {result.success ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5" />
            )}
            <div className="flex-1 min-w-0 text-[11px]">
              <p className="font-bold mb-0.5">
                {result.success ? "Success" : "Failed"}
              </p>
              <p className="opacity-80 leading-snug">{result.message}</p>
              {result.stats && (
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {Object.entries(result.stats).map(([key, val]) => (
                    <div
                      key={key}
                      className="bg-white/60 dark:bg-black/20 p-1 rounded text-center"
                    >
                      <span className="block text-[10px] font-bold">{val}</span>
                      <span className="block text-[8px] uppercase opacity-60">
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
    </FloatingPanel>
  );
}
