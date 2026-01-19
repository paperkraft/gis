import { ChevronDown, Loader2, Save } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React from "react";

import { useProjectSave } from "@/hooks/useProjectSave";
import { useNetworkStore } from "@/store/networkStore";
import { Button } from "../ui/button";

interface HeaderProps {
  isWorkbench: boolean;
  projectName?: string;
  description?: string;
}

export const Header = ({
  isWorkbench,
  projectName,
  description,
}: HeaderProps) => {
  const params = useParams();
  const projectId = params.id as string;

  const route = useRouter();

  const { saveProject, isSaving } = useProjectSave(projectId);
  const hasUnsavedChanges = useNetworkStore((s) => s.hasUnsavedChanges);

  const handleBack = () => {
    route.replace("/");
  };

  return (
    <>
      <header className="h-12 bg-background border-b border-slate-200 flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-primary rounded flex items-center justify-center text-white font-bold text-lg">
              S
            </div>

            {!isWorkbench && (
              <span className="font-bold text-base text-slate-900 leading-tight">
                Sigma ToolBox
              </span>
            )}

            {isWorkbench && (
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-48">
                  {projectName}
                </span>
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-48">
                  {description}
                </span>
              </div>
            )}
          </div>

          {isWorkbench && (
            <>
              <div className="h-4 w-px bg-slate-200 mx-2" />
              <nav className="flex items-center gap-4 text-xs font-medium text-slate-500">
                <span
                  className="hover:text-slate-800 cursor-pointer transition-colors"
                  onClick={() => handleBack()}
                >
                  Dashboard
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
          <div className="flex items-center gap-3 cursor-pointer hover:bg-muted py-1 px-2 rounded">
            <div className="w-8 h-8 rounded-full bg-primary-foreground text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
              SV
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-sm font-semibold text-slate-700 leading-none">
                Sannake Vishal
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Professional Plan
              </div>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </div>
        </div>
      </header>
    </>
  );
};
