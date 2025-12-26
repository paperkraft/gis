"use client";

import React, { ReactNode } from "react";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#F8FAFC] font-sans text-slate-700 overflow-hidden">
      <Header isWorkbench={false} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 min-w-0 bg-background z-0">{children}</main>
      </div>
    </div>
  );
}
