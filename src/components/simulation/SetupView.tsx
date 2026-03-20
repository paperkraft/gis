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

export function SetupView({ isMaximized }: { isMaximized?: boolean }) {
  const { setActiveModal, setActivePanel } = useUIStore();
  const { runSimulation, isSimulating } = useSimulationStore();
  const { setNodeColorMode, setLinkColorMode } = useStyleStore();

  const { updateSettings, features, settings } = useNetworkStore();

  const [activeSection, setActiveSection] = useState("control");
  const [statusMsg, setStatusMsg] = useState("Ready to solve.");
  const [statusColor, setStatusColor] = useState<"blue" | "green" | "red">("blue");

  // Local state for form handling
  const [formData, setFormData] = useState({
    duration: settings.duration || "24:00",
    hydraulicStep: settings.hydraulicStep || "1:00",

    units: (settings.units as FlowUnits) || "LPS",
    headloss: (settings.headloss as HeadlossFormula) || "H-W",

    accuracy: settings.accuracy || 0.001,
    maxTrials: settings.maxTrials || 40,

    patternStep: settings.patternStep || "1:00",
    reportStep: settings.reportStep || "1:00",
    reportStart: settings.reportStart || "0:00",
    startClock: settings.startClock || "12:00 AM",
    statistic: settings.statistic || "NONE",

    specificGravity: settings.specificGravity || 1.0,
    viscosity: settings.viscosity || 1.0,
  });

  useEffect(() => {
    setFormData({
      duration: settings.duration || "24:00",
      hydraulicStep: settings.hydraulicStep || "1:00",

      units: settings.units as FlowUnits,
      headloss: settings.headloss as HeadlossFormula,

      accuracy: settings.accuracy || 0.001,
      maxTrials: settings.maxTrials || 40,

      patternStep: settings.patternStep || "1:00",
      reportStep: settings.reportStep || "1:00",
      reportStart: settings.reportStart || "0:00",
      startClock: settings.startClock || "12:00 AM",
      statistic: settings.statistic || "NONE",

      specificGravity: settings.specificGravity || 1.0,
      viscosity: settings.viscosity || 1.0,
    });
  }, [settings]);

  const handleRun = async () => {
    setStatusMsg("Building model...");
    setStatusColor("blue");

    // 1. Save Config to Store first
    updateSettings({
      duration: formData.duration || "24:00",
      hydraulicStep: formData.hydraulicStep || "1:00",
      patternStep: formData.patternStep || "1:00",
      reportStep: formData.reportStep || "1:00",
      reportStart: formData.reportStart || "0:00",
      startClock: formData.startClock || "12:00 AM",
      statistic: formData.statistic as any || "NONE",

      units: formData.units as FlowUnits || "LPS",
      headloss: formData.headloss as HeadlossFormula || "H-W",

      specificGravity: Number(formData.specificGravity) || 1.0,
      viscosity: Number(formData.viscosity) || 1.0,

      maxTrials: Number(formData.maxTrials) || 40,
      accuracy: Number(formData.accuracy) || 0.001,
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

      <div className={cn(
        "flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3",
        isMaximized && "grid grid-cols-2 gap-4 space-y-0 align-top content-start"
      )}>
        <SimSection
          id="control"
          title="Time & Control"
          icon={Clock}
          isOpen={activeSection === "control"}
          onToggle={() =>
            setActiveSection(activeSection === "control" ? "" : "control")
          }
          isAlwaysOpen={isMaximized}
        >
          <div className="space-y-3">
            <FormGroup label="Simulation Duration">
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Total Duration"
                  value={formData.duration}
                  onChange={(v) => setFormData({ ...formData, duration: v })}
                  placeholder="24:00"
                />
                <FormInput
                  label="Start Clock"
                  value={formData.startClock}
                  onChange={(v) => setFormData({ ...formData, startClock: v })}
                  placeholder="12:00 AM"
                />
              </div>
            </FormGroup>

            <FormGroup label="Timesteps">
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Hydraulic Step"
                  value={formData.hydraulicStep}
                  onChange={(v) => setFormData({ ...formData, hydraulicStep: v })}
                  placeholder="1:00"
                />
                <FormInput
                  label="Pattern Step"
                  value={formData.patternStep}
                  onChange={(v) => setFormData({ ...formData, patternStep: v })}
                  placeholder="1:00"
                />
              </div>
            </FormGroup>
          </div>
        </SimSection>

        <SimSection
          id="hydraulics"
          title="Hydraulics"
          icon={Activity}
          isOpen={activeSection === "hydraulics"}
          onToggle={() => toggleSection("hydraulics")}
          isAlwaysOpen={isMaximized}
        >
          <div className="space-y-3">
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

            <FormGroup label="Fluid Properties">
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Spec. Gravity"
                  value={formData.specificGravity}
                  onChange={(v) => setFormData({ ...formData, specificGravity: v })}
                  type="number"
                  step="0.01"
                />
                <FormInput
                  label="Rel. Viscosity"
                  value={formData.viscosity}
                  onChange={(v) => setFormData({ ...formData, viscosity: v })}
                  type="number"
                  step="0.01"
                />
              </div>
            </FormGroup>
          </div>
        </SimSection>

        <SimSection
          id="options"
          title="Solver Options"
          icon={Settings}
          isOpen={activeSection === "options"}
          onToggle={() => toggleSection("options")}
          isAlwaysOpen={isMaximized}
        >
          <div className="space-y-3">
            <FormGroup label="Report Options">
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Report Step"
                  value={formData.reportStep}
                  onChange={(v) => setFormData({ ...formData, reportStep: v })}
                  placeholder="1:00"
                />
                <FormInput
                  label="Report Start"
                  value={formData.reportStart}
                  onChange={(v) => setFormData({ ...formData, reportStart: v })}
                  placeholder="0:00"
                />
              </div>
              <div className="mt-3">
                <FormSelect
                  label="Output Statistic"
                  value={formData.statistic}
                  onChange={(v) => setFormData({ ...formData, statistic: v })}
                  options={[
                    { label: "None", value: "NONE" },
                    { label: "Average", value: "AVERAGE" },
                    { label: "Minimum", value: "MINIMUM" },
                    { label: "Maximum", value: "MAXIMUM" },
                    { label: "Range", value: "RANGE" },
                  ]}
                />
              </div>
            </FormGroup>

            <FormGroup label="Convergence">
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Accuracy"
                  value={formData.accuracy}
                  onChange={(v) => setFormData({ ...formData, accuracy: v })}
                  type="number"
                  step="0.0001"
                />
                <FormInput
                  label="Max Trials"
                  value={formData.maxTrials}
                  onChange={(v) => setFormData({ ...formData, maxTrials: v })}
                  type="number"
                />
              </div>
            </FormGroup>
          </div>
        </SimSection>

        <div
          className={cn(
            "border rounded p-2 flex gap-2 transition-all",
            statusColor === "blue" ? "bg-blue-50 border-blue-100 text-blue-700" :
            statusColor === "green" ? "bg-green-50 border-green-100 text-green-700" :
            "bg-red-50 border-red-100 text-red-700",
            isMaximized && "col-span-2"
          )}
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
function SimSection({ title, icon: Icon, isOpen, onToggle, isAlwaysOpen, children }: any) {
  const open = isAlwaysOpen || isOpen;
  return (
    <div className={cn(
      "border border-slate-200 rounded-md bg-white overflow-hidden flex flex-col",
      isAlwaysOpen && "h-fit"
    )}>
      <button
        onClick={onToggle}
        disabled={isAlwaysOpen}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors",
          open ? "bg-slate-50" : "hover:bg-slate-50",
          isAlwaysOpen && "cursor-default"
        )}
      >
        <div className="p-1 rounded bg-blue-100 text-blue-600">
          <Icon size={12} />
        </div>
        <span className="text-xs font-bold text-slate-700 flex-1">{title}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 p-3 flex-1">{children}</div>
      )}
    </div>
  );
}