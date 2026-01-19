"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProjectService } from "@/lib/services/ProjectService";
import { useUIStore } from "@/store/uiStore";

export function DeleteProjectModal({ activeProject }: { activeProject: any }) {
  const { activeModal, setActiveModal, refreshProjects } = useUIStore();

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const isOpen = activeModal === "DELETE_PROJECT";
  const project = activeProject;

  const handleClose = () => {
    setActiveModal("NONE");
    setConfirmText("");
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!project) return;

    if (confirmText !== "DELETE") {
      return;
    }

    setLoading(true);
    try {
      await ProjectService.deleteProject(project.id);
      toast.success("Project deleted successfully");
      handleClose();
      refreshProjects();
    } catch (error) {
      toast.error("Failed to delete project");
      console.error(error);
    } finally {
      setLoading(false);
      router.refresh();
    }
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden bg-white dark:bg-slate-950 border-0 shadow-2xl">
        <DialogHeader className="p-4 border-b border-red-100 bg-red-50/50 dark:bg-red-950/10">
          <DialogTitle className="text-lg font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Delete Project
          </DialogTitle>
          <DialogDescription className="hidden" />
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Warning Message */}
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <Trash2 size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800">
                Are you absolutely sure?
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                This action cannot be undone. This will permanently delete the
                project
                <strong className="text-slate-800 mx-1">
                  "{project.name}"
                </strong>
                and remove all associated simulation data, networks, and
                results.
              </p>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-3 pt-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Type "DELETE" to confirm
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="border-red-200 focus:border-red-500 focus:ring-red-500/20 bg-red-50/30"
            />
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center sm:justify-end gap-3">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={loading || confirmText !== "DELETE"}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200"
          >
            {loading ? "Deleting..." : "Delete Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
