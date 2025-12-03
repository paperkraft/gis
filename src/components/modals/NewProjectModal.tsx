"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, FileText, Upload, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectService } from "@/lib/services/ProjectService";
import { ProjectSettings, FlowUnit, HeadlossFormula } from "@/types/network";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "name-choice" | "settings" | "import";

const DEFAULT_SETTINGS: ProjectSettings = {
  title: "",
  units: "GPM",
  headloss: "H-W",
  specificGravity: 1.0,
  viscosity: 1.0,
  trials: 40,
  accuracy: 0.001,
  demandMultiplier: 1.0,
};

export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name-choice");
  const [projectName, setProjectName] = useState("");
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_SETTINGS);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleCreateBlank = () => {
    if (!projectName) return;
    setStep("settings");
  };

  const handleSetupImport = () => {
    if (!projectName) return;
    setStep("import");
  };

  const handleFinalizeBlank = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const finalSettings = { ...settings, title: projectName };
      const id = ProjectService.createProjectFromSettings(
        projectName,
        finalSettings
      );
      router.push(`/project/${id}`);
    }, 500);
  };

  const handleFinalizeImport = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const text = await file.text();
      const id = ProjectService.createProjectFromFile(projectName, text);
      router.push(`/project/${id}`);
    } catch (e) {
      alert("Failed to parse file. Please ensure it is a valid .INP file.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between bg-gray-50 dark:bg-gray-900">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Create New Project
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* STEP 1: Name & Choice */}
          {step === "name-choice" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g., Water Network"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  disabled={!projectName}
                  onClick={handleCreateBlank}
                  className="flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full mb-3 group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Blank Project
                  </h3>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    Start from scratch
                  </p>
                </button>

                <button
                  disabled={!projectName}
                  onClick={handleSetupImport}
                  className="flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Import File
                  </h3>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    Use .INP file
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2A: Settings (Blank) */}
          {step === "settings" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Flow Units
                </label>
                <select
                  value={settings.units}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      units: e.target.value as FlowUnit,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="GPM">GPM (Gallons/min)</option>
                  <option value="LPS">LPS (Liters/sec)</option>
                  <option value="CMH">CMH (Cubic meters/hr)</option>
                  <option value="MGD">MGD (Million gal/day)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Headloss Formula
                </label>
                <select
                  value={settings.headloss}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      headloss: e.target.value as HeadlossFormula,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="H-W">Hazen-Williams</option>
                  <option value="D-W">Darcy-Weisbach</option>
                  <option value="C-M">Chezy-Manning</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">
                    Specific Gravity
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.specificGravity}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        specificGravity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">
                    Viscosity
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.viscosity}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        viscosity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("name-choice")}
                >
                  Back
                </Button>
                <Button
                  onClick={handleFinalizeBlank}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create Project"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2B: Import File */}
          {step === "import" && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".inp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                {file ? (
                  <div>
                    <p className="font-semibold text-green-600 flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" /> {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                      Click to upload .INP file
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      EPANET Input File
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("name-choice")}
                >
                  Back
                </Button>
                <Button
                  onClick={handleFinalizeImport}
                  disabled={!file || isProcessing}
                  className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Import & Create"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
