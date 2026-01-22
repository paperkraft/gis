import React from "react";
import { useUIStore } from "@/store/uiStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Link2Off, Ghost, Merge } from "lucide-react";

export function DeleteConfirmation() {
  const { deleteContext } = useUIStore();

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
      <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-500">
            <AlertTriangle className="w-5 h-5" />
            Delete {primaryType}?
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Main Question */}
          <p className="text-zinc-600 dark:text-zinc-300">
            Are you sure you want to delete
            {isSingleSelection ? (
              <span className="font-bold text-zinc-900 dark:text-white">
                {" "}
                {singleLabel}
              </span>
            ) : (
              <span>
                {" "}
                <span className="font-bold text-zinc-900 dark:text-white">
                  {features.length}
                </span>{" "}
                items
              </span>
            )}
            ?
          </p>

          {/* WARNING 1: CASCADE (Connected Pipes) */}
          {cascadeCount > 0 && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-md p-3 flex gap-3 items-start">
              <Link2Off className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-700 dark:text-red-400 mb-1">
                  Dependent Links
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Will remove{" "}
                  <span className="font-bold text-red-600 dark:text-red-300">
                    {" "}
                    {cascadeCount} connected pipe{cascadeCount > 1 ? "s" : ""}
                  </span>
                  .
                </p>
              </div>
            </div>
          )}

          {/* WARNING 2: ORPHANS (Unused Nodes) */}
          {orphanCount > 0 && (
            <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-md p-3 flex gap-3 items-start">
              <Ghost className="w-5 h-5 text-orange-500 dark:text-orange-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-orange-700 dark:text-orange-400 mb-1">
                  Orphan Cleanup
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Will remove{" "}
                  <span className="font-bold text-orange-600 dark:text-orange-300">
                    {" "}
                    {orphanCount} end node{orphanCount > 1 ? "s" : ""}
                  </span>
                  .
                </p>
              </div>
            </div>
          )}

          {/* WARNING 3: MERGE (Pump/Valve) */}
          {isMerge && (
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-md p-3 flex gap-3 items-start">
              <Merge className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">
                  Topology Update
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Inlet/Outlet nodes will be{" "}
                  <span className="font-bold text-blue-600 dark:text-blue-300">
                    merged into a single junction
                  </span>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Generic "No Undo" Warning (Always visible if no other major warnings) */}
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
