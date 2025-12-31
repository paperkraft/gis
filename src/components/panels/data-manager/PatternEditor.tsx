"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimePattern } from "@/types/network";
import { cn } from "@/lib/utils";
import { FormInput } from "@/components/form-controls/FormInput";

interface PatternEditorProps {
  data: TimePattern;
  isMaximized: boolean;
  onChange: (updated: TimePattern) => void;
  onBack: () => void;
}

export function PatternEditor({ data, isMaximized, onChange, onBack }: PatternEditorProps) {
  
  const updateVal = (idx: number, val: string) => {
    const newMultipliers = [...data.multipliers];
    newMultipliers[idx] = parseFloat(val) || 0;
    onChange({ ...data, multipliers: newMultipliers });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Back Button (Mobile/Minimized only) */}
      {!isMaximized && (
        <div className="shrink-0 mb-2 border-b border-slate-100 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-6 pl-0 text-slate-500 hover:text-slate-800 text-xs"
          >
            <ArrowLeft className="w-3 h-3 mr-1" /> Back to List
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 space-y-4">
        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <FormInput label="ID" value={data.id} disabled/>
          <div className="md:col-span-2">
            <FormInput
              label="Description"
              value={data.description || ""}
              onChange={(v)=> onChange({...data, description: v})}
            />
          </div>
        </div>

        {/* Multipliers Grid */}
        <div className="space-y-2">
          <h6 className="text-[10px] font-bold uppercase text-slate-400">Multipliers (24h)</h6>
            <div className={cn(
              "grid gap-2 border rounded p-3 bg-slate-50", 
              isMaximized ? "grid-cols-6 lg:grid-cols-8" : "grid-cols-4"
            )}>
              {data.multipliers.map((val, idx) => (
                <div key={idx} className="flex flex-col bg-white p-1 rounded border border-slate-200 focus-within:border-primary">
                  <span className="text-[9px] text-slate-400 text-center font-mono mb-1">{idx.toString().padStart(2, "0")}:00</span>
                    <input
                      type="number"
                      step="0.1"
                      value={val}
                      onChange={(e) => updateVal(idx, e.target.value)}
                      className="w-full text-center text-xs font-bold outline-none p-0"
                    />
                    <div className="h-1.5 bg-slate-100 mt-1 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300" 
                        style={{ width: `${Math.min(val * 50, 100)}%` }} 
                      />
                    </div>
                </div>
              ))}
            </div>
        </div>
      </div>
    </div>
  );
}