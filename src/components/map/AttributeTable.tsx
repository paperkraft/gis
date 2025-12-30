"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  X,
  Search,
  ArrowUpDown,
  Download,
  Circle,
  Square,
  Hexagon,
  Minus,
  Triangle,
  SquareDot,
  Maximize2,
  Minimize2,
  Layers,
} from "lucide-react";
import { useNetworkStore } from "@/store/networkStore";
import { useSimulationStore } from "@/store/simulationStore";
import { useMapStore } from "@/store/mapStore";
import { FeatureType } from "@/types/network";
import { COMPONENT_TYPES } from "@/constants/networkComponents";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AttributeTableProps {
  isOpen: boolean;
  onClose: () => void;
  vectorSource?: any;
}

interface ColumnConfig {
  key: string;
  label: string;
  width: string;
  isResult?: boolean;
  isReadOnly?: boolean;
}

// Added "all" option to Tab ID type
const TABS: { id: FeatureType | "all"; label: string; icon: any }[] = [
  { id: "all", label: "All Layers", icon: Layers },
  { id: "junction", label: "Junctions", icon: Circle },
  { id: "pipe", label: "Pipes", icon: Minus },
  { id: "tank", label: "Tanks", icon: Square },
  { id: "reservoir", label: "Reservoirs", icon: Hexagon },
  { id: "pump", label: "Pumps", icon: Triangle },
  { id: "valve", label: "Valves", icon: SquareDot },
];

