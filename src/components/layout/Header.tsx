"use client";
import { Database, Droplet, Moon, Settings, User } from "lucide-react";
import React from "react";

import { Button } from "../ui/button";
import { useUIStore } from "@/store/uiStore";
import { ProjectSettingsModal } from "../modals/ProjectSettingsModal";
import { DataManagerModal } from "../modals/DataManagerModal";

export function Header() {
  const {
    projectSettingsModalOpen,
    dataManagerModalOpen,
    setProjectSettingsModalOpen,
    setDataManagerModalOpen,
  } = useUIStore();

  return (
    <header className="h-14 border-b bg-white dark:bg-gray-900 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Droplet className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Water Network GIS
        </h1>
        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          Beta Edition
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* SETTINGS BUTTON */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setProjectSettingsModalOpen(true)}
          title="Project Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDataManagerModalOpen(true)}
          title="Database"
        >
          <Database className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon">
          <Moon className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </div>

      {/* RENDER MODAL */}
      <ProjectSettingsModal
        isOpen={projectSettingsModalOpen}
        onClose={() => setProjectSettingsModalOpen(false)}
      />

      <DataManagerModal
        isOpen={dataManagerModalOpen}
        onClose={() => setDataManagerModalOpen(false)}
      />
    </header>
  );
}
