"use client";

import React from "react";
import {
  X,
  Keyboard,
  Command,
  PenTool,
  Map as MapIcon,
  Layers,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      color: "text-blue-500",
      shortcuts: [
        { label: "Save Project", keys: ["Ctrl", "S"] },
        { label: "Undo", keys: ["Ctrl", "Z"] },
        { label: "Redo", keys: ["Ctrl", "Y"] },
        { label: "Delete Selection", keys: ["Del"] },
        { label: "Cancel / Deselect", keys: ["Esc"] },
      ],
    },
    {
      title: "Drawing Tools",
      icon: PenTool,
      color: "text-purple-500",
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
      color: "text-green-500",
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
      color: "text-orange-500",
      shortcuts: [
        { label: "Toggle Attribute Table", keys: ["T"] },
        { label: "Toggle Sidebar", keys: ["Ctrl", "B"] },
        { label: "Show Shortcuts", keys: ["?"] },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh]">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-sm">
              <Keyboard className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-gray-500">Supercharge your workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
            {categories.map((category) => (
              <div key={category.title} className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                  <category.icon className={cn("w-4 h-4", category.color)} />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                    {category.title}
                  </h3>
                </div>

                <div className="space-y-2">
                  {category.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between group"
                    >
                      <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                        {shortcut.label}
                      </span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key) => (
                          <kbd
                            key={key}
                            className="min-w-6 h-6 px-1.5 flex items-center justify-center text-[10px] font-bold font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 rounded-md shadow-sm transition-transform group-hover:translate-y-0.5 group-hover:border-b-0"
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
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-end shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="hover:bg-white dark:hover:bg-gray-800"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
