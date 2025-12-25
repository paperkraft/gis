import { usePropertyForm } from "@/hooks/usePropertyForm";
import {
  FeatureHeader,
  FormGroup,
  FormInput,
  FormSelect,
  SaveActions,
  TopologyInfo,
} from "../form-controls/FormControls";
import { ArrowRightLeft } from "lucide-react";

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
            value={formData.length ?? 0}
            onChange={(v) => handleChange("length", parseFloat(v))}
            type="number"
          />
          <FormInput
            label="Diameter (mm)"
            value={formData.diameter ?? 0}
            onChange={(v) => handleChange("diameter", parseFloat(v))}
            type="number"
          />
        </div>
      </FormGroup>

      <FormGroup label="Hydraulics">
        <FormInput
          label="Roughness"
          value={formData.roughness ?? 0}
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

      <SaveActions onSave={handleSave} disabled={!hasChanges} />
    </div>
  );
}
