import React from 'react';

import { Edit2, Mountain, Layers, Map as MapIcon } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

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
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-950 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col gap-4 p-4">
        <div className="text-sm text-slate-500 mb-2">
          Choose a Terrain Option:
        </div>
        <div className="grid grid-cols-1 gap-4">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <div 
                key={opt.id} 
                className="group cursor-pointer rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all shadow-sm hover:shadow-md"
                onClick={opt.action}
              >
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                    {opt.title}
                  </h3>
                </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {opt.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
