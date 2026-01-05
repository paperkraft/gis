"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Activity, GitCommit } from 'lucide-react';
import { useStyleStore, GradientStop } from '@/store/styleStore';
import { getColor } from '@/lib/styles/helper';

export function Legend() {
    const { 
        nodeColorMode, linkColorMode, minMax, 
        nodeGradient, linkGradient, 
        classCount 
    } = useStyleStore();

    return (
        <div className="absolute bottom-10 right-16 flex flex-col gap-3 z-20 items-end font-sans">
            {/* Link Legend */}
            {linkColorMode !== 'none' && minMax[linkColorMode] && (
                <EPANETLegendItem 
                    title={linkColorMode} 
                    icon={<Activity size={13} />}
                    range={minMax[linkColorMode]} 
                    stops={linkGradient}
                    classCount={classCount}
                    color="#3b82f6" 
                />
            )}

            {/* Node Legend */}
            {nodeColorMode !== 'none' && minMax[nodeColorMode] && (
                <EPANETLegendItem 
                    title={nodeColorMode} 
                    icon={<GitCommit size={13} />}
                    range={minMax[nodeColorMode]} 
                    stops={nodeGradient}
                    classCount={classCount}
                    color="#10b981" 
                />
            )}
        </div>
    );
}

// --- SUB-COMPONENT ---

interface LegendItemProps {
    title: string;
    icon: React.ReactNode;
    range: { min: number; max: number };
    stops: GradientStop[];
    classCount: number;
    color: string;
}

function EPANETLegendItem({ title, icon, range, stops, classCount, color }: LegendItemProps) {
    const [isOpen, setIsOpen] = useState(true);

    // Calculate Bins (Intervals)
    const step = (range.max - range.min) / classCount;
    const bins = [];
    
    // Generate ranges from Top (Max) to Bottom (Min)
    for (let i = classCount - 1; i >= 0; i--) {
        const lower = range.min + (i * step);
        const upper = range.min + ((i + 1) * step);
        
        // Get the color for the center of this bin
        const centerVal = lower + (step / 2);
        const binColor = getColor(centerVal, range.min, range.max, stops);
        
        bins.push({
            color: binColor,
            label: `${lower.toFixed(1)} - ${upper.toFixed(1)}`,
            min: lower,
            max: upper
        });
    }

    return (
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-md border border-gray-300 dark:border-gray-700 shadow-xl overflow-hidden w-40 transition-all">
            {/* Header */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 transition-colors"
            >
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-200 capitalize">
                    {icon}
                    <span>{title}</span>
                </div>
                {isOpen ? <ChevronDown size={12} className="text-gray-400"/> : <ChevronUp size={12} className="text-gray-400"/>}
            </button>

            {/* Content (List of Values) */}
            {isOpen && (
                <div className="p-2 space-y-0.5">
                    {bins.map((bin, i) => (
                        <div key={i} className="flex items-center gap-2 px-1 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition-colors cursor-default group">
                            {/* Color Box */}
                            <div 
                                className="w-4 h-4 rounded-[2px] border border-black/10 dark:border-white/10 shadow-sm shrink-0" 
                                style={{ backgroundColor: bin.color }} 
                            />
                            
                            {/* Range Text */}
                            <span className="text-[10px] font-mono font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap group-hover:text-gray-900 dark:group-hover:text-white">
                                {bin.label}
                            </span>
                        </div>
                    ))}
                    
                    {/* Unit Label (Optional Footer) */}
                    <div className="pt-1 mt-1 border-t border-gray-100 dark:border-gray-700 text-[9px] text-gray-400 text-center font-medium uppercase tracking-wider">
                       Values in {getUnit(title)}
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper to guess units based on attribute name
function getUnit(attribute: string) {
    const attr = attribute.toLowerCase();
    if (attr.includes('pressure')) return 'm (Head)';
    if (attr.includes('velocity')) return 'm/s';
    if (attr.includes('flow')) return 'LPS';
    if (attr.includes('diameter')) return 'mm';
    if (attr.includes('head')) return 'm';
    if (attr.includes('elevation')) return 'm';
    return '';
}