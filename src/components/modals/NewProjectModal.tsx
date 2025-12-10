"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  FileText,
  Upload,
  Loader2,
  Check,
  Globe,
  Settings2,
  Droplet,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectService } from "@/lib/services/ProjectService";
import { ProjectSettings, FlowUnit, HeadlossFormula } from "@/types/network";
import { cn } from "@/lib/utils";
import { FileImporter } from "@/lib/import/fileImporter";
import { useMapStore } from "@/store/mapStore";
import {
  flowUnitOptions,
  headLossUnitOptions,
  projectionList,
} from "@/constants/project";

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
  projection: "EPSG:3857", // Default Projection
};

export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name-choice");
  const [projectName, setProjectName] = useState("");
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_SETTINGS);

  // Import State
  const [file, setFile] = useState<File | null>(null);
  const [sourceEPSG, setSourceEPSG] = useState("EPSG:3857"); // Default for Import
  const [isProcessing, setIsProcessing] = useState(false);
  const importerRef = useRef<FileImporter | null>(null);

  const { vectorSource, map } = useMapStore();

  if (!isOpen) return null;

  // Initialize importer
  if (!importerRef.current && vectorSource) {
    importerRef.current = new FileImporter(vectorSource);
  }

  const handleCreateBlank = () => {
    if (!projectName) return;
    setSettings((prev) => ({ ...prev, title: projectName }));
    setStep("settings");
  };

  const handleSetupImport = () => {
    if (!projectName) return;
    setStep("import");
  };

  const handleFinalizeBlank = () => {
    setIsProcessing(true);
    // Simulate slight delay for UX
    setTimeout(() => {
      const finalSettings = { ...settings, title: projectName };
      const id = ProjectService.createProjectFromSettings(
        projectName,
        finalSettings
      );
      router.push(`/project/${id}`);
      onClose();
    }, 500);
  };

  const handleFinalizeImport = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const res = await importerRef?.current?.importFile(file);

      if (res?.success) {
        // Create a project entry manually since importINP loads into active store
        // We essentially need to "Save As" the currently loaded (imported) project
        const id = crypto.randomUUID();
        ProjectService.saveCurrentProject(id, projectName);

        router.push(`/project/${id}`);
        onClose();
      } else {
        alert("Failed to parse or project the INP file.");
      }
    } catch (e) {
      console.error(e);
      alert("An unexpected error occurred during import.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 dark:border-gray-700/50 flex flex-col">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Create New Project
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {step === "name-choice"
                ? "Start your simulation"
                : step === "settings"
                ? "Configure Defaults"
                : "Import Data"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6">
          {/* STEP 1: Name & Choice */}
          {step === "name-choice" && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Downtown Water Network"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  disabled={!projectName}
                  onClick={handleCreateBlank}
                  className="flex flex-col items-center p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group text-left"
                >
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3 group-hover:scale-110 transition-transform text-blue-600 dark:text-blue-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Blank Project
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Start from scratch
                  </p>
                </button>

                <button
                  disabled={!projectName}
                  onClick={handleSetupImport}
                  className="flex flex-col items-center p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-500 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group text-left"
                >
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full mb-3 group-hover:scale-110 transition-transform text-green-600 dark:text-green-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Import File
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">From .INP file</p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2A: Blank Settings */}
          {step === "settings" && (
            <div className="space-y-5">
              {/* Projection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Coordinate System
                </label>
                <select
                  value={settings.projection}
                  onChange={(e) =>
                    setSettings({ ...settings, projection: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none"
                >
                  {projectionList.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400">
                  Defines how coordinates map to the real world.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5" /> Flow Units
                  </label>
                  <select
                    value={settings.units}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        units: e.target.value as FlowUnit,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none"
                  >
                    {flowUnitOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings2 className="w-3.5 h-3.5" /> Formula
                  </label>
                  <select
                    value={settings.headloss}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        headloss: e.target.value as HeadlossFormula,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none"
                  >
                    {headLossUnitOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                <Button
                  variant="ghost"
                  onClick={() => setStep("name-choice")}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  onClick={handleFinalizeBlank}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create Project"
                  )}
                  {!isProcessing && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2B: Import File */}
          {step === "import" && (
            <div className="space-y-5">
              {/* File Drop */}
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer relative group",
                  file
                    ? "border-green-500 bg-green-50/30 dark:bg-green-900/10"
                    : "border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                )}
              >
                <input
                  type="file"
                  accept=".inp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400 mb-2">
                      <Check className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-gray-400 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Click or Drag .INP File
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      EPANET Input File
                    </p>
                  </div>
                )}
              </div>

              {/* Source Projection */}
              <div className="space-y-1.5 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                    Source Projection
                  </h3>
                </div>
                <select
                  value={sourceEPSG}
                  onChange={(e) => setSourceEPSG(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                >
                  {projectionList.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 italic mt-1">
                  Select the coordinate system used in the .INP file to align it
                  correctly on the map.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                <Button
                  variant="ghost"
                  onClick={() => setStep("name-choice")}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  onClick={handleFinalizeImport}
                  disabled={!file || isProcessing}
                  className="bg-green-600 hover:bg-green-700 text-white min-w-[140px] gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Import & Create"
                  )}
                  {!isProcessing && <Upload className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
