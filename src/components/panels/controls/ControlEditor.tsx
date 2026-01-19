import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NetworkControl } from "@/types/network";

interface ControlEditorProps {
  rule: NetworkControl;
  links: any[]; // OL Features
  nodes: any[]; // OL Features
  onChange: (r: NetworkControl) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ControlEditor({
  rule,
  links,
  nodes,
  onChange,
  onSave,
  onCancel,
}: ControlEditorProps) {
  const set = (field: keyof NetworkControl, val: any) => {
    onChange({ ...rule, [field]: val });
  };

  const currentMode = rule.type === "TIMER" ? "TIME" : "NODE";

  return (
    <div className="bg-white p-3 rounded border border-blue-200 shadow-md ring-1 ring-blue-50 space-y-3 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase">
          Rule Editor
        </span>
      </div>

      {/* ROW 1: TARGET & STATUS */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-slate-500">
            Target Link
          </label>
          <Select value={rule.linkId} onValueChange={(v) => set("linkId", v)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {links.map((l) => (
                <SelectItem key={l.getId()} value={l.getId() as string}>
                  {l.get("label") || l.getId()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-slate-500">
            Set Status
          </label>
          <Select
            value={rule.status}
            onValueChange={(v) => set("status", v as any)}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">OPEN</SelectItem>
              <SelectItem value="CLOSED">CLOSED</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-100"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-2 text-[10px] text-slate-400 uppercase font-bold">
            IF Condition
          </span>
        </div>
      </div>

      {/* ROW 2: LOGIC */}
      <div className="space-y-2">
        {/* Trigger Source Selection */}
        <div className="flex gap-2">
          <Select
            value={currentMode}
            onValueChange={(v) => {
              if (v === "TIME") {
                onChange({ ...rule, type: "TIMER", nodeId: undefined });
              } else {
                onChange({
                  ...rule,
                  type: "HI LEVEL",
                  nodeId:
                    nodes.length > 0 ? (nodes[0].getId() as string) : undefined,
                });
              }
            }}
          >
            <SelectTrigger className="h-7 text-xs w-20 shrink-0 font-semibold text-slate-700 bg-slate-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NODE">Node</SelectItem>
              <SelectItem value="TIME">Time</SelectItem>
            </SelectContent>
          </Select>

          {/* Node Selector (Hidden if Time) */}
          {currentMode === "NODE" ? (
            <Select value={rule.nodeId} onValueChange={(v) => set("nodeId", v)}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Select Node" />
              </SelectTrigger>
              <SelectContent>
                {nodes.map((n) => (
                  <SelectItem key={n.getId()} value={n.getId() as string}>
                    {n.get("label") || n.getId()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex-1 flex items-center px-2 text-xs text-slate-400 italic bg-slate-50 border border-transparent rounded h-7">
              Simulation Clock
            </div>
          )}
        </div>

        {/* Comparison & Value */}
        <div className="flex gap-2 items-center">
          {currentMode === "TIME" ? (
            <div className="w-[100px] text-xs font-medium text-slate-500 text-right pr-2">
              At Hour:
            </div>
          ) : (
            <Select
              value={rule.type}
              onValueChange={(v: any) => set("type", v)}
            >
              <SelectTrigger className="h-7 text-xs w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HI LEVEL">ABOVE</SelectItem>
                <SelectItem value="LOW LEVEL">BELOW</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="flex-1 relative">
            <Input
              type="number"
              value={rule.value}
              onChange={(e) => set("value", parseFloat(e.target.value))}
              className="h-7 text-xs pr-8 text-right font-mono"
            />
            <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 pointer-events-none">
              {currentMode === "TIME" ? "Hrs" : "m"}
            </span>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-2 pt-2 border-t border-slate-50 mt-1">
        <Button
          onClick={onSave}
          size="sm"
          className="flex-1 h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Save size={12} className="mr-1" /> Save Rule
        </Button>
        <Button
          onClick={onCancel}
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-slate-500 hover:text-slate-800"
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
