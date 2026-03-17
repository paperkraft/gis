import { Mountain, RefreshCw } from "lucide-react";

import { FormGroup } from "@/components/form-controls/FormGroup";
import { FormInput } from "@/components/form-controls/FormInput";
import { usePropertyForm } from "@/hooks/usePropertyForm";

import { FeatureHeader } from "./FeatureHeader";
import { TopologyInfo } from "./TopologyInfo";
import { SaveActions } from "../form-controls/SaveActions";
import { toast } from "sonner";
import { useState } from "react";
import { ResultChart } from "../simulation/ResultChart";

export function TankProperties() {
  const {
    formData,
    isLoading,
    hasChanges,
    connectionInfo,
    selectedFeatureId,
    handleSave,
    handleZoom,
    handleChange,
    handleDelete,
    handleAutoElevate,
    patterns,
    settings,
    history,
    currentTimeIndex
  } = usePropertyForm();

  const [graphType, setGraphType] = useState<"pressure" | "head">("pressure");

  if (!selectedFeatureId) return null;

  const onSave = () => {
    handleSave();
    toast.success("Tank properties saved");
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

      <FormGroup label="Geometry">
        <div className="flex gap-2 items-end">
          <FormInput
            label="Elevation (m)"
            value={formData.elevation ?? 0}
            onChange={(v) => handleChange("elevation", parseFloat(v))}
            type="number"
            className="flex-1"
            placeholder="Auto-fetch Elevation"
          />
          <button
            onClick={handleAutoElevate}
            disabled={isLoading}
            className="mb-px p-1.5 bg-primary-foreground hover:bg-muted hover:text-primary rounded border transition-colors"
            title="Auto-fetch Elevation"
          >
            {isLoading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Mountain size={14} />
            )}
          </button>
        </div>
      </FormGroup>

      <FormGroup label="Dimensions">
        <div className="grid grid-cols-2 gap-2">
          <FormInput
            label="Initial Level (m)"
            value={formData.initialLevel ?? 10}
            onChange={(v) => handleChange("initialLevel", parseFloat(v))}
            type="number"
          />
          <FormInput
            label="Minimum Level (m)"
            value={formData.minLevel ?? 0}
            onChange={(v) => handleChange("minLevel", parseFloat(v))}
            type="number"
          />
          <FormInput
            label="Maximum Level (m)"
            value={formData.maxLevel ?? 20}
            onChange={(v) => handleChange("maxLevel", parseFloat(v))}
            type="number"
          />
          <FormInput
            label="Diameter (m)"
            value={formData.diameter ?? 10}
            onChange={(v) => handleChange("diameter", parseFloat(v))}
            type="number"
          />
        </div>
        <FormInput
          label="Minimum Volume (m³)"
          value={formData.minVolume ?? 0}
          onChange={(v) => handleChange("minVolume", parseFloat(v))}
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
              <option value="pressure">Water Level (m)</option>
              <option value="head">Total Head (m)</option>
            </select>
          </div>
          <ResultChart
            featureId={selectedFeatureId}
            type="node"
            history={history}
            dataType={graphType}
            activeIndex={currentTimeIndex}
            color={graphType === 'pressure' ? '#0ea5e9' : '#8b5cf6'}
            unit="m"
          />
        </FormGroup>
      )}
    </div>
  );
}
