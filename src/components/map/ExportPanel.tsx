"use client";

import { CheckCircle2, Download, FileCode2, Globe } from "lucide-react";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { useExportProject } from "@/hooks/useExportProject";
import { useUIStore } from "@/store/uiStore";
import { FloatingPanel } from "./FloatingPanel";

export function ExportPanel() {
  const { activeModal, setActiveModal } = useUIStore();
  const { exportToINP, exportToGeoJSON } = useExportProject();
  
  const [format, setFormat] = useState<'inp' | 'geojson'>('inp');
  const [loading, setLoading] = useState(false);

  const handleClose = () => setActiveModal("NONE");

  const handleExport = async () => {
    setLoading(true);
    setTimeout(() => {
        if (format === 'inp') exportToINP();
        else exportToGeoJSON();
        setLoading(false);
    }, 500);
  };

  return (
    <FloatingPanel
        title="Export Data"
        icon={Download}
        isOpen={activeModal === "EXPORT_PROJECT"}
        onClose={handleClose}
        footer={
            <>
                <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs">Cancel</Button>
                <Button 
                    size="sm" 
                    onClick={handleExport} 
                    disabled={loading}
                    className="text-xs"
                >
                    {loading ? "Exporting..." : "Download File"}
                </Button>
            </>
        }
    >
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
           Download the network configuration for simulation or GIS analysis.
        </p>

        <div className="space-y-3">
            <ExportOption 
                active={format === 'inp'}
                onClick={() => setFormat('inp')}
                icon={FileCode2}
                title="EPANET Simulation File (.inp)"
                desc="Standard format for hydraulic analysis. Contains full simulation settings, controls, and curves."
                badge="Best for Engineers"
            />
            <ExportOption 
                active={format === 'geojson'}
                onClick={() => setFormat('geojson')}
                icon={Globe}
                title="GeoJSON (.json)"
                desc="Geospatial format for QGIS, ArcGIS, or web mapping. Contains geometry and basic attributes."
                badge="Best for GIS"
            />
        </div>
    </FloatingPanel>
  );
}

function ExportOption({ active, onClick, icon: Icon, title, desc, badge }: any) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "relative cursor-pointer rounded-md border p-3 flex items-start gap-3 transition-all",
                active
                    ? "border-primary bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-primary/20"
                    : "border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-950"
            )}
        >
            <div className={cn(
                "absolute top-4 right-4 transition-all duration-300",
                active ? "opacity-100 scale-100" : "opacity-0 scale-75"
            )}>
                <CheckCircle2 size={20} className="text-primary fill-blue-100" />
            </div>
            <div className={cn("p-2 rounded shrink-0 transition-colors", active ? "bg-primary text-white" : "bg-slate-100 text-slate-500")}>
                <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className={cn("font-bold text-xs", active ? "text-primary" : "text-slate-700")}>{title}</h3>
                
                {active && badge && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-primary px-1.5 py-0.5 rounded">
                        {badge}
                    </span>
                )}
                <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{desc}</p>
            </div>
        </div>
    );
}