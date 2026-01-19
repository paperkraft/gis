import { Layers, Activity, GitCommit } from "lucide-react";
import {
  useStyleStore,
  NodeColorMode,
  LinkColorMode,
} from "@/store/styleStore";
import { FormSelect } from "@/components/form-controls/FormSelect";
import { Label } from "@/components/ui/label";

export function VisualizationGroup() {
  const {
    nodeColorMode,
    setNodeColorMode,
    linkColorMode,
    setLinkColorMode,
    styleType,
    setStyleType,
  } = useStyleStore();

  const nodeOptions = [
    { label: "None", value: "none" },
    { label: "Elevation", value: "elevation" },
    { label: "Pressure", value: "pressure" },
    { label: "Head", value: "head" },
    { label: "Demand", value: "demand" },
  ];

  const linkOptions = [
    { label: "None", value: "none" },
    { label: "Diameter", value: "diameter" },
    { label: "Flow", value: "flow" },
    { label: "Velocity", value: "velocity" },
    { label: "Headloss", value: "headloss" },
    { label: "Roughness", value: "roughness" },
  ];

  return (
    <div className="space-y-4 p-1">
      {/* Node Controls */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <GitCommit size={12} /> Nodes
        </div>
        <FormSelect
          label=""
          value={nodeColorMode}
          onChange={(v) => setNodeColorMode(v as NodeColorMode)}
          options={nodeOptions}
        />
      </div>

      {/* Link Controls */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <Activity size={12} /> Links
        </div>
        <FormSelect
          label=""
          value={linkColorMode}
          onChange={(v) => setLinkColorMode(v as LinkColorMode)}
          options={linkOptions}
        />
      </div>

      <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
        <Label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
          Style Mode
        </Label>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setStyleType("continuous")}
            className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
              styleType === "continuous"
                ? "bg-blue-50 border-blue-200 text-blue-700 font-medium"
                : "border-gray-200 hover:bg-gray-50 text-gray-600"
            }`}
          >
            Continuous
          </button>
          <button
            onClick={() => setStyleType("discrete")}
            className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
              styleType === "discrete"
                ? "bg-blue-50 border-blue-200 text-blue-700 font-medium"
                : "border-gray-200 hover:bg-gray-50 text-gray-600"
            }`}
          >
            Discrete
          </button>
        </div>
      </div>
    </div>
  );
}
