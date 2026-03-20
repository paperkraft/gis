import { CheckCircle2, GitMerge, GripHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDraggableDialog } from '@/hooks/useDraggableDialog';
import { useMergeHighlight } from '@/hooks/useMergeHighlight';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';

export function MergeConflictModal() {
  const { mergeContext } = useUIStore();
  const { position, onPointerDown, isDragging } = useDraggableDialog();

  useMergeHighlight();

  if (!mergeContext) return null;

  const { pipeA, pipeB, onResolve, onCancel } = mergeContext;

  const getDetails = (feature: any) => {
    const p = feature.getProperties();
    return {
      id: p.label || feature.getId(),
      diameter: p.diameter || 'N/A',
      material: p.material || 'N/A',
      length: Math.round(feature.getGeometry()?.getLength() || 0)
    };
  };

  const detailsA = getDetails(pipeA);
  const detailsB = getDetails(pipeB);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        style={{ transform: `translate(calc(0% + ${position.x}px), calc(0% + ${position.y}px))` }}
        className={cn(
          "max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl transition-none",
          isDragging ? "opacity-90 shadow-2xl duration-0" : "opacity-100 duration-200"
        )}
      >
        <DialogHeader onPointerDown={onPointerDown} className="flex flex-row items-center justify-start">
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-indigo-500" />
            Merge Conflict Resolution
          </DialogTitle>
          <GripHorizontal className="w-5 h-5 text-zinc-400 mr-4 opacity-50" />
        </DialogHeader>

        <div className="py-2">
          <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">
            Two pipes will be merged into a single continuous pipe.
            Please select which <strong>properties</strong> (Diameter, Material, etc.) should be preserved.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <PipeSelectionCard
              colorClass="border-purple-500 bg-purple-50/50 dark:bg-purple-900/10"
              iconColor="text-purple-500"
              title="Pipe A (Preserve)"
              details={detailsA}
              onClick={() => onResolve(pipeA)}
            />

            <PipeSelectionCard
              colorClass="border-orange-500 bg-orange-50/50 dark:bg-orange-900/10"
              iconColor="text-orange-500"
              title="Pipe B (Preserve)"
              details={detailsB}
              onClick={() => onResolve(pipeB)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <Button variant="ghost" onClick={onCancel}>Cancel Merge</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PipeSelectionCard({ colorClass, iconColor, title, details, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all duration-200",
        "hover:scale-[1.02] hover:shadow-lg",
        colorClass
      )}
    >
      <div className="flex items-center justify-between w-full mb-3">
        <span className={cn("font-bold text-lg", iconColor)}>{details.id}</span>
        <CheckCircle2 className={cn("w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity", iconColor)} />
      </div>

      <div className="space-y-2 w-full text-sm">
        <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
          <span className="text-zinc-500">Diameter</span>
          <span className="font-medium">{details.diameter} mm</span>
        </div>
        <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
          <span className="text-zinc-500">Material</span>
          <span className="font-medium">{details.material}</span>
        </div>
        <div className="flex justify-between opacity-60">
          <span className="text-zinc-500">Old Length</span>
          <span>{details.length} m</span>
        </div>
      </div>

      <div className={cn("mt-4 text-xs font-semibold uppercase tracking-wider opacity-60", iconColor)}>
        Click to Select
      </div>
    </button>
  )
}