import { FormGroup } from "@/components/form-controls/FormGroup";
import { FormInput } from "@/components/form-controls/FormInput";
import { FormSelect } from "@/components/form-controls/FormSelect";
import { usePropertyForm } from "@/hooks/usePropertyForm";

import { SaveActions } from "../form-controls/SaveActions";
import { FeatureHeader } from "./FeatureHeader";
import { TopologyInfo } from "./TopologyInfo";
import { toast } from "sonner";
import { useState } from "react";
import { ResultChart } from "../simulation/ResultChart";

export function PumpProperties() {
  const {
    formData,
    hasChanges,
    connectionInfo,
    handleChange,
    handleSave,
    handleDelete,
    handleZoom,
    selectedFeatureId,
    curves,
    handleAutoElevate,
    patterns,
    history,
    currentTimeIndex
  } = usePropertyForm();

  const [graphType, setGraphType] = useState<"flow" | "head" | "setting">("flow");

  if (!selectedFeatureId) return null;

  const onSave = () => {
    handleSave();
    toast.success("Pump properties saved");
  };

  return (
    <div className="p-4 space-y-4">
      <FeatureHeader
        id={selectedFeatureId}
        onZoom={handleZoom}
        onDelete={handleDelete}
      />

      <FormGroup label="General">
        <FormInput
          label="Label"
          value={formData.label ?? ""}
          onChange={(v) => handleChange("label", v)}
          placeholder="Label"
        />
      </FormGroup>

      <TopologyInfo connectionInfo={connectionInfo} />

      <FormGroup label="Parameters">
        <FormSelect
          label="Pump Curve"
          value={formData.curve || "CURVE-1"}
          onChange={(v) => handleChange("curve", v)}
          options={[
            { label: "Constant Power", value: "CONST" },
            ...curves
              .filter((c: any) => c.type === "PUMP")
              .map((c: any) => ({
                label: c.description || c.id,
                value: c.id,
              })),
          ]}
        />

        <FormInput
          label="Power (kW)"
          value={formData.power ?? 0}
          onChange={(v) => handleChange("power", parseFloat(v))}
          type="number"
        />
        <FormInput
          label="Speed Setting"
          value={formData.speed || 1.0}
          onChange={(v) => handleChange("speed", parseFloat(v))}
          type="number"
        />
      </FormGroup>

      <SaveActions onSave={onSave} disabled={!hasChanges} />

      {history && (
        <FormGroup label="Simulation Results">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-medium text-slate-500">Feature Trend</span>
            <select 
              value={graphType} 
              onChange={(e) => setGraphType(e.target.value as any)}
              className="text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5"
            >
              <option value="flow">Flow Rate (LPS)</option>
              <option value="head">Head Gain (m)</option>
              <option value="setting">Speed Setting</option>
            </select>
          </div>
          <ResultChart
            featureId={selectedFeatureId}
            type="link"
            history={history}
            dataType={graphType}
            activeIndex={currentTimeIndex}
            color={graphType === 'flow' ? '#0ea5e9' : graphType === 'head' ? '#8b5cf6' : '#f59e0b'}
            unit={graphType === 'flow' ? 'LPS' : graphType === 'head' ? 'm' : ''}
          />
        </FormGroup>
      )}
    </div>
  );
}
