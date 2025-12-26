import { Focus, Trash2 } from "lucide-react";

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
