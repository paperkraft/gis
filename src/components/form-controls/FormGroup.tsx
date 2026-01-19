import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface FormGroupProps {
  label: string;
  className?: string;
  children: ReactNode;
}

export const FormGroup = ({ label, className, children }: FormGroupProps) => (
  <div className={cn("space-y-2", className)}>
    <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
      {label} <div className="h-px bg-slate-200 flex-1" />
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);
