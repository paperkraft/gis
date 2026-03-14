import { logoutAction } from "@/app/login/actions";
import { ChevronDown, Loader2, LogOut, Save, User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

import { ProjectService } from "@/lib/services/ProjectService";
import { useNetworkStore } from "@/store/networkStore";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Logo from "./app-logo";

interface HeaderProps {
  isWorkbench: boolean;
  projectName?: string;
  description?: string;
  user?: { name: string, email: string };
}

export const Header = ({
  isWorkbench,
  projectName,
  description,
  user,
}: HeaderProps) => {
  const params = useParams();
  const projectId = params.id as string;

  const route = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const hasUnsavedChanges = useNetworkStore((s) => s.hasUnsavedChanges);

  const handleBack = () => {
    route.replace("/");
  };

  const saveProject = async () => {
    if (!projectId || isSaving) return;
    setIsSaving(true);
    try {
      const result = await ProjectService.saveCurrentProject(projectId);
      if (result.success) {
        toast.success("Project saved successfully");
      } else {
        toast.error("Failed to save project");
      }
    } catch {
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logoutAction();
  };

  return (
    <>
      <header className="h-14 bg-background border-b border-slate-200 flex items-center justify-between px-3 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Logo />

            {isWorkbench && (
              <>
                <div className="h-6 w-px bg-border mx-2" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground leading-tight truncate max-w-48">
                    {projectName}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium truncate max-w-48">
                    {description}
                  </span>
                </div>
              </>
            )}
          </div>

          {isWorkbench && (
            <>
              <div className="h-4 w-px bg-slate-200 mx-2" />
              <nav className="h-14 flex items-center gap-4 text-xs font-medium text-slate-500">
                <span
                  className="hover:text-slate-800 cursor-pointer transition-colors"
                  onClick={() => handleBack()}
                >
                  My Projects
                </span>
                <span className="text-primary border-b-2 border-primary pb-3.5 mt-3.5 cursor-pointer">
                  Workbench
                </span>
              </nav>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {(hasUnsavedChanges || isSaving) && (
            <Button
              size="sm"
              variant={hasUnsavedChanges ? "default" : "outline"}
              onClick={saveProject}
              disabled={isSaving || !hasUnsavedChanges}
              className="gap-2 text-xs"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}

          <div className="h-4 w-px bg-slate-200" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer hover:bg-muted py-1 px-2 rounded outline-none">
                <div className="w-8 h-8 rounded-full bg-primary-foreground text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                  {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-sm font-semibold text-slate-700 leading-none">
                    {user?.name || 'Guest User'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {user?.email || 'Professional Plan'}
                  </div>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2">
                <User size={14} /> Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50" onClick={handleLogout}>
                <LogOut size={14} /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
};
