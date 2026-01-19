import { Eye, EyeOff, MoreVertical } from "lucide-react";

interface TreeItemProps {
  label: string;
  active?: boolean;
  icon: any;
  onClick?: () => void;
  count?: number;
  isVisible?: boolean;
  onToggleVisibility?: (e: any) => void;
  onContextMenu?: (e: any) => void;
}

export default function TreeItem({
  label,
  active,
  icon: Icon,
  onClick,
  count,
  isVisible,
  onToggleVisibility,
  onContextMenu,
}: TreeItemProps) {
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`ml-1 flex items-center px-2 py-1 cursor-pointer rounded-sm text-xs transition-all relative ${
        active
          ? "bg-blue-50 text-primary font-medium"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {active && (
        <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-r" />
      )}
      {Icon ? (
        <Icon size={12} className="mr-1.5 opacity-70" />
      ) : (
        <div className="w-1 h-1 bg-current rounded-full mr-3 opacity-50" />
      )}
      <span className="truncate">{label}</span>

      {/* Layer Controls (Visibility Toggle & Count) */}
      <div className="ml-auto flex items-center gap-2">
        {onToggleVisibility && (
          <button
            onClick={onToggleVisibility}
            className={`p-0.5 rounded hover:bg-slate-200 transition-colors ${
              isVisible === false
                ? "text-slate-300"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {isVisible === false ? <EyeOff size={10} /> : <Eye size={10} />}
          </button>
        )}
        {count !== undefined && typeof count === "number" && (
          <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono min-w-5 text-center">
            {count}
          </span>
        )}
        {!onToggleVisibility && count === undefined && (
          <MoreVertical
            size={10}
            className="ml-auto opacity-0 group-hover:opacity-100 text-slate-400"
          />
        )}
      </div>
    </div>
  );
}
