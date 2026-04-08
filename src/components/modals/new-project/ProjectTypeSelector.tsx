import { FileUp, Layers, Map, PenTool } from 'lucide-react';

import { cn } from '@/lib/utils';

export type ProjectType = 'blank' | 'import' | 'gis' | 'layers' | null;
interface ProjectTypeSelectorProps {
    value: ProjectType;
    onChange: (val: ProjectType) => void;
}

export function ProjectTypeSelector({ value, onChange }: ProjectTypeSelectorProps) {
    return (
        <div className="grid grid-cols-4 gap-4 mb-4">
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
            <SelectionCard
                active={value === 'layers'}
                onClick={() => onChange('layers')}
                icon={Layers}
                title="Build from Layers"
                desc="Upload multiple GIS network layers at once."
            />
        </div>
    );
}

function SelectionCard({ active, onClick, icon: Icon, title, desc }: any) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "group cursor-pointer rounded-xl border-2 p-4 flex flex-col gap-3 transition-all duration-300",
                "hover:shadow-xl hover:-translate-y-1.5 active:scale-[0.97] active:duration-75", // Hover & Active effects
                active
                    ? "border-primary bg-primary/5 dark:bg-blue-900/10 shadow-md ring-1 ring-primary/20"
                    : "border-slate-100 hover:border-primary/40 bg-white dark:bg-slate-900 dark:border-slate-800"
            )}
        >
            <div className={cn(
                "p-2 rounded-lg w-fit transition-all duration-300", 
                active 
                    ? "bg-primary text-white shadow-primary/30 shadow-lg scale-110" 
                    : "bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-110"
            )}>
                <Icon size={20} />
            </div>
            <div>
                <h3 className={cn(
                    "font-bold text-sm transition-colors", 
                    active ? "text-primary" : "text-slate-700 group-hover:text-primary"
                )}>
                    {title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{desc}</p>
            </div>
        </div>
    );
}