"use client";
import React from 'react';
import { useStyleStore } from '@/store/styleStore';

export function Legend() {
    const { colorMode, minMax, gradientStops, styleType, classCount } = useStyleStore();

    if (colorMode === 'none') return null;

    const range = minMax[colorMode];
    if (!range) return null;

    // Generate CSS gradient string from store stops
    const getBackground = () => {
        const sorted = [...gradientStops].sort((a, b) => a.offset - b.offset);
        const stops = sorted.map(s => `${s.color} ${s.offset}%`).join(', ');
        return `linear-gradient(to right, ${stops})`;
    };
    
    return (
        <div className="absolute bottom-8 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-20 w-48">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">
                {colorMode.charAt(0).toUpperCase() + colorMode.slice(1)}
            </h4>
            
            <div className="relative mb-1">
                 {styleType === 'discrete' ? (
                     // Discrete Mode: Flex container with borders
                      <div className="h-3 w-full rounded-sm flex overflow-hidden">
                           <div className="absolute inset-0" style={{ background: getBackground() }} />
                           <div className="absolute inset-0 flex">
                                {Array.from({length: classCount}).map((_, i) => (
                                    <div key={i} className="flex-1 border-r border-white/40 last:border-0" />
                                ))}
                           </div>
                      </div>
                 ) : (
                     // Continuous Mode
                     <div className="h-3 w-full rounded-full" style={{ background: getBackground() }} />
                 )}
            </div>
            
            <div className="flex justify-between text-[10px] font-mono text-gray-500">
                <span>{range.min.toFixed(0)}</span>
                <span>{((range.min + range.max)/2).toFixed(0)}</span>
                <span>{range.max.toFixed(0)}</span>
            </div>
        </div>
    );
}