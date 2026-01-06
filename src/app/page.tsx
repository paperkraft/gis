"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AppLayout from "@/components/layout/AppLayout";
import ProjectList from "@/components/layout/ProjectList";
import { NewProjectModal } from "@/components/modals/NewProjectModal";
import { Button } from "@/components/ui/button";
import { ProjectMetadata, ProjectService } from "@/lib/services/ProjectService";
import { useUIStore } from "@/store/uiStore";

export default function Dashboard() {
  const router = useRouter();
  const { setActiveModal } = useUIStore();

  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadProjects = async () => {
    setLoading(true);
    const data = await ProjectService.getProjects();
    setProjects(data);
    setLoading(false);
  };

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = () => {
    setActiveModal("NEW_PROJECT");
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    //   loadProjects(); // Refresh list
    setActiveModal("DELETE_PROJECT");
  };

  const filteredProjects = projects
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.lastModified - a.lastModified);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-500">Loading Project...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppLayout>
        <div className="p-3 px-4 flex items-center justify-between border-b">
          <div>
            <h1 className="text-xl font-medium text-slate-800 mb-1">
              My Projects
            </h1>
          </div>
          <Button size={"sm"} onClick={() => handleCreate()}>
            <Plus size={18} /> New Project
          </Button>
        </div>

        <ProjectList projects={filteredProjects} handleDelete={handleDelete} />
      </AppLayout>
      <NewProjectModal />
    </>
  );
}
