interface FormSelectProps {
  label?: string;
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
    {label && (
      <label className="block text-[10px] font-medium text-muted-foreground mb-1">
        {label}
      </label>
    )}
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
