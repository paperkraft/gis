"use client";
import React from 'react';
import { Command, Keyboard, Layers, Map as MapIcon, PenTool, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const categories = [
    {
      title: "Essentials",
      icon: Command,
      shortcuts: [
        { label: "Save Project", keys: ["Ctrl", "S"] },
        { label: "Undo", keys: ["Ctrl", "Z"] },
        { label: "Redo", keys: ["Ctrl", "Shift", "Z"] },
        { label: "Delete Selection", keys: ["Del"] },
        { label: "Cancel / Deselect", keys: ["Esc"] },
      ],
    },
    {
      title: "Drawing Tools",
      icon: PenTool,
      shortcuts: [
        { label: "Add Junction", keys: ["1"] },
        { label: "Add Tank", keys: ["2"] },
        { label: "Add Reservoir", keys: ["3"] },
        { label: "Draw Pipe", keys: ["4"] },
        { label: "Add Pump", keys: ["5"] },
        { label: "Add Valve", keys: ["6"] },
      ],
    },
    {
      title: "Map Navigation",
      icon: MapIcon,
      shortcuts: [
        { label: "Pan Tool", keys: ["H"] },
        { label: "Select Tool", keys: ["S"] },
        { label: "Modify Tool", keys: ["M"] },
        { label: "Zoom In", keys: ["+"] },
        { label: "Zoom Out", keys: ["-"] },
        { label: "Fit to Extent", keys: ["F"] },
      ],
    },
    {
      title: "Panels & Views",
      icon: Layers,
      shortcuts: [
        { label: "Toggle Attribute Table", keys: ["T"] },
        { label: "Toggle Sidebar", keys: ["Ctrl", "B"] },
        { label: "Show Shortcuts", keys: ["?"] },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* BACKDROP */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* MODAL CONTAINER */}
      <div className="relative w-full max-w-2xl bg-background shadow-2xl rounded-sm border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh]">
        
        {/* HEADER (Matching WorkbenchModal style) */}
        <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-4 select-none shrink-0">
          <div className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <Keyboard size={14} className="text-slate-400" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-destructive transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-background custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            {categories.map((category) => (
              <div key={category.title} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <category.icon size={14} className="text-slate-400" />
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {category.title}
                  </h3>
                </div>

                <div className="flex flex-col gap-2.5">
                  {category.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between group"
                    >
                      <span className="text-xs font-medium text-slate-600">
                        {shortcut.label}
                      </span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key) => (
                          <kbd
                            key={key}
                            className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[9px] font-bold font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded shadow-[0_1px_1px_rgba(0,0,0,0.1)]"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="h-12 px-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs bg-background hover:bg-slate-100"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
