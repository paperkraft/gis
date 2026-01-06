import { ArrowRight, Check, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectSuccessViewProps {
  title: string;
  projectType: string;
  onClose: () => void;
  onOpen: () => void;
}

export function ProjectSuccessView({
  title,
  projectType,
  onClose,
  onOpen,
}: ProjectSuccessViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in slide-in-from-bottom-4">
      <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-green-50/50">
        <Check size={40} strokeWidth={3} />
      </div>

      <h3 className="text-2xl font-bold text-slate-800 mb-2">
        Project Created!
      </h3>

      <p className="text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">
        <strong className="text-slate-800">{title}</strong> has been
        successfully initialized.
        {projectType === "blank"
          ? " You can now start designing your network in the Workbench."
          : " All network data and settings have been imported."}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm justify-center">
        <Button
          variant="outline"
          onClick={onClose}
        >
          <LayoutDashboard size={16} />
          Dashboard
        </Button>
        <Button onClick={onOpen}>
          Open Workbench <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
