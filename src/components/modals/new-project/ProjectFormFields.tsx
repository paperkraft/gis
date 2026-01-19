import { AlertTriangle, CheckCircle2, FileArchive, FileCode2, Loader2, MapPin, Search, UploadCloud, X, XCircle } from 'lucide-react';
import React, { useState } from 'react';

import { FormGroup } from '@/components/form-controls/FormGroup';
import { FormInput } from '@/components/form-controls/FormInput';
import { FormSelect } from '@/components/form-controls/FormSelect';
import { flowUnitOptions, projectionList } from '@/constants/project';
import { cn } from '@/lib/utils';

import { ProjectType } from './ProjectTypeSelector';
import { GisValidationResult } from '@/lib/gis/gisValidator';
import { COMMON_PROJECTIONS } from '@/lib/gis/projections';
import { AutoProjection, getProjectionFromLocation } from '@/lib/gis/locationToZone';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ProjectFormFieldsProps {
    projectType: ProjectType;
    formData: any;
    setFormData: (data: any) => void;

    // File Handling
    importFile: File | null;
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;

    // GIS Validation & Projection Props
    validating?: boolean;
    validationResult?: GisValidationResult | null;
    showProjectionSelect?: boolean;
    onProjectionFound?: (proj: AutoProjection) => void;
}

export function ProjectFormFields({ 
    projectType, formData, setFormData, importFile, fileInputRef, handleFileSelect,
    validating, validationResult, showProjectionSelect,
    onProjectionFound
    
}: ProjectFormFieldsProps) {

    // Local state for the search
    const [locationQuery, setLocationQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [foundZone, setFoundZone] = useState<AutoProjection | null>(null);

    const handleLocationSearch = async () => {
        if (!locationQuery.trim()) return;
        setIsSearching(true);
        setFoundZone(null);

        try {
            const result = await getProjectionFromLocation(locationQuery);
            setFoundZone(result);
            if (onProjectionFound) onProjectionFound(result);
        } catch (error) {
            toast.error("Location not found. Try a major city name.");
        } finally {
            setIsSearching(false);
        }
    };
    
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
                                "relative mt-2 border-2 border-dashed rounded-xl h-36 flex flex-col items-center justify-center text-slate-400 transition-all cursor-pointer",
                                importFile ? "border-green-400 bg-green-50 text-green-600" : "border-slate-200 hover:border-blue-400 hover:text-blue-500 bg-slate-50/50",
                                // validationResult
                                validationResult?.status === 'error' && "border-red-400 bg-red-50 text-red-600 hover:border-red-500 hover:text-red-700",
                                validationResult?.status === 'warning' && "border-amber-400 bg-amber-50 text-amber-600 hover:border-amber-500 hover:text-amber-700"
                            )}
                        >
                            <input ref={fileInputRef} type="file" accept={acceptExt} className="hidden" onChange={handleFileSelect} />

                            {importFile ? (
                                <div className="flex flex-col items-center gap-0.5">
                                    {projectType === 'gis' ? <FileArchive size={20} /> : <FileCode2 size={20} />}
                                    <span className="text-xs font-bold">{importFile.name}</span>
                                    <span className="text-[10px] opacity-70">{(importFile.size / 1024).toFixed(1)} KB</span>
                                    <span className="text-[10px] text-slate-500">Click to change file</span>

                                    {/* Analysis */}
                                    {validating && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
                                            <Loader2 size={14} className="animate-spin" /> Analyzing geometry...
                                        </div>
                                    )}

                                    {/* Validation Result */}
                                    {validationResult && (
                                        <div className={cn(
                                            "p-2 text-[10px] flex gap-2 items-start leading-snug animate-in slide-in-from-top-2 fade-in duration-300",
                                            validationResult.status === 'error' ? "bg-red-50 border-red-200 text-red-700" :
                                            validationResult.status === 'warning' ? "bg-amber-50 border-amber-200 text-amber-700" :
                                            "bg-green-50 border-green-200 text-green-700"
                                        )}>
                                            <div className='flex gap-1'>
                                                <div className="shrink-0">
                                                    {validationResult.status === 'error' ? <XCircle size={14}/> : 
                                                    validationResult.status === 'warning' ? <AlertTriangle size={14}/> : <CheckCircle2 size={14}/>}
                                                </div>
                                                <span className="font-bold block mb-0.5">
                                                    {validationResult.status === 'error' ? 'Invalid File' : 
                                                    validationResult.status === 'warning' ? 'Projection Warning :' : 'Valid Geometry'}
                                                </span>
                                                {validationResult.message}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <UploadCloud size={32} className="mb-2" />
                                    <span className="text-xs font-medium">{uploadLabel}</span>
                                    <span className="text-[10px] opacity-70 mt-1">{uploadDesc}</span>
                                </div>
                            )}
                        </div>

                        {projectType === 'gis' && showProjectionSelect && (
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-md animate-in fade-in zoom-in-95 space-y-2">
                                <div>
                                    <h6 className="text-[11px] font-bold text-primary uppercase tracking-wide">
                                        Identify Project Location
                                    </h6>
                                    <p className="text-[10px] text-primary leading-relaxed">
                                        We detected local coordinates.<br/>Enter the city/region name to automatically fix the projection.
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <FormInput
                                        label=""
                                        name="location-search"
                                        value={locationQuery}
                                        onChange={(v)=> setLocationQuery(v)}
                                        placeholder="e.g. Kolhapur, Maharashtra, India"
                                        onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
                                        className='w-full'
                                    />
                                    <Button 
                                        size="sm" 
                                        onClick={handleLocationSearch} 
                                        disabled={isSearching}
                                        className='size-7.5'
                                        // className="bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                    </Button>
                                </div>

                                {foundZone && (
                                    <div className="flex items-start gap-2 text-[10px] text-green-700 bg-green-100/50 p-2 rounded border border-green-500">
                                        <MapPin size={14} className="shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold block">Detected: UTM Zone {foundZone.zone}{foundZone.hemisphere} - {foundZone.code}</span>
                                            <span className="block line-clamp-1">{foundZone.locationName}</span>
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