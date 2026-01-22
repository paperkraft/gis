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
import { ArrowRight, Merge } from "lucide-react";

export function MergeConflictModal() {
  const { mergeContext, setMergeContext } = useUIStore();

  if (!mergeContext) return null;

  const { pipeA, pipeB, onResolve, onCancel } = mergeContext;

  // Helper to render property comparison
  const renderProp = (label: string, key: string) => (
    <div className="flex justify-between text-sm py-1 border-b border-border/50">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex gap-4">
        <span className="font-mono text-blue-400">{pipeA.get(key)}</span>
        <span className="font-mono text-orange-400">{pipeB.get(key)}</span>
      </div>
    </div>
  );

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-950 border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Merge className="size-5" />
            Merge Pipes
          </DialogTitle>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Deleting this node will merge two pipes. Which properties should the
            new pipe inherit?
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 my-4">
          {/* Pipe A Card */}
          <div
            className="p-4 rounded-lg border border-blue-500/30 hover:border-blue-500 cursor-pointer transition-colors"
            onClick={() => onResolve(pipeA)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-blue-400">Pipe A (Left)</h3>
              <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded text-blue-300">
                {pipeA.getId()}
              </span>
            </div>
            <div className="space-y-1">
              {renderProp("Diameter", "diameter")}
              {renderProp("Roughness", "roughness")}
              {renderProp("Material", "material")}
            </div>
            <Button
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500"
              size="sm"
            >
              Keep Pipe A Props
            </Button>
          </div>

          {/* Pipe B Card */}
          <div
            className="p-4 rounded-lg border border-orange-500/30 hover:border-orange-500 cursor-pointer transition-colors"
            onClick={() => onResolve(pipeB)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-orange-400">Pipe B (Right)</h3>
              <span className="text-xs bg-orange-500/20 px-2 py-0.5 rounded text-orange-300">
                {pipeB.getId()}
              </span>
            </div>
            <div className="space-y-1">
              {renderProp("Diameter", "diameter")}
              {renderProp("Roughness", "roughness")}
              {renderProp("Material", "material")}
            </div>
            <Button
              className="w-full mt-4 bg-orange-600 hover:bg-orange-500"
              size="sm"
            >
              Keep Pipe B Props
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
