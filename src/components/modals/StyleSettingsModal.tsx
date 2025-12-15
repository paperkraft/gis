"use client";

import { ArrowLeftRight, Palette, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { interpolateColor } from '@/lib/styles/helper';
import { PRESETS } from '@/lib/styles/presets';
import { cn } from '@/lib/utils';
import { GradientStop, StyleType, useStyleStore } from '@/store/styleStore';
import { useUIStore } from '@/store/uiStore';

export function StyleSettingsModal() {
  const { styleSettingsModalOpen, setStyleSettingsModalOpen } = useUIStore();
  const { 
    gradientStops, setGradientStops, minMax, updateMinMax, 
    colorMode, styleType, classCount, setStyleType, setClassCount 
  } = useStyleStore();

  const [localStops, setLocalStops] = useState<GradientStop[]>([]);
  const [localMinMax, setLocalMinMax] = useState<{min: number, max: number}>({ min: 0, max: 100 });
  const [localStyleType, setLocalStyleType] = useState<StyleType>('continuous');
  const [localClassCount, setLocalClassCount] = useState<number>(5);

  useEffect(() => {
    if (styleSettingsModalOpen) {
      setLocalStops([...gradientStops].sort((a, b) => a.offset - b.offset));
      if (colorMode !== 'none' && minMax[colorMode]) {
          setLocalMinMax(minMax[colorMode]);
      }
      setLocalStyleType(styleType);
      setLocalClassCount(classCount);
    }
  }, [styleSettingsModalOpen, gradientStops, minMax, colorMode, styleType, classCount]);

  const handleSave = () => {
    setGradientStops(localStops);
    setStyleType(localStyleType);
    setClassCount(localClassCount);
    if (colorMode !== 'none') {
        updateMinMax(colorMode, localMinMax.min, localMinMax.max);
    }
    setStyleSettingsModalOpen(false);
  };

  const updateStop = (index: number, field: keyof GradientStop, value: any) => {
    const newStops = [...localStops];
    newStops[index] = { ...newStops[index], [field]: value };
    setLocalStops(newStops.sort((a, b) => a.offset - b.offset));
  };

  const removeStop = (index: number) => {
    if (localStops.length <= 2) return;
    setLocalStops(localStops.filter((_, i) => i !== index));
  };

  const reverseStops = () => {
      const sorted = [...localStops].sort((a, b) => a.offset - b.offset);
      const colors = sorted.map(s => s.color);
      const offsets = sorted.map(s => s.offset);
      colors.reverse();
      const reversed = offsets.map((offset, i) => ({ offset, color: colors[i] }));
      setLocalStops(reversed);
  };

  const applyPreset = (stops: GradientStop[]) => {
      setLocalStops([...stops]);
  };

  const getGradientPreview = (stops: GradientStop[]) => {
    const sorted = [...stops].sort((a, b) => a.offset - b.offset);
    const css = sorted.map(s => `${s.color} ${s.offset}%`).join(', ');
    return `linear-gradient(to right, ${css})`;
  };

  // Helper to calculate class ranges
  const getClassInfo = (index: number, total: number) => {
      const stepPercent = 100 / total;
      const t = (index * stepPercent) + (stepPercent / 2);
      
      const rangeSpan = localMinMax.max - localMinMax.min;
      const stepValue = rangeSpan / total;
      const startVal = localMinMax.min + (index * stepValue);
      const endVal = startVal + stepValue;

      return {
          color: interpolateColor(t, localStops),
          start: startVal.toFixed(1),
          end: endVal.toFixed(1)
      };
  };

  return (
    <ModalDialog
      isOpen={styleSettingsModalOpen}
      onClose={() => setStyleSettingsModalOpen(false)}
      title="Visualization Settings"
      subtitle="Configure color ramp and data ranges"
      icon={Palette}
      maxWidth="lg"
      footer={
        <>
            <Button variant="outline" onClick={() => applyPreset(PRESETS[0].stops)} className="mr-auto">
                <RefreshCcw className="w-4 h-4 mr-2" /> Reset
            </Button>
            <Button variant="ghost" onClick={() => setStyleSettingsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-blue-600 text-white hover:bg-blue-700">Apply Changes</Button>
        </>
      }
    >
      <div className="space-y-8">
        
        {/* Top Controls */}
        <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">Color Mode</h4>
                <div className="flex bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                    <button 
                        onClick={() => setLocalStyleType('continuous')}
                        className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-all", localStyleType === 'continuous' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "text-gray-500 hover:text-gray-900")}
                    >
                        Gradient
                    </button>
                    <button 
                        onClick={() => setLocalStyleType('discrete')}
                        className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-all", localStyleType === 'discrete' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "text-gray-500 hover:text-gray-900")}
                    >
                        Classes
                    </button>
                </div>

                {localStyleType === 'discrete' && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-1">
                         <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] uppercase font-bold text-gray-400">Class Count: {localClassCount}</label>
                         </div>
                         <input 
                            type="range" 
                            min="2" max="10" step="1"
                            value={localClassCount}
                            onChange={(e) => setLocalClassCount(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                            <span>2</span><span>10</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Min/Max Range */}
            {colorMode !== 'none' && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">Data Range ({colorMode})</h4>
                    <div className="flex gap-4 items-center">
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-400">Min Value</label>
                            <input 
                                type="number" 
                                value={localMinMax.min}
                                onChange={(e) => setLocalMinMax(prev => ({ ...prev, min: parseFloat(e.target.value) }))}
                                className="w-full bg-white dark:bg-gray-900 border rounded-md px-2 py-1 text-sm"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-400">Max Value</label>
                            <input 
                                type="number" 
                                value={localMinMax.max}
                                onChange={(e) => setLocalMinMax(prev => ({ ...prev, max: parseFloat(e.target.value) }))}
                                className="w-full bg-white dark:bg-gray-900 border rounded-md px-2 py-1 text-sm"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Presets List */}
            <div>
                <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">Quick Presets</h4>
                <div className="space-y-2 h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.name}
                            onClick={() => applyPreset(preset.stops)}
                            className="w-full group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all"
                        >
                            <div 
                                className="h-6 w-24 rounded shadow-sm border border-gray-200/50" 
                                style={{ background: getGradientPreview(preset.stops) }} 
                            />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                                {preset.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Editor */}
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold uppercase text-gray-500">Active {localStyleType === 'discrete' ? 'Classes' : 'Gradient'}</h4>
                    <div className="flex gap-2">
                        <button onClick={reverseStops} className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" title="Reverse Colors">
                            <ArrowLeftRight className="w-3 h-3" /> Reverse
                        </button>
                    </div>
                </div>

                {/* Editor Content based on Mode */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    
                    {localStyleType === 'discrete' ? (
                        // --- DISCRETE MODE: CLASS LIST TABLE ---
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                             {Array.from({length: localClassCount}).map((_, i) => {
                                 const info = getClassInfo(i, localClassCount);
                                 return (
                                    <div key={i} className="flex items-center text-sm p-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <span className="w-6 text-[10px] text-gray-400 font-mono">C{i+1}</span>
                                        
                                        <div 
                                            className="w-8 h-6 rounded shadow-sm border border-gray-200 mx-3" 
                                            style={{ backgroundColor: info.color }}
                                        />
                                        
                                        <div className="flex-1 font-mono text-xs text-gray-600 dark:text-gray-300">
                                            {info.start} - {info.end}
                                        </div>
                                    </div>
                                 );
                             })}
                        </div>
                    ) : (
                        // --- CONTINUOUS MODE: GRADIENT EDITOR ---
                        <>
                             {/* Preview Bar */}
                            <div className="h-8 w-full rounded-lg shadow-inner mb-4 border border-gray-200 overflow-hidden" style={{ background: getGradientPreview(localStops) }} />
                            
                            {/* Stop Rows */}
                            {localStops.map((stop, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <input 
                                        type="color" 
                                        value={stop.color}
                                        onChange={(e) => updateStop(idx, 'color', e.target.value)}
                                        className="w-6 h-6 rounded cursor-pointer border-none bg-transparent p-0"
                                    />
                                    
                                    <input 
                                        type="number"
                                        min="0" max="100"
                                        value={stop.offset}
                                        onChange={(e) => updateStop(idx, 'offset', parseInt(e.target.value))}
                                        className="w-12 text-xs border rounded px-1 py-0.5 text-center bg-gray-50 dark:bg-gray-900"
                                    />
                                    
                                    <div className="flex-1">
                                        <input 
                                            type="range" 
                                            min="0" max="100" 
                                            value={stop.offset}
                                            onChange={(e) => updateStop(idx, 'offset', parseInt(e.target.value))}
                                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 block mt-1"
                                        />
                                    </div>
                                    
                                    <button 
                                        onClick={() => removeStop(idx)}
                                        disabled={localStops.length <= 2}
                                        className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>

      </div>
    </ModalDialog>
  );
}