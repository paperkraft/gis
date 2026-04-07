import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown, Activity, GitCommit, GripVertical } from 'lucide-react';
import { useStyleStore, GradientStop, NodeColorMode, LinkColorMode } from '@/store/styleStore';
import { getColor, calculateLegendBins, getUnit } from '@/lib/styles/helper';
import { LegendEditor } from './LegendEditor';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const NODE_OPTIONS: { value: NodeColorMode; label: string }[] = [
    { value: 'pressure', label: 'Pressure' },
    { value: 'elevation', label: 'Elevation' },
    { value: 'head', label: 'Head' },
    { value: 'demand', label: 'Demand' },
    { value: 'none', label: 'Close' },
];

const LINK_OPTIONS: { value: LinkColorMode; label: string }[] = [
    { value: 'velocity', label: 'Velocity' },
    { value: 'flow', label: 'Flow' },
    { value: 'diameter', label: 'Diameter' },
    { value: 'roughness', label: 'Roughness' },
    { value: 'headloss', label: 'Headloss' },
    { value: 'none', label: 'Close' },
];

export function Legend() {
    const {
        nodeColorMode, linkColorMode, minMax,
        nodeGradient, linkGradient,
        classCount, setNodeColorMode, setLinkColorMode,
        nodeClassification, linkClassification,
        nodeCustomBreaks, linkCustomBreaks,
        nodeReverse, linkReverse,
        nodeLegendFramed, linkLegendFramed
    } = useStyleStore();

    const [activeEditor, setActiveEditor] = useState<'node' | 'link' | null>(null);
    const [editorPos, setEditorPos] = useState({ x: 100, y: 100 });

    const handleEdit = (type: 'node' | 'link', e: React.MouseEvent) => {
        setEditorPos({ x: e.clientX, y: e.clientY });
        setActiveEditor(type);
    };

    return (
        <div className="fixed inset-0 pointer-events-none z-20 font-sans">
            {/* Link Legend */}
            {linkColorMode !== 'none' && minMax[linkColorMode] && (
                <EPANETLegendItem
                    type="link"
                    title={linkColorMode}
                    icon={<Activity size={13} />}
                    range={minMax[linkColorMode]}
                    stops={linkGradient}
                    classCount={classCount}
                    defaultPosition={{ bottom: 40, right: 64 }}
                    options={LINK_OPTIONS}
                    onOptionSelect={setLinkColorMode}
                    onEdit={(e) => handleEdit('link', e)}
                    classification={linkClassification}
                    customBreaks={linkCustomBreaks}
                    reverse={linkReverse}
                    framed={linkLegendFramed}
                />
            )}

            {/* Node Legend */}
            {nodeColorMode !== 'none' && minMax[nodeColorMode] && (
                <EPANETLegendItem
                    type="node"
                    title={nodeColorMode}
                    icon={<GitCommit size={13} />}
                    range={minMax[nodeColorMode]}
                    stops={nodeGradient}
                    classCount={classCount}
                    defaultPosition={{ bottom: 40, right: 240 }}
                    options={NODE_OPTIONS}
                    onOptionSelect={setNodeColorMode}
                    onEdit={(e) => handleEdit('node', e)}
                    classification={nodeClassification}
                    customBreaks={nodeCustomBreaks}
                    reverse={nodeReverse}
                    framed={nodeLegendFramed}
                />
            )}

            <LegendEditor
                isOpen={activeEditor !== null}
                onClose={() => setActiveEditor(null)}
                type={activeEditor || 'node'}
                initialX={editorPos.x}
                initialY={editorPos.y}
            />
        </div>
    );
}

// --- SUB-COMPONENT ---

interface LegendItemProps {
    type: 'node' | 'link';
    title: string;
    icon: React.ReactNode;
    range: { min: number; max: number };
    stops: GradientStop[];
    classCount: number;
    defaultPosition: { top?: number; left?: number; bottom?: number; right?: number };
    options: { value: string; label: string }[];
    onOptionSelect: (value: any) => void;
    onEdit: (e: React.MouseEvent) => void;
    classification: 'equal_interval' | 'quantile' | 'manual';
    customBreaks: number[];
    reverse: boolean;
    framed: boolean;
}

function EPANETLegendItem({
    type, title, icon, range, stops, classCount, defaultPosition, options,
    onOptionSelect, onEdit, classification, customBreaks, reverse, framed
}: LegendItemProps) {
    // Position state
    const [position, setPosition] = useState<{ x: number | null, y: number | null }>({ x: null, y: null });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const itemRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!itemRef.current) return;

        setIsDragging(true);
        const rect = itemRef.current.getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    useEffect(() => {
        if (!isDragging) return;

        // Disable text selection during drag
        document.body.style.userSelect = 'none';

        const handleMouseMove = (e: MouseEvent) => {
            const x = e.clientX - dragOffset.current.x;
            const y = e.clientY - dragOffset.current.y;
            setPosition({ x, y });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.userSelect = '';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
        };
    }, [isDragging]);

    const style: React.CSSProperties = position.x !== null
        ? { position: 'fixed', left: position.x, top: position.y ?? undefined }
        : {
            position: 'absolute',
            top: defaultPosition.top,
            left: defaultPosition.left,
            bottom: defaultPosition.bottom,
            right: defaultPosition.right
        };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        onEdit(e);
    };

    // Calculate Bins using Shared Helper
    const bins = calculateLegendBins(range, stops, classCount, classification, customBreaks, reverse);

    return (
        <div
            ref={itemRef}
            id={`legend-${type}`}
            style={style}
            onContextMenu={handleContextMenu}
            className={cn(
                "pointer-events-auto rounded-sm",
                framed
                    ? "bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-300 dark:border-gray-700 shadow-xl overflow-hidden"
                    : "bg-transparent border-transparent shadow-none",
                isDragging && "shadow-2xl opacity-90 cursor-grabbing z-50",
                !framed && "hover:bg-white/5" // Subtle hint when hovering frameless
            )}
        >
            {/* Header */}
            <div
                onMouseDown={handleMouseDown}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 transition-colors cursor-grab active:cursor-grabbing group/header"
                title="Right-click to edit symbology"
            >
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-200 capitalize">
                    <GripVertical size={12} className="text-gray-300 group-hover/header:text-gray-400 -ml-1 transition-colors" />
                    {icon}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                onMouseDown={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            >
                                <span>{title}</span>
                                <ChevronDown size={12} className="text-gray-400" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {options.map((option) => (
                                <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => onOptionSelect(option.value)}
                                    className={cn(
                                        "text-xs capitalize",
                                        title === option.value && "bg-accent font-bold"
                                    )}
                                >
                                    {option.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Content (List of Values) */}
            <div className="p-2 space-y-0.5">
                {bins.map((bin, i) => (
                    <div key={i} className="flex items-center gap-2 px-1 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition-colors cursor-default group">
                        {/* Color Box */}
                        <div
                            className="w-4 h-4 rounded-[2px] border border-black/10 dark:border-white/10 shadow-sm shrink-0"
                            style={{ backgroundColor: bin.color }}
                        />

                        {/* Range Text */}
                        <span className="text-[10px] font-mono font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap group-hover:text-gray-900 dark:group-hover:text-white">
                            {bin.label}
                        </span>
                    </div>
                ))}

                {/* Unit Label (Optional Footer) */}
                <div className="pt-1 mt-1 border-t border-gray-100 dark:border-gray-700 text-[9px] text-gray-400 text-center font-medium uppercase tracking-wider">
                    Values in {getUnit(title)}
                </div>
            </div>
        </div>
    );
}


