"use client";

import AppLayout from "@/components/layout/AppLayout";
import ProjectList from "@/components/layout/ProjectList";
import { NewProjectModal } from "@/components/modals/NewProjectModal";

export default function Dashboard({ user }: { user: { id: string, name: string, email: string } }) {
  return (
    <>
      <AppLayout user={user}>
        <ProjectList userId={user.id} />
      </AppLayout>
      <NewProjectModal />
    </>
  );
}
