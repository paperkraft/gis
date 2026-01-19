"use client";

import { Plus, Search, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useNetworkStore } from "@/store/networkStore";
import { NetworkControl } from "@/types/network";

import { ControlEditor } from "./controls/ControlEditor";
import { ControlListItem } from "./controls/ControlListItem";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";

interface PanelProps {
  isMaximized?: boolean;
}

export function ControlManagerPanel({ isMaximized = false }: PanelProps) {
  const { controls: storeControls, setControls, features } = useNetworkStore();

  const [localControls, setLocalControls] = useState<NetworkControl[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempRule, setTempRule] = useState<NetworkControl | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Sync with store on mount
  useEffect(() => {
    setLocalControls(JSON.parse(JSON.stringify(storeControls)));
  }, [storeControls]);

  // --- DATA PREP ---
  const links = Array.from(features.values()).filter((f) =>
    ["pipe", "pump", "valve"].includes(f.get("type"))
  );
  const nodes = Array.from(features.values()).filter((f) =>
    ["junction", "tank", "reservoir"].includes(f.get("type"))
  );

  const generateNextId = () => {
    let index = 1;
    let newId = `C-${index}`;
    while (localControls.some((c) => c.id === newId)) {
      index++;
      newId = `C-${index}`;
    }
    return newId;
  };

  // --- ACTIONS ---

  const handleCreate = () => {
    if (links.length === 0) {
      alert("No links available to control. Add pumps or valves first.");
      return;
    }

    const newControl: NetworkControl = {
      id: generateNextId(),
      linkId: links[0].getId() as string,
      status: "CLOSED",
      type: "HI LEVEL",
      nodeId: nodes.length > 0 ? (nodes[0].getId() as string) : undefined,
      value: 0,
    };

    setTempRule(newControl);
    setEditingId("NEW");
  };

  const handleEdit = (rule: NetworkControl) => {
    setTempRule({ ...rule });
    setEditingId(rule.id);
  };

  const handleSave = () => {
    if (!tempRule) return;

    let updatedList = [...localControls];

    if (editingId === "NEW") {
      updatedList.push(tempRule);
    } else {
      updatedList = updatedList.map((c) => (c.id === editingId ? tempRule : c));
    }

    setLocalControls(updatedList);
    setControls(updatedList); // Commit to store

    setEditingId(null);
    setTempRule(null);
  };

  const handleDelete = (id: string) => {
    const updated = localControls.filter((c) => c.id !== id);
    setLocalControls(updated);
    setControls(updated);

    if (editingId === id) {
      setEditingId(null);
      setTempRule(null);
    }
  };

  // Filter for display
  const filteredControls = localControls.filter(
    (c) =>
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.linkId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* 1. INTERNAL TOOLBAR (Since Header is in Modal) */}
      <div className="flex items-center gap-2 p-2 border-b border-slate-200 bg-white shrink-0">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-7 pl-8 text-xs bg-slate-50 border-slate-200"
          />
        </div>

        {/* Add Button */}
        <Button
          onClick={handleCreate}
          disabled={!!editingId}
          size="sm"
          className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
        >
          <Plus size={14} className="mr-1.5" />
          Add Rule
        </Button>
      </div>

      {/* 2. SCROLLABLE LIST */}
      <div
        className={cn(
          "flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar",
          // If maximized, we can use a grid layout for better space usage
          isMaximized && "grid grid-cols-2 gap-3 space-y-0 content-start"
        )}
      >
        {/* EDITOR (Spans full width if maximized) */}
        {editingId === "NEW" && tempRule && (
          <div className={cn(isMaximized && "col-span-2")}>
            <ControlEditor
              rule={tempRule}
              links={links}
              nodes={nodes}
              onChange={setTempRule}
              onSave={handleSave}
              onCancel={() => setEditingId(null)}
            />
          </div>
        )}

        {/* EMPTY STATE */}
        {localControls.length === 0 && editingId !== "NEW" && (
          <div
            className={cn(
              "flex flex-col items-center justify-center h-40 opacity-40 text-xs italic space-y-2",
              isMaximized && "col-span-2"
            )}
          >
            <Settings2 size={24} />
            <p>No controls defined.</p>
          </div>
        )}

        {/* LIST ITEMS */}
        {filteredControls.map((rule) => {
          // If Editing this item
          if (editingId === rule.id && tempRule) {
            return (
              <div key={rule.id} className={cn(isMaximized && "col-span-2")}>
                <ControlEditor
                  rule={tempRule}
                  links={links}
                  nodes={nodes}
                  onChange={setTempRule}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            );
          }
          // Normal View
          return (
            <ControlListItem
              key={rule.id}
              rule={rule}
              onEdit={() => handleEdit(rule)}
              onDelete={() => handleDelete(rule.id)}
            />
          );
        })}
      </div>

      {/* 3. FOOTER INFO */}
      <div className="px-3 py-1.5 bg-slate-100 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between shrink-0">
        <span>Total Controls: {localControls.length}</span>
        {isMaximized && <span>Detailed View</span>}
      </div>
    </div>
  );
}
