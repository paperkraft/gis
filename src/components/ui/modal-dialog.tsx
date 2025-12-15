"use client";

import { X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function ModalDialog({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  footer,
  className,
  maxWidth = "lg",
}: ModalDialogProps) {
  const [show, setShow] = useState(isOpen);

  // Sync state with prop for animations
  useEffect(() => {
    if (isOpen) setShow(true);
    else setTimeout(() => setShow(false), 200); // Wait for fade out
  }, [isOpen]);

  if (!show) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200",
        isOpen
          ? "bg-black/40 backdrop-blur-sm opacity-100"
          : "bg-transparent opacity-0 pointer-events-none"
      )}
    >
      <div
        className={cn(
          "overflow-y-auto w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 flex flex-col transition-all duration-200 transform",
          maxWidthClasses[maxWidth],
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0",
          className
        )}
      >
        {/* HEADER */}
        <div className="px-6 py-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 max-h-[calc(100vh-150px)] scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          {children}
        </div>

        {/* FOOTER */}
        {footer && (
          <div className="px-4 py-3 bg-gray-50/80 dark:bg-gray-900/80 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-end gap-3 backdrop-blur-sm shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
