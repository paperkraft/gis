import { Activity } from "react";
import { FormGroup } from "../form-controls/FormGroup";
import { FormInput } from "../form-controls/FormInput";
import { SaveActions } from "../form-controls/SaveActions";

export default function SimulationConfig() {
  return (
    <div className="p-4 space-y-4">
      <FormGroup label="Time">
        <div className="grid grid-cols-2 gap-2">
          <FormInput label="Duration" value="24:00" />
          <FormInput label="Hydraulic Step" value="01:00" />
        </div>
      </FormGroup>
      <FormGroup label="Convergence">
        <FormInput label="Max Trials" value="40" />
      </FormGroup>
      <SaveActions label="Run Simulation" icon={Activity} />
    </div>
  );
}
