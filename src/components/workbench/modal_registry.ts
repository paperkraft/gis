import {
    BarChart3Icon, Circle, Cpu, Hexagon, LucideIcon, Minus, Palette, Pentagon, Settings, Square,
    Table2, Triangle,
} from 'lucide-react';

import { ControlManagerPanel } from '../panels/ControlManagerPanel';
import { DataManagerPanel } from '../panels/DataManagerPanel';
import { ProjectSettingsPanel } from '../panels/ProjectSettingsPanel';
import { StyleSettingsPanel } from '../panels/StyleSettingsPanel';
import { JunctionProperties } from '../properties/JunctionProperties';
import { PipeProperties } from '../properties/PipeProperties';
import { PumpProperties } from '../properties/PumpProperties';
import { ReservoirProperties } from '../properties/ReservoirProperties';
import { TankProperties } from '../properties/TankProperties';
import { ValveProperties } from '../properties/ValveProperties';
import { SimulationGraphs } from '../simulation/SimulationGraphs';

interface ModalConfig {
  title: string;
  icon: LucideIcon;
  component: React.ComponentType<any>;
  defaultMaximized?: boolean;
}

export type WorkbenchModalType =
    | "NONE"
    | "GEOMETRY_IMPORT"
    | "STYLE_SETTINGS"
    | "SIMULATION_GRAPHS"
    | "PROJECT_SETTINGS"
    | "DATA_MANAGER"
    | "CONTROLS"
    // Network
    | "JUNCTION_PROP"
    | "RESERVOIR_PROP"
    | "TANK_PROP"
    | "PIPE_PROP"
    | "PUMP_PROP"
    | "VALVE_PROP"
    
export const MODAL_REGISTRY: Partial<Record<WorkbenchModalType, ModalConfig>> = {
  // Network Properties
  JUNCTION_PROP:      { title: "Junction Properties",   icon: Circle,           component: JunctionProperties },
  RESERVOIR_PROP:     { title: "Reservoir Properties",  icon: Hexagon,          component: ReservoirProperties },
  TANK_PROP:          { title: "Tank Properties",       icon: Pentagon,         component: TankProperties },
  PIPE_PROP:          { title: "Pipe Properties",       icon: Minus,            component: PipeProperties },
  PUMP_PROP:          { title: "Pump Properties",       icon: Triangle,         component: PumpProperties },
  VALVE_PROP:         { title: "Valve Properties",      icon: Square,           component: ValveProperties },   
  //  
  PROJECT_SETTINGS:   { title: "Project Settings",      icon: Settings,         component: ProjectSettingsPanel },
  STYLE_SETTINGS:     { title: "Edit Symbology",        icon: Palette,          component: StyleSettingsPanel },
  CONTROLS:           { title: "Network Controls",      icon: Cpu,              component: ControlManagerPanel },
  SIMULATION_GRAPHS:  { title: "Simulation Results",    icon: BarChart3Icon,    component: SimulationGraphs,    defaultMaximized: true },
  DATA_MANAGER:       { title: "Data Browser",          icon: Table2,           component: DataManagerPanel,    defaultMaximized: true },
};