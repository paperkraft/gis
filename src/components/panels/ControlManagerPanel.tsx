"use client";

import { useState, useEffect } from "react";
import { Cpu, Plus, Trash2, Save, X } from "lucide-react";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { NetworkControl } from "@/types/network";

export function ControlManagerPanel() {
  const { setActivePanel } = useUIStore();
  const { controls: storeControls, setControls, features } = useNetworkStore();

  const [localControls, setLocalControls] = useState<NetworkControl[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with store on mount
  useEffect(() => {
    setLocalControls(JSON.parse(JSON.stringify(storeControls)));
    setHasChanges(false);
  }, [storeControls]);

  const links = Array.from(features.values()).filter((f) =>
    ["pipe", "pump", "valve"].includes(f.get("type"))
  );
  const nodes = Array.from(features.values()).filter((f) =>
    ["junction", "tank", "reservoir"].includes(f.get("type"))
  );

  // --- ACTIONS ---
  const handleSave = () => {
    setControls(localControls);
    setHasChanges(false);
    // Optional: Auto-close or stay open? SimScale usually keeps it open.
    // setActivePanel("PROJECT_DETAILS");
  };

  const markChanged = () => setHasChanges(true);

  const handleAdd = () => {
    if (links.length === 0) {
      alert("No links available to control.");
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
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-600" />
          Network Controls
        </h2>
        <button
          onClick={() => setActivePanel("PROJECT_DETAILS")}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {localControls.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            No controls defined.
            <br />
            Click Add to create rules.
          </div>
        ) : (
          localControls.map((control) => (
            <div
              key={control.id}
              className="bg-white p-3 rounded border border-slate-200 shadow-sm space-y-2 text-xs"
            >
              {/* Row 1: Link & Action */}
              <div className="flex gap-2">
                <select
                  value={control.linkId}
                  onChange={(e) =>
                    updateLocalControl(control.id, { linkId: e.target.value })
                  }
                  className="flex-1 border rounded px-2 py-1"
                >
                  {links.map((l) => (
                    <option key={l.getId()} value={l.getId()}>
                      {l.get("label") || l.getId()}
                    </option>
                  ))}
                </select>
                <select
                  value={control.status}
                  onChange={(e) =>
                    updateLocalControl(control.id, {
                      status: e.target.value as any,
                    })
                  }
                  className="w-24 border rounded px-2 py-1 font-semibold text-indigo-600"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="ACTIVE">ACTIVE</option>
                </select>
              </div>

              {/* Row 2: Logic */}
              <div className="flex gap-2 items-center">
                <span className="text-slate-400 font-mono">IF</span>
                <select
                  value={control.type}
                  onChange={(e) =>
                    updateLocalControl(control.id, {
                      type: e.target.value as any,
                    })
                  }
                  className="flex-1 border rounded px-2 py-1"
                >
                  <option value="LOW LEVEL">Node Below</option>
                  <option value="HI LEVEL">Node Above</option>
                  <option value="TIMER">Time Is</option>
                </select>
              </div>

              {/* Row 3: Node & Value */}
              <div className="flex gap-2">
                {["LOW LEVEL", "HI LEVEL"].includes(control.type) && (
                  <select
                    value={control.nodeId}
                    onChange={(e) =>
                      updateLocalControl(control.id, { nodeId: e.target.value })
                    }
                    className="flex-1 border rounded px-2 py-1"
                  >
                    {nodes.map((n) => (
                      <option key={n.getId()} value={n.getId()}>
                        {n.get("label") || n.getId()}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="number"
                  value={control.value}
                  onChange={(e) =>
                    updateLocalControl(control.id, {
                      value: parseFloat(e.target.value),
                    })
                  }
                  className="w-20 border rounded px-2 py-1 text-center"
                />
                <button
                  onClick={() => handleDelete(control.id)}
                  className="ml-auto text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-200 bg-white shrink-0 flex gap-2">
        <Button
          onClick={handleAdd}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          size="sm"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Save className="w-4 h-4 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}
