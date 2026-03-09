import {
  AlertTriangle,
  Eye,
  EyeOff,
  Ghost,
  GripHorizontal,
  Link2Off,
  Merge,
} from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { useDraggableDialog } from "@/hooks/useDraggableDialog";

export function DeleteConfirmation() {
  const { deleteContext } = useUIStore();
  const { position, onPointerDown, isDragging } = useDraggableDialog();

  if (!deleteContext) return null;

  const { features, impact, onConfirm, onCancel } = deleteContext;
  const { totalCount, cascadeCount, orphanCount, isMerge, primaryType } =
    impact;

  const isSingleSelection = features.length === 1;
  const singleLabel = isSingleSelection
    ? features[0].get("label") || features[0].getId()
    : "";

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        className={cn(
          "max-w-md bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-lg transition-opacity duration-200",
          isDragging ? "opacity-90 shadow-2xl duration-0" : "opacity-100 duration-200"
        )}
        style={{ transform: `translate(calc(0% + ${position.x}px), calc(0% + ${position.y}px))` }}
      >
        <DialogHeader
          onPointerDown={onPointerDown}
          className="flex flex-row items-center justify-start"
        >
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-500">
            <AlertTriangle className="size-5" />
            Delete {primaryType}?
          </DialogTitle>
          <GripHorizontal className="w-5 h-5 text-zinc-400 mr-4 opacity-50" />
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-zinc-600 dark:text-zinc-300">
            Are you sure you want to delete&nbsp;
            {isSingleSelection ? (
              <span className="font-bold text-zinc-900 dark:text-white">
                {singleLabel}
              </span>
            ) : (
              <span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {features.length}
                </span>
                items
              </span>
            )}
            ?
          </p>

          {/* WARNING 1: CASCADE */}
          {cascadeCount > 0 && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-md p-3 flex gap-3 items-start">
              <Link2Off className="size-5 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-700 dark:text-red-400 mb-1">
                  Dependent Links
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Will remove&nbsp;
                  <span className="font-bold text-red-600 dark:text-red-300">
                    {cascadeCount} connected pipe{cascadeCount > 1 ? "s" : ""}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* WARNING 2: ORPHANS */}
          {orphanCount > 0 && (
            <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-md p-3 flex gap-3 items-start">
              <Ghost className="size-5 text-orange-500 dark:text-orange-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-orange-700 dark:text-orange-400 mb-1">
                  Orphan Cleanup
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Will remove&nbsp;
                  <span className="font-bold text-orange-600 dark:text-orange-300">
                    {orphanCount} end node{orphanCount > 1 ? "s" : ""}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* WARNING 3: MERGE */}
          {isMerge && (
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-md p-3 flex gap-3 items-start">
              <Merge className="size-5 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">
                  Topology Update
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Inlet/Outlet nodes will be&nbsp;
                  <span className="font-bold text-blue-600 dark:text-blue-300">
                    merged into a single junction.
                  </span>
                </p>
              </div>
            </div>
          )}

          {cascadeCount === 0 && orphanCount === 0 && !isMerge && (
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              This action cannot be undone unless you use the history undo.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete {totalCount > features.length ? `All ${totalCount}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
