import React from 'react';
import { useParams } from 'next/navigation';
import { Edit2, Mountain, Layers, Map as MapIcon, Info, CheckCircle2 } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useNetworkStore } from '@/store/networkStore';
import { ProjectService } from '@/lib/services/ProjectService';
import { cn } from '@/lib/utils';

export function TerrainOptionsPanel() {
  const params = useParams();
  const { setActiveModal, setMenuStatus } = useUIStore();
  const { settings, updateSettings } = useNetworkStore();
  const selectedOptionId = settings.selectedTerrainOption;

  const handleSelect = (id: string, action: () => void) => {
    // 1. Update mandatory status in project settings
    const updatedStatuses = { 
      ...(settings.mandatorySetupStatuses || {}), 
      "itm_terrain": "visited" as const 
    };

    // 2. Persist to network store
    updateSettings({ 
      selectedTerrainOption: id,
      mandatorySetupStatuses: updatedStatuses 
    });

    // 3. UI Status Sync
    setMenuStatus("itm_terrain", "visited");

    // 4. Auto-Save to Backend
    setTimeout(() => {
        if (params?.id) {
            ProjectService.saveCurrentProject(params.id as string);
        }
    }, 100);

    action();
  };

  const options = [
    {
      id: "manual",
      title: "Manual Input",
      description: "Manually enter the elevation data for the network nodes.",
      icon: Edit2,
      action: () => {
        // Handle manual input action if needed
        console.log("Manual Input Selected");
      }
    },
    {
      id: "auto",
      title: "Open Elevation",
      description: "Automatically fetch elevation data from global satellite datasets.",
      icon: Mountain,
      action: () => {
        setActiveModal("AUTO_ELEVATION");
      }
    },
    {
      id: "contours",
      title: "Contours",
      description: "Upload and interpolate elevations from contour line spatial files.",
      icon: Layers,
      action: () => {
        setActiveModal("CONTOURS_PANEL");
      }
    },
    {
      id: "combined",
      title: "Open Elevation + Contours",
      description: "Combine satellite data with contour lines for premium accuracy.",
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
                Choose how elevation data is sourced for your network. Auto Elevation uses satellite data, while Contours provide visual guidance and interpolation sources.
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
                const isSelected = selectedOptionId === opt.id;
                
                return (
                <button 
                    key={opt.id} 
                    className={cn(
                      "group w-full text-left rounded-lg border transition-all duration-300 relative",
                      isSelected 
                        ? "border-blue-500 bg-blue-50/30 shadow-sm ring-1 ring-blue-500/20" 
                        : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 hover:border-slate-300 hover:shadow-md"
                    )}
                    onClick={() => handleSelect(opt.id, opt.action)}
                >
                    {/* Selected Status Indicator (Top Right) */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 text-blue-600 animate-in fade-in zoom-in duration-300">
                        <CheckCircle2 size={16} fill="currentColor" className="text-white fill-blue-600" />
                      </div>
                    )}

                    <div className="p-3 flex items-start gap-4">
                        <div className={cn(
                          "p-2.5 rounded-lg transition-colors",
                          isSelected 
                            ? "bg-blue-600 text-white" 
                            : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600"
                        )}>
                            <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0 py-0.5">
                            <h3 className={cn(
                              "text-sm font-bold transition-colors",
                              isSelected ? "text-blue-900" : "text-slate-700 dark:text-slate-200 group-hover:text-blue-700"
                            )}>
                            {opt.title}
                            </h3>
                            <p className={cn(
                              "text-[11px] mt-0.5 leading-relaxed",
                              isSelected ? "text-blue-700/70" : "text-slate-500 dark:text-slate-400"
                            )}>
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
