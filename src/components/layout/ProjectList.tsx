import {
  Clock,
  ExternalLink,
  FolderOpen,
  Info,
  LayoutGrid,
  List,
} from "lucide-react";
import React, { useCallback, useState } from "react";
import { RightPanel } from "./RightPanel";
import { ProjectMetadata } from "@/lib/services/ProjectService";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface ProjectListProps {
  projects: ProjectMetadata[] | [];
  handleDelete: (e: React.MouseEvent, id: string) => void;
}

const ProjectList = ({ projects, handleDelete }: ProjectListProps) => {
  const route = useRouter();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewPanel, setViewPanel] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Helper: Find the object only if selectedId exists
  const activeProject = projects.find((p) => p.id === selectedId);

  const handleClick = useCallback(() => {
    setViewPanel(false);
  }, []);

  const handleOpenProject = useCallback((id: string) => {
    route.replace(`/workbench/${id}`);
  }, []);

  return (
    <div className="flex">
      <div className="flex-1 flex flex-col min-w-0 z-0">
        <div className="p-4 pb-0 flex items-center justify-end gap-2">
          <div className="flex bg-muted p-1 rounded border border-slate-200">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded ${
                viewMode === "grid"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-accent-foreground"
              }`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded ${
                viewMode === "list"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-accent-foreground"
              }`}
            >
              <List size={16} />
            </button>
          </div>
          {!viewPanel && (
            <div className="flex bg-muted p-1 rounded border border-slate-200">
              <button
                onClick={() => setViewPanel(true)}
                className="p-1.5 rounded text-muted-foreground hover:text-accent-foreground"
              >
                <Info size={16} />
              </button>
            </div>
          )}
        </div>

        <div
          className="flex-1 overflow-y-auto p-4"
          onClick={() => setSelectedId(null)}
        >
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects.map((p) => (
                <GridCard
                  key={p.id}
                  data={p}
                  isSelected={selectedId === p.id}
                  onClick={() => setSelectedId(p.id)}
                  openProject={() => handleOpenProject(p.id)}
                />
              ))}
            </div>
          )}

          {viewMode === "list" && (
            <div className="rounded  overflow-hidden">
              <table className="w-full text-left text-sm text-slate-600">
                {/* <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-400"> */}
                <thead className="border bg-primary-foreground">
                  <tr>
                    <th className="px-6 py-3">Project Name</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="border">
                  {projects.map((p) => (
                    <ListRow
                      key={p.id}
                      data={p}
                      isSelected={selectedId === p.id}
                      onClick={() => setSelectedId(p.id)}
                      openProject={() => handleOpenProject(p.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* C. RIGHT PANEL (CONDITIONAL) */}
      {viewPanel && (
        <RightPanel
          activeProject={activeProject}
          handleClose={handleClick}
          handleDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default ProjectList;

// ==================
// SUB-COMPONENTS
// ==================

function GridCard({ data, onClick, isSelected, openProject }: any) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`group rounded-lg border cursor-pointer overflow-hidden transition-all duration-200 ${
        isSelected
          ? "ring-2 ring-primary/80 border-transparent shadow-md transform scale-[1.01]"
          : "shadow-sm hover:shadow-md hover:border-primary/50"
      }`}
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div
            className={`size-10 rounded flex items-center justify-center transition-colors ${
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-primary-foreground text-primary"
            }`}
          >
            <FolderOpen size={20} />
          </div>
          {isSelected && (
            <Button
              variant={"ghost"}
              size={"icon-sm"}
              className="group text-muted-foreground/80 hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                openProject();
              }}
            >
              <ExternalLink className="size-4" />
            </Button>
          )}
        </div>

        <h3 className="font-bold text-sm mb-1 truncate">{data.name}</h3>
        <div className="text-xs text-muted-foreground mt-4 flex justify-between">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {new Date(data.lastModified).toLocaleDateString()}
          </div>
          <span className="font-medium bg-muted px-2 py-0.5 rounded"></span>
        </div>
      </div>
    </div>
  );
}

function ListRow({ data, onClick, isSelected, openProject }: any) {
  return (
    <tr
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "cursor-pointer transition-colors border-b last:border-0 [&_td]:px-4 [&_td]:py-2",
        isSelected && "bg-primary-foreground/50",
        !isSelected && "hover:bg-muted/50"
      )}
    >
      <td className=" font-medium text-slate-700 flex items-center gap-3">
        <FolderOpen
          size={16}
          className={isSelected ? "text-primary" : "text-muted-foreground/50"}
        />
        {data.name}
      </td>
      <td className="">
        <span className="px-2 py-0.5 text-slate-500">{data.description}</span>
      </td>
      <td className=" text-right font-mono text-xs">
        <button
          className="size-5 cursor-pointer text-muted-foreground/50 hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            openProject();
          }}
        >
          <ExternalLink size={16} />
        </button>
      </td>
    </tr>
  );
}
