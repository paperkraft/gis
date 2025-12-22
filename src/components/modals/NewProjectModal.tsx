"use client";

import { ArrowLeft, ArrowRight, Check, FileText, Loader2, Plus, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ProjectSettingsForm } from '@/components/shared/ProjectSettingsForm';
import { Button } from '@/components/ui/button';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { ProjectService } from '@/lib/services/ProjectService';
import { cn } from '@/lib/utils';
import { ProjectSettings } from '@/types/network';

import Input from '../shared/Input';

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
  trials: 24,
  accuracy: 0.001,
  demandMultiplier: 1.0,
  projection: "EPSG:3857",
};

export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name-choice");
  const [projectName, setProjectName] = useState("");
  const [description, setProjectDescription] = useState("");
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_SETTINGS);

  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setStep("name-choice");
      setProjectName("");
      setProjectDescription("");
      setSettings(DEFAULT_SETTINGS);
      setFile(null);
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [isOpen]);

  const handleSettingsChange = (key: keyof ProjectSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateBlank = () => {
    if (!projectName) return;
    setSettings((prev) => ({ ...prev, title: projectName, description }));
    setStep("settings");
  };

  const handleSetupImport = () => {
    if (!projectName) return;
    setStep("import");
  };

  const handleFinalizeBlank = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    try {
      const finalSettings = { ...settings, title: projectName };
      const id = await ProjectService.createProjectFromSettings(
        projectName,
        description,
        finalSettings
      );
      router.push(`/project/${id}`);
      onClose();
    } catch (e) {
      alert("Failed to create project.");
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleFinalizeImport = async () => {
    if (!file || processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    try {
      const text = await file.text();
      // Pass the selected projection from the form
      const id = await ProjectService.createProjectFromFile(
        projectName,
        description,
        text,
        settings.projection
      );
      router.push(`/project/${id}`);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to import project file.");
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  // --- FOOTER RENDERERS ---
  const renderFooter = () => {
    if (step === "name-choice") return null;

    return (
      <>
        <Button
          variant="ghost"
          onClick={() => setStep("name-choice")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        {step === "settings" ? (
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
        ) : (
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
        )}
      </>
    );
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Project"
      subtitle={
        step === "name-choice"
          ? "Start your hydraulic simulation"
          : step === "settings"
          ? "Configure Defaults"
          : "Import Data"
      }
      icon={Plus}
      footer={renderFooter()}
      maxWidth="lg"
    >
      {/* STEP 1: Name & Choice */}
      {step === "name-choice" && (
        <div className="space-y-6">
          <Input
            label="Project Name"
            autoFocus
            value={projectName}
            placeholder="e.g. Downtown Water Network"
            onChange={(v) => setProjectName(v as string)}
          />

          <Input
            label="Description"
            value={description}
            placeholder="Description of Water Network"
            onChange={(v) => setProjectDescription(v as string)}
          />

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
              <p className="text-xs text-gray-500 mt-1">Start from scratch</p>
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
        <ProjectSettingsForm
          settings={settings}
          onChange={handleSettingsChange}
          mode="create"
        />
      )}

      {/* STEP 2B: Import File */}
      {step === "import" && (
        <div className="space-y-6">
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
                <p className="text-xs text-gray-500 mt-1">EPANET Input File</p>
              </div>
            )}
          </div>

          {/* Projection Selector via reusable form? Or just custom since it's only one field */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
            {/* We can just reuse the component logic here manually for simplicity in this specific unique step */}
            <label className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-2 block">
              Source Projection
            </label>
            <ProjectSettingsForm
              settings={settings}
              onChange={handleSettingsChange}
              mode="create"
            />
          </div>
        </div>
      )}
    </ModalDialog>
  );
}
