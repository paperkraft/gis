"use client";

import React from "react";
import { Globe, Droplet, Activity } from "lucide-react";
import { ProjectSettings } from "@/types/network";
import {
  flowUnitOptions,
  headLossUnitOptions,
  projectionList,
} from "@/constants/project";
import Input from "./Input";
import Select from "./Select";

interface ProjectSettingsFormProps {
  settings: ProjectSettings;
  onChange: (key: keyof ProjectSettings, value: any) => void;
  mode?: "create" | "edit";
}

export function ProjectSettingsForm({
  settings,
  onChange,
  mode = "edit",
}: ProjectSettingsFormProps) {
  return (
    <div className="space-y-8">
      {/* Section 1: General & Map */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2 border-b border-blue-100 dark:border-blue-900/30 pb-2">
          <Globe className="w-4 h-4" /> Coordinate System
        </h3>

        {mode === "edit" && (
          <>
            <Input
              type="text"
              label="Project Title"
              value={settings.title}
              onChange={(v) => onChange("title", v as string)}
            />

            <Input
              type="text"
              label="Description"
              value={settings.description || ""}
              onChange={(v) => onChange("description", v as string)}
            />
          </>
        )}

        <div className="space-y-1">
          <Select
            label="Projection"
            value={settings.projection || "EPSG:3857"}
            onChange={(v) => onChange("projection", v)}
            options={projectionList}
          />
          <p className="text-[10px] text-gray-500">
            {mode === "create"
              ? "Defines how imported coordinates map to the world."
              : "Coordinates will be converted to this projection on export."}
          </p>
        </div>
      </section>

      {/* Section 2: Hydraulics */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 border-b border-indigo-100 dark:border-indigo-900/30 pb-2">
          <Droplet className="w-4 h-4" /> Hydraulics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Flow Units"
            value={settings.units}
            onChange={(v) => onChange("units", v)}
            options={flowUnitOptions}
          />

          <Select
            label="Headloss Formula"
            value={settings.headloss}
            onChange={(v) => onChange("headloss", v)}
            options={headLossUnitOptions}
          />

          <Input
            type="number"
            step={0.01}
            label="Specific Gravity"
            value={settings.specificGravity}
            onChange={(v) =>
              onChange("specificGravity", parseFloat(v as string))
            }
          />

          <Input
            type="number"
            step={0.01}
            label="Viscosity"
            value={settings.viscosity}
            onChange={(v) => onChange("viscosity", parseFloat(v as string))}
          />
        </div>
      </section>

      {/* Section 3: Solver (Only show advanced options in Edit mode or if expanded) */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2 border-b border-emerald-100 dark:border-emerald-900/30 pb-2">
          <Activity className="w-4 h-4" /> Solver
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="number"
            step={1}
            label="Trials"
            value={settings.trials}
            onChange={(v) => onChange("trials", parseFloat(v as string))}
          />

          <Input
            type="number"
            step={0.0001}
            label="Accuracy"
            value={settings.accuracy}
            onChange={(v) => onChange("accuracy", parseFloat(v as string))}
          />

          <Input
            type="number"
            step={0.1}
            label="Demand Multiplier"
            value={settings.demandMultiplier}
            onChange={(v) =>
              onChange("demandMultiplier", parseFloat(v as string))
            }
          />
        </div>
      </section>
    </div>
  );
}
