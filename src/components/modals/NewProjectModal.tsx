"use client";

import { Box, Cloud } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectService } from "@/lib/services/ProjectService";
import { useUIStore } from "@/store/uiStore";

// Import Sub-components
import { ProjectFormFields } from "./new-project/ProjectFormFields";
import { ProjectSuccessView } from "./new-project/ProjectSuccessView";
import { ProjectTypeSelector } from "./new-project/ProjectTypeSelector";

const DEFAULT_FORM_DATA = {
  title: "",
  description: "",
  projection: "EPSG:3857",
  units: "LPS",
};

export function NewProjectModal() {
  const { activeModal, setActiveModal } = useUIStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [loading, setLoading] = useState(false);
  const [projectType, setProjectType] = useState<"blank" | "import">("blank");
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  const isOpen = activeModal === "NEW_PROJECT";

  // --- Handlers ---
  const handleClose = () => {
    setActiveModal("NONE");
    setTimeout(() => {
      setFormData(DEFAULT_FORM_DATA);
      setProjectType("blank");
      setImportFile(null);
      setFileContent("");
      setCreatedProjectId(null);
      setLoading(false);
    }, 300);
  };

  const handleOpenProject = () => {
    if (createdProjectId) {
      handleClose();
      router.push(`/workbench/${createdProjectId}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".inp")) {
        toast.error("Please select a valid .inp file");
        return;
      }
      setImportFile(file);
      const name = file.name.replace(/\.[^/.]+$/, "");
      setFormData((prev) => ({ ...prev, title: name }));

      const reader = new FileReader();
      reader.onload = (e) => setFileContent(e.target?.result as string);
      reader.readAsText(file);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error("Project title is required");
      return;
    }

    setLoading(true);

    try {
      let projectId = "";
      if (projectType === "blank") {
        const settings = {
          title: formData.title,
          description: formData.description,
          projection: formData.projection,
          units: formData.units as any,
          // Defaults
          headloss: "H-W",
          specificGravity: 1.0,
          viscosity: 1.0,
          maxTrials: 40,
          accuracy: 0.001,
          demandMultiplier: 1.0,
          emitterExponent: 0.5,
          duration: "24:00",
          hydraulicStep: "1:00",
          patternStep: "1:00",
          reportStep: "1:00",
          reportStart: "0:00",
          startClock: "12:00 AM",
        };
        projectId = await ProjectService.createProjectFromSettings(
          formData.title,
          formData.description,
          settings as any
        );
      } else {
        if (!fileContent) {
          toast.error("No file content loaded");
          setLoading(false);
          return;
        }
        projectId = await ProjectService.createProjectFromFile(
          formData.title,
          formData.description,
          fileContent,
          formData.projection
        );
      }

      if (projectId) {
        setCreatedProjectId(projectId);
        setLoading(false);
        toast.success("Project created successfully");
      }
    } catch (error) {
      toast.error("Failed to create project");
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[750px] p-0 gap-0 overflow-hidden bg-white dark:bg-slate-950 flex flex-col max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <DialogTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Box className="size-5 text-primary" />
            {createdProjectId ? "Project Ready" : "Create New Project"}
          </DialogTitle>
          <DialogDescription className="hidden"/>
        </DialogHeader>

        {createdProjectId ? (
          // --- SUCCESS VIEW ---
          <ProjectSuccessView
            title={formData.title}
            projectType={projectType}
            units={formData.units}
            onClose={handleClose}
            onOpen={handleOpenProject}
          />
        ) : (
          // --- FORM VIEW ---
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <ProjectTypeSelector
                value={projectType}
                onChange={setProjectType}
              />

              <ProjectFormFields
                projectType={projectType}
                formData={formData}
                setFormData={setFormData}
                importFile={importFile}
                fileInputRef={fileInputRef as any}
                handleFileSelect={handleFileSelect}
              />
            </div>

            <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center w-full shrink-0">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Cloud size={12} /> <span>Synced to Cloud</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={
                    loading || (projectType === "import" && !importFile)
                  }
                >
                  {loading
                    ? "Creating..."
                    : projectType === "import"
                    ? "Import & Create"
                    : "Create Project"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
