import { FileCode2, UploadCloud } from 'lucide-react';
import React from 'react';

import { FormGroup } from '@/components/form-controls/FormGroup';
import { FormInput } from '@/components/form-controls/FormInput';
import { FormSelect } from '@/components/form-controls/FormSelect';
import { Label } from '@/components/ui/label';
import { flowUnitOptions, projectionList } from '@/constants/project';
import { cn } from '@/lib/utils';

interface ProjectFormFieldsProps {
    projectType: 'blank' | 'import';
    formData: any;
    setFormData: (data: any) => void;
    importFile: File | null;
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProjectFormFields({ 
    projectType, formData, setFormData, importFile, fileInputRef, handleFileSelect 
}: ProjectFormFieldsProps) {
    
    const handleChange = (key: string, val: any) => setFormData({ ...formData, [key]: val });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Common Details */}
            <div className="space-y-5">
                <div className="space-y-2">
                    <FormGroup label="Project Info">
                        <FormInput
                            label="Title *"
                            name="title"
                            value={formData.title}
                            onChange={(v)=> handleChange('title', v)}
                            placeholder={projectType === 'blank' ? "e.g. New Distribution Network" : "Project title (auto-filled)"}
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
                                "border-2 border-dashed rounded-xl h-36 flex flex-col items-center justify-center text-slate-400 transition-all cursor-pointer",
                                importFile ? "border-green-400 bg-green-50 text-green-600" : "border-slate-200 hover:border-blue-400 hover:text-blue-500 bg-slate-50/50"
                            )}
                        >
                            <input ref={fileInputRef} type="file" accept=".inp" className="hidden" onChange={handleFileSelect} />
                            {importFile ? (
                                <>
                                    <FileCode2 size={32} className="mb-2" />
                                    <span className="text-sm font-bold">{importFile.name}</span>
                                    <span className="text-[10px] opacity-70">{(importFile.size / 1024).toFixed(1)} KB</span>
                                    <span className="text-[10px] mt-2 bg-white px-2 py-0.5 rounded border border-green-200">Click to change</span>
                                </>
                            ) : (
                                <>
                                    <UploadCloud size={32} className="mb-2" />
                                    <span className="text-xs font-medium">Click to upload .inp file</span>
                                    <span className="text-[10px] opacity-70 mt-1">EPANET Input Files supported</span>
                                </>
                            )}
                        </div>
                        {importFile && (
                            <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs text-green-700 animate-in fade-in slide-in-from-bottom-2">
                                <p className="font-bold mb-1">Ready to Import</p>
                                We will parse geometry, curves, patterns, and controls from <strong>{importFile.name}</strong>. Coordinate projection will be auto-detected.
                            </div>
                        )}
                    </FormGroup>
                )}
            </div>
        </div>
    );
}