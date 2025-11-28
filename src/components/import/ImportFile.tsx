"use client";

import { AlertCircle, CheckCircle, Download, FileText, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { FileImporter, ImportResult } from '@/lib/import/fileImporter';
import { useMapStore } from '@/store/mapStore';

export default function ImportPage() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importerRef = useRef<FileImporter | null>(null);

  const { vectorSource } = useMapStore();

  // Initialize importer when vector source is available
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
      // Clear network if requested
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

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Network</h1>
          <p className="text-gray-600 mt-1">
            Import water distribution network from various file formats
          </p>
        </div>

        {/* Supported Formats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Supported Formats</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">EPANET (.inp)</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Standard EPANET input file format with network topology and
                  hydraulic data
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <FileText className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-green-900">
                  GeoJSON (.geojson, .json)
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  GIS-compatible format with geographic coordinates and
                  properties
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-purple-900">
                  Shapefile (.zip)
                </h3>
                <p className="text-sm text-purple-700 mt-1">
                  Zipped shapefile with .shp, .shx, .dbf components
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg opacity-50">
              <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-700">KML (.kml)</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Coming soon - Google Earth format
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* File Upload Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Upload File</h2>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg text-gray-700 mb-2">
              {selectedFile
                ? selectedFile.name
                : "Click to select file or drag and drop"}
            </p>
            <p className="text-sm text-gray-500">
              Supports: .inp, .geojson, .json, .zip (shapefile)
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
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleImport(false)}
                disabled={importing}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Upload className="w-5 h-5" />
                {importing ? "Importing..." : "Import & Merge"}
              </button>

              <button
                onClick={() => handleImport(true)}
                disabled={importing}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                {importing ? "Importing..." : "Clear & Import"}
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {importing && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
              <div>
                <p className="font-medium text-gray-900">
                  Importing network...
                </p>
                <p className="text-sm text-gray-500">
                  Processing {selectedFile?.name}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className={`rounded-lg shadow-sm border p-6 ${
              result.success
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-start gap-4">
              {result.success ? (
                <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <h3
                  className={`font-semibold text-lg mb-2 ${
                    result.success ? "text-green-900" : "text-red-900"
                  }`}
                >
                  {result.success ? "Import Successful!" : "Import Failed"}
                </h3>
                <p
                  className={result.success ? "text-green-800" : "text-red-800"}
                >
                  {result.message}
                </p>

                {/* Statistics */}
                {result.stats && (
                  <div className="mt-4 bg-white rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Import Statistics
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex flex-col">
                        <span className="text-2xl font-bold text-blue-600">
                          {result.stats.junctions}
                        </span>
                        <span className="text-sm text-gray-600">Junctions</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl font-bold text-green-600">
                          {result.stats.tanks}
                        </span>
                        <span className="text-sm text-gray-600">Tanks</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl font-bold text-purple-600">
                          {result.stats.reservoirs}
                        </span>
                        <span className="text-sm text-gray-600">
                          Reservoirs
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl font-bold text-red-600">
                          {result.stats.pipes}
                        </span>
                        <span className="text-sm text-gray-600">Pipes</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl font-bold text-orange-600">
                          {result.stats.pumps}
                        </span>
                        <span className="text-sm text-gray-600">Pumps</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl font-bold text-pink-600">
                          {result.stats.valves}
                        </span>
                        <span className="text-sm text-gray-600">Valves</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">
                          Total Features
                        </span>
                        <span className="text-2xl font-bold text-gray-900">
                          {result.features.length}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sample Files */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Sample Files</h2>
          <p className="text-gray-600 mb-4">
            Download sample network files to test the import functionality
          </p>
          <div className="space-y-2">
            <a
              href="/samples/network.inp"
              download
              className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">network.inp</p>
                <p className="text-sm text-gray-500">EPANET sample network</p>
              </div>
            </a>
            <a
              href="/samples/network.geojson"
              download
              className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">network.geojson</p>
                <p className="text-sm text-gray-500">GeoJSON sample network</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
