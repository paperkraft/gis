"use client";

import { Box, Cloud } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { convertGisToINP } from '@/lib/gis/gisImporter';
import { GisValidationResult, validateGisFile } from '@/lib/gis/gisValidator';
import { AutoProjection } from '@/lib/gis/locationToZone';
import { ProjectService } from '@/lib/services/ProjectService';
import { useUIStore } from '@/store/uiStore';
import { FlowUnits } from '@/types/network';

// Import Sub-components
import { ProjectFormFields } from './new-project/ProjectFormFields';
import { ProjectSuccessView } from './new-project/ProjectSuccessView';
import { ProjectType, ProjectTypeSelector } from './new-project/ProjectTypeSelector';

const DEFAULT_FORM_DATA = {
  title: "",
  description: "",
  projection: "EPSG:3857",
  units: "LPS",
};

export function NewProjectModal() {
  const router = useRouter();
  const { activeModal, setActiveModal, refreshProjects } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [projectType, setProjectType] = useState<ProjectType>("blank");
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  // Form Data
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  // File & Content State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");

  // GIS Validation State
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<GisValidationResult | null>(null);

  // GIS Projection State
  const [showProjectionSelect, setShowProjectionSelect] = useState(false);
  const [selectedEPSG, setSelectedEPSG] = useState("EPSG:4326");

  const isOpen = activeModal === "NEW_PROJECT";

  const handleReset = () => {
    setProjectType("blank");
    setImportFile(null);
    setFileContent("");
    setCreatedProjectId("");
    setValidationResult(null);
    setShowProjectionSelect(false);
    setSelectedEPSG("EPSG:4326");
    setFormData(DEFAULT_FORM_DATA);
    setValidating(false);
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleReset();
    }
  }, [isOpen]);

  // --- Handlers ---
  const handleClose = () => {
    setActiveModal("NONE");
    setTimeout(() => {
      handleReset();
    }, 300);
  };

  const handleOpenProject = () => {
    if (createdProjectId) {
      handleClose();
      router.push(`/workbench/${createdProjectId}`);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const title = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    setFormData((prev) => ({ ...prev, title: formData.title || title }));

    const name = file.name.toLowerCase();

    // A. GIS Import Logic
    if (projectType === "gis") {
      setValidating(true);
      setValidationResult(null);
      setShowProjectionSelect(false);
      setSelectedEPSG("EPSG:4326");

      const isValid =
        name.endsWith(".zip") ||
        name.endsWith(".json") ||
        name.endsWith(".geojson");

      if (!isValid) {
        toast.error(
          "Please select a valid .zip (Shapefile) or .json (GeoJSON) file"
        );
        return;
      }

      // Run Validation
      const result = await validateGisFile(file);
      setValidationResult(result);

      // If status is 'warning' OR message mentions "Projected"/"Meters",
      // show the "Identify Location" search box.
      if (
        result.status === "warning" ||
        result.message?.toLowerCase().includes("projected")
      ) {
        setShowProjectionSelect(true);
      } else {
        // If valid (Lat/Lon), we hide the search box and stick to 4326
        setShowProjectionSelect(false);
      }

      setValidating(false);
    }

    // B. INP Import Logic
    else if (projectType === "import") {
      if (!name.endsWith(".inp")) {
        toast.error("Please select a valid .inp file");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => setFileContent(e.target?.result as string);
      reader.readAsText(file);
    }

    setImportFile(file);
  };

  // Projection Found Callback (From ProjectFormFields)
  const handleProjectionFound = (proj: AutoProjection) => {
    setSelectedEPSG(proj.code); // e.g. "EPSG:32643"
    toast.success(`Projection set to Zone ${proj.zone}${proj.hemisphere}`);
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error("Project title is required");
      return;
    }

    setLoading(true);

    try {
      let projectId = "";

      // --- PATH A: GIS IMPORT ---
      if (projectType === "gis") {
        if (!importFile || validationResult?.status === "error") {
          toast.error("Cannot create project from invalid file.");
          setLoading(false);
          return;
        }

        toast.loading("Converting GIS data to network model...");

        // Convert to INP using the detected EPSG
        // If the user didn't search, it defaults to EPSG:4326 (Lat/Lon)
        const inpContent = await convertGisToINP(
          importFile,
          {
            defaultDiameter: 150,
            defaultRoughness: 100,
            tolerance: 0.0001, // ~1 meters snapping
          },
          selectedEPSG
        );

        toast.dismiss();

        if (!inpContent || inpContent.length < 50) {
          toast.error("Conversion resulted in empty network.");
          setLoading(false);
          return;
        }

        // 2. API Call to create project from INP
        projectId = await ProjectService.createProjectFromFile(
          formData.title,
          formData.description || `Imported from ${importFile.name}`,
          inpContent
        );
      }

      // --- PATH B: INP IMPORT ---
      else if (projectType === "import") {
        if (!fileContent) {
          toast.error("File content is empty.");
          setLoading(false);
          return;
        }

        projectId = await ProjectService.createProjectFromFile(
          formData.title,
          formData.description || "Imported from INP file",
          fileContent
        );
      }

      // --- PATH C: BLANK PROJECT ---
      else {
        const data = {
          title: formData.title,
          description: formData.description,
          projection: formData.projection,
          units: formData.units as FlowUnits,
        };

        projectId = await ProjectService.createProjectFromSettings(
          formData.title,
          formData.description || "Blank project",
          data as any
        );
      }

      if (projectId) {
        setCreatedProjectId(projectId);
        setLoading(false);
        refreshProjects();
      }
    } catch (error: any) {
      console.error(error);
      toast.dismiss();
      toast.error(error.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[750px] p-0 gap-0 overflow-hidden bg-white dark:bg-slate-950 flex flex-col max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <DialogTitle className="text-md font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Box className="size-4 text-primary" />
            {createdProjectId ? "Project Ready" : "Create New Project"}
          </DialogTitle>
          <DialogDescription className="hidden" />
        </DialogHeader>

        {createdProjectId ? (
          // --- SUCCESS VIEW ---
          <ProjectSuccessView
            title={formData.title}
            projectType={projectType}
            onClose={handleClose}
            onOpen={handleOpenProject}
          />
        ) : (
          // --- FORM VIEW ---
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">

              <ProjectTypeSelector
                value={projectType}
                onChange={(t) => {
                  setProjectType(t);
                  setImportFile(null);
                  setValidationResult(null);
                  setShowProjectionSelect(false);
                }}
              />

              <ProjectFormFields
                projectType={projectType}
                formData={formData}
                setFormData={setFormData}
                // File Props
                importFile={importFile}
                fileInputRef={fileInputRef as any}
                handleFileSelect={handleFileSelect}
                // GIS Props
                validating={validating}
                validationResult={validationResult}
                showProjectionSelect={showProjectionSelect}
                onProjectionFound={handleProjectionFound}
              />

              {projectType === 'gis' && !importFile && (
                <div className="bg-amber-50 border border-amber-100 p-2.5 rounded text-[11px] text-amber-700 leading-tight">
                  <strong>Note:</strong> "Upload a .zip file containing at least .shp, .shx, .dbf, and .prj files." or GeoJson. We will auto-create pipes along the road centerlines.
                </div>
            )}
            </div>

            <DialogFooter className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center w-full shrink-0">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Cloud size={12} /> <span>Synced to Cloud</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={
                    loading ||
                    validating ||
                    !formData.title ||
                    (projectType === "gis" &&
                      (!importFile || validationResult?.status === "error")) ||
                    (projectType === "import" && !importFile)
                  }
                >
                  {/* {loading
                    ? "Creating..."
                    : projectType === "import" || projectType === "gis"
                    ? "Import & Create"
                    : "Create Project"} */}
                  {loading
                    ? "Creating..."
                    : validating
                    ? "Validating..."
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
