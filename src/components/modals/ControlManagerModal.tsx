"use client";

import { useState, useEffect } from "react";
import { X, Cpu, Plus, Trash2, AlertCircle, Save } from "lucide-react";
import { useNetworkStore } from "@/store/networkStore";
import { Button } from "@/components/ui/button";
import { NetworkControl, ControlType, ControlAction } from "@/types/network";

interface ControlManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ControlManagerModal({
  isOpen,
  onClose,
}: ControlManagerModalProps) {
  const storeControls = useNetworkStore((state) => state.controls);
  const setControls = useNetworkStore((state) => state.setControls); // Use new setter
  const features = useNetworkStore((state) => state.features);

  const [localControls, setLocalControls] = useState<NetworkControl[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Load from store
  useEffect(() => {
    if (isOpen) {
      setLocalControls(JSON.parse(JSON.stringify(storeControls)));
      setHasChanges(false);
    }
  }, [isOpen, storeControls]);

  // Dropdown lists
  const links = Array.from(features.values()).filter((f) =>
    ["pipe", "pump", "valve"].includes(f.get("type"))
  );
  const nodes = Array.from(features.values()).filter((f) =>
    ["junction", "tank", "reservoir"].includes(f.get("type"))
  );

  if (!isOpen) return null;

  // --- ACTIONS ---

  const handleSave = () => {
    setControls(localControls);
    setHasChanges(false);
    onClose();
  };

  const markChanged = () => setHasChanges(true);

  const handleAdd = () => {
    if (links.length === 0) {
      alert("You need at least one Link (Pump/Valve/Pipe) to control.");
      return;
    }
    const newControl: NetworkControl = {
      id: crypto.randomUUID(),
      linkId: links[0].getId() as string,
      status: "CLOSED",
      type: "HI LEVEL",
      nodeId: nodes.length > 0 ? (nodes[0].getId() as string) : undefined,
      value: 10,
    };
    setLocalControls([...localControls, newControl]);
    markChanged();
  };

  const handleDelete = (id: string) => {
    setLocalControls(localControls.filter((c) => c.id !== id));
    markChanged();
  };

  const updateLocalControl = (id: string, updated: Partial<NetworkControl>) => {
    setLocalControls(
      localControls.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );
    markChanged();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl h-[70vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" /> Network Controls
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/50">
          {localControls.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p>No controls defined.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {localControls.map((control) => {
                const linkExists = links.some(
                  (l) => l.getId() === control.linkId
                );
                const nodeExists =
                  !["LOW LEVEL", "HI LEVEL"].includes(control.type) ||
                  nodes.some((n) => n.getId() === control.nodeId);
                const isValid = linkExists && nodeExists;

                return (
                  <div
                    key={control.id}
                    className={`bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm flex items-center gap-3 flex-wrap ${
                      !isValid && "border-red-300"
                    }`}
                  >
                    {/* Link Select */}
                    <select
                      value={control.linkId}
                      onChange={(e) =>
                        updateLocalControl(control.id, {
                          linkId: e.target.value,
                        })
                      }
                      className="text-sm border rounded px-2 py-1 bg-white"
                    >
                      {links.map((l) => (
                        <option key={l.getId()} value={l.getId()}>
                          {l.get("label")}
                        </option>
                      ))}
                    </select>

                    {/* Action Select */}
                    <select
                      value={control.status}
                      onChange={(e) =>
                        updateLocalControl(control.id, {
                          status: e.target.value as any,
                        })
                      }
                      className="text-sm border rounded px-2 py-1 font-bold text-indigo-600 bg-white"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="CLOSED">CLOSED</option>
                      <option value="ACTIVE">ACTIVE</option>
                    </select>

                    {/* Type Select */}
                    <select
                      value={control.type}
                      onChange={(e) =>
                        updateLocalControl(control.id, {
                          type: e.target.value as any,
                        })
                      }
                      className="text-sm border rounded px-2 py-1 bg-white"
                    >
                      <option value="LOW LEVEL">Node Below</option>
                      <option value="HI LEVEL">Node Above</option>
                      <option value="TIMER">Time Is</option>
                    </select>

                    {/* Node Select (Conditional) */}
                    {["LOW LEVEL", "HI LEVEL"].includes(control.type) && (
                      <select
                        value={control.nodeId}
                        onChange={(e) =>
                          updateLocalControl(control.id, {
                            nodeId: e.target.value,
                          })
                        }
                        className="text-sm border rounded px-2 py-1 bg-white"
                      >
                        {nodes.map((n) => (
                          <option key={n.getId()} value={n.getId()}>
                            {n.get("label")}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Value Input */}
                    <input
                      type="number"
                      value={control.value}
                      onChange={(e) =>
                        updateLocalControl(control.id, {
                          value: parseFloat(e.target.value),
                        })
                      }
                      className="w-20 text-sm border rounded px-2 py-1 bg-white text-center"
                    />

                    <div className="flex-1"></div>
                    <button
                      onClick={() => handleDelete(control.id)}
                      className="text-gray-400 hover:text-red-500 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
          <Button onClick={handleAdd} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> Add Control
          </Button>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
