"use client";

import { LucideIcon, X } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

interface FloatingPanelProps {
  title: string;
  icon: LucideIcon;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function FloatingPanel({
  title,
  icon: Icon,
  isOpen,
  onClose,
  children,
  footer,
  className,
}: FloatingPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "absolute top-2.5 right-14 z-10 w-80 bg-background backdrop-blur-sm dark:bg-slate-900/95 ring-1 ring-slate-900/5 dark:ring-slate-800 rounded-sm shadow-xl flex flex-col animate-in slide-in-from-right-4 duration-300",
        className
      )}
    >
      {/* Header */}
      <div className="h-9 rounded-t-sm bg-slate-50 border-b border-slate-200 flex items-center justify-between px-3 select-none shrink-0">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <Icon size={14} />
            {title}
          </div>
        </div>
        <button
          onClick={onClose}
          className="hover:text-destructive transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Content Scroll Area */}
      <div className="p-3 overflow-y-auto max-h-[60vh] custom-scrollbar">
        {children}
      </div>

      {/* Footer (Optional) */}
      {footer && (
        <div className="p-2.5 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 shrink-0 rounded-b-sm">
          {footer}
        </div>
      )}
    </div>
  );
}
