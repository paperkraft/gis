import { Mountain, RefreshCw } from "lucide-react";

import { FormGroup } from "@/components/form-controls/FormGroup";
import { FormInput } from "@/components/form-controls/FormInput";
import { FormSelect } from "@/components/form-controls/FormSelect";
import { usePropertyForm } from "@/hooks/usePropertyForm";

import { FeatureHeader } from "./FeatureHeader";
import { TopologyInfo } from "./TopologyInfo";
import { SaveActions } from "../form-controls/SaveActions";

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
  } = usePropertyForm();

  if (!selectedFeatureId) return null;

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
          value={formData.pattern || "1"}
          onChange={(v) => handleChange("pattern", v)}
          options={[{ value: "1", label: "Default Pattern" }]}
        />
      </FormGroup>
      <SaveActions onSave={handleSave} disabled={!hasChanges} />
    </div>
  );
}
