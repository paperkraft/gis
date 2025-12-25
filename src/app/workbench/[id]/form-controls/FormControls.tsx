import { ArrowRightLeft, Focus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const FormGroup = ({ label, children }: any) => (
  <div className="space-y-2">
    <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
      {label} <div className="h-px bg-muted-foreground/20 flex-1" />
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

interface FormInputProps {
  label: string;
  value: any;
  onChange?: (e: any) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  type?: string;
}

export const FormInput = ({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  className = "",
  type,
}: FormInputProps) => (
  <div className={className}>
    <label className="block text-[10px] font-medium text-muted-foreground mb-1">
      {label}
    </label>
    <input
      type={type ?? "text"}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full text-xs px-2.5 py-1.5 rounded border outline-none transition-all ${
        disabled
          ? "bg-slate-50 text-slate-400 border-slate-200"
          : "bg-white border-slate-300 text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary"
      }`}
    />
  </div>
);

interface FormSelectProps {
  label: string;
  value: any;
  onChange?: (e: any) => void;
  disabled?: boolean;
  className?: string;
  options: { label: string; value: string }[];
}

export const FormSelect = ({
  label,
  value,
  onChange,
  disabled,
  className,
  options,
}: FormSelectProps) => (
  <div className={className}>
    <label className="block text-[10px] font-medium text-muted-foreground mb-1">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
    >
      {options.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  </div>
);

export const SaveActions = ({
  onSave,
  disabled,
  label = "Save Changes",
}: any) => (
  <div className="pt-2">
    <Button
      onClick={onSave}
      disabled={disabled}
      className={cn(
        "w-full rounded",
        disabled && "cursor-not-allowed bg-muted-foreground"
      )}
    >
      <Save size={14} /> {disabled ? "No Changes" : label}
    </Button>
  </div>
);

export const FeatureHeader = ({
  id,
  onZoom,
  onDelete,
}: {
  id: string;
  onZoom: () => void;
  onDelete: () => void;
}) => (
  <div className="flex justify-between items-center bg-primary-foreground/50 p-2 rounded border border-primary/10">
    <span className="font-mono text-xs font-bold text-slate-700">ID:{id}</span>
    <div className="flex gap-1">
      <button
        onClick={onZoom}
        className="p-1 text-muted-foreground hover:text-primary hover:bg-background rounded cursor-pointer"
      >
        <Focus size={14} />
      </button>
      <button
        onClick={onDelete}
        className="p-1 text-muted-foreground hover:text-destructive hover:bg-background rounded cursor-pointer"
      >
        <Trash2 size={14} />
      </button>
    </div>
  </div>
);

interface TopologyPorps {
  connectionInfo: any;
  handleClick?: () => void;
}

export const TopologyInfo = ({
  connectionInfo,
  handleClick,
}: TopologyPorps) => {
  if (!connectionInfo) return null;

  return (
    <div className="bg-primary-foreground/50 border border-primary/10 rounded p-2 text-xs flex flex-col gap-2">
      <div className="flex justify-between items-center text-muted-foreground">
        <span>Topology</span>
        {connectionInfo?.type === "link" && connectionInfo?.isPipe && (
          <button
            onClick={handleClick}
            className="flex items-center gap-1 text-primary/80 hover:text-primary text-[10px] uppercase font-bold cursor-pointer"
          >
            <ArrowRightLeft size={10} /> Reverse
          </button>
        )}

        {connectionInfo?.type === "node" && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Connections:&nbsp;</span>
            <span className="text-primary font-bold">
              {connectionInfo?.count}
            </span>
          </div>
        )}
      </div>

      {connectionInfo?.type === "link" && (
        <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
          <div className="bg-white p-1 rounded border border-slate-200 text-center">
            Source:&nbsp;
            {connectionInfo.startNodeId || "?"}
          </div>
          <div className="bg-white p-1 rounded border border-slate-200 text-center">
            Target:&nbsp;
            {connectionInfo.endNodeId || "?"}
          </div>
        </div>
      )}

      {connectionInfo?.type === "node" &&
        connectionInfo?.connections?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {connectionInfo?.connections?.map((id: any) => (
              <span
                key={id}
                className="px-1 py-0.5 border rounded text-[10px] font-mono bg-background"
              >
                {id}
              </span>
            ))}
          </div>
        )}
    </div>
  );
};
