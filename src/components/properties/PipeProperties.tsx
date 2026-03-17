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

export function PipeProperties() {
  const {
    formData,
    hasChanges,
    connectionInfo,
    handleChange,
    handleSave,
    handleDelete,
    handleZoom,
    handleReverse,
    selectedFeatureId,
    history,
    currentTimeIndex
  } = usePropertyForm();

  const [graphType, setGraphType] = useState<"flow" | "velocity" | "headloss">("flow");

  if (!selectedFeatureId) return null;

  const onSave = () => {
    // 1. Validate
    if ((formData.length ?? 0) <= 0) {
      toast.error("Length must be greater than 0");
      return;
    }
    if ((formData.diameter ?? 0) <= 0) {
      toast.error("Diameter must be greater than 0");
      return;
    }
    if ((formData.roughness ?? 0) <= 0) {
      toast.error("Roughness must be greater than 0");
      return;
    }

    // 2. Save
    handleSave();
    toast.success("Pipe properties saved");
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

      <TopologyInfo
        connectionInfo={connectionInfo}
        handleClick={handleReverse}
      />

      <FormGroup label="Geometry">
        <div className="flex gap-2 items-end">
          <FormInput
            label="Length (m)"
            value={formData.length || 1}
            onChange={(v) => handleChange("length", parseFloat(v))}
            type="number"
          />
          <FormInput
            label="Diameter (mm)"
            value={formData.diameter || 1}
            onChange={(v) => handleChange("diameter", parseFloat(v))}
            type="number"
          />
        </div>
      </FormGroup>

      <FormGroup label="Hydraulics">
        <FormInput
          label="Roughness"
          value={formData.roughness || 1}
          onChange={(v) => handleChange("roughness", parseFloat(v))}
          type="number"
        />

        <FormSelect
          label="Initial Status"
          value={formData.status || "OPEN"}
          onChange={(v) => handleChange("status", v)}
          options={[
            { label: "Open", value: "OPEN" },
            { label: "Close", value: "CLOSED" },
            { label: "Check Valve", value: "CV" },
          ]}
        />
        <FormInput
          label="Material"
          value={formData.material ?? ""}
          onChange={(v) => handleChange("material", v)}
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
              <option value="velocity">Velocity (m/s)</option>
              <option value="headloss">Headloss (m/km)</option>
            </select>
          </div>
          <ResultChart
            featureId={selectedFeatureId}
            type="link"
            history={history}
            dataType={graphType}
            activeIndex={currentTimeIndex}
            color={graphType === 'flow' ? '#0ea5e9' : graphType === 'velocity' ? '#8b5cf6' : '#f59e0b'}
            unit={graphType === 'velocity' ? 'm/s' : graphType === 'flow' ? 'LPS' : 'm/km'}
          />
        </FormGroup>
      )}
    </div>
  );
}
