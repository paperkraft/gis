"use client";

import {
  Type,
  ArrowRight,
  Dot,
  Monitor,
  Activity,
  Hash,
  Mountain,
  Check,
  Plus,
  Minus,
  ChevronDown,
  Maximize2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import { useStyleStore, PRESETS, LabelSettings } from "@/store/styleStore";
import { COMPONENT_TYPES } from "@/constants/networkComponents";

import { FloatingPanel } from "./FloatingPanel";
import { cn } from "@/lib/utils";

export function DisplayPanel() {
  const {
    activeRightPanel,
    setActiveRightPanel,
    showLabels,
    setShowLabels,
    showPipeArrows,
    setShowPipeArrows,
    showVertices,
    setShowVertices,
    isProjectInitialized
  } = useUIStore();

  const isLocked = !isProjectInitialized();

  const {
    nodeColorMode,
    setNodeColorMode,
    linkColorMode,
    setLinkColorMode,
    labelSettings,
    setLabelSetting,
    selectedProps,
    togglePropSelection,
    layerStyles,
    updateStyle
  } = useStyleStore();


  return (
    <FloatingPanel
      title="Display Settings"
      icon={Monitor}
      isOpen={activeRightPanel === 'DISPLAY'}
      onClose={() => setActiveRightPanel('NONE')}
      className="w-72"
    >
      <div className={cn("space-y-6 py-2 transition-all duration-300", isLocked && "opacity-60 pointer-events-none grayscale-[0.5]")}>
        {isLocked && (
          <div className="bg-amber-50 border border-amber-200 rounded p-2 text-[11px] text-amber-700 leading-tight mb-2">
            <strong>Setup Required:</strong> Complete mandatory project configuration to enable display settings.
          </div>
        )}
        {/* 1. Global Visibility */}
        <Section title="Visibility & Details">
          <div className="grid grid-cols-1 gap-2">
            <ToggleItem
              label="Show Labels"
              description="Global ID/Result labels"
              isActive={showLabels}
              onToggle={() => setShowLabels(!showLabels)}
              icon={Type}
            />
            <ToggleItem
              label="Pipe Arrows"
              description="Show flow direction"
              isActive={showPipeArrows}
              onToggle={() => setShowPipeArrows(!showPipeArrows)}
              icon={ArrowRight}
            />
            <ToggleItem
              label="Base Vertices"
              description="Show pipe bend points"
              isActive={showVertices}
              onToggle={() => setShowVertices(!showVertices)}
              icon={Dot}
            />
          </div>
        </Section>

        {/* 2. Label Modes (Only show if labels are ON) */}
        {showLabels && (
          <div className="space-y-4">
            <Section title="Label Content">
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-md">
                <ModeBtn
                  active={labelSettings.showId}
                  onClick={() => setLabelSetting('showId', !labelSettings.showId)}
                  icon={Hash}
                  label="ID"
                />
                <ModeBtn
                  active={labelSettings.showProp}
                  onClick={() => setLabelSetting('showProp', !labelSettings.showProp)}
                  icon={Mountain}
                  label="Prop"
                />
                <ModeBtn
                  active={labelSettings.showSim}
                  onClick={() => setLabelSetting('showSim', !labelSettings.showSim)}
                  icon={Activity}
                  label="Sim"
                />
              </div>
            </Section>

            <Section title="Label Size">
              <div className="flex items-center justify-between gap-4 px-1">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-medium">Font Size</span>
                  <span className="text-xs font-bold text-primary">{labelSettings.fontSize || 10}px</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
                  <button 
                    onClick={() => setLabelSetting('fontSize', Math.max(6, (labelSettings.fontSize || 10) - 1))}
                    className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <button 
                    onClick={() => setLabelSetting('fontSize', Math.min(24, (labelSettings.fontSize || 10) + 1))}
                    className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </Section>

            {labelSettings.showProp && (
              <Section title="Property Selection">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(COMPONENT_TYPES).map(([type, config]) => {
                    const activeProps = selectedProps[type] || [];
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex items-center gap-1 px-1 opacity-70">
                          <config.icon size={8} />
                          <span className="text-[8px] font-bold uppercase">{config.name}</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full h-7 px-2 text-[10px] justify-between font-normal border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                            >
                              <span className="truncate">
                                {activeProps.length === 0 ? "Select..." : activeProps.join(", ")}
                              </span>
                              <ChevronDown size={10} className="opacity-50 shrink-0" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48 overflow-y-auto max-h-64 custom-scrollbar">
                            <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400">Properties ({config.name})</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {['label', ...Object.keys(config.defaultProperties)].map(prop => (
                              <DropdownMenuCheckboxItem
                                key={prop}
                                checked={activeProps.includes(prop)}
                                onCheckedChange={() => togglePropSelection(type, prop)}
                                className="text-xs"
                                disabled={!activeProps.includes(prop) && activeProps.length >= 2}
                              >
                                {prop}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}
          </div>
        )}

        <Section title="Sizing & Scale">
           <div className="space-y-3">
            {/* Pipe Scaling */}
            <div className="space-y-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Maximize2 size={12} className="text-slate-400" />
                   <span className="text-[10px] font-bold uppercase text-slate-500">Pipe Scaling</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-medium text-slate-400">Auto</span>
                  <Switch 
                    checked={layerStyles.pipe?.autoScale ?? true}
                    onCheckedChange={(val) => updateStyle('pipe', { autoScale: val })}
                  />
                </div>
              </div>
              
              {!(layerStyles.pipe?.autoScale ?? true) && (
                <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>Custom Width</span>
                    <span className="font-bold text-primary">{layerStyles.pipe?.width || 2}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="20" 
                    step="0.5"
                    value={layerStyles.pipe?.width || 2}
                    onChange={(e) => updateStyle('pipe', { width: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              )}
            </div>

            {/* Junction Scaling */}
            <div className="space-y-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Maximize2 size={12} className="text-slate-400" />
                   <span className="text-[10px] font-bold uppercase text-slate-500">Junction Scaling</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-medium text-slate-400">Auto</span>
                  <Switch 
                    checked={layerStyles.junction?.autoScale ?? true}
                    onCheckedChange={(val) => updateStyle('junction', { autoScale: val })}
                  />
                </div>
              </div>
              
              {!(layerStyles.junction?.autoScale ?? true) && (
                <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>Custom Size</span>
                    <span className="font-bold text-primary">{layerStyles.junction?.radius || 5}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="24" 
                    step="1"
                    value={layerStyles.junction?.radius || 5}
                    onChange={(e) => updateStyle('junction', { radius: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* 3. Node Symbology */}
        <Section title="Node Symbology (Colors)">
          <Select value={nodeColorMode} onValueChange={(val: any) => setNodeColorMode(val)}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Default</SelectItem>
              <SelectItem value="pressure">Pressure</SelectItem>
              <SelectItem value="head">Head</SelectItem>
              <SelectItem value="demand">Demand</SelectItem>
              <SelectItem value="elevation">Elevation</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="mt-1 flex items-center gap-1.5 px-0.5">
            <Activity size={10} className="text-slate-400" />
            <span className="text-[9px] text-slate-400 italic">Right-click on map legend to edit symbology</span>
          </div>
        </Section>

        {/* 4. Link Symbology */}
        <Section title="Link Symbology (Colors)">
          <Select value={linkColorMode} onValueChange={(val: any) => setLinkColorMode(val)}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Default</SelectItem>
              <SelectItem value="velocity">Velocity</SelectItem>
              <SelectItem value="flow">Flow</SelectItem>
              <SelectItem value="headloss">Headloss</SelectItem>
              <SelectItem value="diameter">Diameter</SelectItem>
              <SelectItem value="roughness">Roughness</SelectItem>
            </SelectContent>
          </Select>

          <div className="mt-1 flex items-center gap-1.5 px-0.5">
            <Activity size={10} className="text-slate-400" />
            <span className="text-[9px] text-slate-400 italic">Right-click on map legend to edit symbology</span>
          </div>
        </Section>
      </div>
    </FloatingPanel>
  );
}

// --- SUB-COMPONENTS ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ToggleItem({ label, description, isActive, onToggle, icon: Icon }: any) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-3 p-2 rounded-md transition-all text-left group",
        isActive
          ? "bg-primary/5 border border-primary/20"
          : "hover:bg-slate-50 border border-transparent"
      )}
    >
      <div className={cn(
        "p-1.5 rounded-md",
        isActive ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-slate-100 text-slate-400 group-hover:text-slate-600"
      )}>
        <Icon size={14} />
      </div>
      <div className="flex-1">
        <div className={cn("text-xs font-semibold", isActive ? "text-primary" : "text-slate-700")}>
          {label}
        </div>
        <div className="text-[10px] text-slate-400">{description}</div>
      </div>
      <div className={cn(
        "w-8 h-4 rounded-full relative transition-colors duration-200",
        isActive ? "bg-primary" : "bg-slate-200"
      )}>
        <div className={cn(
          "absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200",
          isActive ? "translate-x-4" : "translate-x-0"
        )} />
      </div>
    </button>
  );
}


function ModeBtn({ active, onClick, icon: Icon, label }: any) {

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center justify-center py-2 gap-1 rounded transition-all",
        active
          ? "bg-white text-primary shadow-sm"
          : "text-slate-500 hover:text-slate-800"
      )}
    >
      <Icon size={14} />
      <span className="text-[9px] font-bold uppercase">{label}</span>
    </button>
  );
}



