"use client";

import {
  Activity,
  ArrowRightCircle,
  BarChart3Icon,
  Box,
  Cylinder,
  Database,
  Maximize2,
  Minimize2,
  Palette,
  Settings,
  Upload,
  X,
  Zap,
} from "lucide-react";
import React, { useState } from "react";

import { WorkbenchModalType } from "@/store/uiStore";

import GeometryImportPanel from "../panels/GeometryImportPanel";
import SimulationConfig from "../panels/SimulationConfig";
import { StyleSettingsPanel } from "../panels/StyleSettingsPanel";
import { JunctionProperties } from "../properties/JunctionProperties";
import { PipeProperties } from "../properties/PipeProperties";
import { PumpProperties } from "../properties/PumpProperties";
import { ReservoirProperties } from "../properties/ReservoirProperties";
import { TankProperties } from "../properties/TankProperties";
import { ValveProperties } from "../properties/ValveProperties";
import { SimulationGraphs } from "../simulation/SimulationGraphs";

interface DraggableModalProps {
  type: WorkbenchModalType;
  onClose: () => void;
  sidebarWidth: number;
  initialWidth?: number;
  initialHeight?: number;
  maximized?: boolean;
}

export function WorkbenchModal({
  type,
  onClose,
  sidebarWidth,
  initialWidth,
  initialHeight,
  maximized= false
}: DraggableModalProps) {
  const [isMaximized, setIsMaximized] = useState(maximized);

  // --- 1. DOCKED STYLING ---
  const modalStyle: React.CSSProperties = isMaximized
    ? {
        position: "absolute",
        top: 12,
        left: sidebarWidth + 24,
        right: 16,
        bottom: 40,
        width: "auto",
        height: "auto",
        zIndex: 50,
      }
    : {
        position: "absolute",
        top: 12,
        left: sidebarWidth + 24,
        width: initialWidth || "320px",
        maxHeight: initialHeight || "calc(100vh - 100px)",
        zIndex: 50,
      };

  // --- CONTENT SWITCHER ---
  const renderContent = () => {
    switch (type) {
      case "STYLE_SETTINGS":
        return <StyleSettingsPanel />;
      case "GEOMETRY_IMPORT":
        return <GeometryImportPanel />;
      case "SIMULATION_CONFIG":
        return <SimulationConfig />;
      case "SIMULATION_GRAPHS":
        return <SimulationGraphs />;
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
      case "STYLE_SETTINGS":
        return { title: "Edit Symbology", icon: Palette };
      case "GEOMETRY_IMPORT":
        return { title: "Import Network", icon: Upload };
      case "SIMULATION_CONFIG":
        return { title: "Simulation Options", icon: Activity };
      case "SIMULATION_GRAPHS":
        return { title: "Simulation Results", icon: BarChart3Icon };
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
