"use client";

import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Play,
  Settings,
} from "lucide-react";
import React, { useEffect, useState } from "react";

import { FormGroup } from "@/components/form-controls/FormGroup";
import { FormInput } from "@/components/form-controls/FormInput";
import { flowUnitOptions, headLossUnitOptions } from "@/constants/project";
import { cn } from "@/lib/utils";
import { useNetworkStore } from "@/store/networkStore";
import { useSimulationStore } from "@/store/simulationStore";
import { useStyleStore } from "@/store/styleStore";
import { useUIStore } from "@/store/uiStore";
import { FlowUnits, HeadlossFormula } from "@/types/network";

import { FormSelect } from "../form-controls/FormSelect";

export function SetupView() {
  const { setActiveModal, setActivePanel } = useUIStore();
  const { runSimulation, isSimulating } = useSimulationStore();
  const { setNodeColorMode, setLinkColorMode } = useStyleStore();

  const { updateSettings, features, settings } = useNetworkStore();

  const [activeSection, setActiveSection] = useState("control");
  const [statusMsg, setStatusMsg] = useState("Ready to solve.");
  const [statusColor, setStatusColor] = useState<"blue" | "green" | "red">(
    "blue"
  );

  // Local state for form handling
  const [formData, setFormData] = useState({
    duration: settings.duration,
    hydraulicStep: settings.hydraulicStep,

    units: settings.units,
    headloss: settings.headloss,

    accuracy: settings.accuracy || 0.001,
    maxTrials: settings.maxTrials || 40,
  });

  useEffect(() => {
    setFormData({
      duration: settings.duration || "24:00",
      hydraulicStep: settings.hydraulicStep || "1:00",

      units: settings.units as FlowUnits,
      headloss: settings.headloss as HeadlossFormula,

      accuracy: settings.accuracy || 0.001,
      maxTrials: settings.maxTrials || 40,
    });
  }, [settings]);

  const handleRun = async () => {
    setStatusMsg("Building model...");
    setStatusColor("blue");

    // 1. Save Config to Store first
    updateSettings({
      duration: formData.duration || "24:00",
      hydraulicStep: formData.hydraulicStep || "1:00",

      units: formData.units as FlowUnits,
      headloss: formData.headloss as HeadlossFormula,

      maxTrials: Number(formData.maxTrials) || 0.001,
      accuracy: Number(formData.accuracy) || 40,
    });

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
        setNodeColorMode("pressure");
        setLinkColorMode("velocity");
      } else {
        setStatusMsg("Solver Failed.");
        setStatusColor("red");
      }
    }, 50);
  };

  const toggleSection = (id: string) =>
    setActiveSection(activeSection === id ? "" : id);

  const handleBack = () => {
    setActiveModal("NONE");
    setActivePanel("NONE");
    setNodeColorMode("none");
    setLinkColorMode("none");
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-700 animate-in slide-in-from-left-4">
      <div className="flex items-center gap-2 p-3 border-b border-slate-100 bg-slate-50">
        <button
          onClick={handleBack}
          className="p-1.5 hover:bg-white rounded text-slate-400 hover:text-slate-700 transition-all"
        >
          <ArrowLeft size={14} />
        </button>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Simulation Setup
          </h2>
          <p className="text-[10px] text-slate-500">Analysis Configuration</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        <SimSection
          id="control"
          title="Time & Control"
          icon={Clock}
          isOpen={activeSection === "control"}
          onToggle={() =>
            setActiveSection(activeSection === "control" ? "" : "control")
          }
        >
          <FormGroup label="Duration">
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Total Hrs"
                value={formData.duration}
                onChange={(v) => setFormData({ ...formData, duration: v })}
                placeholder="24:00"
              />
              <FormInput
                label="Hydraulic Step"
                value={formData.hydraulicStep}
                onChange={(v) => setFormData({ ...formData, hydraulicStep: v })}
                placeholder="1:00"
              />
            </div>
          </FormGroup>
        </SimSection>

        <SimSection
          id="hydraulics"
          title="Hydraulics"
          icon={Activity}
          isOpen={activeSection === "hydraulics"}
          onToggle={() => toggleSection("hydraulics")}
        >
          <FormGroup label="System Properties">
            <FormSelect
              label="Flow Units"
              value={formData.units}
              onChange={(v) => setFormData({ ...formData, units: v })}
              options={flowUnitOptions}
            />
            <FormSelect
              label="Head Loss Model"
              value={formData.headloss}
              onChange={(v) => setFormData({ ...formData, headloss: v })}
              options={headLossUnitOptions}
            />
          </FormGroup>
        </SimSection>

        <SimSection
          id="options"
          title="Solver Options"
          icon={Settings}
          isOpen={activeSection === "options"}
          onToggle={() => toggleSection("options")}
        >
          <FormGroup label="Convergence">
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Accuracy"
                value={formData.accuracy}
                onChange={(v) => setFormData({ ...formData, accuracy: v })}
                type="number"
                step="0.001"
              />
              <FormInput
                label="Max Trials"
                value={formData.maxTrials}
                onChange={(v) => setFormData({ ...formData, maxTrials: v })}
                type="number"
              />
            </div>
          </FormGroup>
        </SimSection>

        <div
          className={`border rounded p-2 flex gap-2 transition-all ${
            statusColor === "blue"
              ? "bg-blue-50 border-blue-100 text-blue-700"
              : statusColor === "green"
              ? "bg-green-50 border-green-100 text-green-700"
              : "bg-red-50 border-red-100 text-red-700"
          }`}
        >
          {statusColor === "green" ? (
            <CheckCircle2 size={14} className="mt-0.5" />
          ) : (
            <AlertCircle size={14} className="mt-0.5" />
          )}
          <p className="text-[10px] font-medium py-0.5">{statusMsg}</p>
        </div>
      </div>

      <div className="p-3 border-t border-slate-100 bg-slate-50">
        <button
          onClick={handleRun}
          disabled={isSimulating}
          className={cn(
            "w-full py-2.5 rounded shadow-sm flex items-center justify-center gap-2 text-xs font-bold text-white transition-all",
            isSimulating
              ? "bg-slate-400 cursor-wait"
              : "bg-green-600 hover:bg-green-700"
          )}
        >
          {isSimulating ? (
            <>
              <Activity size={14} className="animate-spin" />
              Solving...
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" />
              Run Simulation
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Helper for Collapsible Sections
function SimSection({ title, icon: Icon, isOpen, onToggle, children }: any) {
  return (
    <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left ${
          isOpen ? "bg-slate-50" : "hover:bg-slate-50"
        }`}
      >
        <div className="p-1 rounded bg-blue-100 text-blue-600">
          <Icon size={12} />
        </div>
        <span className="text-xs font-bold text-slate-700 flex-1">{title}</span>
      </button>
      {isOpen && (
        <div className="border-t border-slate-100 p-3">{children}</div>
      )}
    </div>
  );
}
