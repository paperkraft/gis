import { cn } from "@/lib/utils";

interface FormSelectProps {
  id?: string;
  name?: string;
  label?: string;
  value: any;
  onChange?: (e: any) => void;
  disabled?: boolean;
  className?: string;
  description?: string;
  options: { label: string; value: string }[];
  props?: any;
}

export const FormSelect = ({
  id,
  name,
  label,
  value,
  onChange,
  disabled,
  className,
  options,
  description = "",
  props
}: FormSelectProps) => (
  <div className={cn(className)}>
    {label && (
      <label
        htmlFor={id ?? label}
        className="block text-[11px] font-medium mb-1"
      >
        {label}
      </label>
    )}
    <select
      id={id ?? label}
      name={name}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      {...props}
      className={`w-full text-xs px-2.5 py-1.5 rounded border outline-none transition-all ${
        disabled
          ? "bg-slate-50 text-slate-400 border-slate-200"
          : "bg-background border-input focus:border-primary focus:ring-1 focus:ring-primary"
      }`}
    >
      {options.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
    {description && <span className="text-[10px]">{description}</span>}
  </div>
);
