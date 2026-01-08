"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Layers, Circle, Minus, Square, Hexagon, Triangle, SquareDot,
  Search, Download, Maximize2, X, ArrowUpDown, Minimize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNetworkStore } from "@/store/networkStore";
import { useSimulationStore } from "@/store/simulationStore";
import { useMapStore } from "@/store/mapStore";
import { FeatureType } from "@/types/network";
import { Button } from "@/components/ui/button";
import { TABLE_CONFIG, ColumnDef } from "@/config/attributeColumns";
import { useUIStore } from "@/store/uiStore";

interface AttributeTableProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABS: { id: FeatureType | "all"; label: string; icon: any }[] = [
  { id: "all", label: "Overview", icon: Layers },
  { id: "junction", label: "Junctions", icon: Circle },
  { id: "pipe", label: "Pipes", icon: Minus },
  { id: "tank", label: "Tanks", icon: Square },
  { id: "reservoir", label: "Reservoirs", icon: Hexagon },
  { id: "pump", label: "Pumps", icon: Triangle },
  { id: "valve", label: "Valves", icon: SquareDot },
];

export function AttributeTable({ isOpen, onClose }: AttributeTableProps) {
  // STORES
  const { features, selectFeature, updateFeature } = useNetworkStore();
  const { results, status: simStatus } = useSimulationStore();
  const { map } = useMapStore();

  const { isCollapsed, sidebarWidth } = useUIStore();
  // STATE
  const [activeTab, setActiveTab] = useState<FeatureType | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  
  // LAYOUT STATE
  const [tableHeight, setTableHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // EDITING STATE
  const [editingCell, setEditingCell] = useState<{ id: string; key: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // --- RESIZING LOGIC ---
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback(
    (e: MouseEvent) => {
        if (isResizing) {
          e.preventDefault();
          document.body.style.userSelect = "none";
          const newHeight = window.innerHeight - e.clientY;
          if (newHeight > 200 && newHeight < window.innerHeight * 0.8) {
            setTableHeight(newHeight);
          }
        } else {
          document.body.style.userSelect = "";
        }
      },
      [isResizing]
    );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // --- 1. RESOLVE COLUMNS ---
  const columns = useMemo(() => {
    if (activeTab === "all") {
       return [
          { key: "type", label: "Type", width: "w-20", type: "readonly" },
          { key: "id", label: "ID", width: "w-24", type: "readonly" },
          { key: "elevation", label: "Elev", width: "w-16", type: "number" },
          { key: "length", label: "Len", width: "w-16", type: "number" },
          { key: "diameter", label: "Diam", width: "w-16", type: "number" },
          { key: "status", label: "Status", width: "w-20", type: "text" },
          { key: "pressure", label: "Pres", width: "w-20", type: "readonly", isResult: true },
          { key: "flow", label: "Flow", width: "w-20", type: "readonly", isResult: true },
       ] as ColumnDef[];
    }
    return TABLE_CONFIG[activeTab] || [];
  }, [activeTab]);

  // --- 2. PREPARE DATA ---
  const tableData = useMemo(() => {
    const data: any[] = [];
    const featureList = Array.from(features.values()).filter(
      (f) => activeTab === "all" || f.get("type") === activeTab
    );

    featureList.forEach((feature) => {
      const id = feature.getId() as string;
      const type = feature.get("type");
      const props = feature.getProperties();
      const row: any = { id, type, ...props };

      if (simStatus === "completed" && results) {
        if (["junction", "tank", "reservoir"].includes(type)) {
           const res = results.nodes[id];
           if (res) Object.assign(row, { pressure: res.pressure?.toFixed(2), head: res.head?.toFixed(2), demand: res.demand?.toFixed(2) });
        } else {
           const res = results.links[id];
           if (res) Object.assign(row, { flow: res.flow?.toFixed(2), velocity: res.velocity?.toFixed(2), headloss: res.headloss?.toFixed(2) });
        }
      }
      data.push(row);
    });

    if (!searchTerm) return data;
    return data.filter((row) => row.id.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [features, activeTab, results, simStatus, searchTerm]);

  // --- 3. SORT DATA ---
  const sortedData = useMemo(() => {
    if (!sortConfig) return tableData;
    return [...tableData].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
        return sortConfig.direction === "asc" ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      }
      if (valA === undefined) return 1; if (valB === undefined) return -1;
      return valA < valB ? (sortConfig.direction === "asc" ? -1 : 1) : (sortConfig.direction === "asc" ? 1 : -1);
    });
  }, [tableData, sortConfig]);

  // --- HANDLERS ---
  const handleSort = (key: string) => {
    setSortConfig(prev => ({ key, direction: prev?.key === key && prev.direction === "asc" ? "desc" : "asc" }));
  };

  const handleRowClick = (id: string) => {
    selectFeature(id);
    if (map) {
      const feature = features.get(id);
      const geom = feature?.getGeometry();
      if (geom) {
        map.getView().fit(geom.getExtent(), { padding: [100, 100, 400, 100], maxZoom: 19, duration: 600 });
      }
    }
  };

  // --- EDITING ---
  const startEditing = (id: string, key: string, initialValue: any, colDef: ColumnDef) => {
    if (colDef.type === 'readonly' || colDef.isResult) return;
    setEditingCell({ id, key });
    setEditValue(String(initialValue ?? ""));
  };

  const saveEdit = () => {
    if (editingCell) {
      const { id, key } = editingCell;
      let finalValue: string | number = editValue;
      if (!isNaN(Number(editValue)) && editValue.trim() !== "") finalValue = Number(editValue);
      updateFeature(id, { [key]: finalValue });
      setEditingCell(null);
    }
  };

  // --- CSV EXPORT ---
  const handleExport = () => {
    if (sortedData.length === 0) return;
    const header = columns.map((col) => col.label).join(",");
    const rows = sortedData.map((row) => columns.map((col) => `"${(row[col.key] ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([header + "\n" + rows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `network_${activeTab}.csv`;
    link.click();
  };

  if (!isOpen) return null;

  const leftPosition = (!isCollapsed && !isFullScreen) ? sidebarWidth + 16 : 16;

  return (
    <div 
        ref={tableRef}
        style={{ height: isFullScreen ? "100%" : tableHeight, left: leftPosition }}
        className={cn(
            // BASE STYLES shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]
            "absolute bottom-9 right-2 z-30 flex flex-col rounded-sm bg-background border border-slate-200 shadow-[0_-1px_10px_0_rgba(0,0,0,0.1)]",
            // ANIMATION FOR SIDEBAR ADJUSTMENT 
            "transition-all duration-300 ease-in-out",
            // FULL SCREEN OVERRIDE
            isFullScreen && "top-0 left-0! right-0 h-full z-50 border-t-0"
        )}
    >
      
      {/* 1. RESIZER HANDLE */}
      {!isFullScreen && (
        <div 
          onMouseDown={startResizing}
          className="absolute -top-1.5 group left-0 w-full h-3 cursor-ns-resize flex justify-center items-center z-50 group"
        >
          <div className={cn("w-12 h-1  rounded-full group-hover:bg-blue-500 transition-colors",
            isResizing ? "bg-primary w-16": "bg-slate-300 group-hover:bg-primary"
          )} />
        </div>
      )}

      {/* 2. HEADER & TABS */}
      <div className="flex flex-col rounded-t-sm bg-slate-50 border-b border-slate-200">
         
         {/* Toolbar Row */}
         <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-200/50">
            <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-slate-700 uppercase tracking-wide px-2">Table View</span>
               <div className="h-4 w-px bg-slate-300" />
               
               {/* Search */}
               <div className="relative group">
                 <Search className="absolute left-2 top-1.5 w-3 h-3 text-slate-400 group-hover:text-blue-500" />
                 <input
                   type="text"
                   placeholder="Filter..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="h-6 w-32 focus:w-48 pl-7 text-[11px] bg-white border border-slate-300 rounded hover:border-blue-400 focus:border-primary focus:ring-0 transition-all"
                 />
               </div>
            </div>

            <div className="flex items-center gap-1">
               <Button variant="ghost" size="icon-sm" onClick={handleExport} className="size-6 text-slate-500 hover:text-green-600" title="Export CSV"><Download size={12}/></Button>
               <Button variant="ghost" size="icon-sm" onClick={() => setIsFullScreen(!isFullScreen)} className="size-6 text-slate-500 hover:text-primary">{isFullScreen ? <Minimize2 size={12}/> : <Maximize2 size={12}/>}</Button>
               <Button variant="ghost" size="icon-sm" onClick={onClose} className="size-6 text-slate-500 hover:text-destructive"><X size={12}/></Button>
            </div>
         </div>

         {/* Tabs Row (SimScale / Excel Style) */}
         <div className="flex items-end px-2 pt-1 gap-0.5">
            {TABS.map((tab) => {
               const Icon = tab.icon;
               const isActive = activeTab === tab.id;
               return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as FeatureType | "all"); setEditingCell(null); }}
                    className={cn(
                       "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border-t border-l border-r rounded-t-sm transition-all relative top-px",
                       isActive 
                         ? "bg-white border-slate-300 border-b-white text-primary z-10" 
                         : "bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                    )}
                  >
                     <Icon className="w-3 h-3 opacity-70" />
                     {tab.label}
                  </button>
               );
            })}
         </div>
      </div>

      {/* 3. TABLE GRID */}
      <div className="flex-1 overflow-auto bg-white relative">
        <div className="min-w-full inline-block align-middle">
           <div className="border-b border-slate-200">
              {/* Header */}
              <div className="flex bg-slate-50 sticky top-0 z-10 shadow-sm">
                 {columns.map((col) => (
                    <div
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={cn(
                        "px-3 py-2 text-[10px] font-bold text-slate-600 uppercase border-r border-b border-slate-200 cursor-pointer hover:bg-slate-100 flex items-center justify-between group select-none shrink-0",
                        col.width || "w-24",
                        col.isResult && "bg-blue-50/50 text-primary border-blue-100"
                      )}
                    >
                      <span>{col.label}</span>
                      <ArrowUpDown className="w-3 h-3 opacity-20 group-hover:opacity-100" />
                    </div>
                 ))}
              </div>

              {/* Body */}
              {sortedData.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Search className="w-8 h-8 mb-2 opacity-20" />
                    <span className="text-xs">No Data</span>
                 </div>
              ) : (
                 sortedData.map((row, i) => (
                    <div
                      key={row.id}
                      onClick={() => handleRowClick(row.id)}
                      className={cn(
                        "flex hover:bg-blue-50 cursor-pointer group transition-colors",
                        i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                      )}
                    >
                       {columns.map((col) => {
                          const isEditing = editingCell?.id === row.id && editingCell?.key === col.key;
                          return (
                             <div
                               key={col.key}
                               onDoubleClick={() => startEditing(row.id, col.key, row[col.key], col)}
                               className={cn(
                                 "px-3 py-1.5 text-[11px] font-mono text-slate-700 border-r border-slate-100 flex items-center shrink-0 relative truncate",
                                 col.width || "w-24",
                                 col.isResult && "bg-blue-50/20 text-blue-800 font-semibold",
                                 !col.isResult && col.type !== 'readonly' && "hover:bg-white hover:shadow-inner cursor-text"
                               )}
                             >
                                {isEditing ? (
                                   <input
                                      ref={inputRef}
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={(e) => e.key === "Enter" ? saveEdit() : e.key === "Escape" && setEditingCell(null)}
                                      className="absolute inset-0 w-full h-full px-2 text-[11px] border border-blue-500 focus:outline-none z-20"
                                   />
                                ) : (
                                   row[col.key] ?? <span className="text-slate-300">-</span>
                                )}
                             </div>
                          );
                       })}
                    </div>
                 ))
              )}
           </div>
        </div>
      </div>

      {/* 4. FOOTER STATUS BAR */}
      <div className="bg-slate-50 px-3 py-1 rounded-b-sm border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center select-none">
         <div className="flex gap-4">
            <span>{sortedData.length} Elements</span>
            <span className="text-slate-400">|</span>
            <span>{activeTab === 'all' ? 'All Types' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + 's'}</span>
         </div>
         {simStatus === 'completed' && (
            <div className="flex items-center gap-1.5 text-primary font-medium">
               <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
               Results Loaded
            </div>
         )}
      </div>

    </div>
  );
}