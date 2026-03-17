import { Mountain, RefreshCw } from "lucide-react";

import { FormGroup } from "@/components/form-controls/FormGroup";
import { FormInput } from "@/components/form-controls/FormInput";
import { FormSelect } from "@/components/form-controls/FormSelect";
import { usePropertyForm } from "@/hooks/usePropertyForm";

import { FeatureHeader } from "./FeatureHeader";
import { TopologyInfo } from "./TopologyInfo";
import { SaveActions } from "../form-controls/SaveActions";
import { toast } from "sonner";
import { useState } from "react";
import { ResultChart } from "../simulation/ResultChart";

export function JunctionProperties() {
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

  const [graphType, setGraphType] = useState<"pressure" | "demand" | "head">("pressure");

  if (!selectedFeatureId) return null;

  const onSave = () => {
    handleSave();
    toast.success("Junction properties saved");
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

      <FormGroup label="Demand">
        <FormInput
          label="Base Demand (LPS)"
          value={formData.demand ?? 0}
          onChange={(v) => handleChange("demand", parseFloat(v))}
          type="number"
          placeholder="Base Demand"
        />

        <FormSelect
          label="Demand Pattern"
          value={formData.pattern || settings?.defaultPattern || "1"}
          onChange={(v) => handleChange("pattern", v)}
          options={[
            { value: settings?.defaultPattern || "1", label: `Default Pattern (${settings?.defaultPattern || "1"})` },
            ...patterns
              .filter((p: any) => p.id !== settings?.defaultPattern)
              .map((p: any) => ({
                label: p.description || p.id,
                value: p.id,
              })),
          ]}
        />
      </FormGroup>

      {history && (
        <FormGroup label="Simulation Results">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-medium text-slate-500">Feature Trend</span>
            <select 
              value={graphType} 
              onChange={(e) => setGraphType(e.target.value as any)}
              className="text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5"
            >
              <option value="pressure">Pressure (m)</option>
              <option value="head">Total Head (m)</option>
              <option value="demand">Demand (LPS)</option>
            </select>
          </div>
          <ResultChart
            featureId={selectedFeatureId}
            type="node"
            history={history}
            dataType={graphType}
            activeIndex={currentTimeIndex}
            color={graphType === 'pressure' ? '#3b82f6' : graphType === 'demand' ? '#ec4899' : '#8b5cf6'}
            unit={graphType === 'demand' ? 'LPS' : 'm'}
          />
        </FormGroup>
      )}

      <SaveActions onSave={onSave} disabled={!hasChanges} />
    </div>
  );
}
