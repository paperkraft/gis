"use client";

import React, { useState } from "react";
import {
  X,
  Maximize2,
  Minimize2,
  Upload,
  Box,
  Settings,
  Activity,
  Save,
  FileText,
  CheckCircle2,
  ArrowRightCircle,
  Database,
  Cylinder,
  Zap,
} from "lucide-react";
import { WorkbenchModalType } from "@/store/uiStore";
import { JunctionProperties } from "./panels/JunctionProperties";
import { ReservoirProperties } from "./panels/ReservoirProperties";
import { TankProperties } from "./panels/TankProperties";
import { PipeProperties } from "./panels/PipeProperties";
import { PumpProperties } from "./panels/PumpProperties";
import { ValveProperties } from "./panels/ValveProperties";

interface DraggableModalProps {
  type: WorkbenchModalType;
  onClose: () => void;
  sidebarWidth: number;
}

export function DraggableModal({
  type,
  onClose,
  sidebarWidth,
}: DraggableModalProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  // --- 1. DOCKED STYLING ---
  const modalStyle: React.CSSProperties = isMaximized
    ? {
        position: "absolute",
        top: 12,
        left: sidebarWidth + 24,
        right: 16,
        bottom: 16,
        width: "auto",
        height: "auto",
        zIndex: 50,
      }
    : {
        position: "absolute",
        top: 12,
        left: sidebarWidth + 24,
        width: "320px",
        maxHeight: "calc(100vh - 100px)",
        zIndex: 50,
      };

  // --- CONTENT SWITCHER ---
  const renderContent = () => {
    switch (type) {
      case "GEOMETRY_IMPORT":
        return <GeometryImportContent />;
      case "SIMULATION_CONFIG":
        return <SimulationConfigContent />;
      // Network Components
      case "JUNCTION_PROP":
        return <JunctionProperties />;
      case "RESERVOIR_PROP":
        return <ReservoirProperties />;
      case "TANK_PROP":
        return <TankProperties />;
      case "PIPE_PROP":
        return <PipeProperties />;
      case "PUMP_PROP":
        return <PumpProperties />;
      case "VALVE_PROP":
        return <ValveProperties />;
      default:
        return <div className="p-4 text-xs">Content not implemented.</div>;
    }
  };

  const getHeaderInfo = () => {
    switch (type) {
      case "GEOMETRY_IMPORT":
        return { title: "Import Network", icon: Upload };
      case "SIMULATION_CONFIG":
        return { title: "Simulation Options", icon: Activity };
      case "JUNCTION_PROP":
        return { title: "Junction Properties", icon: ArrowRightCircle };
      case "RESERVOIR_PROP":
        return { title: "Reservoir Properties", icon: Database };
      case "TANK_PROP":
        return { title: "Tank Properties", icon: Cylinder };
      case "PIPE_PROP":
        return { title: "Pipe Properties", icon: Activity };
      case "PUMP_PROP":
        return { title: "Pump Properties", icon: Zap };
      case "VALVE_PROP":
        return { title: "Valve Properties", icon: Box };
      default:
        return { title: "Properties", icon: Settings };
    }
  };

  const { title, icon: Icon } = getHeaderInfo();

  return (
    <div
      style={modalStyle}
      className="pointer-events-auto shadow-2xl rounded-lg animate-in fade-in slide-in-from-left-4 duration-300 flex flex-col transition-all ease-out"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-lg  overflow-hidden flex flex-col shadow-xl ring-1 ring-slate-900/5 h-full">
        {/* HEADER */}

        <div className="h-9 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-3 select-none shrink-0">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            <Icon size={14} className="text-blue-500" />
            {title}
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="hover:text-slate-700 transition-colors"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
            <button
              onClick={onClose}
              className="hover:text-red-500 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// OTHER MODALS (Import, Sim Config)
// =========================================================
function GeometryImportContent() {
  return (
    <div className="p-4 space-y-5 text-slate-700">
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-blue-50/50 transition-colors cursor-pointer">
        <Upload size={18} className="text-blue-500 mb-2" />
        <span className="text-xs font-semibold text-slate-600">
          Upload .INP / .JSON
        </span>
      </div>
      <FormGroup label="Settings">
        <FormSelect label="CRS" value="WGS84">
          <option>WGS 84 (EPSG:4326)</option>
        </FormSelect>
        <div className="grid grid-cols-2 gap-2">
          <FormInput label="Scale X" defaultValue="1.0" />
          <FormInput label="Scale Y" defaultValue="1.0" />
        </div>
      </FormGroup>
      <div className="flex gap-2">
        <button className="flex-1 bg-slate-100 py-2 rounded text-xs">
          Cancel
        </button>
        <button className="flex-1 bg-blue-600 text-white py-2 rounded text-xs">
          Import
        </button>
      </div>
    </div>
  );
}

function SimulationConfigContent() {
  return (
    <div className="p-4 space-y-4">
      <FormGroup label="Time">
        <div className="grid grid-cols-2 gap-2">
          <FormInput label="Duration" defaultValue="24:00" />
          <FormInput label="Hydraulic Step" defaultValue="01:00" />
        </div>
      </FormGroup>
      <FormGroup label="Convergence">
        <FormInput label="Max Trials" defaultValue="40" />
      </FormGroup>
      <SaveActions label="Run Simulation" icon={Activity} />
    </div>
  );
}

// =========================================================
// UI HELPERS (Style)
// =========================================================

const FormGroup = ({ label, children }: any) => (
  <div className="space-y-2">
    <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
      {label} <div className="h-px bg-slate-100 flex-1" />
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

const FormInput = ({ label, defaultValue, disabled, placeholder }: any) => (
  <div>
    <label className="block text-[10px] font-medium text-slate-500 mb-1">
      {label}
    </label>
    <input
      type="text"
      defaultValue={defaultValue}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full text-xs px-2.5 py-1.5 rounded border outline-none transition-all ${
        disabled
          ? "bg-slate-50 text-slate-400 border-slate-200"
          : "bg-white border-slate-300 text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      }`}
    />
  </div>
);

const FormSelect = ({ label, value, children }: any) => (
  <div>
    <label className="block text-[10px] font-medium text-slate-500 mb-1">
      {label}
    </label>
    <select
      defaultValue={value}
      className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    >
      {children}
    </select>
  </div>
);

const SaveActions = ({ label = "Save Changes", icon: Icon = Save }: any) => (
  <div className="pt-2">
    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded transition-colors shadow-sm flex items-center justify-center gap-2">
      <Icon size={14} /> {label}
    </button>
  </div>
);
