"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

import { cn } from "@/lib/utils";

import { sidebarMenus } from "./sidebar";

export const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );

  // Helper to determine if a path is active
  const isActive = (path: string) => pathname === path;

  return (
    <aside className="w-64 bg-background flex flex-col shrink-0 border-r border-slate-200 z-20 transition-all duration-300 ease-in-out">
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {sidebarMenus.map((menu) => (
          <NavItem
            key={menu.href}
            icon={menu.icon}
            label={menu.title}
            active={isActive(menu.href)}
            onClick={() => handleNavigate(menu.href)}
          />
        ))}
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
