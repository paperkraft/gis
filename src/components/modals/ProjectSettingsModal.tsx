"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Settings, Globe, Droplet, Activity } from "lucide-react";
import { useNetworkStore } from "@/store/networkStore";
import { ProjectSettings } from "@/types/network";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  flowUnitOptions,
  headLossUnitOptions,
  projectionList,
} from "@/constants/project";

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingInput = ({ label, value, type = "text", onChange, step }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
      {label}
    </label>
    <input
      type={type}
      value={value}
      step={step}
      onChange={(e) =>
        onChange(
          type === "number" ? parseFloat(e.target.value) : e.target.value
        )
      }
      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-gray-900 dark:text-gray-100"
    />
  </div>
);

const SettingSelect = ({ label, value, options, onChange }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
      {label}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none text-gray-900 dark:text-gray-100"
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 1L5 5L9 1" />
        </svg>
      </div>
    </div>
  </div>
);

export function ProjectSettingsModal({
  isOpen,
  onClose,
}: ProjectSettingsModalProps) {
  const { settings, updateSettings } = useNetworkStore();
  const [formData, setFormData] = useState<ProjectSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
      setHasChanges(false);
    }
  }, [isOpen, settings]);

  const handleChange = (key: keyof ProjectSettings, value: any) => {
    const updated = { ...formData, [key]: value };
    setFormData(updated);
    setHasChanges(JSON.stringify(updated) !== JSON.stringify(settings));
  };

  const handleSave = () => {
    updateSettings(formData);
    setHasChanges(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-200 dark:bg-gray-800 rounded-xl text-gray-700 dark:text-gray-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Project Settings
              </h2>
              <p className="text-xs text-gray-500">
                Configure simulation parameters and export format
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          {/* Section 1: General & Map */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2 border-b border-blue-100 dark:border-blue-900/30 pb-2">
              <Globe className="w-4 h-4" /> General & Export
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingInput
                label="Project Title"
                value={formData.title}
                onChange={(v: string) => handleChange("title", v)}
              />
              <div>
                <SettingSelect
                  label="Export Projection"
                  value={formData.projection || "EPSG:3857"}
                  onChange={(v: string) => handleChange("projection", v)}
                  options={projectionList}
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Coordinates will be converted to this projection when
                  exporting to INP. The map always uses Web Mercator.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Hydraulics */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 border-b border-indigo-100 dark:border-indigo-900/30 pb-2">
              <Droplet className="w-4 h-4" /> Hydraulics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SettingSelect
                label="Flow Units"
                value={formData.units}
                onChange={(v: any) => handleChange("units", v)}
                options={flowUnitOptions}
              />
              <SettingSelect
                label="Headloss Formula"
                value={formData.headloss}
                onChange={(v: any) => handleChange("headloss", v)}
                options={headLossUnitOptions}
              />
              <SettingInput
                label="Specific Gravity"
                value={formData.specificGravity}
                type="number"
                step="0.01"
                onChange={(v: number) => handleChange("specificGravity", v)}
              />
              <SettingInput
                label="Relative Viscosity"
                value={formData.viscosity}
                type="number"
                step="0.01"
                onChange={(v: number) => handleChange("viscosity", v)}
              />
            </div>
          </section>

          {/* Section 3: Solver Options */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2 border-b border-emerald-100 dark:border-emerald-900/30 pb-2">
              <Activity className="w-4 h-4" /> Solver Parameters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SettingInput
                label="Max Trials"
                value={formData.trials}
                type="number"
                step="1"
                onChange={(v: number) => handleChange("trials", v)}
              />
              <SettingInput
                label="Accuracy"
                value={formData.accuracy}
                type="number"
                step="0.0001"
                onChange={(v: number) => handleChange("accuracy", v)}
              />
              <SettingInput
                label="Demand Multiplier"
                value={formData.demandMultiplier}
                type="number"
                step="0.1"
                onChange={(v: number) => handleChange("demandMultiplier", v)}
              />
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-end gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="hover:bg-white dark:hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className={cn(
              "min-w-[120px] transition-all",
              hasChanges
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
            )}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
