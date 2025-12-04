import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ControlGroupProps {
  id: string;
  icon: any;
  label: string;
  children: ReactNode;
  activeGroup: string | null;
  onToggle: (id: string) => void;
  isActiveGroup?: boolean;
}

export const ControlGroup = ({
  id,
  icon: Icon,
  label,
  children,
  activeGroup,
  onToggle,
  isActiveGroup = false,
}: ControlGroupProps) => {
  const isOpen = activeGroup === id;

  return (
    <div className="relative flex flex-row-reverse items-center gap-2">
      {/* Main Group Button */}
      <button
        onClick={() => onToggle(id)}
        className={cn(
          "w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-700",
          isOpen || isActiveGroup
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        )}
        title={label}
      >
        <Icon className="w-5 h-5" />
      </button>

      {/* Expanded Horizontal Bar */}
      <div
        className={cn(
          "absolute right-12 flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-200 origin-right z-20",
          isOpen
            ? "opacity-100 scale-100 translate-x-0"
            : "opacity-0 scale-95 translate-x-4 pointer-events-none"
        )}
      >
        {children}
      </div>
    </div>
  );
};

export const ToolBtn = ({
  onClick,
  isActive = false,
  icon: Icon,
  title,
  label,
  colorClass = "text-gray-700 dark:text-gray-200",
}: {
  onClick: () => void;
  isActive?: boolean;
  icon: any;
  title: string;
  label?: string;
  colorClass?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center justify-center rounded-lg transition-colors relative group/btn",
      label ? "px-2 gap-2 h-8" : "w-8 h-8",
      isActive
        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        : "hover:bg-gray-100 dark:hover:bg-gray-700"
    )}
    title={title}
  >
    <Icon
      className={cn(
        "w-4 h-4",
        isActive ? "text-blue-600 dark:text-blue-400" : colorClass
      )}
    />
    {label && (
      <span
        className={cn(
          "text-xs font-medium",
          isActive
            ? "text-blue-600 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-300"
        )}
      >
        {label}
      </span>
    )}
  </button>
);

export const Divider = () => (
  <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
);
