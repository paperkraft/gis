"use client";

import { Printer, Compass, Type } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { handlePrint, PrintOptions, LegendData } from "@/lib/interactions/map-controls";
import { useMapStore } from "@/store/mapStore";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";
import { useStyleStore } from "@/store/styleStore";
import { calculateLegendBins, getUnit } from "@/lib/styles/helper";
import { FloatingPanel } from "./FloatingPanel";
import { FormGroup } from "../form-controls/FormGroup";
import { FormSelect } from "../form-controls/FormSelect";
import { FormInput } from "../form-controls/FormInput";

export function PrintPanel() {
  const { activeRightPanel, setActiveRightPanel } = useUIStore();
  const map = useMapStore((state) => state.map);
  const { settings } = useNetworkStore();

  const [options, setOptions] = useState<PrintOptions>({
    pageSize: "A4",
    orientation: "landscape",
    showNorthArrow: true,
    showTitle: true,
    showDescription: true,
    customTitle: settings.title || "",
    customDescription: settings.description || "",
    logoUrl: '/logo.svg',
    drawnBy: 'sys',
    checkedBy: '',
  });

  const handleClose = () => setActiveRightPanel("NONE");

  const onPrint = () => {
    // 1. Calculate Network Extent
    const layers = map?.getLayers().getArray() || [];
    const vectorLayer = layers.find(
      (l) => l.get("name") === "network" || l.get("title") === "Network Layer"
    );
    const source = (vectorLayer as any)?.getSource();
    const features = source?.getFeatures() || [];

    let extent: number[] | undefined;
    if (features.length > 0) {
      features.forEach((f: any) => {
        const geom = f.getGeometry();
        if (geom) {
          const fExtent = geom.getExtent();
          if (!extent) {
            extent = [...fExtent];
          } else {
            extent[0] = Math.min(extent[0], fExtent[0]);
            extent[1] = Math.min(extent[1], fExtent[1]);
            extent[2] = Math.max(extent[2], fExtent[2]);
            extent[3] = Math.max(extent[3], fExtent[3]);
          }
        }
      });
    }

    // 2. Legend Data
    const { 
      nodeColorMode, linkColorMode, minMax,
      nodeGradient, linkGradient, classCount,
      nodeClassification, linkClassification,
      nodeCustomBreaks, linkCustomBreaks,
      nodeReverse, linkReverse,
      nodeLegendFramed, linkLegendFramed
    } = useStyleStore.getState();

    const legends: LegendData[] = [];
    const mapEl = document.getElementById('map-viewport-container');
    const mapRect = mapEl?.getBoundingClientRect();

    // Node Legend
    if (nodeColorMode !== 'none') {
      const el = document.getElementById('legend-node');
      const rect = el?.getBoundingClientRect();
      let x = 80, y = 70; // Default fallback
      if (rect && mapRect) {
        x = ((rect.left - mapRect.left) / mapRect.width) * 100;
        y = ((rect.top - mapRect.top) / mapRect.height) * 100;
      }

      legends.push({
        title: nodeColorMode,
        unit: getUnit(nodeColorMode),
        bins: calculateLegendBins(minMax[nodeColorMode], nodeGradient, classCount, nodeClassification, nodeCustomBreaks, nodeReverse),
        x, y,
        framed: nodeLegendFramed
      });
    }

    // Link Legend
    if (linkColorMode !== 'none') {
      const el = document.getElementById('legend-link');
      const rect = el?.getBoundingClientRect();
      let x = 70, y = 70; // Default fallback
      if (rect && mapRect) {
        x = ((rect.left - mapRect.left) / mapRect.width) * 100;
        y = ((rect.top - mapRect.top) / mapRect.height) * 100;
      }

      legends.push({
        title: linkColorMode,
        unit: getUnit(linkColorMode),
        bins: calculateLegendBins(minMax[linkColorMode], linkGradient, classCount, linkClassification, linkCustomBreaks, linkReverse),
        x, y,
        framed: linkLegendFramed
      });
    }

    // 3. Execute Print
    handlePrint(map, { ...options, networkExtent: extent, legends });
    handleClose();
  };

  return (
    <FloatingPanel
      title="Print Map"
      icon={Printer}
      isOpen={activeRightPanel === "PRINT_MAP"}
      onClose={handleClose}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={onPrint} className="text-xs">
            Proceed to Print
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-slate-700">
        <FormGroup label="Page Configuration">
          <FormSelect
            label="Paper Size"
            value={options.pageSize}
            onChange={(v) => setOptions({ ...options, pageSize: v })}
            options={[{ label: "A4", value: "A4" }, { label: "A3", value: "A3" }, { label: "Letter", value: "Letter" }, { label: "Legal", value: "Legal" }]}
          />

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                Orientation
              </label>
              <OrientationToggle value={options.orientation} onChange={(v: any) => setOptions({ ...options, orientation: v })} />
            </div>
          </div>
        </FormGroup>

        <FormGroup label="Layout Options">
          <div className="space-y-2">
            <PanelCheckbox
              label="Show North Arrow"
              icon={Compass}
              checked={options.showNorthArrow}
              onChange={(checked: boolean) => setOptions({ ...options, showNorthArrow: checked })}
              color="blue"
            />
            <PanelCheckbox
              label="Show Title & Info"
              icon={Type}
              checked={options.showTitle}
              onChange={(checked: boolean) => setOptions({ ...options, showTitle: checked })}
              color="orange"
            />
          </div>

          {options.showTitle && (
            <>
              <FormInput label="Title" value={options.customTitle} onChange={(v) => setOptions({ ...options, customTitle: v })} />
              <FormInput label="Description" value={options.customDescription} onChange={(v) => setOptions({ ...options, customDescription: v })} />
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Drawn By" value={options.drawnBy} onChange={(v) => setOptions({ ...options, drawnBy: v })} />
                <FormInput label="Checked By" value={options.checkedBy} onChange={(v) => setOptions({ ...options, checkedBy: v })} />
              </div>
            </>
          )}
        </FormGroup>
      </div>
    </FloatingPanel>
  );
}

function PanelCheckbox({ label, icon: Icon, checked, onChange, color }: any) {
  const colorMap: any = {
    blue: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
    orange: "text-orange-500 bg-orange-50 dark:bg-orange-900/20",
  };

  return (
    <label className="flex items-center justify-between p-2 rounded border border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-all">
      <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
        <div className={`p-1.5 rounded ${colorMap[color]}`}>
          <Icon size={12} />
        </div>
        {label}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500"
      />
    </label>
  );
}


function OrientationToggle({ value, onChange }: any) {
  return (
    <div className="flex bg-slate-100 dark:bg-slate-800/50 p-0.5 rounded h-8">
      <button
        onClick={() => onChange("landscape")}
        className={`flex-1 rounded-sm text-[10px] font-bold transition-all ${value === "landscape"
          ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400"
          : "text-slate-500 hover:text-slate-700"
          }`}
      >
        Landscape
      </button>
      <button
        onClick={() => onChange("portrait")}
        className={`flex-1 rounded-sm text-[10px] font-bold transition-all ${value === "portrait"
          ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400"
          : "text-slate-500 hover:text-slate-700"
          }`}
      >
        Portrait
      </button>
    </div>
  );
}