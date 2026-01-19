"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PumpCurve } from "@/types/network";
import { FormInput } from "@/components/form-controls/FormInput";
import { FormSelect } from "@/components/form-controls/FormSelect";

interface CurveEditorProps {
  data: PumpCurve;
  isMaximized: boolean;
  onChange: (updated: PumpCurve) => void;
  onBack: () => void;
}

export function CurveEditor({ data, isMaximized, onChange, onBack }: CurveEditorProps) {

  const updatePoint = (idx: number, field: "x" | "y", val: string) => {
    const newPoints = [...data.points];
    newPoints[idx] = { ...newPoints[idx], [field]: parseFloat(val) || 0 };
    onChange({ ...data, points: newPoints });
  };

  const addPoint = () => {
    onChange({ ...data, points: [...data.points, { x: 0, y: 0 }] });
  };

  const removePoint = (idx: number) => {
    const newPoints = data.points.filter((_, i) => i !== idx);
    onChange({ ...data, points: newPoints });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
      {!isMaximized && (
        <div className="shrink-0 mb-2 border-b border-slate-100 pb-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-6 pl-0 text-slate-500 hover:text-slate-800 text-xs">
            <ArrowLeft className="w-3 h-3 mr-1" /> Back to List
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 space-y-4">
        {/* Metadata */}
        <div className="grid grid-cols-2 gap-2">
            <FormInput label="ID" value={data.id} disabled/>
            <FormSelect
                label="Type"
                value={data.type || ""}
                onChange={(v) => onChange({ ...data, type: v})}
                options={[
                    {label:"Pump (H-Q)", value:"PUMP"},
                    {label:"Volume", value:"VOLUME"},
                    {label:"Headloss", value:"HEADLOSS"},
                ]}
            />
        </div>

        <FormInput
            label="Description"
            value={data.description || ""}
            onChange={(v)=> onChange({...data, description: v})}
        />

        {/* Points Table */}
        <div className="border rounded overflow-hidden">
            <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b">
                    <tr>
                        <th className="py-2 px-3 text-left font-medium text-slate-500">Flow (X)</th>
                        <th className="py-2 px-3 text-left font-medium text-slate-500">Head (Y)</th>
                        <th className="w-8"></th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {data.points.map((pt, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50">
                            <td className="p-1">
                                <input
                                    type="number"
                                    value={pt.x}
                                    onChange={(e) => updatePoint(idx, "x", e.target.value)}
                                    className="w-full bg-transparent outline-none text-center h-8 focus:bg-white focus:ring-1 ring-blue-200 rounded"
                                />
                            </td>
                            <td className="p-1">
                                <input
                                    type="number"
                                    value={pt.y}
                                    onChange={(e) => updatePoint(idx, "y", e.target.value)}
                                    className="w-full bg-transparent outline-none text-center h-8 focus:bg-white focus:ring-1 ring-blue-200 rounded"
                                />
                            </td>
                            <td className="p-1 text-center">
                                <button
                                    onClick={() => removePoint(idx)}
                                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="p-2 bg-slate-50 border-t text-center">
                <button
                    onClick={addPoint}
                    className="text-[10px] text-primary font-bold hover:underline uppercase tracking-wide"
                >
                    + Add Data Point
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}