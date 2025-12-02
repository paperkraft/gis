"use client";

import { useState, useEffect } from "react";
import { Settings, X, Save } from "lucide-react";
import { useNetworkStore } from "@/store/networkStore";
import { Button } from "@/components/ui/button";
import { ProjectSettings, FlowUnit, HeadlossFormula } from "@/types/network";

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectSettingsModal({
  isOpen,
  onClose,
}: ProjectSettingsModalProps) {
  const { settings, updateSettings } = useNetworkStore();
  const [formData, setFormData] = useState<ProjectSettings>(settings);

  // Sync when opening
  useEffect(() => {
    if (isOpen) setFormData(settings);
  }, [isOpen, settings]);

  const handleChange = (key: keyof ProjectSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSettings(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Project Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* General */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Project Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Units & Formulas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Flow Units
              </label>
              <select
                value={formData.units}
                onChange={(e) =>
                  handleChange("units", e.target.value as FlowUnit)
                }
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="GPM">GPM (Gallons/min)</option>
                <option value="LPS">LPS (Liters/sec)</option>
                <option value="CFS">CFS (Cubic feet/sec)</option>
                <option value="MGD">MGD (Million gal/day)</option>
                <option value="CMD">CMD (Cubic meters/day)</option>
                <option value="CMH">CMH (Cubic meters/hr)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Headloss Formula
              </label>
              <select
                value={formData.headloss}
                onChange={(e) =>
                  handleChange("headloss", e.target.value as HeadlossFormula)
                }
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="H-W">Hazen-Williams</option>
                <option value="D-W">Darcy-Weisbach</option>
                <option value="C-M">Chezy-Manning</option>
              </select>
            </div>
          </div>

          <div className="h-px bg-gray-200 dark:bg-gray-700" />

          {/* Physics Parameters */}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Hydraulic Parameters
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-500 uppercase">
                Specific Gravity
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.specificGravity}
                onChange={(e) =>
                  handleChange("specificGravity", parseFloat(e.target.value))
                }
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-500 uppercase">
                Viscosity
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.viscosity}
                onChange={(e) =>
                  handleChange("viscosity", parseFloat(e.target.value))
                }
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-500 uppercase">
                Max Trials
              </label>
              <input
                type="number"
                value={formData.trials}
                onChange={(e) =>
                  handleChange("trials", parseInt(e.target.value))
                }
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-500 uppercase">
                Accuracy
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.accuracy}
                onChange={(e) =>
                  handleChange("accuracy", parseFloat(e.target.value))
                }
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 rounded-b-xl">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" /> Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
