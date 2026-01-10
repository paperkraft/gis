"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { ReactNode } from "react";

import { useUIStore } from "@/store/uiStore";

import { Button } from "../ui/button";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { sidebarMenus } from "./sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { setActiveModal } = useUIStore();

  const pageTitle =
    sidebarMenus.find((menu) =>
      menu.exact ? path === menu.href : path.startsWith(menu.href)
    )?.title || "Dashboard";

  const showNewProject = path === "/";

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F8FAFC] font-sans text-slate-700 overflow-hidden">
      <Header isWorkbench={false} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 min-w-0 bg-background z-0">
          <div className="p-3 px-4 flex items-center justify-between border-b h-14">
            <h6 className="font-medium text-slate-700">{pageTitle}</h6>
            {showNewProject && (
              <Button size="sm" onClick={() => setActiveModal("NEW_PROJECT")}>
                <Plus size={18} /> New Project
              </Button>
            )}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
