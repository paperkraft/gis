"use client";

import { X, Keyboard } from "lucide-react";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: "Tools",
      items: [
        { key: "S", description: "Select tool" },
        { key: "M", description: "Modify tool" },
        { key: "P", description: "Draw Network (opens component selection)" },
        { key: "D", description: "Draw Network (alias)" },
        { key: "ESC", description: "Exit current tool / Return to Select" },
      ],
    },
    {
      category: "Map Navigation",
      items: [
        { key: "+", description: "Zoom in" },
        { key: "-", description: "Zoom out" },
        { key: "H", description: "Fit to extent (Home)" },
        { key: "R", description: "Toggle measurement tool" },
        { key: "Ctrl+F", description: "Focus location search" },
      ],
    },
    {
      category: "Quick Add Components",
      items: [
        { key: "1", description: "Add Junction" },
        { key: "2", description: "Add Tank" },
        { key: "3", description: "Add Reservoir" },
        { key: "4", description: "Add Pipe" },
        { key: "5", description: "Add Pump" },
        { key: "6", description: "Add Valve" },
      ],
    },
    {
      category: "Edit",
      items: [
        { key: "Delete", description: "Delete selected feature" },
        { key: "Ctrl+Z", description: "Undo (coming soon)" },
        { key: "Ctrl+Y", description: "Redo (coming soon)" },
      ],
    },
    {
      category: "File",
      items: [
        { key: "Ctrl+S", description: "Export network" },
        { key: "Ctrl+O", description: "Import network" },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-linear-to-r from-blue-500 to-blue-600">
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {section.category}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm text-gray-700">
                        {item.description}
                      </span>
                      <kbd className="px-3 py-1.5 text-xs font-mono font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded-md shadow-sm">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Press{" "}
            <kbd className="px-2 py-1 text-xs font-mono bg-white border border-gray-300 rounded">
              ?
            </kbd>{" "}
            anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
}
