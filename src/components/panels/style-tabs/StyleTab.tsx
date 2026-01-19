"use client";

import React, { useEffect, useState } from 'react';

import { FormGroup } from '@/components/form-controls/FormGroup';
import { FormInput } from '@/components/form-controls/FormInput';
import { FormSelect } from '@/components/form-controls/FormSelect';
import { PRESETS } from '@/lib/styles/presets';
import { GradientStop, useStyleStore, NodeColorMode, LinkColorMode } from '@/store/styleStore';

interface StyleTabProps {
    layerId: string;
}

export function StyleTab({ layerId }: StyleTabProps) {
    const { 
        getStyle, updateStyle, layerStyles,
        // New Split Modes
        nodeColorMode, setNodeColorMode,
        linkColorMode, setLinkColorMode,
        
        nodeGradient, setNodeGradient,
        linkGradient, setLinkGradient,
        minMax, updateMinMax
    } = useStyleStore();

    // 1. Determine if this layer is a Node or Link
    const isLinkLayer = ['pipe', 'pump', 'valve'].includes(layerId);
    
    // 2. Resolve Current Mode and Setter based on layer type
    const currentMode = isLinkLayer ? linkColorMode : nodeColorMode;
    const currentGradient = isLinkLayer ? linkGradient : nodeGradient;

    const setMode = (val: string) => isLinkLayer ? setLinkColorMode(val as LinkColorMode) : setNodeColorMode(val as NodeColorMode);
    const setGradient = (stops: GradientStop[]) => isLinkLayer ? setLinkGradient(stops) : setNodeGradient(stops);

    // Local State
    const [localStyle, setLocalStyle] = useState<any>(null);
    const [localStops, setLocalStops] = useState<GradientStop[]>([]);
    const [localMinMax, setLocalMinMax] = useState<{ min: number, max: number }>({ min: 0, max: 100 });

    // Sync State
    useEffect(() => {
        setLocalStyle(getStyle(layerId));
        setLocalStops([...currentGradient].sort((a, b) => a.offset - b.offset));
        
        // Use currentMode (node/link) to get minMax
        if (currentMode !== 'none' && minMax[currentMode]) {
            setLocalMinMax(minMax[currentMode]);
        }
    }, [layerId, layerStyles, currentGradient, currentMode, minMax, getStyle]);

    // --- HANDLERS ---

    const handleBaseChange = (key: string, value: any) => {
        const newStyle = { ...localStyle, [key]: value };
        setLocalStyle(newStyle);
        updateStyle(layerId, newStyle);
    };

    const handleThematicSave = (stops = localStops) => {
        // Ensure strictly sorted before saving
        const sorted = [...stops].sort((a, b) => a.offset - b.offset);
        setGradient(sorted);
        if (currentMode !== 'none') updateMinMax(currentMode, localMinMax.min, localMinMax.max);
    };

    const handleStopChange = (index: number, field: keyof GradientStop, value: any) => {
        const newStops = [...localStops];
        newStops[index] = { ...newStops[index], [field]: value };
        setLocalStops(newStops);
        if (field === 'color') handleThematicSave(newStops);
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
    
    // Attribute Options based on Layer Type
    const getOptions = () => {
        const base = [{ value: 'none', label: 'Uniform Color' }];
        
        if (isLinkLayer) {
            return [
                ...base, 
                { value: 'diameter', label: 'Diameter' }, 
                { value: 'roughness', label: 'Roughness' }, 
                { value: 'flow', label: 'Flow' }, 
                { value: 'velocity', label: 'Velocity' },
                { value: 'headloss', label: 'Headloss' }
            ];
        }
        
        // Node Options
        return [
            ...base, 
            { value: 'elevation', label: 'Elevation' }, 
            { value: 'pressure', label: 'Pressure' }, 
            { value: 'head', label: 'Head' },
            { value: 'demand', label: 'Demand' }
        ];
    };

    const isThematic = currentMode !== 'none';

    return (
        <div className="p-4 space-y-6">
            
            {/* 1. COLOR MODE SELECTOR */}
            <FormGroup label="Coloring Method">
                <FormSelect 
                    label="Method" 
                    value={currentMode}
                    options={getOptions()}
                    onChange={(v) => setMode(v)}
                />
            </FormGroup>

            {/* 2. THEMATIC EDITOR */}
            {isThematic ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                    {/* Range */}
                    <div className="bg-primary-foreground/50 p-3 rounded border border-primary/10">
                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase mb-1">
                            <span>Min Value</span>
                            <span>Max Value</span>
                        </div>
                        <div className="flex gap-2">
                            <input type="number" value={localMinMax.min} onChange={(e) => setLocalMinMax(prev => ({...prev, min: parseFloat(e.target.value)}))} onBlur={() => handleThematicSave()} className="w-full text-xs border rounded px-2 py-1 bg-background" />
                            <input type="number" value={localMinMax.max} onChange={(e) => setLocalMinMax(prev => ({...prev, max: parseFloat(e.target.value)}))} onBlur={() => handleThematicSave()} className="w-full text-xs border rounded px-2 py-1 bg-background text-right" />
                        </div>
                    </div>

                    {/* Gradient */}
                    <FormGroup label="Gradient">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Color Map</label>
                                <button onClick={handleReverseGradient} className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition-colors">
                                    Reverse
                                </button>
                            </div>
                            
                            {/* Visual Preview Bar */}
                            <div className="h-6 w-full rounded-md shadow-inner border border-slate-300 mb-3 relative overflow-hidden">
                                <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${localStops.map(s => `${s.color} ${s.offset}%`).join(', ')})` }} />
                            </div>

                            {/* Stops Data Grid */}
                            <div className="border border-slate-200 rounded-md overflow-hidden text-xs">
                                {/* Header */}
                                <div className="grid grid-cols-[1fr_60px_40px] bg-slate-100 border-b border-slate-200 px-2 py-1.5 font-semibold text-slate-600">
                                    <span>Offset %</span>
                                    <span>Hex</span>
                                    <span className="text-center">Color</span>
                                </div>
                                
                                {/* Rows */}
                                <div className="divide-y divide-slate-100 bg-white">
                                    {localStops.map((stop, idx) => (
                                        <div key={idx} className="grid grid-cols-[1fr_60px_40px] px-2 py-1 items-center hover:bg-slate-50 group transition-colors">
                                            
                                            {/* Offset Input */}
                                            <div className="relative pr-2">
                                                <input 
                                                    type="number" 
                                                    min="0" max="100" 
                                                    value={stop.offset}
                                                    onChange={(e) => handleStopChange(idx, 'offset', parseInt(e.target.value))}
                                                    onBlur={() => handleThematicSave()} 
                                                    className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none py-0.5 text-slate-700 font-mono"
                                                />
                                            </div>

                                            {/* Hex Label */}
                                            <span className="font-mono text-[10px] text-slate-400 uppercase select-all">
                                                {stop.color}
                                            </span>

                                            {/* Color Picker Swatch */}
                                            <div className="flex justify-center">
                                                <div className="relative w-5 h-5 rounded shadow-sm ring-1 ring-slate-200 overflow-hidden cursor-pointer hover:ring-blue-400">
                                                    <input 
                                                        type="color" 
                                                        value={stop.color} 
                                                        onChange={(e) => handleStopChange(idx, 'color', e.target.value)}
                                                        className="absolute -top-2 -left-2 w-10 h-10 p-0 cursor-pointer opacity-0"
                                                    />
                                                    <div className="w-full h-full" style={{ backgroundColor: stop.color }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Presets */}
                        <div className="mt-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2 block">Quick Presets</label>
                            <div className="grid grid-cols-6 gap-1.5">
                                {PRESETS.map((p, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => { setLocalStops(p.stops); handleThematicSave(p.stops); }} 
                                        className="h-5 rounded-sm border border-slate-200 hover:border-blue-500 hover:shadow-sm transition-all shadow-sm" 
                                        style={{ background: `linear-gradient(to right, ${p.stops.map(s => `${s.color} ${s.offset}%`).join(', ')})` }} 
                                        title={p.name} 
                                    />
                                ))}
                            </div>
                        </div>
                    </FormGroup>
                </div>
            ) : (
                /* 3. UNIFORM COLOR PICKER (For Base Style) */
                <div className="animate-in fade-in slide-in-from-left-1">
                     <FormGroup label="Base Color">
                        <div className="flex flex-wrap gap-2">
                            {['#94a3b8', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0f172a'].map(c => (
                                <button key={c} onClick={() => handleBaseChange('color', c)} className={`w-6 h-6 rounded-full border border-slate-200 shadow-sm transition-transform hover:scale-110 ${localStyle?.color === c ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`} style={{ backgroundColor: c }} />
                            ))}
                            <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-100">
                                <input type="color" value={localStyle?.color || '#000'} onChange={(e) => handleBaseChange('color', e.target.value)} className="absolute -top-2 -left-2 w-10 h-10 p-0 cursor-pointer opacity-0" />
                                <div className="w-full h-full" style={{backgroundColor: localStyle?.color}} />
                            </div>
                        </div>
                    </FormGroup>
                </div>
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
                <div className="flex justify-between">
                    <label className="text-[10px] font-bold text-slate-500">Layer Opacity</label>
                    <span className="text-[10px] font-mono text-slate-400">{Math.round((localStyle?.opacity || 1) * 100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.1" value={localStyle?.opacity || 1} onChange={(e) => handleBaseChange('opacity', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            </FormGroup>
        </div>
    );
}