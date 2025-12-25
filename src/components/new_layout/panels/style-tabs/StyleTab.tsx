"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeftRight, Trash2, Plus } from "lucide-react";
import { useStyleStore, GradientStop } from "@/store/styleStore";
import { PRESETS } from '@/lib/styles/presets';
import { FormGroup, FormInput } from "../FormControls";

interface StyleTabProps {
    layerId: string;
}

export function StyleTab({ layerId }: StyleTabProps) {
    const { 
        getStyle, updateStyle, layerStyles,
        colorMode, setColorMode,
        gradientStops, setGradientStops,
        minMax, updateMinMax
    } = useStyleStore();

    // Local State
    const [localStyle, setLocalStyle] = useState<any>(null);
    const [localStops, setLocalStops] = useState<GradientStop[]>([]);
    const [localMinMax, setLocalMinMax] = useState<{ min: number, max: number }>({ min: 0, max: 100 });

    // Sync State
    useEffect(() => {
        setLocalStyle(getStyle(layerId));
        setLocalStops([...gradientStops].sort((a, b) => a.offset - b.offset));
        if (colorMode !== 'none' && minMax[colorMode]) {
            setLocalMinMax(minMax[colorMode]);
        }
    }, [layerId, layerStyles, gradientStops, colorMode, minMax, getStyle]);

    // --- HANDLERS ---

    const handleBaseChange = (key: string, value: any) => {
        const newStyle = { ...localStyle, [key]: value };
        setLocalStyle(newStyle);
        updateStyle(layerId, newStyle);
    };

    const handleThematicSave = (stops = localStops) => {
        setGradientStops(stops);
        if (colorMode !== 'none') updateMinMax(colorMode, localMinMax.min, localMinMax.max);
    };

    const handleReverseGradient = () => {
        const sorted = [...localStops].sort((a, b) => a.offset - b.offset);
        const colors = sorted.map(s => s.color);
        const offsets = sorted.map(s => s.offset);
        
        // Reverse colors but keep offsets in place
        colors.reverse();
        
        const reversed = offsets.map((offset, i) => ({ offset, color: colors[i] }));
        setLocalStops(reversed);
        handleThematicSave(reversed);
    };

    const isLine = ['pipe', 'pump', 'valve'].includes(layerId);
    
    // Attribute Options based on Layer
    const getOptions = () => {
        const base = [{ value: 'none', label: 'Uniform Color' }];
        if (layerId === 'pipe') return [...base, { value: 'diameter', label: 'Diameter' }, { value: 'roughness', label: 'Roughness' }, { value: 'flow', label: 'Flow' }, { value: 'velocity', label: 'Velocity' }];
        if (['junction', 'tank', 'reservoir'].includes(layerId)) return [...base, { value: 'elevation', label: 'Elevation' }, { value: 'pressure', label: 'Pressure' }, { value: 'head', label: 'Head' }];
        return base;
    };

    const isThematic = colorMode !== 'none';

    return (
        <div className="p-4 space-y-6">
            
            {/* 1. COLOR MODE SELECTOR */}
            <FormGroup label="Coloring Method">
                <select 
                    value={isThematic ? colorMode : 'none'} 
                    onChange={(e) => setColorMode(e.target.value as any)}
                    className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white focus:border-blue-500 outline-none"
                >
                    {getOptions().map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </FormGroup>

            {/* 2. THEMATIC EDITOR */}
            {isThematic ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    
                    {/* Range */}
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-2">
                            <span>Min Value</span>
                            <span>Max Value</span>
                        </div>
                        <div className="flex gap-2">
                            <input type="number" value={localMinMax.min} onChange={(e) => setLocalMinMax(prev => ({...prev, min: parseFloat(e.target.value)}))} onBlur={() => handleThematicSave()} className="w-full text-xs border rounded px-2 py-1" />
                            <input type="number" value={localMinMax.max} onChange={(e) => setLocalMinMax(prev => ({...prev, max: parseFloat(e.target.value)}))} onBlur={() => handleThematicSave()} className="w-full text-xs border rounded px-2 py-1 text-right" />
                        </div>
                    </div>

                    {/* Gradient */}
                    <FormGroup label="Gradient">
                        <div className="flex justify-end mb-1">
                            <button onClick={handleReverseGradient} className="text-[10px] flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors">
                                <ArrowLeftRight size={10} /> Reverse
                            </button>
                        </div>
                        <div className="h-4 w-full rounded shadow-sm border border-slate-200 mb-2" style={{ background: `linear-gradient(to right, ${localStops.map(s => `${s.color} ${s.offset}%`).join(', ')})` }} />
                        
                        <div className="space-y-1">
                            {localStops.map((stop, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input type="color" value={stop.color} onChange={(e) => { const n = [...localStops]; n[idx].color = e.target.value; setLocalStops(n); handleThematicSave(n); }} className="w-5 h-5 rounded cursor-pointer border-none p-0 bg-transparent" />
                                    <input type="range" min="0" max="100" value={stop.offset} onChange={(e) => { const n = [...localStops]; n[idx].offset = parseInt(e.target.value); setLocalStops(n.sort((a,b)=>a.offset-b.offset)); }} onMouseUp={() => handleThematicSave()} className="flex-1 h-1 bg-slate-200 rounded-lg accent-blue-600 appearance-none cursor-pointer" />
                                </div>
                            ))}
                        </div>
                    </FormGroup>

                    {/* Presets */}
                    <div className="grid grid-cols-5 gap-1 pt-1">
                        {PRESETS.slice(0, 5).map((p, i) => (
                            <button key={i} onClick={() => { setLocalStops(p.stops); handleThematicSave(p.stops); }} className="h-3 rounded border border-slate-100 hover:border-blue-400 hover:scale-105 transition-all" style={{ background: `linear-gradient(to right, ${p.stops.map(s => `${s.color} ${s.offset}%`).join(', ')})` }} title={p.name} />
                        ))}
                    </div>
                </div>
            ) : (
                /* 3. UNIFORM COLOR PICKER */
                <FormGroup label="Base Color">
                    <div className="flex flex-wrap gap-2">
                        {['#94a3b8', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0f172a'].map(c => (
                            <button key={c} onClick={() => handleBaseChange('color', c)} className={`w-6 h-6 rounded-full border border-slate-200 ${localStyle?.color === c ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`} style={{ backgroundColor: c }} />
                        ))}
                        <input type="color" value={localStyle?.color || '#000'} onChange={(e) => handleBaseChange('color', e.target.value)} className="w-6 h-6 p-0 border-0 rounded-full cursor-pointer" />
                    </div>
                </FormGroup>
            )}

            {/* 4. GEOMETRY  */}
            <FormGroup label="Geometry">
                <div className="space-y-3">
                    {layerId === 'pipe' && (
                        <div className="flex items-center justify-between bg-primary-foreground p-2 rounded border border-primary/20">
                            <div>
                                <div className="text-[11px] font-bold text-slate-700">Auto-Scale</div>
                                <div className="text-[9px] text-muted-foreground">Scale width by Diameter</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={localStyle?.autoScale ?? true} onChange={(e) => handleBaseChange('autoScale', e.target.checked)} className="sr-only peer" />
                                <div className="w-7 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>
                    )}

                    <div className={`grid grid-cols-2 gap-3 transition-opacity ${localStyle?.autoScale && layerId === 'pipe' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <FormInput label={isLine ? "Thickness" : "Radius"} value={isLine ? localStyle?.width || 1 : localStyle?.radius || 1} onChange={(v: string) => handleBaseChange(isLine ? 'width' : 'radius', parseFloat(v))} type="number" />
                        {!isLine && <FormInput label="Border" value={localStyle?.strokeWidth || 1} onChange={(v: string) => handleBaseChange('strokeWidth', parseFloat(v))} type="number" />}
                    </div>
                </div>
            </FormGroup>

            <FormGroup label="Opacity">
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="text-[11px] text-slate-600">
                    Layer Opacity
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                    {Math.round((localStyle?.opacity || 1) * 100)}%
                    </span>
                </div>
                <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={localStyle?.opacity || 1}
                    onChange={(e) =>
                        handleBaseChange("opacity", parseFloat(e.target.value))
                    }
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary mt-2"
                />
            </FormGroup>
        </div>
    );
}