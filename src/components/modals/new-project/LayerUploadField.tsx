import { AlertTriangle, CheckCircle2, FileArchive, Trash2, UploadCloud, XCircle } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LayerUploadFieldProps {
    label: string;
    required?: boolean;
    file: File | null;
    onFileSelect: (file: File | null) => void;
    accept?: string;
    validation?: {
        status: 'valid' | 'warning' | 'error';
        message?: string;
    } | null;
    validating?: boolean;
}

export function LayerUploadField({
    label,
    required,
    file,
    onFileSelect,
    accept = ".zip,.json,.geojson",
    validation,
    validating
}: LayerUploadFieldProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        onFileSelect(selectedFile);
    };

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                {file && (
                    <button
                        onClick={() => onFileSelect(null)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>

            <div
                onClick={() => !file && inputRef.current?.click()}
                className={cn(
                    "group relative border-2 border-dashed rounded-xl p-3 flex items-center gap-3 transition-all duration-300 cursor-pointer min-h-[60px]",
                    "hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]",
                    file
                        ? validation?.status === 'error'
                            ? "border-red-400 bg-red-50 text-red-600"
                            : validation?.status === 'warning'
                                ? "border-amber-400 bg-amber-50 text-amber-600"
                                : "border-green-400 bg-green-50 text-green-600 shadow-sm"
                        : "border-slate-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary bg-slate-50/50"
                )}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={handleFileChange}
                />

                {file ? (
                    <>
                        <div className='absolute top-1 right-2'>
                            {validation?.status === 'error' ? <XCircle size={14} className="text-red-500" /> :
                                validation?.status === 'warning' ? <AlertTriangle size={14} className="text-amber-500" /> :
                                    <CheckCircle2 size={14} className="text-green-500" />}
                        </div>
                        <div className="shrink-0 bg-white p-2 rounded-lg shadow-sm border border-slate-100">

                            <FileArchive size={16} className={cn(
                                validation?.status === 'error' ? "text-red-500" :
                                    validation?.status === 'warning' ? "text-amber-500" : "text-green-500"
                            )} />

                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-bold truncate">{file.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] opacity-70">{(file.size / 1024).toFixed(1)} KB</span>
                                {validating ? (
                                    <span className="text-[9px] text-slate-400 italic flex items-center gap-1">
                                        Validating...
                                    </span>
                                ) : validation && (
                                    <span className={cn(
                                        "text-[9px] font-medium",
                                        validation.status === 'error' ? "text-red-600" :
                                            validation.status === 'warning' ? "text-amber-600" : "text-green-600"
                                    )}>
                                        {validation.message}
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-3 w-full">
                        <div className="bg-slate-100 p-2 rounded-lg text-slate-400 group-hover:text-blue-500 transition-colors">
                            <UploadCloud size={18} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold">Select layer file</span>
                            <span className="text-[9px] opacity-60">SHP (.zip) or GeoJSON</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
