import { cn } from "@/lib/utils";

interface FormInputProps {
  id?: string;
  name?: string;
  label: string;
  value: any;
  onChange?: (e: any) => void;
  onKeyDown?: (e: any) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  type?: string;
  description?: string;
  textarea?: boolean;
  rows?: number;
  step?: string;
}

export const FormInput = ({
  id,
  name,
  label,
  value,
  onChange,
  onKeyDown,
  disabled,
  placeholder,
  className = "",
  type,
  textarea = false,
  rows,
  description = "",
  step,
}: FormInputProps) => (
  <div className={cn(className)}>
    {label && (
      <label
        htmlFor={id ?? label}
        className="block text-[11px] font-medium mb-1"
      >
        {label}
      </label>
    )}

    {textarea && (
      <textarea
        id={id ?? label}
        name={name}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => onKeyDown?.(e)}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows ?? 3}
        className={`w-full text-xs px-2.5 py-1.5 rounded border outline-none transition-all ${
          disabled
            ? "bg-slate-50 text-slate-400 border-slate-200"
            : "bg-background border-input focus:border-primary focus:ring-1 focus:ring-primary"
        }`}
      />
    )}

    {!textarea && (
      <input
        id={id ?? label}
        name={name}
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => onKeyDown?.(e)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full text-xs px-2.5 py-1.5 rounded border outline-none transition-all ${
          disabled
            ? "bg-slate-50 text-slate-400 border-slate-200"
            : "bg-white border-input focus:border-primary focus:ring-1 focus:ring-primary"
        }`}
        step={step}
      />
    )}

    {description && <span className="text-[10px]">{description}</span>}
  </div>
);
