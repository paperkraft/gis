import { Upload } from "lucide-react";
import { FormGroup } from "../form-controls/FormGroup";
import { FormSelect } from "../form-controls/FormSelect";
import { FormInput } from "../form-controls/FormInput";

export default function GeometryImportPanel() {
  return (
    <div className="p-4 space-y-5 text-slate-700">
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-blue-50/50 transition-colors cursor-pointer">
        <Upload size={18} className="text-blue-500 mb-2" />
        <span className="text-xs font-semibold text-slate-600">
          Upload .INP / .JSON
        </span>
      </div>
      <FormGroup label="Settings">
        <FormSelect
          label="CRS"
          value="WGS84"
          options={[{ label: "WGS 84 (EPSG:4326)", value: "WGS84" }]}
        />
        <div className="grid grid-cols-2 gap-2">
          <FormInput label="Scale X" value="1.0" />
          <FormInput label="Scale Y" value="1.0" />
        </div>
      </FormGroup>
      <div className="flex gap-2">
        <button className="flex-1 bg-slate-100 py-2 rounded text-xs">
          Cancel
        </button>
        <button className="flex-1 bg-blue-600 text-white py-2 rounded text-xs">
          Import
        </button>
      </div>
    </div>
  );
}
