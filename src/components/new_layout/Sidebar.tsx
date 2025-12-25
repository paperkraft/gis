"use client";

import { cn } from "@/lib/utils";
import { FolderOpen, MailPlus, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export const Sidebar = () => {
  const router = useRouter();
  const handleNavigate = useCallback((path: string) => {
    router.push(path);
  }, []);

  return (
    <aside className="w-64 bg-background flex flex-col shrink-0 border-r border-slate-200 z-20 transition-all duration-300 ease-in-out">
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <NavItem
          icon={FolderOpen}
          label="My Projects"
          active
          onClick={() => handleNavigate("/")}
        />
        <NavItem
          icon={Users}
          label="Shared with me"
          onClick={() => handleNavigate("/shared-projects")}
        />
        <div className="mt-8 px-3 mb-2 text-[11px] font-medium text-muted-foreground">
          Section
        </div>
        <NavItem
          icon={MailPlus}
          label="Invitations"
          onClick={() => handleNavigate("/invitation")}
        />
        <NavItem
          icon={Wallet}
          label="Subscription"
          onClick={() => handleNavigate("/subscription")}
        />
      </div>
    </aside>
  );
};

function NavItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 text-slate-600 hover:bg-primary-foreground hover:text-primary",
        active && "bg-primary-foreground text-primary"
      )}
      onClick={onClick}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}
