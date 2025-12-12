import React from "react";

type InputProps = {
  label: string;
  value: string | number;
  type?: string;
  placeholder?: string;
  onChange: (value: string | number) => void;
  step?: number;
  autoFocus?: boolean;
};

const Input = ({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
  step,
  autoFocus,
}: InputProps) => {
  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
        {label}
      </label>
      <input
        autoFocus={autoFocus}
        type={type}
        value={value}
        step={step}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(
            type === "number" ? parseFloat(e.target.value) : e.target.value
          )
        }
        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-gray-900 dark:text-gray-100"
      />
    </div>
  );
};

export default Input;
