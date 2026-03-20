"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

// Quick hook to prevent spamming the API while typing
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
    React.useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

interface Projection {
    auth_name: string;
    srid: number;
}

interface FormProjectionSelectProps {
    label: string;
    value: string; // "EPSG:XXXX"
    onChange: (value: string) => void;
    description?: string;
    className?: string;
    disabled?: boolean;
}

export function FormProjectionSelect({ 
    label, 
    value, 
    onChange, 
    description, 
    className,
    disabled 
}: FormProjectionSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const debouncedSearch = useDebounce(searchQuery, 300);

    const [projections, setProjections] = React.useState<Projection[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    // Initial load and search
    React.useEffect(() => {
        const fetchProjections = async () => {
            setIsLoading(true);
            try {
                const url = debouncedSearch
                    ? `/api/gis/projections?search=${encodeURIComponent(debouncedSearch)}`
                    : `/api/gis/projections`;

                const res = await fetch(url);
                const data = await res.json();
                setProjections(data.projections || []);
            } catch (error) {
                console.error("Failed to fetch projections", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (open || !projections.length) {
            fetchProjections();
        }
    }, [debouncedSearch, open]);

    const srid = parseInt(value?.replace('EPSG:', '') || "0");
    const selectedProjection = projections.find((p) => p.srid === srid);

    return (
        <div className={cn("space-y-1", className)}>
            {label && (
                <label className="block text-[11px] font-medium mb-1">
                    {label}
                </label>
            )}

            <Popover open={open} onOpenChange={setOpen} modal={false}>
                <PopoverTrigger asChild>
                    <button
                        disabled={disabled}
                        className={cn(
                            "w-full text-left text-xs px-2.5 py-1.5 rounded border outline-none transition-all flex items-center justify-between",
                            disabled
                                ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-white border-input focus:border-primary focus:ring-1 focus:ring-primary hover:border-slate-300"
                        )}
                    >
                        <span className="truncate">
                            {value ? (selectedProjection ? `${selectedProjection.auth_name}:${selectedProjection.srid}` : value) : "Select Projection..."}
                        </span>
                        <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50 ml-2" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false} className="w-full">
                        <div className="flex items-center border-b px-2 h-9">
                            <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                            <input 
                                className="flex h-full w-full rounded-md bg-transparent py-2 text-xs outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Search SRID or Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <CommandList className="max-h-[200px] overflow-y-auto">
                            {isLoading && (
                                <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin opacity-50" />
                                </div>
                            )}
                            {!isLoading && projections.length === 0 && (
                                <div className="p-4 text-[11px] text-center text-slate-500">No projections found.</div>
                            )}
                            {!isLoading && (
                                <CommandGroup>
                                    {projections.map((proj) => (
                                        <CommandItem
                                            key={proj.srid}
                                            value={proj.srid.toString()}
                                            className="text-[11px] py-1.5 cursor-pointer"
                                            onSelect={() => {
                                                onChange(`EPSG:${proj.srid}`);
                                                setOpen(false);
                                                setSearchQuery("");
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-3.5 w-3.5",
                                                    srid === proj.srid ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {proj.auth_name}:{proj.srid}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {description && (
                <p className="text-[10px] text-slate-500 leading-tight">{description}</p>
            )}
        </div>
    );
}
