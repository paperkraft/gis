import { AlertTriangle, CheckCircle2, FileArchive, FileCode2, Loader2, UploadCloud, XCircle } from 'lucide-react';
import React from 'react';

import { FormGroup } from '@/components/form-controls/FormGroup';
import { FormInput } from '@/components/form-controls/FormInput';
import { FormSelect } from '@/components/form-controls/FormSelect';
import { flowUnitOptions, projectionList } from '@/constants/project';
import { cn } from '@/lib/utils';

import { ProjectType } from './ProjectTypeSelector';
import { GisValidationResult } from '@/lib/gis/gisValidator';
import { COMMON_PROJECTIONS } from '@/lib/gis/projections';

interface ProjectFormFieldsProps {
    projectType: ProjectType;
    formData: any;
    setFormData: (data: any) => void;

    // File Handling
    importFile: File | null;
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;

    // GIS Validation & Projection Props (New)
    validating?: boolean;
    validationResult?: GisValidationResult | null;
    selectedEPSG?: string;
    setSelectedEPSG?: (val: string) => void;
    showProjectionSelect?: boolean;
}

export function ProjectFormFields({ 
    projectType, formData, setFormData, importFile, fileInputRef, handleFileSelect,
    validating, validationResult, selectedEPSG, setSelectedEPSG, showProjectionSelect 
}: ProjectFormFieldsProps) {
    
    const handleChange = (key: string, val: any) => setFormData({ ...formData, [key]: val });

    // Helper to determine accepted file extensions
    const acceptExt = projectType === 'gis' ? '.zip,.json,.geojson' : '.inp';
    const uploadLabel = projectType === 'gis' ? 'Upload GIS Data' : 'Upload Input File (.inp)';
    const uploadDesc = projectType === 'gis' ? 'Supports Shapefile (.zip) or GeoJSON (.json)' : 'EPANET 2.0 or 2.2 format';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column: Common Details */}
            <div className="space-y-5">
                <div className="space-y-2">
                    <FormGroup label="Project Info">
                        <FormInput
                            label="Title *"
                            name="title"
                            value={formData.title}
                            onChange={(v)=> handleChange('title', v)}
                            placeholder={projectType === 'blank' ? "e.g. New Project" : "Auto-filled from filename"}
                        />

                        <FormInput
                            label="Description"
                            name="description"
                            textarea
                            value={formData.description}
                            onChange={(v)=> handleChange('description', v)}
                            placeholder="Describe the project goals..."
                        />

                        { projectType === 'gis' && showProjectionSelect && setSelectedEPSG && (
                            <FormSelect
                                label="Confirm Coordinate System"
                                name="coord-system"
                                value={selectedEPSG}
                                onChange={(v)=> setSelectedEPSG(v)}
                                options={COMMON_PROJECTIONS}
                                className='text-primary'
                            />
                        )}
                    </FormGroup>
                </div>
            </div>

            {/* Right Column: Dynamic */}
            <div className="space-y-5">
                {projectType === 'blank' ? (
                    <div className="space-y-4">
                        <FormGroup label="Configuration">
                            <div className="grid grid-cols-2 gap-2">
                                <FormSelect
                                    label="Flow Units"
                                    name="units"
                                    value={formData.units}
                                    onChange={(v)=> handleChange('units', v)}
                                    options={flowUnitOptions}
                                />
                                <FormSelect
                                    label="Projection"
                                    name="projection"
                                    value={formData.projection}
                                    onChange={(v)=> handleChange('projection', v)}
                                    options={projectionList}
                                />
                               
                            </div>
                        </FormGroup>
                        
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 mt-2">
                            <p className="font-bold mb-1">Starting from scratch?</p>
                            You will start with an empty canvas. You can draw network using the toolbar, then configure simulation settings later.
                        </div>
                    </div>
                ) : (
                    <FormGroup label='Source File'>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "border-2 border-dashed rounded-xl h-36 flex flex-col items-center justify-center text-slate-400 transition-all cursor-pointer",
                                importFile ? "border-green-400 bg-green-50 text-green-600" : "border-slate-200 hover:border-blue-400 hover:text-blue-500 bg-slate-50/50"
                            )}
                        >
                            <input ref={fileInputRef} type="file" accept={acceptExt} className="hidden" onChange={handleFileSelect} />
                            {importFile ? (
                                <>
                                    {projectType === 'gis' ? <FileArchive size={20} /> : <FileCode2 size={20} />}
                                    <span className="text-sm font-bold">{importFile.name}</span>
                                    <span className="text-[10px] opacity-70">{(importFile.size / 1024).toFixed(1)} KB</span>
                                    <span className="text-[10px] mt-2 bg-white px-2 py-0.5 rounded border border-green-200">Click to change</span>
                                </>
                            ) : (
                                <>
                                    <UploadCloud size={32} className="mb-2" />
                                    <span className="text-xs font-medium">{uploadLabel}</span>
                                    <span className="text-[10px] opacity-70 mt-1">{uploadDesc}</span>
                                </>
                            )}
                        </div>

                        {/* Specific Warning for GIS */}
                        {projectType === 'gis' && !importFile && (
                            <div className="bg-amber-50 border border-amber-100 p-2.5 rounded text-[10px] text-amber-700 leading-tight">
                                <strong>Note:</strong> "Upload a .zip file containing at least .shp, .shx, .dbf, and .prj files." or GeoJson.<br/> We will auto-create pipes along the road centerlines.
                            </div>
                        )}

                        {/* --- Validation Feedback UI --- */}
                        {projectType === 'gis' && importFile && (
                            <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                                {validating ? (
                                    <div className="flex items-center gap-2 text-xs text-slate-500 p-2">
                                        <Loader2 size={14} className="animate-spin" /> Analyzing geometry...
                                    </div>
                                ) : validationResult && (
                                    <div className={cn(
                                        "p-3 rounded-md text-[11px] border flex gap-2 items-start leading-snug",
                                        validationResult.status === 'error' ? "bg-red-50 border-red-200 text-red-700" :
                                        validationResult.status === 'warning' ? "bg-amber-50 border-amber-200 text-amber-700" :
                                        "bg-green-50 border-green-200 text-green-700"
                                    )}>
                                        <div className="shrink-0 mt-0.5">
                                            {validationResult.status === 'error' ? <XCircle size={14}/> : 
                                             validationResult.status === 'warning' ? <AlertTriangle size={14}/> : <CheckCircle2 size={14}/>}
                                        </div>
                                        <div>
                                            <span className="font-bold block mb-0.5">
                                                {validationResult.status === 'error' ? 'Invalid File' : 
                                                 validationResult.status === 'warning' ? 'Projection Warning' : 'Valid Geometry'}
                                            </span>
                                            {validationResult.message}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </FormGroup>
                )}
            </div>
        </div>
    );
}