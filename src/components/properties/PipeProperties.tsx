import { FormGroup } from "@/components/form-controls/FormGroup";
import { FormInput } from "@/components/form-controls/FormInput";
import { FormSelect } from "@/components/form-controls/FormSelect";
import { usePropertyForm } from "@/hooks/usePropertyForm";

import { SaveActions } from "../form-controls/SaveActions";
import { FeatureHeader } from "./FeatureHeader";
import { TopologyInfo } from "./TopologyInfo";
import { toast } from "sonner";

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
  } = usePropertyForm();

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
    </div>
  );
}
