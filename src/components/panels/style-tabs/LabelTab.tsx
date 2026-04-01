"use client";

import { Activity, Check, Cylinder, Eye, EyeOff, Mountain, Tag } from 'lucide-react';
import React from 'react';
import { COMPONENT_TYPES } from '@/constants/networkComponents';


import { FormGroup } from '@/components/form-controls/FormGroup';
import { cn } from '@/lib/utils';
import { useStyleStore } from '@/store/styleStore';
import { useUIStore } from '@/store/uiStore';

export function LabelTab({ layerId }: { layerId: string }) {
  const { showLabels, setShowLabels } = useUIStore();
  const { labelSettings, setLabelSetting, selectedProps, togglePropSelection } = useStyleStore();

  const isLine = ["pipe", "pump", "valve"].includes(layerId);

  return (
    <div className="p-4 space-y-5">
      {/* Master Toggle */}
      <div className="flex items-center justify-between bg-primary-foreground p-3 rounded border border-primary/10">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded bg-muted-foreground/10 text-muted-foreground",
              showLabels && "bg-primary/10 text-primary"
            )}
          >
            {showLabels ? <Eye size={16} /> : <EyeOff size={16} />}
          </div>
          <div className="flex flex-col">
            <span className={cn("text-xs font-bold text-muted-foreground")}>
              Show Labels
            </span>
            <span className="text-[10px] text-muted-foreground">
              Global visibility
            </span>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
        </label>
      </div>

      <FormGroup label="Label Content">
        <div className="space-y-2">
          <Option
            active={labelSettings.showId}
            onClick={() => setLabelSetting('showId', !labelSettings.showId)}
            label="Component ID"
            desc="e.g. P-101"
            icon={Tag}
          />

          <Option
            active={labelSettings.showProp}
            onClick={() => setLabelSetting('showProp', !labelSettings.showProp)}
            label="Properties"
            desc="Select attributes"
            icon={isLine ? Cylinder : Mountain}
          />

          {labelSettings.showProp && (
            <div className="ml-11 flex flex-wrap gap-1.5 pb-2">
              {['label', ...Object.keys(COMPONENT_TYPES[layerId]?.defaultProperties || {})].map(prop => (
                <button
                  key={prop}
                  onClick={() => togglePropSelection(layerId, prop)}
                  className={cn(
                    "px-2 py-1 text-[10px] font-medium rounded border transition-all",
                    selectedProps[layerId]?.includes(prop)
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {prop}
                </button>
              ))}
            </div>
          )}

          <Option
            active={labelSettings.showSim}
            onClick={() => setLabelSetting('showSim', !labelSettings.showSim)}
            label="Sim Result"
            desc="Active Variable"
            icon={Activity}
          />

        </div>
      </FormGroup>
    </div>
  );
}

function Option({ active, onClick, label, desc, icon: Icon }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-2.5 rounded border",
        "transition-all text-left border-muted-foreground/20",
        "hover:border-primary/50 hover:bg-primary-foreground",
        active && "bg-primary-foreground border-primary/50"
      )}
    >
      <div
        className={cn(
          "p-1.5 rounded bg-muted-foreground/10 text-muted-foreground",
          active && "bg-primary/10 text-primary"
        )}
      >
        <Icon size={14} />
      </div>
      <div>
        <div
          className={cn(
            "text-[11px] font-bold text-muted-foreground",
            active && "text-primary"
          )}
        >
          {label}
        </div>
        <div className="text-[10px] text-muted-foreground">{desc}</div>
      </div>
      {active && <Check size={14} className="ml-auto text-primary" />}
    </button>
  );
}
