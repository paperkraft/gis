"use client";

import {
    Activity, AlertCircle, ArrowLeft, CheckCircle2, Clock, Play, Settings
} from 'lucide-react';
import React, { useState } from 'react';

import { FormGroup } from '@/components/form-controls/FormGroup';
import { FormInput } from '@/components/form-controls/FormInput';
import { flowUnitOptions, headLossUnitOptions } from '@/constants/project';
import { useSimulationStore } from '@/store/simulationStore';
import { useStyleStore } from '@/store/styleStore';
import { useUIStore } from '@/store/uiStore';

import { FormSelect } from '../form-controls/FormSelect';
import { useNetworkStore } from '@/store/networkStore';
import { HeadlossFormula } from '@/types/network';

export function SetupView() {
    const { setActiveModal, setActivePanel } = useUIStore();
    const { runSimulation, isSimulating } = useSimulationStore();
    const { setColorMode } = useStyleStore();

    const { updateSettings, features, settings } = useNetworkStore();

    const [activeSection, setActiveSection] = useState("control");
    const [statusMsg, setStatusMsg] = useState("Ready to solve.");
    const [statusColor, setStatusColor] = useState<"blue"|"green"|"red">("blue");

    const [config, setConfig] = useState({
        duration: 24, 
        timeStep: "1:00",
        startClock: "12:00 AM",
        flowUnits: settings.units, 
        headloss: settings.headloss as HeadlossFormula , 
        accuracy: settings.accuracy, 
        trials: settings.trials
    });

    const handleRun = async () => {
        setStatusMsg("Building model...");
        setStatusColor("blue");

        updateSettings(config);

        setTimeout(async () => {
            if (features.size === 0) {
                setStatusMsg("Error: Network empty."); 
                setStatusColor("red"); 
                return;
            }
            
            setStatusMsg("Running Solver...");
            
            const success = await runSimulation();

            if (success) {
                setStatusMsg("Converged."); 
                setStatusColor("green"); 
                setColorMode('pressure');
            } else {
                setStatusMsg("Solver Failed."); 
                setStatusColor("red");
            }
        }, 50);
    };

    const toggleSection = (id: string) => setActiveSection(activeSection === id ? "" : id);

    const handleBack = () => {
        setActiveModal("NONE");
        setActivePanel("NONE");
    }

    return (
        <div className="flex flex-col h-full bg-white text-slate-700 animate-in slide-in-from-left-4">
             <div className="flex items-center gap-2 p-3 border-b border-slate-100 bg-slate-50">
                <button onClick={handleBack} className="p-1.5 hover:bg-white rounded text-slate-400 hover:text-slate-700 transition-all"><ArrowLeft size={14} /></button>
                <div><h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Simulation Setup</h2><p className="text-[10px] text-slate-500">Analysis Configuration</p></div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                <SimSection id="control" title="Time & Control" icon={Clock} isOpen={activeSection === "control"} onToggle={() => setActiveSection(activeSection === "control" ? "" : "control")}>
                   <div className="space-y-3 px-1">
                     <FormGroup label="Duration">
                       <div className="grid grid-cols-2 gap-3">
                          <FormInput label="Total Hrs" value={config.duration} onChange={(v:any) => setConfig({...config, duration: v})} type="number" />
                          <FormInput label="Hydraulic Step" value={config.timeStep} onChange={(v:any) => setConfig({...config, timeStep: v})} />
                       </div>
                     </FormGroup>
                  </div>
                </SimSection>

                <SimSection id="hydraulics" title="Hydraulics" icon={Activity} isOpen={activeSection === "hydraulics"} onToggle={() => toggleSection("hydraulics")}>
                    <div className="space-y-3 px-1">
                        <FormGroup label="System Properties">
                        <FormSelect label="Flow Units" value={config.flowUnits} onChange={(v:any) => setConfig({...config, flowUnits: v})} options={flowUnitOptions}/>
                        <FormSelect label="Head Loss Model" value={config.headloss} onChange={(v:any) => setConfig({...config, headloss: v})} options={headLossUnitOptions}/>
                        </FormGroup>
                    </div>
                </SimSection>
        
                <SimSection id="options" title="Solver Options" icon={Settings} isOpen={activeSection === "options"} onToggle={() => toggleSection("options")}>
                    <div className="space-y-3 px-1">
                        <FormGroup label="Convergence">
                        <div className="grid grid-cols-2 gap-3">
                            <FormInput label="Accuracy" value={config.accuracy} onChange={(v:any) => setConfig({...config, accuracy: v})} />
                            <FormInput label="Max Trials" value={config.trials} onChange={(v:any) => setConfig({...config, trials: v})} />
                        </div>
                        </FormGroup>
                    </div>
                </SimSection>

                <div className={`border rounded p-2 flex gap-2 transition-all ${statusColor === 'blue' ? 'bg-blue-50 border-blue-100 text-blue-700' : statusColor === 'green' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                    {statusColor === 'green' ? <CheckCircle2 size={14} className="mt-0.5" /> : <AlertCircle size={14} className="mt-0.5" />}
                    <p className="text-[10px] font-medium py-0.5">{statusMsg}</p>
                </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50">
                <button onClick={handleRun} disabled={isSimulating} className={`w-full py-2.5 rounded shadow-sm flex items-center justify-center gap-2 text-xs font-bold text-white transition-all ${isSimulating ? 'bg-slate-400 cursor-wait' : 'bg-green-600 hover:bg-green-700'}`}>
                   {isSimulating ? <><Activity size={14} className="animate-spin" /> Solving...</> : <><Play size={14} fill="currentColor" /> Run Simulation</>}
                </button>
            </div>
        </div>
    );
}

// Helper for Collapsible Sections
function SimSection({ title, icon: Icon, isOpen, onToggle, children }: any) { 
    return (
        <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
            <button onClick={onToggle} className={`w-full flex items-center gap-2 px-3 py-2.5 text-left ${isOpen ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                <div className="p-1 rounded bg-blue-100 text-blue-600"><Icon size={12}/></div>
                <span className="text-xs font-bold text-slate-700 flex-1">{title}</span>
            </button>
            {isOpen && <div className="border-t border-slate-100 p-3">{children}</div>}
        </div>
    );
}