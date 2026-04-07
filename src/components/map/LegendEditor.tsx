"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Palette, ArrowUpDown, X, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStyleStore, PRESETS } from '@/store/styleStore';
import { useSimulationStore } from '@/store/simulationStore';
import { calculateQuantiles, getUnit } from '@/lib/styles/helper';
import { cn } from '@/lib/utils';
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LegendEditorProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'node' | 'link';
  initialX?: number;
  initialY?: number;
}

export function LegendEditor({ isOpen, onClose, type, initialX = 100, initialY = 100 }: LegendEditorProps) {
  const {
    nodeColorMode,
    linkColorMode,
    nodeGradient,
    linkGradient,
    nodeCustomBreaks,
    linkCustomBreaks,
    nodeReverse,
    linkReverse,
    nodeLegendFramed,
    linkLegendFramed,
    classCount,
    minMax,
    setGradientPreset,
    setClassification,
    setCustomBreaks,
    toggleReverse,
    setLegendFramed,
    setNodeGradient,
    setLinkGradient,
    nodeClassification,
    linkClassification,
  } = useStyleStore();

  const { results } = useSimulationStore();

  const metric = type === 'node' ? nodeColorMode : linkColorMode;
  const reverse = type === 'node' ? nodeReverse : linkReverse;
  const framed = type === 'node' ? nodeLegendFramed : linkLegendFramed;
  const gradient = type === 'node' ? nodeGradient : linkGradient;
  const breaks = type === 'node' ? nodeCustomBreaks : linkCustomBreaks;
  const range = minMax[metric] || { min: 0, max: 100 };
  const activeClassification = type === 'node' ? nodeClassification : linkClassification;

  // 1. Handle Reverse for Preview
  const displayGradient = useMemo(() => {
    if (!reverse) return gradient;
    return gradient.map((s, i) => ({
      offset: s.offset,
      color: gradient[gradient.length - 1 - i].color
    }));
  }, [gradient, reverse]);

  // Draggable State
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const editorRef = useRef<HTMLDivElement>(null);

  // Local state for breaks (as strings)
  const [localBreaks, setLocalBreaks] = useState<string[]>([]);
  const lastOpenState = useRef(false);

  useEffect(() => {
    if (isOpen && !lastOpenState.current) {
      const initialBreaks = breaks.length > 0
        ? breaks.map(b => (typeof b === 'number' ? b.toFixed(2) : b))
        : Array.from({ length: classCount - 1 }, (_, i) => (range.min + (i + 1) * ((range.max - range.min) / classCount)).toFixed(2));

      setLocalBreaks(initialBreaks);
      setPosition({ x: initialX, y: initialY });
    }
    lastOpenState.current = isOpen;
  }, [isOpen, initialX, initialY, breaks, range.min, range.max, classCount]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!editorRef.current) return;
    setIsDragging(true);
    const rect = editorRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Data fetching for Quantiles
  const currentValues = useMemo(() => {
    if (!results || metric === 'none') return [];
    if (type === 'node') {
      return Object.values(results.nodes).map((n: any) => n[metric]).filter(v => v !== undefined);
    } else {
      return Object.values(results.links).map((l: any) => l[metric]).filter(v => v !== undefined);
    }
  }, [results, metric, type]);

  const handleEqualIntervals = () => {
    setClassification(type, 'equal_interval');
    const step = (range.max - range.min) / classCount;
    setLocalBreaks(Array.from({ length: classCount - 1 }, (_, i) => (range.min + (i + 1) * step).toFixed(2).toString()));
  };

  const handleEqualQuantiles = () => {
    setClassification(type, 'quantile');
    const newBreaks = calculateQuantiles(currentValues, classCount);
    setLocalBreaks(newBreaks.map(b => b.toFixed(2)));
  };

  const handleOK = () => {
    setCustomBreaks(type, localBreaks.map(b => parseFloat(b) || 0));
    onClose();
  };

  const updateColor = (index: number, color: string) => {
    const newStops = [...gradient];
    newStops[index] = { ...newStops[index], color };
    if (type === 'node') setNodeGradient(newStops);
    else setLinkGradient(newStops);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={editorRef}
      style={{ left: position.x, top: position.y }}
      className={cn(
        "fixed z-100 w-[370px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl rounded-sm select-none font-sans text-[9px] text-slate-700 dark:text-slate-200 ring-1 ring-slate-900/5 pointer-events-auto",
        isDragging && "opacity-95"
      )}
    >
      {/* Header Bar */}
      <div
        onMouseDown={handleMouseDown}
        className="h-9 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 cursor-move shrink-0 rounded-t-sm"
      >
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <Palette size={14} className="text-primary" />
          <span>Legend Editor</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="p-3.5 flex gap-3.5">
        {/* Left Column: Color Bar and Inputs */}
        <div className="flex gap-3 min-w-[125px]">
          {/* Vertical Color Bar */}
          <div className="flex flex-col w-7 rounded-sm overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
            {displayGradient.map((stop, i) => {
              const originalIndex = reverse ? gradient.length - 1 - i : i;
              return (
                <button
                  key={i}
                  type="button"
                  className="flex-1 w-full border-b last:border-0 border-slate-200/40 dark:border-slate-800/40 relative group"
                  style={{ backgroundColor: stop.color }}
                  onClick={() => document.getElementById(`color-picker-${type}-${originalIndex}`)?.click()}
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  <input
                    id={`color-picker-${type}-${originalIndex}`}
                    type="color"
                    className="absolute inset-0 opacity-0 pointer-events-none"
                    value={gradient[originalIndex].color}
                    onChange={(e) => updateColor(originalIndex, e.target.value)}
                  />
                </button>
              );
            })}
          </div>

          {/* Threshold Inputs - Vertically aligned with gaps */}
          <div className="flex flex-col justify-between py-0.5 flex-1 relative">
            <div className="text-[8.5px] h-3 text-primary font-bold uppercase tracking-tight opacity-70 mb-auto">{metric}</div>

            <div className="flex flex-col flex-1 justify-around py-1 gap-1">
              {localBreaks.map((val, i) => (
                <Input
                  key={i}
                  type="text"
                  value={val}
                  className="h-6 w-full px-1.5 text-[10px]! font-mono border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 focus:ring-1 focus:ring-primary/20 mb-0.5 last:mb-0"
                  onChange={(e) => {
                    const newBreaks = [...localBreaks];
                    newBreaks[i] = e.target.value;
                    setLocalBreaks(newBreaks);
                    setClassification(type, 'manual');
                  }}
                />
              ))}
            </div>

            <div className="text-[8px] h-3 text-slate-400 font-bold uppercase tracking-widest mt-auto">{getUnit(metric)}</div>
          </div>
        </div>

        {/* Center Column: Method Buttons (Action Group) */}
        <div className="flex flex-col gap-1.5 w-26 justify-center">
          <Button
            variant={'outline'}
            size="sm"
            onClick={handleEqualIntervals}
            className={cn(
              "h-7 text-[9px] font-semibold rounded-sm",
              activeClassification === 'equal_interval' ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20" : ""
            )}
          >
            Equal Intervals
          </Button>
          <Button
            variant={'outline'}
            size="sm"
            onClick={handleEqualQuantiles}
            className={cn(
              "h-7 text-[9px] font-semibold rounded-sm",
              activeClassification === 'quantile' ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20" : ""
            )}
          >
            Equal Quantiles
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-2 text-[9px] font-semibold rounded-sm gap-1">
                <Palette size={10} className="text-slate-400" />
                Color Ramp
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => {
                const preset = PRESETS[key];
                return (
                  <DropdownMenuItem key={key} onClick={() => setGradientPreset(type, key)} className="flex items-center gap-2.5">
                    <div className="flex-1 h-2 rounded-[1px] flex overflow-hidden border border-slate-200">
                      {preset.map((stop, i) => (
                        <div key={i} className="flex-1 h-full" style={{ backgroundColor: stop.color }} />
                      ))}
                    </div>
                    <span className="text-[8px] font-bold uppercase text-slate-500 w-11">{key}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant={'outline'}
            size="sm"
            onClick={() => toggleReverse(type)}
            className={cn(
              "h-7 px-2 text-[9px] font-semibold rounded-sm gap-1.5 transition-all text-left justify-start",
              reverse ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20" : ""
            )}
          >
            <ArrowUpDown className={cn(reverse ? "text-primary" : "text-slate-400")} />
            {reverse ? "Reversed" : "Standard"}
          </Button>
        </div>

        {/* Vertical Separator */}
        <div className="w-px bg-slate-200 dark:bg-slate-800" />

        {/* Right Column: OK / Cancel */}
        <div className="flex flex-col gap-1.5 w-18">
          <Button onClick={handleOK} variant="default" size="sm" className="h-7 font-bold tracking-wide text-[10px]">
            OK
          </Button>
          <Button onClick={onClose} variant="outline" size="sm" className="h-7 font-semibold text-[10px]">
            Cancel
          </Button>

          <div className="mt-auto flex items-center gap-1.5">
            <Checkbox
              id="framed"
              checked={framed}
              onCheckedChange={(checked) => setLegendFramed(type, !!checked)}
              className="border-slate-200"
            />
            <label htmlFor="framed" className="text-[9px] text-slate-500 font-bold uppercase tracking-tight cursor-pointer">Framed</label>
          </div>
        </div>
      </div>

      {/* Footer Hint Banner */}
      <div className="mx-4 mb-4 mt-0.5 p-1.5 bg-primary/5 dark:bg-primary/10 border border-primary/10 text-[8px] text-primary/70 rounded-sm italic font-medium flex items-center justify-center gap-1.5">
        <Info size={10} className="shrink-0" />
        Click on a color to change it individually
      </div>
    </div>
  );
}


