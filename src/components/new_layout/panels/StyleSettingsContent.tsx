import {
  FormGroup,
  FormInput,
} from "@/components/new_layout/panels/FormControls";
import { useStyleStore } from "@/store/styleStore";
import { useUIStore } from "@/store/uiStore";
import { Check, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

export function StyleSettingsContent() {
  const { activeStyleLayer, setActiveModal } = useUIStore();
  //   const { getStyle, updateStyle, resetStyle } = useStyleStore();

  // Local state for immediate feedback before saving
  // In a real app, you might want this to be live
  const [style, setStyle] = useState<any>(null);

  useEffect(() => {
    if (activeStyleLayer) {
      //   const current = getStyle(activeStyleLayer);
      //   setStyle(current);
    }
  }, [activeStyleLayer]);

  const handleChange = (key: string, value: any) => {
    const newStyle = { ...style, [key]: value };
    setStyle(newStyle);
    // Live update:
    // if (activeStyleLayer) updateStyle(activeStyleLayer, newStyle);
  };

  if (!activeStyleLayer || !style)
    return <div className="p-4 text-xs">No layer selected.</div>;

  const isLine =
    activeStyleLayer === "pipe" ||
    activeStyleLayer === "pump" ||
    activeStyleLayer === "valve";

  return (
    <div className="p-4 space-y-5">
      {/* Header / Context */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded">
        <span className="text-xs font-bold uppercase text-slate-500">
          {activeStyleLayer} Layer
        </span>
        <button
          onClick={() => {
            // resetStyle(activeStyleLayer);
            // setStyle(getStyle(activeStyleLayer));
          }}
          className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
        >
          <RotateCcw size={10} /> Reset Default
        </button>
      </div>

      {/* Color Picker */}
      <FormGroup label="Appearance">
        <div className="space-y-2">
          <label className="text-[10px] font-medium text-slate-500">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              "#3b82f6",
              "#ef4444",
              "#10b981",
              "#f59e0b",
              "#6366f1",
              "#8b5cf6",
              "#ec4899",
              "#64748b",
            ].map((color) => (
              <button
                key={color}
                onClick={() => handleChange("color", color)}
                className={`w-6 h-6 rounded-full border border-slate-200 transition-transform hover:scale-110 ${
                  style.color === color
                    ? "ring-2 ring-offset-1 ring-slate-400"
                    : ""
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <input
              type="color"
              value={style.color}
              onChange={(e) => handleChange("color", e.target.value)}
              className="w-6 h-6 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
            />
          </div>
        </div>
      </FormGroup>

      {/* Geometry / Size */}
      <FormGroup label="Geometry">
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label={isLine ? "Width (px)" : "Radius (px)"}
            value={isLine ? style.width : style.radius}
            onChange={(v: string) =>
              handleChange(isLine ? "width" : "radius", parseFloat(v))
            }
            type="number"
          />
          {!isLine && (
            <FormInput
              label="Stroke Width"
              value={style.strokeWidth || 1}
              onChange={(v: string) =>
                handleChange("strokeWidth", parseFloat(v))
              }
              type="number"
            />
          )}
        </div>
      </FormGroup>

      {/* Advanced / Sliders */}
      <FormGroup label="Advanced">
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-[10px] font-medium text-slate-500">
                Opacity
              </label>
              <span className="text-[10px] text-slate-700 font-mono">
                {Math.round((style.opacity || 1) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={style.opacity || 1}
              onChange={(e) =>
                handleChange("opacity", parseFloat(e.target.value))
              }
              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>
      </FormGroup>

      <div className="pt-4 border-t border-slate-50">
        <button
          onClick={() => setActiveModal("NONE")}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2 rounded flex items-center justify-center gap-2 transition-colors"
        >
          <Check size={14} /> Done
        </button>
      </div>
    </div>
  );
}
