"use client";

import { ArrowLeft, Box, Cloud } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { GisValidationResult, validateGisFile } from '@/lib/gis/gisValidator';
import { AutoProjection } from '@/lib/gis/locationToZone';
import { ProjectService } from '@/lib/services/ProjectService';
import { analyzeInpCoordinates } from '@/lib/epanet/inpParser';
import { useUIStore } from '@/store/uiStore';
import { FlowUnits } from '@/types/network';

// Import Sub-components
import { ProjectFormFields } from './new-project/ProjectFormFields';
import { ProjectSuccessView } from './new-project/ProjectSuccessView';
import { ProjectType, ProjectTypeSelector } from './new-project/ProjectTypeSelector';

const DEFAULT_FORM_DATA = {
  title: "",
  description: "",
  projection: "3857",
  units: "LPS",
  // GIS-specific settings
  tolerance: 5,
  maxPipeLength: 150,
  defaultDiameter: 150,
  defaultRoughness: 140,
};

export function NewProjectModal() {
  const router = useRouter();
  const { activeModal, setActiveModal, refreshProjects } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [projectType, setProjectType] = useState<ProjectType>("blank");
  const [isTypeSelected, setIsTypeSelected] = useState(false);
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
  const [selectedEPSG, setSelectedEPSG] = useState<number | undefined>(undefined);

  // Multi-Layer State
  const [layers, setLayers] = useState<{ [key: string]: File | null }>({
    pipe: null,
    junction: null,
    tank: null,
    reservoir: null,
    pump: null,
    valve: null,
  });

  const [layerValidations, setLayerValidations] = useState<{ [key: string]: GisValidationResult | null }>({});
  const [layerValidating, setLayerValidating] = useState<{ [key: string]: boolean }>({});

  const isOpen = activeModal === "NEW_PROJECT";

  const handleReset = () => {
    setProjectType("blank");
    setImportFile(null);
    setFileContent("");
    setCreatedProjectId("");
    setValidationResult(null);
    setShowProjectionSelect(false);
    setSelectedEPSG(undefined);
    setValidating(false);
    setLoading(false);
    setIsTypeSelected(false);
    setLayers({
      pipe: null,
      junction: null,
      tank: null,
      reservoir: null,
      pump: null,
      valve: null,
    });
    setLayerValidations({});
    setLayerValidating({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getProjection = (srid: number) => {
    setSelectedEPSG(srid);
  }

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
      setSelectedEPSG(undefined);

      const isValid =
        name.endsWith(".zip") ||
        name.endsWith(".json") ||
        name.endsWith(".geojson");

      if (!isValid) {
        toast.error("Please select a valid .zip (Shapefile) or .json (GeoJSON) file");
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
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content);

        // Trigger Analysis for UI feedback
        setValidating(true);
        try {
          const analysis = analyzeInpCoordinates(content);
          setValidationResult({
            status: analysis.isGeographic ? 'valid' : 'warning',
            message: analysis.isGeographic ? "Detected Geographic coordinates." : "Detected non-geographic (projected) coordinates.",
            details: analysis
          });

          if (analysis.projection) {
            const sridMatch = analysis.projection.match(/EPSG:(\d+)/i);
            if (sridMatch) {
              const srid = parseInt(sridMatch[1], 10);
              setSelectedEPSG(srid);
              setValidationResult({
                status: 'valid',
                message: `Found projection metadata: EPSG:${srid}. This system will be used for coordinates.`,
                details: analysis
              });
              toast.success(`Automatically detected projection: EPSG:${srid}`);
              setShowProjectionSelect(false); // Hide selector if auto-detected
            }
          } else if (!analysis.isGeographic) {
            setShowProjectionSelect(true);
          }
        } catch (err) {
          setValidationResult({ status: 'error', message: "Invalid INP file structure." });
        }
        setValidating(false);
      };
      reader.readAsText(file);
    }

    setImportFile(file);
  };

  const handleLayerFileSelect = async (key: string, file: File | null) => {
    setLayers((prev) => ({ ...prev, [key]: file }));
    if (!file) {
      setLayerValidations((prev) => ({ ...prev, [key]: null }));
      return;
    }

    setLayerValidating((prev) => ({ ...prev, [key]: true }));

    try {
      const result = await validateGisFile(file);
      setLayerValidations((prev) => ({ ...prev, [key]: result }));

      // If this is the first file and it has projection info, try to auto-set it
      if (
        (result.status === "warning" || result.message?.toLowerCase().includes("projected")) &&
        !selectedEPSG
      ) {
        setShowProjectionSelect(true);
      }
    } catch (error) {
      setLayerValidations((prev) => ({ ...prev, [key]: { status: 'error', message: 'Validation failed' } }));
    } finally {
      setLayerValidating((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Projection Found Callback (From ProjectFormFields)
  const handleProjectionFound = (proj: AutoProjection) => {
    setSelectedEPSG(+proj.code); // e.g. "32643"
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

        let geojsonText: string | null = null;
        let fileType = 'unknown';

        if (importFile.name.toLowerCase().endsWith('.zip')) {
          fileType = 'zip';
        } else if (importFile.name.toLowerCase().endsWith('.geojson') || importFile.name.toLowerCase().endsWith('.json')) {
          fileType = 'geojson';
        } else {
          throw new Error("Unsupported file type. Please upload a .zip shapefile or .geojson");
        }

        const settings = {
          tolerance: formData.tolerance,
          maxPipeLength: +formData.maxPipeLength,
          defaultDiameter: formData.defaultDiameter,
          defaultRoughness: formData.defaultRoughness,
        };

        const formDataPayload = new FormData();
        formDataPayload.append("title", formData.title);
        formDataPayload.append("description", formData.description || `Imported from ${importFile.name}`);
        formDataPayload.append("file", importFile);
        formDataPayload.append("fileType", fileType);
        formDataPayload.append("settings", JSON.stringify(settings));
        if (selectedEPSG) formDataPayload.append("projection", selectedEPSG.toString());

        // Send to server for PostGIS
        const response = await fetch('/api/gis/import', {
          method: 'POST',
          body: formDataPayload
          // Do not set Content-Type, browser sets it to multipart/form-data
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to process GIS data on server");

        toast.dismiss();
        if (result.id) projectId = result.id;
      }

      // --- PATH B: MULTI-LAYER IMPORT ---
      else if (projectType === "layers") {
        if (!layers.pipe || !layers.junction) {
          toast.error("Pipes and Junctions layers are required.");
          setLoading(false);
          return;
        }

        toast.loading("Processing layers and building network...");

        const formDataPayload = new FormData();
        formDataPayload.append("title", formData.title);
        formDataPayload.append("description", formData.description || "Build from Layers");

        const settings = {
          tolerance: formData.tolerance,
          maxPipeLength: +formData.maxPipeLength,
          defaultDiameter: formData.defaultDiameter,
          defaultRoughness: formData.defaultRoughness,
        };
        formDataPayload.append("settings", JSON.stringify(settings));
        if (selectedEPSG) formDataPayload.append("projection", selectedEPSG.toString());

        for (const [key, file] of Object.entries(layers)) {
          if (file) {
            formDataPayload.append(`layer_${key}`, file);
          }
        }

        const response = await fetch('/api/gis/supporting-layers', {
          method: 'POST',
          body: formDataPayload
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to process layers");

        toast.dismiss();
        if (result.id) projectId = result.id;
      }

      // --- PATH C: INP IMPORT ---
      else if (projectType === "import") {
        if (!fileContent) {
          toast.error("File content is empty.");
          setLoading(false);
          return;
        }

        const sourceProj = selectedEPSG ? `EPSG:${selectedEPSG}` : (validationResult?.details?.isGeographic ? 'EPSG:4326' : 'Simple');

        projectId = await ProjectService.createProjectFromFile(
          formData.title,
          formData.description || "Imported from INP file",
          fileContent,
          sourceProj
        );
      }

      // --- PATH C: BLANK PROJECT ---
      else {
        const data = {
          title: formData.title,
          description: formData.description,
          projection: formData.projection,
          units: formData.units as FlowUnits,
          isGeographic: formData.projection !== 'Simple'
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
            <div className="flex items-center gap-2">
              {isTypeSelected && !createdProjectId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 -ml-1 h-7 w-7 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800"
                  onClick={() => setIsTypeSelected(false)}
                >
                  <ArrowLeft className="size-4" />
                </Button>
              )}
              <Box className="size-4 text-primary" />
              {createdProjectId ? "Project Ready" : isTypeSelected ? `New ${projectType.toUpperCase()} Project` : "Create New Project"}
            </div>
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
              {!isTypeSelected ? (
                <ProjectTypeSelector
                  value={projectType}
                  onChange={(t) => {
                    setProjectType(t);
                    setIsTypeSelected(true);
                    setImportFile(null);
                    setValidationResult(null);
                    setShowProjectionSelect(false);
                  }}
                />
              ) : (
                <>
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
                    selectedEPSG={selectedEPSG}
                    onProjectionFound={handleProjectionFound}
                    getProjection={getProjection}
                    // Multi-Layer Props
                    layers={layers}
                    layerValidations={layerValidations}
                    layerValidating={layerValidating}
                    onLayerFileSelect={handleLayerFileSelect}
                  />

                  {projectType === 'gis' && !importFile && (
                    <div className="bg-amber-50 border border-amber-100 mt-4 p-2.5 rounded text-[11px] text-amber-700 leading-tight">
                      <strong>Note:</strong> "Upload a .zip file containing at least .shp, .shx, .dbf, and .prj files." or GeoJson. We will auto-create pipes along the road centerlines.
                    </div>
                  )}
                </>
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
                      (!importFile || validationResult?.status === "error" || (validationResult?.status === "warning" && !selectedEPSG))) ||
                    (projectType === "layers" &&
                      (!layers.pipe || !layers.junction || Object.values(layerValidations).some(v => v?.status === 'error'))) ||
                    (projectType === "import" && !importFile)
                  }
                >
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
