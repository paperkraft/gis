"use client";

import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { flowUnitOptions, headLossUnitOptions, projectionList } from '@/constants/project';
import { useNetworkStore } from '@/store/networkStore';
import { ProjectSettings } from '@/types/network';

import { FormGroup } from '../form-controls/FormGroup';
import { FormInput } from '../form-controls/FormInput';
import { FormSelect } from '../form-controls/FormSelect';

export function ProjectSettingsPanel() {
  const { settings, updateSettings } = useNetworkStore();

  // Local state to prevent constant re-renders on every keystroke
  const [localSettings, setLocalSettings] = useState<ProjectSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync on mount
  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleChange = (key: keyof ProjectSettings, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setHasChanges(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Section 1: Metadata */}
        <FormGroup label="General Information">
          <FormInput
            label="Project Title"
            value={localSettings.title || ""}
            onChange={(v) => handleChange("title", v)}
          />

          <FormInput
            textarea
            label="Description"
            value={localSettings.description || ""}
            onChange={(v) => handleChange("description", v)}
          />

          <FormSelect
            label="Projection"
            value={localSettings.projection || ""}
            onChange={(v) => handleChange("projection", v)}
            options={projectionList}
            description="Coordinates will be converted to this projection on export."
          />
        </FormGroup>

        <hr className="border-slate-200" />

        {/* Section 2: Hydraulics */}
        <FormGroup label="Hydraulic Defaults">
          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Flow Units"
              value={localSettings.units || ""}
              onChange={(v) => handleChange("units", v)}
              options={flowUnitOptions}
            />
            <FormSelect
              label="Head Loss Formula"
              value={localSettings.headloss || ""}
              onChange={(v) => handleChange("headloss", v)}
              options={headLossUnitOptions}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              type="number"
              label="Viscosity"
              value={localSettings.viscosity || 0}
              onChange={(v) => handleChange("viscosity", parseFloat(v))}
            />
            <FormInput
              type="number"
              label="Specific Gravity"
              value={localSettings.specificGravity || 0}
              onChange={(v) => handleChange("specificGravity", parseFloat(v))}
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
