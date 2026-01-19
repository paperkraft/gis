"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  flowUnitOptions,
  headLossUnitOptions,
  projectionList,
} from "@/constants/project";
import { useNetworkStore } from "@/store/networkStore";

import { FormGroup } from "../form-controls/FormGroup";
import { FormInput } from "../form-controls/FormInput";
import { FormSelect } from "../form-controls/FormSelect";
import { toast } from "sonner";

export function ProjectSettingsPanel() {
  const { settings, updateSettings, patterns } = useNetworkStore();

  const [formData, setFormData] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const patternOptions = [
    { value: "1", label: "Default (1)" },
    ...patterns.map((p) => ({
      value: p.id,
      label: `${p.id} - ${p.description || ""}`,
    })),
  ];

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings(formData);
    setHasChanges(false);
    toast.success("Project settings updated");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Section 1: Metadata */}
        <FormGroup label="General Information">
          <FormInput
            label="Project Title"
            value={formData.title || ""}
            onChange={(v) => handleChange("title", v)}
          />

          <FormInput
            textarea
            label="Description"
            value={formData.description || ""}
            onChange={(v) => handleChange("description", v)}
          />

          <FormSelect
            label="Projection"
            value={formData.projection || ""}
            onChange={(v) => handleChange("projection", v)}
            options={projectionList}
            description="Coordinates will be converted to this projection on export."
          />
        </FormGroup>

        <hr className="border-slate-200" />

        {/* Section 2: Hydraulics */}
        <FormGroup label="Hydraulic Defaults">
          <FormSelect
            label="Default Pattern"
            value={formData.defaultPattern || "1"}
            onChange={(v) => handleChange("defaultPattern", v)}
            options={patternOptions}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Flow Units"
              value={formData.units || ""}
              onChange={(v) => handleChange("units", v)}
              options={flowUnitOptions}
            />
            <FormSelect
              label="Head Loss Formula"
              value={formData.headloss || ""}
              onChange={(v) => handleChange("headloss", v)}
              options={headLossUnitOptions}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              type="number"
              label="Viscosity"
              value={formData.viscosity || 0}
              onChange={(v) => handleChange("viscosity", parseFloat(v))}
            />
            <FormInput
              type="number"
              label="Specific Gravity"
              value={formData.specificGravity || 0}
              onChange={(v) => handleChange("specificGravity", parseFloat(v))}
            />
          </div>
        </FormGroup>

        {/* GLOBAL DEMAND CONTROL */}
        <FormGroup label="Global Controls">
          <FormInput
            label="Demand Multiplier"
            value={formData.demandMultiplier ?? 1.0}
            onChange={(v) => handleChange("demandMultiplier", parseFloat(v))}
            type="number"
            step="0.1"
            description="Scale all demands (e.g. 1.5 = 50% increase)"
          />
        </FormGroup>

        {/* TIME SETTINGS */}
        <FormGroup label="Time Defaults">
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Duration (Hrs)"
              value={formData.duration || "24:00"}
              onChange={(v) => handleChange("duration", v)}
            />
            <FormInput
              label="Hydraulic Step"
              value={formData.hydraulicStep || "1:00"}
              onChange={(v) => handleChange("hydraulicStep", v)}
            />
            <FormInput
              label="Pattern Step"
              value={formData.patternStep || "1:00"}
              onChange={(v) => handleChange("patternStep", v)}
            />
            <FormInput
              label="Report Step"
              value={formData.reportStep || "1:00"}
              onChange={(v) => handleChange("reportStep", v)}
            />
          </div>
        </FormGroup>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`w-full h-8 text-xs ${
            hasChanges
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          <Save className="w-3 h-3 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
