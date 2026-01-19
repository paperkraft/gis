import { Trash2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NetworkControl } from "@/types/network";

interface ControlListItemProps {
  rule: NetworkControl;
  onEdit: () => void;
  onDelete: () => void;
}

export function ControlListItem({
  rule,
  onEdit,
  onDelete,
}: ControlListItemProps) {
  // Helper to make condition readable
  const getReadableCondition = (type: string) => {
    switch (type) {
      case "HI LEVEL":
        return "ABOVE";
      case "LOW LEVEL":
        return "BELOW";
      case "TIMER":
        return "AT TIME";
      default:
        return type;
    }
  };

  return (
    <div
      onClick={onEdit}
      className="group bg-white p-3 rounded border border-slate-200 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all relative"
    >
      <div className="flex flex-col gap-1">
        {/* LINE 1: ACTION */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-mono">
            {rule.linkId || "?"}
          </span>
          <ArrowRight size={12} className="text-slate-400" />
          <span
            className={cn(
              "px-1.5 py-0.5 rounded border text-[10px] uppercase",
              rule.status === "OPEN"
                ? "bg-green-50 text-green-700 border-green-100"
                : rule.status === "CLOSED"
                ? "bg-red-50 text-red-700 border-red-100"
                : "bg-indigo-50 text-indigo-700 border-indigo-100"
            )}
          >
            {rule.status}
          </span>
        </div>

        {/* LINE 2: CONDITION */}
        <div className="text-[10px] text-slate-500 font-mono pl-1 flex items-center gap-1">
          <span className="opacity-50">IF</span>
          <span className="font-bold text-slate-600">
            {rule.type === "TIMER" ? "CLOCK TIME" : rule.nodeId || "N/A"}
          </span>
          <span className="text-slate-400">
            {getReadableCondition(rule.type)}
          </span>
          <span className="font-bold text-slate-700">
            {rule.value} {rule.type === "TIMER" ? "Hrs" : ""}
          </span>
        </div>
      </div>

      {/* DELETE BUTTON (Hover Only) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
        title="Delete Rule"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
