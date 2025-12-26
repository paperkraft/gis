import { Mountain, RefreshCw } from "lucide-react";

import { FormGroup } from "@/components/form-controls/FormGroup";
import { FormInput } from "@/components/form-controls/FormInput";
import { usePropertyForm } from "@/hooks/usePropertyForm";

import { SaveActions } from "../form-controls/SaveActions";
import { FeatureHeader } from "./FeatureHeader";
import { TopologyInfo } from "./TopologyInfo";

export function TankProperties() {
  const {
    formData,
    hasChanges,
    isLoading,
    connectionInfo,
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
            label="Diameter (m)"
            value={formData.diameter ?? 0}
            onChange={(v) => handleChange("diameter", parseFloat(v))}
            type="number"
          />

          <FormInput
            label="Capacity"
            value={formData.capacity ?? 0}
            onChange={(v) => handleChange("capacity", parseFloat(v))}
            type="number"
          />
        </div>

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

      <FormGroup label="Water Levels">
        <FormInput
          label="Initial Level (m)"
          value={formData.initialLevel ?? 0}
          onChange={(v) => handleChange("initialLevel", parseFloat(v))}
          type="number"
        />
        <div className="flex gap-2 items-end">
          <FormInput
            label="Min Level (m)"
            value={formData.minLevel ?? 0}
            onChange={(v) => handleChange("minLevel", parseFloat(v))}
            type="number"
          />
          <FormInput
            label="Max Level (m)"
            value={formData.maxLevel ?? 0}
            onChange={(v) => handleChange("maxLevel", parseFloat(v))}
            type="number"
          />
        </div>
      </FormGroup>

      <SaveActions onSave={handleSave} disabled={!hasChanges} />
    </div>
  );
}
