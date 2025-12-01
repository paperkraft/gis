"use client";

import {
  BoxSelect,
  ChevronRight,
  FileUp,
  Home,
  Map as MapIcon,
  MousePointer2,
  Pentagon,
  Ruler,
  Square,
  Table,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { layerType } from "@/constants/map";
import {
  handleZoomIn,
  handleZoomOut,
  handleZoomToExtent,
} from "@/lib/interactions/map-controls";
import { switchBaseLayer } from "@/lib/map/baseLayers";
import { MeasurementManager } from "@/lib/topology/measurementManager";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/store/mapStore";
import { useUIStore } from "@/store/uiStore";

import { ImportModal } from "../modals/ImportModal";
import { ExportModal } from "../modals/ExportModal";

export function MapControls() {
  const { map } = useMapStore();
  const {
    activeTab,
    activeTool,
    baseLayer,
    measurementType,
    importModalOpen,
    exportModalOpen,
    showBaseLayerMenu,
    measurementActive,
    showAttributeTable,
    showMeasurementMenu,
    
    setBaseLayer,
    setActiveTool,
    setMeasurementType,
    setMeasurementActive,
    setShowBaseLayerMenu,
    setShowAttributeTable,
    setShowMeasurementMenu,
    setImportModalOpen,
    setExportModalOpen,
  } = useUIStore();

  const [showSelectMenu, setShowSelectMenu] = useState(false);
  const measurementManagerRef = useRef<MeasurementManager | null>(null);

  // Initialize MeasurementManager
  useEffect(() => {
    if (map) {
      measurementManagerRef.current = new MeasurementManager(map);
    }
    return () => {
      measurementManagerRef.current?.stopMeasurement();
    };
  }, [map]);

  // Handle Measurement State Changes
  useEffect(() => {
    if (!measurementManagerRef.current) return;

    if (measurementActive) {
      measurementManagerRef.current.startMeasurement(measurementType);
    } else {
      measurementManagerRef.current.stopMeasurement();
    }
  }, [measurementActive, measurementType]);

  const selectOptions = [
    {
      id: "select",
      name: "Select",
      icon: MousePointer2,
      description: "Single click selection",
    },
    {
      id: "select-box",
      name: "Box Select",
      icon: BoxSelect,
      description: "Drag box to select",
    },
    {
      id: "select-polygon",
      name: "Region Select",
      icon: Pentagon,
      description: "Draw polygon to select",
    },
  ];

  const activeSelectTool =
    selectOptions.find((t) => t.id === activeTool) || selectOptions[0];
  const SelectIcon = activeSelectTool.icon;

  const baseLayerOptions = [
    { id: "osm", name: "OpenStreetMap", description: "Standard map view" },
    { id: "satellite", name: "Satellite", description: "Aerial imagery" },
    { id: "terrain", name: "Terrain", description: "Terrain view" },
    { id: "mapbox", name: "Mapbox", description: "Mapbox Streets" },
  ];

  const measurementOptions = [
    {
      id: "distance",
      name: "Distance",
      description: "Measure line distance",
      icon: Ruler,
    },
    {
      id: "area",
      name: "Area",
      description: "Measure polygon area",
      icon: Square,
    },
  ];

  const handleBaseLayerChange = (layerType: layerType) => {
    if (!map) return;

    // Use shared utility to toggle visibility instantly
    switchBaseLayer(map, layerType);

    setBaseLayer(layerType);
    setShowBaseLayerMenu(false);
  };

  const handleMeasurementTypeSelect = (type: "distance" | "area") => {
    setMeasurementType(type);
    setShowMeasurementMenu(false);
    setMeasurementActive(true); // This triggers the useEffect above
  };

  const handleToggleMeasurement = () => {
    if (!map) return;

    if (measurementActive) {
      setMeasurementActive(false);
    } else {
      setShowMeasurementMenu(!showMeasurementMenu);
    }
  };

  if (activeTab !== "network-editor") return null;

  return (
    <>
      {/* Zoom Controls - Right Side Top */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 space-y-1">
        <button
          onClick={() => handleZoomIn(map)}
          className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>

        <div className="h-px bg-gray-200" />

        <button
          onClick={() => handleZoomOut(map)}
          className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </button>

        <div className="h-px bg-gray-200" />

        <button
          onClick={() => handleZoomToExtent(map)}
          className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          title="Zoom to Extent"
        >
          <Home className="w-5 h-5 text-gray-700" />
        </button>

        <div className="h-px bg-gray-200" />

        {/* SELECTION TOOLS DROPDOWN */}
        <div className="relative">
          <button
            onClick={() => setShowSelectMenu(!showSelectMenu)}
            className={cn(
              "size-10 flex items-center justify-center rounded-md transition-colors group relative",
              ["select", "select-box", "select-polygon"].includes(
                activeTool || ""
              )
                ? "bg-blue-100"
                : "hover:bg-gray-100"
            )}
            title="Select Tools"
          >
            <SelectIcon
              className={cn(
                "size-5",
                ["select", "select-box", "select-polygon"].includes(
                  activeTool || ""
                )
                  ? "text-blue-600"
                  : "text-gray-700"
              )}
            />
            <ChevronRight className="absolute bottom-0.5 right-0.5 w-2 h-2 text-gray-500 transform rotate-90" />
          </button>

          {showSelectMenu && (
            <>
              <div className="absolute right-full top-0 mr-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 w-48 z-50">
                <div className="text-xs font-semibold text-gray-500 px-2 mb-2">
                  SELECTION TOOLS
                </div>
                {selectOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        setActiveTool(option.id as any);
                        setShowSelectMenu(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3",
                        activeTool === option.id
                          ? "bg-blue-50 text-blue-700"
                          : "hover:bg-gray-100 text-gray-700"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <div>
                        <div className="text-sm font-medium">{option.name}</div>
                        <div className="text-xs opacity-70">
                          {option.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSelectMenu(false)}
              />
            </>
          )}
        </div>

        {/* Measurement Tool */}
        <div className="relative">
          <button
            onClick={handleToggleMeasurement}
            className={cn(
              "size-10 flex items-center justify-center rounded-md transition-colors group relative",
              showMeasurementMenu || measurementActive
                ? "bg-blue-100"
                : "hover:bg-gray-100"
            )}
            title="Measurement Tool"
          >
            {measurementType === "distance" ? (
              <Ruler
                className={cn(
                  "size-5",
                  showMeasurementMenu || measurementActive
                    ? "text-blue-600"
                    : "text-gray-700"
                )}
              />
            ) : (
              <Square
                className={cn(
                  "size-5",
                  measurementActive || measurementActive
                    ? "text-blue-600"
                    : "text-gray-700"
                )}
              />
            )}
            <div className="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
              {measurementActive ? "Stop Measuring" : "Measurement Tool"}
            </div>
          </button>

          {/* Measurement Type Dropdown */}
          {showMeasurementMenu && !measurementActive && (
            <>
              <div className="absolute right-full top-0 mr-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 w-52 z-50">
                <div className="text-xs font-semibold text-gray-500 px-2 mb-2">
                  MEASUREMENT TYPE
                </div>
                {measurementOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() =>
                        handleMeasurementTypeSelect(option.id as any)
                      }
                      className="w-full text-left px-3 py-2.5 rounded-md transition-colors hover:bg-gray-100 text-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-gray-600" />
                        <div>
                          <div className="text-sm font-medium">
                            {option.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Click outside to close menu */}
              {showMeasurementMenu && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setShowMeasurementMenu(false);
                  }}
                />
              )}
            </>
          )}
        </div>

        <div className="h-px bg-gray-200" />

        {/* Base Layer Toggle Button */}
        <div className="relative">
          <button
            onClick={() => setShowBaseLayerMenu(!showBaseLayerMenu)}
            className={cn(
              "size-10 flex items-center justify-center rounded-md transition-colors group relative",
              showBaseLayerMenu ? "bg-blue-100" : "hover:bg-gray-100"
            )}
            title="Change Base Layer"
          >
            <MapIcon
              className={cn(
                "size-5",
                showBaseLayerMenu ? "text-blue-600" : "text-gray-700"
              )}
            />
            <div className="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
              Base Layer
            </div>
          </button>

          {/* Base Layer Dropdown */}
          {showBaseLayerMenu && (
            <>
              <div className="absolute right-full top-0 mr-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 w-48 z-50">
                <div className="text-xs font-semibold text-gray-500 px-2 mb-2">
                  BASE LAYER
                </div>
                {baseLayerOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleBaseLayerChange(option.id as any)}
                    className={`
                      w-full text-left px-3 py-2 rounded-md transition-colors
                      ${
                        baseLayer === option.id
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "hover:bg-gray-100 text-gray-700"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      {baseLayer === option.id && (
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      )}
                      <div>
                        <div className="text-sm font-medium">{option.name}</div>
                        <div className="text-xs text-gray-500">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowBaseLayerMenu(false)}
              />
            </>
          )}
        </div>

        <div className="h-px bg-gray-200" />

        {/* Attribute Table Toggle */}
        <button
          onClick={() => setShowAttributeTable(!showAttributeTable)}
          className={cn(
            "size-10 flex items-center justify-center rounded-md transition-colors group relative",
            showAttributeTable ? "bg-blue-100" : "hover:bg-gray-100"
          )}
          title="Attribute Table"
        >
          <Table
            className={cn(
              "size-5",
              showAttributeTable ? "text-blue-600" : "text-gray-700"
            )}
          />
          <div className="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            {showAttributeTable ? "Close Table" : "Attribute Table"}
          </div>
        </button>

        <div className="h-px bg-gray-200" />

        {/* Import Button */}
        <button
          onClick={() => setImportModalOpen(true)}
          className="size-10 flex items-center justify-center rounded-md transition-colors group relative hover:bg-gray-100"
          title="Import Network"
        >
          <FileUp className="w-5 h-5 text-gray-700" />
          <div className="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            {importModalOpen ? "Close" : "Import Network"}
          </div>
        </button>
      </div>

      {/* Active Tool Indicator */}
      {activeTool !== "select" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-medium">
            {activeTool === "draw" && "Drawing Mode"}
            {activeTool === "modify" && "Modify Mode"}
            {activeTool === "select-box" && "Box Select Mode"}
            {activeTool === "select-polygon" && "Region Select Mode"}
          </span>
          <button
            onClick={() => setActiveTool("select")}
            className="ml-2 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded"
          >
            ESC
          </button>
        </div>
      )}

      {/* Measurement Active Indicator */}
      {measurementActive && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-10">
          {measurementType === "distance" ? (
            <>
              <Ruler className="w-4 h-4" />
              <span className="text-sm font-medium">
                Click to measure distance
              </span>
            </>
          ) : (
            <>
              <Square className="w-4 h-4" />
              <span className="text-sm font-medium">Click to measure area</span>
            </>
          )}
          <button
            onClick={handleToggleMeasurement}
            className="ml-2 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded"
          >
            Stop
          </button>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
    </>
  );
}
