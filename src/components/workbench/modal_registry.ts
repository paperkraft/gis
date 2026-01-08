import {
    BarChart3Icon, CheckCircle2, Circle, Cpu, Filter, Hexagon, LucideIcon, Minus, Mountain, Palette,
    Pentagon, Settings, Square, Table2, Triangle, UploadIcon
} from 'lucide-react';

import { AutoElevationPanel } from '../panels/AutoElevationPanel';
import { ControlManagerPanel } from '../panels/ControlManagerPanel';
import { DataManagerPanel } from '../panels/DataManagerPanel';
import { NetworkValidationPanel } from '../panels/NetworkValidationPanel';
import { ProjectSettingsPanel } from '../panels/ProjectSettingsPanel';
import { StyleSettingsPanel } from '../panels/StyleSettingsPanel';
import { JunctionProperties } from '../properties/JunctionProperties';
import { PipeProperties } from '../properties/PipeProperties';
import { PumpProperties } from '../properties/PumpProperties';
import { ReservoirProperties } from '../properties/ReservoirProperties';
import { TankProperties } from '../properties/TankProperties';
import { ValveProperties } from '../properties/ValveProperties';
import { SimulationGraphs } from '../simulation/graphs/SimulationGraphs';
import { ScenarioManagerPanel } from '../simulation/ScenarioManagerPanel';
import { QueryBuilderPanel } from '../panels/QueryBuilderPanel';

interface ModalConfig {
  title: string;
  icon: LucideIcon;
  component: React.ComponentType<any>;
  defaultMaximized?: boolean;
}

export type WorkbenchModalType =
  | "NONE"
  | "NEW_PROJECT"
  | "DELETE_PROJECT"
  | "EXPORT_PROJECT"
    // Network
  | "JUNCTION_PROP"
  | "RESERVOIR_PROP"
  | "TANK_PROP"
  | "PIPE_PROP"
  | "PUMP_PROP"
  | "VALVE_PROP"
  // Rest
  | "PROJECT_SETTINGS"
  | "STYLE_SETTINGS"
  | "SIMULATION_GRAPHS"
  | "SCENARIO_MANAGER"
  | "CURVES_PATTERNS"
  | "AUTO_ELEVATION"
  | "CONTROLS"
  | "VALIDATION"
  | "BOOKMARK"
  | "QUERY_BUILDER"
   
    
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
  SIMULATION_GRAPHS:  { title: "Simulation Results",    icon: BarChart3Icon,    component: SimulationGraphs,    defaultMaximized: true },
  SCENARIO_MANAGER:   { title: "Simulation Scenario",   icon: BarChart3Icon,    component: ScenarioManagerPanel },
  CURVES_PATTERNS:    { title: "Pattern Curves",        icon: Table2,           component: DataManagerPanel,    defaultMaximized: true },
  AUTO_ELEVATION:     { title: "Auto Elevation",        icon: Mountain,         component: AutoElevationPanel },
  CONTROLS:           { title: "Network Controls",      icon: Cpu,              component: ControlManagerPanel },
  VALIDATION:         { title: "Network Validation",    icon: CheckCircle2,     component: NetworkValidationPanel },
  QUERY_BUILDER:      { title: "Query Builder",         icon: Filter,           component: QueryBuilderPanel },
};