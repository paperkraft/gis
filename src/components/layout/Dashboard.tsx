"use client";

import AppLayout from "@/components/layout/AppLayout";
import ProjectList from "@/components/layout/ProjectList";
import { NewProjectModal } from "@/components/modals/NewProjectModal";

export default function Dashboard() {
  return (
    <>
      <AppLayout>
        <ProjectList />
      </AppLayout>
      <NewProjectModal />
    </>
  );
}
