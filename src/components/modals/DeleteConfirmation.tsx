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
import { AlertTriangle, Link2Off } from "lucide-react";

export function DeleteConfirmation() {
  const { deleteContext } = useUIStore();

  if (!deleteContext) return null;

  const { features, impact, onConfirm, onCancel } = deleteContext;
  const { totalCount, cascadeCount, primaryType } = impact;

  const isSingleSelection = features.length === 1;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden bg-white dark:bg-slate-950 border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="size-5" />
            Delete {primaryType}?
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Main Statement */}
          <p>
            Are you sure you want to delete this&nbsp;
            {isSingleSelection ? (
              <span className="font-bold">{primaryType.toLowerCase()}</span>
            ) : (
              <span>
                <span className="font-bold">{features.length}</span> items
              </span>
            )}
            ?
          </p>

          {/* CASCADE WARNING */}
          {cascadeCount > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded p-3 flex gap-3 items-start animate-in fade-in zoom-in duration-200">
              <Link2Off className="size-5 text-amber-800 dark:text-amber-300 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">
                  Dependent Items
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Deleting this will automatically remove&nbsp;
                  <span className="font-bold text-amber-800 dark:text-amber-300">
                    {cascadeCount} connected pipe{cascadeCount > 1 ? "s" : ""}
                  </span>
                  .
                </p>
              </div>
            </div>
          )}

          {!isSingleSelection && cascadeCount === 0 && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              This action cannot be undone unless you use the history undo.
            </p>
          )}
        </div>

        <DialogFooter className="gap-3 sm:gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
          >
            Delete {totalCount > features.length ? `All ${totalCount}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
