"use client";

import { ChevronDown, ChevronRight, Save } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { COMPONENT_TYPES } from "@/constants/networkComponents";
import { ProjectService } from "@/lib/services/ProjectService";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";

import { FormGroup } from "../form-controls/FormGroup";
import { FormInput } from "../form-controls/FormInput";

export function DefaultAttributesPanel() {
  const params = useParams();
  const { settings, updateSettings } = useNetworkStore();
  const { setMenuStatus } = useUIStore();

  const [defaults, setDefaults] = useState(settings.componentDefaults || {});
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedType, setExpandedType] = useState<string | null>(Object.keys(COMPONENT_TYPES)[0]);

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
    // 1. Update mandatory status in project settings
    const updatedStatuses = { 
      ...(settings.mandatorySetupStatuses || {}), 
      "set_attr": "visited" as const 
    };

    // 2. Persist to network store
    updateSettings({ 
      componentDefaults: defaults,
      mandatorySetupStatuses: updatedStatuses 
    });

    setHasChanges(false);

    // 3. UI Status Sync
    setMenuStatus("set_attr", "visited");

    // 4. Auto-Save to Backend
    setTimeout(() => {
        if (params?.id) {
            ProjectService.saveCurrentProject(params.id as string);
        }
    }, 100);

    toast.success("Component defaults updated");
  };

  const toggleAccordion = (type: string) => {
    setExpandedType(expandedType === type ? null : type);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-[11px] text-slate-500 bg-blue-50/50 p-3 rounded-lg border border-blue-100/50 mb-2 leading-relaxed">
          Set default properties for new features. These values will be applied
          automatically when you draw on the map.
        </div>

        {Object.entries(COMPONENT_TYPES).map(([type, config]) => {
          const typeDefaults = defaults[type] || { ...config.defaultProperties, prefix: config.prefix, group: "General" };
          const isExpanded = expandedType === type;
          const Icon = config.icon;
          
          // Determine the displayed prefix (handle fallback with dash)
          const displayedPrefix = typeDefaults.prefix !== undefined ? typeDefaults.prefix : (config.prefix + (config.prefix.endsWith('-') ? '' : '-'));

          return (
            <div key={type} className="border border-slate-200 rounded-lg bg-white overflow-hidden transition-all duration-200 shadow-sm border-l-4" style={{ borderLeftColor: config.color }}>
              <button
                onClick={() => toggleAccordion(type)}
                className={`w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors ${isExpanded ? 'border-b border-slate-100 bg-slate-50/50' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-white border border-slate-100 shadow-sm">
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-700">{config.name}</span>
                    <span className="text-[10px] text-slate-500 ml-2 block leading-none">Auto ID: {displayedPrefix}1</span>
                  </div>
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              {isExpanded && (
                <div className="p-4 space-y-6 animate-in slide-in-from-top-1 duration-200">
                  {/* Identity Section */}
                  <FormGroup label="Identity & Grouping">
                    <div className="grid grid-cols-2 gap-3">
                      <FormInput
                        label="ID Prefix"
                        type="text"
                        value={typeDefaults.prefix ?? config.prefix}
                        onChange={(v) => handleChange(type, 'prefix', v)}
                        placeholder="e.g. J-"
                      />
                      <FormInput
                        label="Group"
                        type="text"
                        value={typeDefaults.group ?? "General"}
                        onChange={(v) => handleChange(type, 'group', v)}
                        placeholder="e.g. Distribution"
                      />
                    </div>
                  </FormGroup>

                  {/* Attributes Section */}
                  <FormGroup label="Default Attributes">
                    <div className="grid grid-cols-2 gap-3">
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
                </div>
              )}
            </div>
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
