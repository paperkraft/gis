"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { COMPONENT_TYPES } from "@/constants/networkComponents";
import { useNetworkStore } from "@/store/networkStore";

import { FormGroup } from "../form-controls/FormGroup";
import { FormInput } from "../form-controls/FormInput";

export function DefaultValuesPanel() {
  const { settings, updateSettings } = useNetworkStore();

  const [defaults, setDefaults] = useState(settings.componentDefaults || {});
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (type: string, key: string, value: any) => {
    setDefaults((prev: any) => ({
      ...prev,
      [type]: {
        ...(prev[type] || {}),
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings({ componentDefaults: defaults });
    setHasChanges(false);
    toast.success("Component defaults updated");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 mb-2">
          Set default properties for new features. These values will be applied
          automatically when you draw on the map.
        </div>

        {Object.entries(COMPONENT_TYPES).map(([type, config]) => {
          const typeDefaults = defaults[type] || config.defaultProperties;
          
          return (
            <FormGroup key={type} label={`${config.name} Defaults`}>
               <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {Object.entries(config.defaultProperties).map(([key, defaultValue]) => {
                  const label = key.charAt(0).toUpperCase() + key.slice(1);
                  const value = typeDefaults[key] ?? defaultValue;
                  const isNumber = typeof defaultValue === 'number';

                  return (
                    <FormInput
                      key={key}
                      label={label}
                      type={isNumber ? "number" : "text"}
                      value={value}
                      onChange={(v) => handleChange(type, key, isNumber ? parseFloat(v) : v)}
                    />
                  );
                })}
              </div>
            </FormGroup>
          );
        })}
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
          Save Defaults
        </Button>
      </div>
    </div>
  );
}
