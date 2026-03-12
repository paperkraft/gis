"use client";

import {
  Printer,
  Maximize2,
  FileText,
  Compass,
  Type,
  AlignLeft,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { handlePrint, PrintOptions } from "@/lib/interactions/map-controls";
import { useMapStore } from "@/store/mapStore";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";
import { FloatingPanel } from "./FloatingPanel";

export function PrintPanel() {
  const { activeModal, setActiveModal } = useUIStore();
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

  const handleClose = () => setActiveModal("NONE");

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

    // 2. Execute Print
    handlePrint(map, { ...options, networkExtent: extent });
    handleClose();
  };

  return (
    <FloatingPanel
      title="Print Map"
      icon={Printer}
      isOpen={activeModal === "PRINT_MAP"}
      onClose={handleClose}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onPrint}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Printer className="w-3.5 h-3.5" />
            Proceed to Print
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Page Settings */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Page Configuration
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Size
              </label>
              <select
                value={options.pageSize}
                onChange={(e) => setOptions({ ...options, pageSize: e.target.value as any })}
                className="w-full h-8 px-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="A4">A4 Standard</option>
                <option value="A3">A3 Large</option>
                <option value="Letter">Letter</option>
                <option value="Legal">Legal</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Maximize2 className="w-3.5 h-3.5" /> Orientation
              </label>
              <div className="flex bg-slate-100 dark:bg-slate-800/50 p-0.5 rounded h-8">
                <button
                  onClick={() => setOptions({ ...options, orientation: "landscape" })}
                  className={`flex-1 rounded-sm text-[10px] font-bold transition-all ${options.orientation === "landscape"
                    ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400"
                    : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  Landscape
                </button>
                <button
                  onClick={() => setOptions({ ...options, orientation: "portrait" })}
                  className={`flex-1 rounded-sm text-[10px] font-bold transition-all ${options.orientation === "portrait"
                    ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400"
                    : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  Portrait
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Layout Features */}
        <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Layout Options
          </h3>

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
        </div>

        {/* Text Customization */}
        {options.showTitle && (
          <div className="space-y-3 pt-1 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Type className="w-3.5 h-3.5 text-slate-400" /> Map Title
              </label>
              <input
                type="text"
                value={options.customTitle}
                onChange={(e) => setOptions({ ...options, customTitle: e.target.value })}
                placeholder="Enter map title..."
                className="w-full h-8 px-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <AlignLeft className="w-3.5 h-3.5 text-slate-400" /> Description
              </label>
              <textarea
                value={options.customDescription}
                onChange={(e) => setOptions({ ...options, customDescription: e.target.value })}
                placeholder="Enter description..."
                rows={2}
                className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  Drawn By
                </label>
                <input
                  type="text"
                  value={options.drawnBy}
                  onChange={(e) => setOptions({ ...options, drawnBy: e.target.value })}
                  placeholder="sys"
                  className="w-full h-8 px-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  Checked By
                </label>
                <input
                  type="text"
                  value={options.checkedBy}
                  onChange={(e) => setOptions({ ...options, checkedBy: e.target.value })}
                  placeholder="Checked by..."
                  className="w-full h-8 px-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}
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
