"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
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

interface ProjectionSelectProps {
    value: number | undefined;
    onChange: (srid: number) => void;
    placeholder?: string;
}

export function ProjectionSelect({ value, onChange, placeholder = "Select SRID..." }: ProjectionSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const debouncedSearch = useDebounce(searchQuery, 300);

    const [projections, setProjections] = React.useState<Projection[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    // Fetch from the API whenever the debounced search changes (or on first open)
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

        if (open) {
            fetchProjections();
        }
    }, [debouncedSearch, open]);

    // Find the selected item's label to display on the button
    const selectedProjection = projections.find((p) => p.srid === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={false}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value
                        ? selectedProjection
                            ? `${selectedProjection.auth_name}:${selectedProjection.srid}`
                            : `EPSG:${value}` // Fallback if data isn't loaded yet
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-auto p-0">
                {/* shouldFilter={false} is critical here because we filter via the PostGIS API */}
                <Command shouldFilter={false} className="w-full">
                    <CommandInput
                        placeholder="Search e.g., 32643..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList>
                        {isLoading && (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin opacity-50" />
                            </div>
                        )}
                        {!isLoading && projections.length === 0 && (
                            <CommandEmpty>No projections found.</CommandEmpty>
                        )}
                        {!isLoading && (
                            <CommandGroup>
                                {projections.map((proj) => (
                                    <CommandItem
                                        key={proj.srid}
                                        value={proj.srid.toString()}
                                        onSelect={() => {
                                            onChange(proj.srid);
                                            setOpen(false);
                                            setSearchQuery(""); // Reset search on select
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === proj.srid ? "opacity-100" : "opacity-0"
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
    );
}