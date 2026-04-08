import {
    AlertTriangle, ArrowRight, CheckCircle2, FileArchive, FileCode2, LayoutList, Loader2, MapPin,
    Maximize2, Search, UploadCloud, XCircle
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { FormGroup } from '@/components/form-controls/FormGroup';
import { FormInput } from '@/components/form-controls/FormInput';
import { FormProjectionSelect } from '@/components/form-controls/FormProjectionSelect';
import { FormSelect } from '@/components/form-controls/FormSelect';
import { Button } from '@/components/ui/button';
import { flowUnitOptions } from '@/constants/project';
import { GisValidationResult } from '@/lib/gis/gisValidator';
import { AutoProjection, getProjectionFromLocation } from '@/lib/gis/locationToZone';
import { cn } from '@/lib/utils';

import { ProjectType } from './ProjectTypeSelector';
import { LayerUploadField } from './LayerUploadField';

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
    selectedEPSG?: number;
    onProjectionFound?: (proj: AutoProjection) => void;
    getProjection?: (srid: number) => void;

    // Multi-Layer Props
    layers?: { [key: string]: File | null };
    layerValidations?: { [key: string]: GisValidationResult | null };
    layerValidating?: { [key: string]: boolean };
    onLayerFileSelect?: (key: string, file: File | null) => void;
}

