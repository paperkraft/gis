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
