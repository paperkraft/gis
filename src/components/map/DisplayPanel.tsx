"use client";

import {
  Type,
  ArrowRight,
  Dot,
  Monitor,
  Activity,
  Hash,
  Mountain,
  Check
} from "lucide-react";
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
  } = useUIStore();

  const {
    nodeColorMode,
    setNodeColorMode,
    nodeGradient,
    linkColorMode,
    setLinkColorMode,
    linkGradient,
    labelSettings,
    setLabelSetting,
    selectedProps,
    togglePropSelection,
    setGradientPreset
  } = useStyleStore();


  return (
    <FloatingPanel
      title="Display Settings"
      icon={Monitor}
      isOpen={activeRightPanel === 'DISPLAY'}
      onClose={() => setActiveRightPanel('NONE')}
      className="w-72"
    >
      <div className="space-y-6 py-2">
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

            {labelSettings.showProp && (
              <Section title="Property Selection">
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {Object.entries(COMPONENT_TYPES).map(([type, config]) => (
                    <div key={type} className="space-y-1.5">
                      <div className="flex items-center gap-1.5 px-1">
                        <config.icon size={10} className="text-slate-400" />
                        <span className="text-[9px] font-bold uppercase text-slate-500">{config.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['label', ...Object.keys(config.defaultProperties)].map(prop => (
                          <PropertyBadge
                            key={prop}
                            label={prop}
                            active={selectedProps[type]?.includes(prop)}
                            onClick={() => togglePropSelection(type, prop)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}


        {/* 3. Node Symbology */}
        <Section title="Node Symbology (Colors)">
          <div className="flex flex-wrap gap-2">
            <SymbologyBadge
              label="Default"
              active={nodeColorMode === "none"}
              onClick={() => setNodeColorMode("none")}
            />
            <SymbologyBadge
              label="Pressure"
              active={nodeColorMode === "pressure"}
              onClick={() => setNodeColorMode("pressure")}
            />
            <SymbologyBadge
              label="Head"
              active={nodeColorMode === "head"}
              onClick={() => setNodeColorMode("head")}
            />
            <SymbologyBadge
              label="Demand"
              active={nodeColorMode === "demand"}
              onClick={() => setNodeColorMode("demand")}
            />
            <SymbologyBadge
              label="Elevation"
              active={nodeColorMode === "elevation"}
              onClick={() => setNodeColorMode("elevation")}
            />
          </div>
          
          {nodeColorMode !== 'none' && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
               <PaletteSelector 
                currentGradient={nodeGradient} 
                onSelect={(preset) => setGradientPreset('node', preset)} 
              />
            </div>
          )}
        </Section>

        {/* 4. Link Symbology */}
        <Section title="Link Symbology (Colors)">
          <div className="flex flex-wrap gap-2">
            <SymbologyBadge
              label="Default"
              active={linkColorMode === "none"}
              onClick={() => setLinkColorMode("none")}
            />
            <SymbologyBadge
              label="Velocity"
              active={linkColorMode === "velocity"}
              onClick={() => setLinkColorMode("velocity")}
            />
            <SymbologyBadge
              label="Flow"
              active={linkColorMode === "flow"}
              onClick={() => setLinkColorMode("flow")}
            />
            <SymbologyBadge
              label="Headloss"
              active={linkColorMode === "headloss"}
              onClick={() => setLinkColorMode("headloss")}
            />
            <SymbologyBadge
              label="Diameter"
              active={linkColorMode === "diameter"}
              onClick={() => setLinkColorMode("diameter")}
            />
            <SymbologyBadge
              label="Roughness"
              active={linkColorMode === "roughness"}
              onClick={() => setLinkColorMode("roughness")}
            />
          </div>

          {linkColorMode !== 'none' && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <PaletteSelector 
                currentGradient={linkGradient} 
                onSelect={(preset) => setGradientPreset('link', preset)} 
              />
            </div>
          )}
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

function PropertyBadge({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-1.5 py-0.5 text-[8px] font-medium rounded transition-all border",
        active
          ? "bg-primary/10 border-primary/30 text-primary"
          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
      )}
    >
      {label}
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

function SymbologyBadge({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 text-[10px] font-medium rounded-full border transition-all flex items-center gap-1.5",
        active
          ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
          : "bg-white border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary"
      )}
    >
      {active && <Check size={10} strokeWidth={3} />}
      {label}
    </button>
  );
}

function PaletteSelector({ currentGradient, onSelect }: { currentGradient: any[], onSelect: (preset: keyof typeof PRESETS) => void }) {
    return (
        <div className="space-y-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Color Palette</span>
            <div className="flex flex-wrap gap-1.5">
                {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => {
                    const preset = PRESETS[key];
                    const isActive = JSON.stringify(currentGradient) === JSON.stringify(preset);
                    
                    return (
                        <button
                            key={key}
                            onClick={() => onSelect(key)}
                            className={cn(
                                "flex-1 min-w-[50px] h-5 rounded-sm border p-0.5 transition-all overflow-hidden relative group",
                                isActive ? "border-primary ring-1 ring-primary/30" : "border-slate-200 hover:border-slate-300"
                            )}
                            title={key}
                        >
                            <div className="w-full h-full rounded-[1px] flex">
                                {preset.map((stop, i) => (
                                    <div 
                                        key={i} 
                                        className="flex-1 h-full" 
                                        style={{ backgroundColor: stop.color }} 
                                    />
                                ))}
                            </div>
                            {isActive && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                    <Check size={10} className="text-white drop-shadow-md" strokeWidth={3} />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
