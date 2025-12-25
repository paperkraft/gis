import { usePropertyForm } from "@/hooks/usePropertyForm";
import {
  FeatureHeader,
  FormGroup,
  FormInput,
  FormSelect,
  SaveActions,
  TopologyInfo,
} from "../form-controls/FormControls";

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

      <FormGroup label="Parameters">
        <FormSelect
          label="Pump Curve"
          value={formData.curve || "CURVE-1"}
          onChange={(v) => handleChange("curve", v)}
          options={[
            { label: "Curve-1 (Std)", value: "CURVE-1" },
            { label: "Constant Power", value: "CONST" },
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

      <SaveActions onSave={handleSave} disabled={!hasChanges} />
    </div>
  );
}
