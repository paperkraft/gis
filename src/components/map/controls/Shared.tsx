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
      {/* Main Group Button - Updated to match MapControls/DrawingToolbar style */}
      <button
        onClick={() => onToggle(id)}
        className={cn(
          "w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95",
          isOpen || isActiveGroup
            ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
            : "text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
        )}
        title={label}
      >
        <Icon className="w-5 h-5" strokeWidth={2.5} />
      </button>

      {/* Expanded Horizontal Bar - Glassmorphism applied */}
      <div
        className={cn(
          "absolute right-11 flex items-center gap-1 p-1.5 rounded-xl shadow-xl border border-white/20 dark:border-gray-700/50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md transition-all duration-200 origin-right z-20",
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
  colorClass = "text-gray-500 dark:text-gray-400",
  className,
}: {
  onClick: () => void;
  isActive?: boolean;
  icon: any;
  title: string;
  label?: string;
  colorClass?: string;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center justify-center rounded-lg transition-all duration-200 active:scale-95",
      label ? "px-2 gap-2 h-8" : "w-8 h-8",
      isActive
        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
        : "hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200",
      className
    )}
    title={title}
    data-search-toggle={
      title === "Location Search" || title === "Search" ? "true" : undefined
    }
  >
    <Icon
      className={cn(
        "w-4 h-4",
        isActive ? "text-blue-600 dark:text-blue-400" : colorClass
      )}
      strokeWidth={2.5}
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
  <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1 opacity-50" />
);

export const StandaloneControl = ({
  onClick,
  isActive = false,
  icon: Icon,
  title,
  colorClass = "text-gray-500 dark:text-gray-400",
}: {
  onClick: () => void;
  isActive?: boolean;
  icon: any;
  title: string;
  colorClass?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95",
      isActive
        ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
        : "text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
    )}
    title={title}
  >
    <Icon
      className={cn("w-5 h-5", isActive ? "text-white" : colorClass)}
      strokeWidth={2.5}
    />
  </button>
);
