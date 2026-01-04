"use client";

import { Database, Eye, EyeOff, RotateCcw, Save, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useNetworkStore } from '@/store/networkStore';
import { useScenarioStore } from '@/store/scenarioStore';
import { useSimulationStore } from '@/store/simulationStore';
import { useUIStore } from '@/store/uiStore';

interface ScenarioManagerPanelProps {
  isMaximized?: boolean;
}

export function ScenarioManagerPanel({ isMaximized = false }: ScenarioManagerPanelProps) {
  const { setActiveModal } = useUIStore();
  const { scenarios, addScenario, removeScenario, toggleVisibility } = useScenarioStore();
  
  const { 
     features, nextIdCounter, setNetworkState, setPatterns, setCurves, setControls, updateSettings 
  } = useNetworkStore();
  
  const { history, status } = useSimulationStore();
  const [newScenarioName, setNewScenarioName] = useState("");

  const handleSave = () => {
    if (!history || !newScenarioName.trim()) return;
    const featureList = Array.from(features.values());
    addScenario(newScenarioName, history, featureList, nextIdCounter);
    setNewScenarioName("");
  };

  const handleRestore = (scenario: any) => {
    if(!confirm(`Restore "${scenario.name}"? Current unsaved changes will be lost.`)) return;
    const snap = scenario.snapshot;
    setNetworkState(snap.geoJSON); 
    if(snap.patterns) setPatterns(snap.patterns);
    if(snap.curves) setCurves(snap.curves);
    if(snap.controls) setControls(snap.controls);
    if(snap.settings) updateSettings(snap.settings);
    useSimulationStore.setState({ 
      history: scenario.results, 
      results: scenario.results.snapshots[scenario.results.snapshots.length-1],
      status: 'completed',
      currentTimeIndex: scenario.results.snapshots.length - 1
    });
    setActiveModal("NONE"); 
  };

  return (
    <div className={cn(
        "flex h-full w-full bg-slate-50 overflow-hidden",
        // Responsive Layout Switcher
        isMaximized ? "flex-row" : "flex-col" 
    )}>
       
       {/* SECTION 1: EDITOR / CONTROLS */}
       {/* If maximized: Left Sidebar (Fixed Width). If Normal: Top Bar (Auto Height) */}
       <div className={cn(
           "bg-white border-slate-200 shrink-0 flex flex-col",
           isMaximized 
             ? "w-64 border-r h-full" 
             : "w-full border-b h-auto"
       )}>
          
          {/* Header Area */}
           
          {/* Form Area */}
          <div className="p-4 space-y-4">
             {/* Status Badge (Only show if plenty of space or maximized) */}
             {(isMaximized || features.size > 0) && (
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Current Session</label>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className={cn("w-2 h-2 rounded-full animate-pulse", status === 'completed' ? "bg-green-500" : "bg-slate-300")} />
                        <span className="text-xs font-bold text-slate-700">
                            {status === 'completed' ? "Results Available" : "No Results"}
                        </span>
                    </div>
                    <div className="text-[10px] text-slate-500 space-y-1 font-mono">
                        <div className="flex justify-between"><span>Nodes:</span> <span>{features.size}</span></div>
                        <div className="flex justify-between"><span>Duration:</span> <span>{history ? (history.summary.duration/3600).toFixed(1) + "h" : "-"}</span></div>
                    </div>
                    </div>
                </div>
             )}

             {/* Save Input Group */}
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase hidden sm:block">Create Snapshot</label>
                <div className={cn("flex gap-2", isMaximized ? "flex-col" : "flex-row items-end")}>
                    <Input 
                       placeholder="Scenario Name..." 
                       value={newScenarioName} 
                       onChange={(e) => setNewScenarioName(e.target.value)}
                       className="h-8 text-xs bg-white flex-1"
                    />
                    <Button 
                       onClick={handleSave} 
                       disabled={!history || !newScenarioName.trim()} 
                       className={cn("h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-sm", isMaximized ? "w-full" : "w-auto px-4")}
                    >
                       <Save size={14} className={cn(isMaximized && "mr-2")} /> 
                       {isMaximized ? "Save Snapshot" : "Save"}
                    </Button>
                </div>
             </div>
          </div>
       </div>

       {/* SECTION 2: SCENARIO LIST */}
       <div className="flex-1 flex flex-col bg-slate-50/50 min-h-0">
          
          {/* List Header */}
          <div className="h-10 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0">
             <span className="text-xs font-bold text-slate-500 uppercase">Saved Scenarios</span>
             <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                {scenarios.length}
             </span>
          </div>

          {/* Scrollable List Area */}
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
             {scenarios.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-3 pb-10">
                   <div className="p-3 bg-slate-100 rounded-full"><Database size={24} /></div>
                   <p className="text-xs font-medium">No saved scenarios.</p>
                </div>
             ) : (
                <div className={cn(
                   "grid gap-3 transition-all",
                   // If Maximized, use 2 columns. If Normal, use 1 column.
                   isMaximized ? "grid-cols-2" : "grid-cols-1"
                )}>
                   {scenarios.map((s) => (
                      <div key={s.id} className="group bg-white p-3 rounded border border-slate-200 hover:border-purple-300 hover:shadow-sm transition-all flex flex-col relative">
                         
                         {/* Card Header */}
                         <div className="flex justify-between items-start mb-2">
                            <div className="flex gap-2 items-center overflow-hidden">
                               <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                               <span className="text-xs font-bold text-slate-700 truncate" title={s.name}>{s.name}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 bg-slate-50 px-1 rounded shrink-0">
                               {new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                         </div>

                         {/* Card Body */}
                         <div className="text-[10px] text-slate-500 mb-3 pl-4.5 flex gap-3">
                            <span>{s.snapshot?.geoJSON?.length || 0} Items</span>
                            <span className="text-slate-300">|</span>
                            <span>{s.results ? "Simulated" : "Draft"}</span>
                         </div>

                         {/* Card Footer Actions */}
                         <div className="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between pl-1">
                            <Button variant="ghost" size="sm" onClick={() => handleRestore(s)} className="h-6 px-2 text-[10px] text-slate-600 hover:text-green-700 hover:bg-green-50 font-bold -ml-1">
                               <RotateCcw size={12} className="mr-1.5" /> Restore
                            </Button>
                            <div className="flex gap-1">
                               <button onClick={() => toggleVisibility(s.id)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded">
                                  {s.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                               </button>
                               <button onClick={() => removeScenario(s.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                  <Trash2 size={14} />
                               </button>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </div>
       </div>
    </div>
  );
}