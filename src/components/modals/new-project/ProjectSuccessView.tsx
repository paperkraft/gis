import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectSuccessViewProps {
    title: string;
    projectType: string;
    units: string;
    onClose: () => void;
    onOpen: () => void;
}

export function ProjectSuccessView({ title, projectType, units, onClose, onOpen }: ProjectSuccessViewProps) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 size={32} />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800">"{title}" Created!</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    {projectType === 'blank'
                        ? "Your empty project has been initialized. You can now start drawing your network."
                        : "Network geometry and settings have been imported successfully."}
                </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 w-full max-w-sm text-left space-y-2">
                <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Type</span>
                    <span className="font-bold text-slate-700 capitalize">{projectType} Project</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Units</span>
                    <span className="font-bold text-slate-700">{units}</span>
                </div>
            </div>

            <div className="flex gap-3 pt-4 w-full justify-center">
                <Button variant="outline" onClick={onClose}>
                    Close
                </Button>
                <Button onClick={onOpen} className="bg-green-600 hover:bg-green-700 text-white gap-2 px-8">
                    Open Workbench <ArrowRight size={16} />
                </Button>
            </div>
        </div>
    );
}