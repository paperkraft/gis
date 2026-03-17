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

export function ValveProperties() {
  const {
    formData,
    hasChanges,
    connectionInfo,
    handleChange,
    handleSave,
    handleDelete,
    handleZoom,
    selectedFeatureId,
    history,
    currentTimeIndex
  } = usePropertyForm();

  const [graphType, setGraphType] = useState<"flow" | "velocity" | "headloss" | "status" | "setting">("flow");

  if (!selectedFeatureId) return null;

  const onSave = () => {
    if ((formData.diameter ?? 0) <= 0) {
      toast.error("Diameter must be positive");
      return;
    }
    handleSave();
    toast.success("Valve properties saved");
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

        <TopologyInfo connectionInfo={connectionInfo} />

        <FormSelect
          label="Valve Type"
          value={formData.valveType || "PRV"}
          onChange={(v) => handleChange("valveType", v)}
          options={[
            { label: "PRV (Pressure Reducing)", value: "PRV" },
            { label: "PSV (Pressure Sustaining)", value: "PSV" },
            { label: "PBV (Pressure Breaker)", value: "PBV" },
            { label: "FCV (Flow Control)", value: "FCV" },
            { label: "TCV (Throttle Control)", value: "TCV" },
            { label: "GPV (General Purpose)", value: "GPV" },
          ]}
        />
      </FormGroup>

      <FormGroup label="Settings">
        <FormInput
          label="Diameter (mm)"
          value={formData.diameter ?? 0}
          onChange={(v) => handleChange("diameter", parseFloat(v))}
          type="number"
        />
        <FormInput
          label="Setting"
          value={formData.setting ?? 0}
          onChange={(v) => handleChange("setting", parseFloat(v))}
          type="number"
        />
        <FormInput
          label="Loss Coeff."
          value={formData.loss ?? 0}
          onChange={(v) => handleChange("loss", parseFloat(v))}
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
              <option value="velocity">Velocity (m/s)</option>
              <option value="headloss">Headloss (m/km)</option>
              <option value="status">Valve Status</option>
              <option value="setting">Setting</option>
            </select>
          </div>
          <ResultChart
            featureId={selectedFeatureId}
            type="link"
            history={history}
            dataType={graphType}
            activeIndex={currentTimeIndex}
            color={graphType === 'flow' ? '#0ea5e9' : graphType === 'velocity' ? '#8b5cf6' : '#f59e0b'}
            unit={graphType === 'velocity' ? 'm/s' : graphType === 'flow' ? 'LPS' : graphType === 'headloss' ? 'm/km' : ''}
          />
        </FormGroup>
      )}
    </div>
  );
}