export function ProjectFormFields({
    projectType, formData, setFormData, importFile, fileInputRef, handleFileSelect,
    validating, validationResult, showProjectionSelect, selectedEPSG,
    onProjectionFound, getProjection,
    layers, layerValidations, layerValidating, onLayerFileSelect

}: ProjectFormFieldsProps) {

    // Local state for the search
    const [locationQuery, setLocationQuery] = useState("");
    const [projection, setProjection] = useState<number | undefined>(selectedEPSG);
    const [isSearching, setIsSearching] = useState(false);
    const [foundZone, setFoundZone] = useState<AutoProjection | null>(null);

    // Sync local projection with prop (for auto-detection)
    React.useEffect(() => {
        if (selectedEPSG !== undefined) {
            setProjection(selectedEPSG);
        }
    }, [selectedEPSG]);

    const handleLocationSearch = async () => {
        if (!locationQuery.trim()) return;
        setIsSearching(true);
        setFoundZone(null);

        try {
            const result = await getProjectionFromLocation(locationQuery);
            setFoundZone(result);
            setProjection(+result.code);
            if (onProjectionFound) onProjectionFound(result);
        } catch (error) {
            toast.error("Location not found. Try a major city name.");
        } finally {
            setIsSearching(false);
        }
    };

    // Fetch dynamic projections for Blank project flow (REMOVED - now handled in component)

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
                            onChange={(v) => handleChange('title', v)}
                            placeholder={projectType === 'blank' ? "e.g. New Project" : "Auto-filled from filename"}
                        />

                        <FormInput
                            label="Description"
                            name="description"
                            textarea
                            value={formData.description}
                            onChange={(v) => handleChange('description', v)}
                            placeholder="Describe the project goals..."
                        />
                    </FormGroup>

                    {(projectType === 'gis' || projectType === 'layers') && (
                        <FormGroup label="Network Building Settings">
                            <div className="grid grid-cols-2 gap-3">
                                <FormInput
                                    type='number'
                                    step='0.1'
                                    label="Tolerance (m)"
                                    name="tolerance"
                                    value={formData.tolerance ?? 5}
                                    onChange={(v) => handleChange('tolerance', v)}
                                    placeholder="e.g. 5"
                                    description="Snapping distance for nodes."
                                />

                                <FormInput
                                    type='number'
                                    step='50'
                                    label="Max Pipe (m)"
                                    name="maxPipeLength"
                                    value={formData.maxPipeLength ?? 150}
                                    onChange={(v) => handleChange('maxPipeLength', v)}
                                    placeholder="e.g. 150"
                                    description="Split long segments."
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 px-1 leading-tight">
                                These settings control how raw GIS lines are converted into network pipes and junctions.
                            </p>
                        </FormGroup>
                    )}
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
                                    onChange={(v) => handleChange('units', v)}
                                    options={flowUnitOptions}
                                />
                                <FormProjectionSelect
                                    label="Projection"
                                    value={formData.projection}
                                    onChange={(v) => handleChange('projection', v)}
                                />
                            </div>
                        </FormGroup>
                    </div>
                ) : projectType === 'layers' ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <LayerUploadField
                                label="Pipes"
                                required
                                file={layers?.pipe || null}
                                onFileSelect={(f) => onLayerFileSelect?.('pipe', f)}
                                validation={layerValidations?.pipe}
                                validating={layerValidating?.pipe}
                            />
                            <LayerUploadField
                                label="Junctions"
                                required
                                file={layers?.junction || null}
                                onFileSelect={(f) => onLayerFileSelect?.('junction', f)}
                                validation={layerValidations?.junction}
                                validating={layerValidating?.junction}
                            />
                        </div>

                        <div className="space-y-3 pt-2 border-t border-slate-100">
                            <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Special Components (Optional)</h6>
                            <div className="grid grid-cols-2 gap-3">
                                <LayerUploadField
                                    label="Tanks"
                                    file={layers?.tank || null}
                                    onFileSelect={(f) => onLayerFileSelect?.('tank', f)}
                                    validation={layerValidations?.tank}
                                    validating={layerValidating?.tank}
                                />
                                <LayerUploadField
                                    label="Reservoirs"
                                    file={layers?.reservoir || null}
                                    onFileSelect={(f) => onLayerFileSelect?.('reservoir', f)}
                                    validation={layerValidations?.reservoir}
                                    validating={layerValidating?.reservoir}
                                />
                                <LayerUploadField
                                    label="Pumps"
                                    file={layers?.pump || null}
                                    onFileSelect={(f) => onLayerFileSelect?.('pump', f)}
                                    validation={layerValidations?.pump}
                                    validating={layerValidating?.pump}
                                />
                                <LayerUploadField
                                    label="Valves"
                                    file={layers?.valve || null}
                                    onFileSelect={(f) => onLayerFileSelect?.('valve', f)}
                                    validation={layerValidations?.valve}
                                    validating={layerValidating?.valve}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <FormGroup label='Source File'>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "group relative mt-2 border-2 border-dashed rounded-xl h-36 flex flex-col items-center justify-center text-slate-400 transition-all duration-300 cursor-pointer",
                                "hover:shadow-lg hover:-translate-y-1 active:scale-[0.98]",
                                importFile ? "border-green-400 bg-green-50 text-green-600" : "border-slate-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary bg-slate-50/50",
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
                                            "mt-2 p-2 rounded border flex gap-2 items-start text-left min-w-40 animate-in fade-in zoom-in-95",
                                            validationResult.status === 'error' ? "bg-red-50 border-red-100 text-red-700" :
                                                validationResult.status === 'warning' ? "bg-amber-50 border-amber-100 text-amber-700" :
                                                    "bg-green-50 border-green-100 text-green-700 shadow-sm"
                                        )}>
                                            <div className="shrink-0 mt-0.5">
                                                {validationResult.status === 'error' ? <XCircle size={14} /> :
                                                    validationResult.status === 'warning' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold leading-none mb-1">
                                                    {validationResult.status === 'error' ? 'Invalid File' :
                                                        validationResult.status === 'warning' ? 'Projection Warning' : 'Valid Geometry'}
                                                </span>
                                                <span className="text-[9px] leading-tight opacity-90">{validationResult.message}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center p-4">
                                    <UploadCloud size={32} className="mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                                    <span className="text-xs font-semibold">{uploadLabel}</span>
                                    <span className="text-[10px] opacity-60 mt-0.5">{uploadDesc}</span>
                                </div>
                            )}
                        </div>

                        {/* Coordinate Inspector (epanetjs style) */}
                        {importFile && validationResult?.details && (
                            <div className="hidden mt-4 p-3 bg-slate-50/50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <LayoutList size={14} className="text-slate-500" />
                                        <h6 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Metadata Inspector</h6>
                                    </div>
                                    <div className={cn(
                                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                        validationResult.details.isGeographic ? "bg-green-100 text-green-700 border border-green-200" : "bg-amber-100 text-amber-700 border border-amber-200"
                                    )}>
                                        {validationResult.details.isGeographic ? "Geographic (Lat/Lon)" : "Projected (Meters)"}
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                    <table className="w-full text-[10px]">
                                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                            <tr>
                                                <th className="px-2 py-1.5 text-left font-semibold">Sample Node</th>
                                                <th className="px-2 py-1.5 text-right font-semibold">X / Lon</th>
                                                <th className="px-2 py-1.5 text-right font-semibold">Y / Lat</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {validationResult.details.sampleCoords.map((c: any, i: number) => (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-2 py-1 text-slate-400 font-mono">#{i + 1}</td>
                                                    <td className="px-2 py-1 text-right font-mono text-slate-600 tabular-nums">{c[0].toFixed(3)}</td>
                                                    <td className="px-2 py-1 text-right font-mono text-slate-600 tabular-nums">{c[1].toFixed(3)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                                        <div className="flex items-center gap-1.5 mb-1 opacity-50">
                                            <Maximize2 size={10} className="text-slate-900" />
                                            <span className="text-[9px] font-bold uppercase tracking-tighter">X-Range</span>
                                        </div>
                                        <div className="text-[10px] font-mono font-bold text-slate-700 tabular-nums">
                                            {validationResult.details.bounds.minX.toFixed(0)} — {validationResult.details.bounds.maxX.toFixed(0)}
                                        </div>
                                    </div>
                                    <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                                        <div className="flex items-center gap-1.5 mb-1 opacity-50">
                                            <Maximize2 size={10} className="rotate-90 text-slate-900" />
                                            <span className="text-[9px] font-bold uppercase tracking-tighter">Y-Range</span>
                                        </div>
                                        <div className="text-[10px] font-mono font-bold text-slate-700 tabular-nums">
                                            {validationResult.details.bounds.minY.toFixed(0)} — {validationResult.details.bounds.maxY.toFixed(0)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Projection Handler */}
                        {(projectType === 'gis' || projectType === 'import') && showProjectionSelect && (
                            <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">Source SRS</span>
                                        <span className="text-[11px] font-bold text-blue-900 leading-none">
                                            {projection ? `EPSG:${projection}` : "Local (Identifying...)"}
                                        </span>
                                    </div>
                                    <ArrowRight className="text-blue-300" size={16} />
                                    <div className="flex flex-col gap-1 text-right">
                                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">Target (Map)</span>
                                        <span className="text-[11px] font-bold text-blue-900 leading-none">EPSG:4326 (WGS 84)</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <FormProjectionSelect
                                            label="CRS (Coordinate System)"
                                            value={projection ? `EPSG:${projection}` : ""}
                                            onChange={(v) => {
                                                const srid = parseInt(v.replace("EPSG:", ""), 10);
                                                setProjection(srid);
                                                getProjection?.(srid);
                                            }}
                                            description="Select the spatial reference system for your data."
                                        />
                                    </div>

                                    <div className="relative flex items-center">
                                        <div className="grow border-t border-slate-200"></div>
                                        <span className="shrink mx-3 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">OR</span>
                                        <div className="grow border-t border-slate-200"></div>
                                    </div>

                                    <div className="p-3 bg-blue-50/80 border border-blue-100 rounded animate-in fade-in zoom-in-95 space-y-3 shadow-sm">
                                        <div>
                                            <h6 className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                                                Identify Project Location
                                            </h6>
                                            <p className="text-[9px] text-blue-600 leading-relaxed mt-0.5">
                                                Search for a city or region to auto-detect the coordinate system.
                                            </p>
                                        </div>

                                        <div className="flex gap-2 items-start">
                                            <FormInput
                                                label=""
                                                name="location-search"
                                                value={locationQuery}
                                                onChange={(v) => setLocationQuery(v)}
                                                placeholder="e.g. Pune, Maharashtra, India"
                                                onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
                                                className='w-full'
                                            />
                                            <Button
                                                size="sm"
                                                onClick={handleLocationSearch}
                                                disabled={isSearching}
                                                className="size-8 shrink-0"
                                            >
                                                {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                            </Button>
                                        </div>

                                        {foundZone && (
                                            <div className="flex items-start gap-2 text-[10px] text-green-700 bg-green-50 p-2 rounded border border-green-200 animate-in zoom-in-95">
                                                <MapPin size={14} className="shrink-0 mt-0.5 text-green-600" />
                                                <div>
                                                    <span className="font-bold block">Detected: UTM Zone {foundZone.zone}{foundZone.hemisphere} ({foundZone.code})</span>
                                                    <span className="block opacity-80 italic">{foundZone.locationName}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </FormGroup>
                )}
            </div>
        </div>
    );
}