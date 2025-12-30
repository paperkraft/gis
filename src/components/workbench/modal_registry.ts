import {
    BarChart3Icon, Circle, Cpu, Hexagon, LucideIcon, Minus, Palette, Pentagon, Square, Triangle, Upload
} from 'lucide-react';

import { WorkbenchModalType } from '@/store/uiStore';

import GeometryImportPanel from '../panels/GeometryImportPanel';
import { StyleSettingsPanel } from '../panels/StyleSettingsPanel';
import { JunctionProperties } from '../properties/JunctionProperties';
import { PipeProperties } from '../properties/PipeProperties';
import { PumpProperties } from '../properties/PumpProperties';
import { ReservoirProperties } from '../properties/ReservoirProperties';
import { TankProperties } from '../properties/TankProperties';
import { ValveProperties } from '../properties/ValveProperties';
import { SimulationGraphs } from '../simulation/SimulationGraphs';
import { ControlManagerPanel } from '../panels/ControlManagerPanel';

// This makes the modal generic. Add new tools here.
interface ModalConfig {
  title: string;
  icon: LucideIcon;
  component: React.ComponentType<any>;
}

export const MODAL_REGISTRY: Partial<Record<WorkbenchModalType, ModalConfig>> = {
  // Tools
  STYLE_SETTINGS:     { title: "Edit Symbology",          icon: Palette,          component: StyleSettingsPanel },
  GEOMETRY_IMPORT:    { title: "Import Network",          icon: Upload,           component: GeometryImportPanel },
  CONTROLS:           { title: "Network Controls",        icon: Cpu,              component: ControlManagerPanel },
  SIMULATION_GRAPHS:  { title: "Simulation Results",      icon: BarChart3Icon,    component: SimulationGraphs },
    
  // Network Properties
  JUNCTION_PROP:      { title: "Junction Properties",     icon: Circle,           component: JunctionProperties },
  RESERVOIR_PROP:     { title: "Reservoir Properties",    icon: Hexagon,          component: ReservoirProperties },
  TANK_PROP:          { title: "Tank Properties",         icon: Pentagon,         component: TankProperties },
  PIPE_PROP:          { title: "Pipe Properties",         icon: Minus,            component: PipeProperties },
  PUMP_PROP:          { title: "Pump Properties",         icon: Triangle,         component: PumpProperties },
  VALVE_PROP:         { title: "Valve Properties",        icon: Square,           component: ValveProperties },
};