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

// Tooltip for vertical stack buttons (appears to the LEFT)
const LeftTooltip = ({ text }: { text: string }) => (
  <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-2 py-1 bg-gray-900 text-white text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-xl z-50">
    {text}
    {/* Arrow pointing right */}
    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
  </div>
);

// Tooltip for horizontal expanded buttons (appears BELOW)
const BottomTooltip = ({ text }: { text: string }) => (
  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-xl z-50">
    {text}
    {/* Arrow pointing up */}
    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
  </div>
);

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
          "relative group w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95",
          isOpen || isActiveGroup
            ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
            : "text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
        )}
        // title={label}
      >
        <Icon className="w-5 h-5" strokeWidth={2.5} />
        {!isOpen && <LeftTooltip text={label} />}
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
  disabled = false,
}: {
  onClick: () => void;
  isActive?: boolean;
  icon: any;
  title: string;
  label?: string;
  colorClass?: string;
  className?: string;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "relative group flex items-center justify-center rounded-lg transition-all duration-200 active:scale-95",
      label ? "px-2 gap-2 h-8" : "w-8 h-8",
      isActive
        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
        : "hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200",
      className
    )}
    // title={title}
    disabled={disabled}
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
    <BottomTooltip text={title} />
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
      "relative group w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95",
      isActive
        ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
        : "text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
    )}
    // title={title}
  >
    <Icon
      className={cn("w-5 h-5", isActive ? "text-white" : colorClass)}
      strokeWidth={2.5}
    />
    <LeftTooltip text={title} />
  </button>
);
