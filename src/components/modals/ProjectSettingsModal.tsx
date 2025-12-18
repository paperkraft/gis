"use client";

import { Save, Settings } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNetworkStore } from "@/store/networkStore";
import { ProjectSettings } from "@/types/network";

import { ProjectSettingsForm } from "../shared/ProjectSettingsForm";
import { ModalDialog } from "../ui/modal-dialog";
import { ProjectService } from "@/lib/services/ProjectService";
import { useParams } from "next/navigation";

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectSettingsModal({
  isOpen,
  onClose,
}: ProjectSettingsModalProps) {
  const params = useParams();

  const { settings, updateSettings } = useNetworkStore();
  const [formData, setFormData] = useState<ProjectSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
      setHasChanges(false);
    }
  }, [isOpen, settings]);

  const handleChange = (key: keyof ProjectSettings, value: any) => {
    const updated = { ...formData, [key]: value };
    setFormData(updated);
    setHasChanges(JSON.stringify(updated) !== JSON.stringify(settings));
  };

  const handleSave = async () => {
    updateSettings(formData);
    await ProjectService.saveCurrentProject(params.id as string);
    setHasChanges(false);
    onClose();
  };

  if (!isOpen) return null;

  const renderFooter = () => (
    <>
      <Button
        variant="outline"
        onClick={onClose}
        className="hover:bg-white dark:hover:bg-gray-800"
      >
        Cancel
      </Button>
      <Button
        onClick={handleSave}
        disabled={!hasChanges}
        className={cn(
          "min-w-[120px] transition-all",
          hasChanges
            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
            : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
        )}
      >
        <Save className="w-4 h-4 mr-2" /> Save Changes
      </Button>
    </>
  );

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Project Settings"
      subtitle="Configure simulation parameters and export format"
      icon={Settings}
      footer={renderFooter()}
      maxWidth="2xl"
    >
      <ProjectSettingsForm
        settings={formData}
        onChange={handleChange}
        mode="edit"
      />
    </ModalDialog>
  );
}
