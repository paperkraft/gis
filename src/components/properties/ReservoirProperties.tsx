import { Mountain, RefreshCw } from "lucide-react";

import { FormGroup } from "@/components/form-controls/FormGroup";
import { FormInput } from "@/components/form-controls/FormInput";
import { FormSelect } from "@/components/form-controls/FormSelect";
import { usePropertyForm } from "@/hooks/usePropertyForm";

import { SaveActions } from "../form-controls/SaveActions";
import { FeatureHeader } from "./FeatureHeader";
import { TopologyInfo } from "./TopologyInfo";

export function ReservoirProperties() {
  const {
    formData,
    hasChanges,
    connectionInfo,
    isLoading,
    handleChange,
    handleSave,
    handleDelete,
    handleZoom,
    handleAutoElevate,
    selectedFeatureId,
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

      <FormGroup label="Hydraulic Head">
        <FormInput
          label="Total Head (m)"
          value={formData.head ?? 0}
          onChange={(v) => handleChange("head", parseFloat(v))}
          type="number"
        />

        <FormSelect
          label="Head Pattern"
          value={formData.headPattern || "NONE"}
          onChange={(v) => handleChange("headPattern", v)}
          options={[
            { value: "NONE", label: "Node (Fixed Head)" },
            { value: "TIDAL", label: "Tidal Variation" },
          ]}
        />
      </FormGroup>

      <SaveActions onSave={handleSave} disabled={!hasChanges} />
    </div>
  );
}
