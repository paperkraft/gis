import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import WorkbenchPageClient from "@/components/workbench/WorkbenchPageClient";

export default async function WorkbenchEditor() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <WorkbenchPageClient user={session} />
  );
}
