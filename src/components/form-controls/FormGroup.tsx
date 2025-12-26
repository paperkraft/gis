import { ReactNode } from "react";

interface FormGroupProps {
  label: string;
  children: ReactNode;
}

export const FormGroup = ({ label, children }: FormGroupProps) => (
  <div className="space-y-2">
    <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
      {label} <div className="h-px bg-muted-foreground/20 flex-1" />
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);
