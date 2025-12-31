"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataListProps {
  items: { id: string; description?: string }[];
  selectedId: string | null;
  typeLabel: string; // "Pattern" or "Curve"
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function DataList({ 
  items, selectedId, typeLabel, onSelect, onDelete, onAdd 
}: DataListProps) {
  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {items.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs italic">
            No {typeLabel}s defined.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex justify-between items-center p-2 rounded border cursor-pointer group transition-all",
                selectedId === item.id
                  ? "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-100"
                  : "border-slate-100 hover:bg-slate-50 hover:border-blue-200"
              )}
            >
              <div className="min-w-0">
                <div className={cn(
                  "text-xs font-bold font-mono truncate",
                  selectedId === item.id ? "text-blue-700" : "text-slate-700"
                )}>
                  {item.id}
                </div>
                <div className="text-[10px] text-slate-500 truncate w-32">
                  {item.description || "-"}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
              >
                <Trash2 size={12} />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Add Button Footer */}
      <div className="p-2 border-t border-slate-100 bg-slate-50">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs border-dashed bg-white"
          onClick={onAdd}
        >
          <Plus className="w-3 h-3 mr-2" /> Add {typeLabel}
        </Button>
      </div>
    </div>
  );
}