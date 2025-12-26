import { FormGroup } from '@/components/form-controls/FormGroup';
import { FormInput } from '@/components/form-controls/FormInput';
import { FormSelect } from '@/components/form-controls/FormSelect';
import { usePropertyForm } from '@/hooks/usePropertyForm';

import { SaveActions } from '../form-controls/SaveActions';
import { FeatureHeader } from './FeatureHeader';
import { TopologyInfo } from './TopologyInfo';

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

      <SaveActions onSave={handleSave} disabled={!hasChanges} />
    </div>
  );
}
