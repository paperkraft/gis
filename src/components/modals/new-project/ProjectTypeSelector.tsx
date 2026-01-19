import { FileUp, Map, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProjectType = 'blank' | 'import' | 'gis';
interface ProjectTypeSelectorProps {
    value: ProjectType;
    onChange: (val: ProjectType) => void;
}

export function ProjectTypeSelector({ value, onChange }: ProjectTypeSelectorProps) {
    return (
        <div className="grid grid-cols-3 gap-4 mb-4">
            <SelectionCard
                active={value === 'blank'}
                onClick={() => onChange('blank')}
                icon={PenTool}
                title="Start from Scratch"
                desc="Design a network manually on an empty canvas."
            />
            <SelectionCard
                active={value === 'import'}
                onClick={() => onChange('import')}
                icon={FileUp}
                title="Import EPANET File"
                desc="Upload an existing .inp file to run simulations."
            />
            <SelectionCard
                active={value === 'gis'}
                onClick={() => onChange('gis')}
                icon={Map}
                title="Build from Lines"
                desc="Roads to Pipes."
            />
        </div>
    );
}

function SelectionCard({ active, onClick, icon: Icon, title, desc }: any) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "cursor-pointer rounded-xl border-2 p-4 flex flex-col gap-3 transition-all",
                active
                    ? "border-primary bg-primary/5 dark:bg-blue-900/10"
                    : "border-slate-100 hover:border-slate-200 bg-white"
            )}
        >
            <div className={cn("p-2 rounded-lg w-fit", active ? "bg-primary text-white" : "bg-slate-100 text-slate-500")}>
                <Icon size={20} />
            </div>
            <div>
                <h3 className={cn("font-bold text-sm", active ? "text-blue-900" : "text-slate-700")}>{title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}