export function AttributeTable({ isOpen, onClose }: AttributeTableProps) {
  const { features, selectFeature, updateFeature } = useNetworkStore();
  const { results, status: simStatus } = useSimulationStore();
  const { map } = useMapStore();

  const [activeTab, setActiveTab] = useState<FeatureType | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [editingCell, setEditingCell] = useState<{
    id: string;
    key: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // --- 1. FILTER DATA ---
  const tableData = useMemo(() => {
    const data: any[] = [];

    // Filter logic: If 'all', take everything, otherwise filter by type
    const featureList = Array.from(features.values()).filter(
      (f) => activeTab === "all" || f.get("type") === activeTab
    );

    featureList.forEach((feature) => {
      const id = feature.getId() as string;
      const type = feature.get("type");
      const props = feature.getProperties();

      const row: any = {
        id: id,
        type: type, // Include type for "All" view
        label: props.label || id,
        ...props,
      };

      if (simStatus === "completed" && results) {
        if (["junction", "tank", "reservoir"].includes(type)) {
          const res = results.nodes[id];
          if (res) {
            row.pressure = res.pressure?.toFixed(2);
            row.head = res.head?.toFixed(2);
            row.demand = res.demand?.toFixed(2);
          }
        } else {
          const res = results.links[id];
          if (res) {
            row.flow = res.flow?.toFixed(2);
            row.velocity = res.velocity?.toFixed(2);
            row.headloss = res.headloss?.toFixed(2);
          }
        }
      }
      data.push(row);
    });

    if (!searchTerm) return data;
    return data.filter((row) =>
      row.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [features, activeTab, results, simStatus, searchTerm]);

  // --- 2. SORT DATA ---
  const sortedData = useMemo(() => {
    if (!sortConfig) return tableData;
    return [...tableData].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
        return sortConfig.direction === "asc"
          ? Number(valA) - Number(valB)
          : Number(valB) - Number(valA);
      }
      // Handle missing values in sort (e.g. Length doesn't exist on Nodes)
      if (valA === undefined) return 1;
      if (valB === undefined) return -1;

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [tableData, sortConfig]);

  // --- 3. COLUMNS CONFIG ---
  const getColumns = (): ColumnConfig[] => {
    const idCol = { key: "id", label: "ID", width: "w-24", isReadOnly: true };

    // --- NEW: "ALL" VIEW COLUMNS ---
    if (activeTab === "all")
      return [
        { key: "type", label: "Type", width: "w-24", isReadOnly: true },
        idCol,
        { key: "elevation", label: "Elev", width: "w-20" },
        { key: "length", label: "Len", width: "w-20" },
        { key: "diameter", label: "Diam", width: "w-20" },
        { key: "status", label: "Status", width: "w-20" },
        // Combined Results
        { key: "pressure", label: "Pres", width: "w-20", isResult: true },
        { key: "head", label: "Head", width: "w-20", isResult: true },
        { key: "flow", label: "Flow", width: "w-20", isResult: true },
        { key: "velocity", label: "Vel", width: "w-20", isResult: true },
      ];

    if (activeTab === "junction")
      return [
        idCol,
        { key: "elevation", label: "Elev (m)", width: "w-24" },
        { key: "demand", label: "Base Demand", width: "w-28" },
        {
          key: "pressure",
          label: "Pressure (psi)",
          width: "w-28",
          isResult: true,
        },
        { key: "head", label: "Head (m)", width: "w-24", isResult: true },
      ];

    if (activeTab === "pipe")
      return [
        idCol,
        { key: "length", label: "Length (m)", width: "w-24" },
        { key: "diameter", label: "Diam (mm)", width: "w-28" },
        { key: "roughness", label: "Roughness", width: "w-24" },
        { key: "flow", label: "Flow (GPM)", width: "w-24", isResult: true },
        { key: "velocity", label: "Vel (m/s)", width: "w-24", isResult: true },
        { key: "headloss", label: "Loss", width: "w-24", isResult: true },
      ];

    return [
      { key: "id", label: "ID", width: "w-32", isReadOnly: true },
      { key: "label", label: "Label", width: "w-48" },
    ];
  };

  const columns = getColumns();

  // --- HANDLERS ---
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleRowClick = (id: string) => {
    selectFeature(id);
    if (map) {
      const feature = features.get(id);
      if (feature) {
        const geom = feature.getGeometry();
        if (geom) {
          map.getView().fit(geom.getExtent(), {
            padding: isFullScreen ? [100, 100, 100, 100] : [100, 100, 400, 100],
            maxZoom: 19,
            duration: 600,
          });
        }
      }
    }
  };

  // --- EXPORT TO CSV ---
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCurrent = () => {
    if (sortedData.length === 0) return;
    const headerRow = columns.map((col) => col.label).join(",");
    const rows = sortedData
      .map((row) => {
        return columns
          .map((col) => {
            const val = row[col.key];
            const safeVal =
              val === null || val === undefined ? "" : String(val);
            return `"${safeVal.replace(/"/g, '""')}"`;
          })
          .join(",");
      })
      .join("\n");

    downloadCSV(`${headerRow}\n${rows}`, `network_${activeTab}_data.csv`);
  };

  // --- EDITING HANDLERS ---
  const startEditing = (
    id: string,
    key: string,
    initialValue: any,
    isReadOnly?: boolean,
    isResult?: boolean
  ) => {
    if (isReadOnly || isResult) return;
    const val =
      initialValue !== undefined && initialValue !== null ? initialValue : "";
    setEditingCell({ id, key });
    setEditValue(String(val));
  };

  const saveEdit = () => {
    if (editingCell) {
      const { id, key } = editingCell;
      let finalValue: string | number = editValue;
      if (!isNaN(Number(editValue)) && editValue.trim() !== "") {
        finalValue = Number(editValue);
      }
      window.dispatchEvent(new CustomEvent("takeSnapshot"));
      updateFeature(id, { [key]: finalValue });
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit();
    else if (e.key === "Escape") setEditingCell(null);
  };

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "absolute left-4 right-4 z-30 flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300 transition-all ease-in-out",
        isFullScreen ? "top-20 bottom-8 h-auto" : "bottom-8 h-87.5"
      )}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between overflow-x-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-t-xl px-4 py-2 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900 dark:text-white hidden sm:block">
            Attribute Data
          </span>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-2 hidden sm:block" />

          {/* SCROLLABLE TABS */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg overflow-x-auto scrollbar-none">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as FeatureType | "all");
                    setEditingCell(null);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                    isActive
                      ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  )}
                >
                  <Icon
                    className="w-3 h-3"
                    style={{
                      color:
                        isActive && tab.id !== "all"
                          ? COMPONENT_TYPES[tab.id as FeatureType]?.color
                          : undefined,
                    }}
                  />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* SEARCH BAR (Restored) */}
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 focus:w-48 transition-all"
            />
          </div>

          {/* EXPORT DROPDOWN */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportCurrent}
            className="h-8 px-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 gap-1"
            title="Export Options"
          >
            <Download className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="h-8 w-8 text-gray-500 hover:text-gray-900"
            title={isFullScreen ? "Minimize" : "Full Screen"}
          >
            {isFullScreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-gray-500 hover:text-red-500"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 bg-white dark:bg-gray-900 border-x border-b border-gray-200 dark:border-gray-700/50 rounded-b-xl shadow-xl overflow-hidden flex flex-col">
        {/* Header Row */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 overflow-y-scroll scrollbar-none">
          {columns.map((col) => (
            <div
              key={col.key}
              onClick={() => handleSort(col.key)}
              className={cn(
                "px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 select-none shrink-0",
                col.width,
                col.isResult &&
                  "text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10"
              )}
            >
              {col.label}
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          {sortedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Search className="w-8 h-8 mb-2 opacity-20" />
              <span className="text-sm">No features found</span>
            </div>
          ) : (
            sortedData.map((row) => (
              <div
                key={row.id}
                onClick={() => handleRowClick(row.id)}
                className="flex border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors group"
              >
                {columns.map((col) => {
                  const isEditing =
                    editingCell?.id === row.id && editingCell?.key === col.key;
                  return (
                    <div
                      key={col.key}
                      onDoubleClick={() =>
                        startEditing(
                          row.id,
                          col.key,
                          row[col.key],
                          col.isReadOnly,
                          col.isResult
                        )
                      }
                      className={cn(
                        "px-4 py-2 text-xs text-gray-700 dark:text-gray-300 font-mono flex items-center shrink-0 relative",
                        col.width,
                        col.isResult &&
                          "font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/20 dark:bg-indigo-900/5 group-hover:bg-transparent",
                        !col.isResult &&
                          !col.isReadOnly &&
                          "hover:bg-white dark:hover:bg-gray-800 hover:shadow-inner"
                      )}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={handleKeyDown}
                          className="absolute inset-0 w-full h-full px-4 text-xs bg-white dark:bg-gray-800 border-2 border-blue-500 focus:outline-none text-gray-900 dark:text-white"
                        />
                      ) : (
                        row[col.key] || "-"
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-1.5 border-t border-gray-200 dark:border-gray-800 text-[10px] text-gray-500 flex justify-between items-center">
          <span>{sortedData.length} items</span>
          <span className="italic text-gray-400">Double-click to edit</span>
          <span className="font-semibold text-gray-600 dark:text-gray-400">
            {activeTab.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
