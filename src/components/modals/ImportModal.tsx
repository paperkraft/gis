"use client";

import { useState, useRef } from "react";
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { FileImporter, ImportResult } from "@/lib/import/fileImporter";
import { useMapStore } from "@/store/mapStore";

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

      const importResult = await importerRef.current.importFile(selectedFile);
      setResult(importResult);

      // Zoom to imported features
      if (importResult.success && map && vectorSource) {
        setTimeout(() => {
          const extent = vectorSource.getExtent();
          map
            .getView()
            ?.fit(extent, { padding: [50, 50, 50, 50], duration: 1000 });
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Import Network
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Load network from INP, GeoJSON, or Shapefile
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-4">
            {/* Supported Formats */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2 text-sm">
                Supported Formats
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-blue-700">
                  <FileText className="w-4 h-4" />
                  <span>EPANET (.inp)</span>
                </div>
                <div className="flex items-center gap-2 text-blue-700">
                  <FileText className="w-4 h-4" />
                  <span>GeoJSON (.geojson)</span>
                </div>
                <div className="flex items-center gap-2 text-blue-700">
                  <FileText className="w-4 h-4" />
                  <span>Shapefile (.zip)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <FileText className="w-4 h-4" />
                  <span>KML (Coming soon)</span>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-700 mb-1">
                {selectedFile
                  ? selectedFile.name
                  : "Click to select or drag & drop file"}
              </p>
              <p className="text-sm text-gray-500">
                INP, GeoJSON, or Shapefile (ZIP)
              </p>
              {selectedFile && (
                <p className="text-sm text-blue-600 mt-2">
                  Size: {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".inp,.geojson,.json,.zip,.kml"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Action Buttons */}
            {selectedFile && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleImport(false)}
                  disabled={importing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  {importing ? "Importing..." : "Import & Merge"}
                </button>

                <button
                  onClick={() => handleImport(true)}
                  disabled={importing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  {importing ? "Importing..." : "Clear & Import"}
                </button>
              </div>
            )}

            {/* Loading */}
            {importing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
                  <div>
                    <p className="font-medium text-blue-900 text-sm">
                      Importing network...
                    </p>
                    <p className="text-xs text-blue-700">
                      {selectedFile?.name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div
                className={`rounded-lg border p-4 ${
                  result.success
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`font-medium text-sm mb-2 ${
                        result.success ? "text-green-900" : "text-red-900"
                      }`}
                    >
                      {result.message}
                    </p>

                    {/* Statistics */}
                    {result.stats && (
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="text-center bg-white rounded p-2">
                          <div className="text-lg font-bold text-blue-600">
                            {result.stats.junctions}
                          </div>
                          <div className="text-gray-600">Junctions</div>
                        </div>
                        <div className="text-center bg-white rounded p-2">
                          <div className="text-lg font-bold text-green-600">
                            {result.stats.tanks}
                          </div>
                          <div className="text-gray-600">Tanks</div>
                        </div>
                        <div className="text-center bg-white rounded p-2">
                          <div className="text-lg font-bold text-purple-600">
                            {result.stats.reservoirs}
                          </div>
                          <div className="text-gray-600">Reservoirs</div>
                        </div>
                        <div className="text-center bg-white rounded p-2">
                          <div className="text-lg font-bold text-red-600">
                            {result.stats.pipes}
                          </div>
                          <div className="text-gray-600">Pipes</div>
                        </div>
                        <div className="text-center bg-white rounded p-2">
                          <div className="text-lg font-bold text-orange-600">
                            {result.stats.pumps}
                          </div>
                          <div className="text-gray-600">Pumps</div>
                        </div>
                        <div className="text-center bg-white rounded p-2">
                          <div className="text-lg font-bold text-pink-600">
                            {result.stats.valves}
                          </div>
                          <div className="text-gray-600">Valves</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
