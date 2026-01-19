import { Clock, ExternalLink, FolderOpen, Info, LayoutGrid, List, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

import { ProjectMetadata, ProjectService } from '@/lib/services/ProjectService';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';

import { FormInput } from '../form-controls/FormInput';
import CustomToolTip from '../shared/CustomToolTip';
import { Button } from '../ui/button';
import { RightPanel } from './RightPanel';

const ProjectList = () => {
  const route = useRouter();
  const { projectRefreshKey } = useUIStore();

  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewPanel, setViewPanel] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [features, setFeatures] = useState<any>(null);
  const [loadingThumbnail, setLoadingThumbnail] = useState(false);

  // Helper: Find the object only if selectedId exists
  const activeProject = projects.find((p) => p.id === selectedId);

  const fetchProjects = async (isSilent = false) => {
    if (!isSilent) setLoading(true);

    try {
      const data = await ProjectService.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load projects on mount
  useEffect(() => {
    const isSilentRefresh = projects.length > 0;
    fetchProjects(isSilentRefresh);
  }, [projectRefreshKey]);

  // Fetch selected project details when selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setFeatures([]);
      return;
    }

    // 1. Set a Timeout (Delay)
    const timer = setTimeout(() => {
      const getProj = async () => {
        setLoadingThumbnail(true); // Show spinner in thumbnail area
        try {
          const res = await fetch(`/api/projects/${selectedId}`, {
            cache: "no-store",
          });
          if (!res.ok) throw new Error("Err");
          const project = await res.json();

          // Only update if the user is STILL looking at this project
          setFeatures(project.data?.features || []);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingThumbnail(false);
        }
      };
      getProj();
    }, 300); // Wait 300ms

    // 2. Cleanup function
    // This runs if selectedId changes *before* the 300ms is up
    return () => clearTimeout(timer);
  }, [selectedId]);

  const handleClick = useCallback(() => {
    setViewPanel(false);
  }, []);

  const handleOpenProject = useCallback((id: string) => {
    route.replace(`/workbench/${id}`);
  }, []);

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase().trim();
    return (
      p.name?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      false
    );
  });

  return (
    <div className="flex">
      <div className="flex-1 flex flex-col min-w-0 z-0">
        {/* A. TOP BAR */}
        <div className="p-4 pb-0 flex items-center justify-end gap-2">
          <div className="relative w-full md:w-64 group">
            <FormInput
              label=""
              type="text"
              value={searchQuery}
              onChange={(v) => setSearchQuery(v)}
              placeholder="Search projects..."
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-0.5 rounded-full transition-all"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

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

        {/* CONTENT AREA */}
        <div
          className="flex-1 overflow-y-auto p-4"
          onClick={() => setSelectedId(null)}
        >
          {/* Empty State: No Projects */}
          {loading && projects.length === 0 && (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "bg-white rounded-xl border border-slate-200 animate-pulse",
                    viewMode === "grid" ? "h-[150px]" : "h-16"
                  )}
                />
              ))}
            </div>
          )}

          {/* Empty State: Search found nothing */}
          {!loading && projects.length > 0 && filteredProjects.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
                <Search className="text-slate-400" size={24} />
              </div>
              <h3 className="text-slate-900 font-medium">No matches found</h3>
              <p className="text-slate-500 text-sm mt-1">
                We couldn't find any project matching "{searchQuery}"
              </p>
              <Button
                variant="link"
                onClick={() => setSearchQuery("")}
                className="mt-2 text-primary"
              >
                Clear search
              </Button>
            </div>
          )}

          {/* DATA DISPLAY */}

          {!loading &&
            filteredProjects.length > 0 &&
            (viewMode === "grid" ? (
              // GRID VIEW
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
                {filteredProjects.map((p) => (
                  <GridCard
                    key={p.id}
                    data={p}
                    isSelected={selectedId === p.id}
                    onClick={() => setSelectedId(p.id)}
                    openProject={() => handleOpenProject(p.id)}
                  />
                ))}
              </div>
            ) : (
              // LIST VIEW
              <div className="rounded overflow-hidden animate-in fade-in duration-500">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="border bg-primary-foreground">
                    <tr>
                      <th className="px-6 py-3">Project Name</th>
                      <th className="px-6 py-3">Description</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="border">
                    {filteredProjects.map((p) => (
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
            ))}
        </div>
      </div>

      {/* C. RIGHT PANEL (CONDITIONAL) */}
      {viewPanel && (
        <RightPanel
          loadingThumbnail={loadingThumbnail}
          features={features}
          activeProject={activeProject}
          handleClose={handleClick}
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
      className={`group rounded-md border cursor-pointer overflow-hidden transition-all duration-200 ${
        isSelected
          ? "ring-2 ring-primary/80 border-transparent shadow-md transform scale-[1.01]"
          : "shadow-sm hover:shadow-md hover:border-primary/50"
      }`}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div
            className={`size-10 rounded flex items-center justify-center transition-colors ${
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-primary-foreground text-primary"
            }`}
          >
            <FolderOpen size={18} />
          </div>
          {isSelected && (
            <CustomToolTip tooltip="Open">
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
            </CustomToolTip>
          )}
        </div>

        <h3 className="font-bold text-sm text-slate-700 truncate">{data.name}</h3>
        <div className="text-xs text-muted-foreground mt-4 flex justify-between">
          <div className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {new Date(data.lastModified).toLocaleDateString()}
          </div>
          <span className="size-5 font-medium bg-muted rounded-full"></span>
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
