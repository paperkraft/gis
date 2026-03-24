import React from 'react';

import { Edit2, Mountain, Layers, Map as MapIcon, Info } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

export function TerrainOptionsPanel() {
  const { setActiveModal } = useUIStore();

  const options = [
    {
      id: "manual",
      title: "Manual Input",
      description: "Manually enter the elevation data for the network.",
      icon: Edit2,
      action: () => {
        // Handle manual input action or switch modal
        // setActiveModal("SOME_MANUAL_INPUT_MODAL");
        console.log("Manual Input Selected");
      }
    },
    {
      id: "auto",
      title: "Open Elevation",
      description: "Use pre-existing elevation data available in the system.",
      icon: Mountain,
      action: () => {
        setActiveModal("AUTO_ELEVATION");
      }
    },
    {
      id: "contours",
      title: "Contours",
      description: "Display contour lines on the map to assist with network drawing.",
      icon: Layers,
      action: () => {
        setActiveModal("CONTOURS_PANEL");
      }
    },
    {
      id: "combined",
      title: "Open Elevation + Contours",
      description: "Combine both elevation data and contour lines for more detailed terrain information.",
      icon: MapIcon,
      action: () => {
        setActiveModal("CONTOURS_PANEL");
      }
    }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/30 overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        
        {/* 1. Header Info Box */}
        <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-[11px] text-blue-800 space-y-2">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                <Info size={14} />
                <span>Terrain Configuration</span>
            </div>
            <p className="opacity-80 leading-relaxed">
                Choose how elevation data is sourced for your network. Auto Elevation uses satellite data, while Contours provide visual guidance.
            </p>
        </div>

        <div className="space-y-4">
            {/* 2. Section Header */}
            <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider px-1">
                Available Strategies
            </h4>

            {/* 3. Options Grid */}
            <div className="grid grid-cols-1 gap-3">
            {options.map((opt) => {
                const Icon = opt.icon;
                return (
                <button 
                    key={opt.id} 
                    className="group w-full text-left rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 hover:border-blue-400 hover:bg-white hover:shadow-md transition-all duration-300"
                    onClick={opt.action}
                >
                    <div className="p-3 flex items-start gap-3">
                        <div className="p-2 rounded bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0 py-0.5">
                            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-700 transition-colors">
                            {opt.title}
                            </h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {opt.description}
                            </p>
                        </div>
                    </div>
                </button>
                );
            })}
            </div>
        </div>
      </div>
    </div>
  );
}
