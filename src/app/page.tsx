import Dashboard from "@/components/layout/Dashboard";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Page() {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    return <Dashboard user={session} />;
}
