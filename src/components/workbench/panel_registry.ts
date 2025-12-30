
import { WorkbenchPanelType } from '@/store/uiStore';

import { SimulationPanel } from '../simulation/SimulationPanel';

export const PANEL_REGISTRY: Partial<Record<WorkbenchPanelType, React.ComponentType<any>>> = {

  SIMULATION_SETUP: SimulationPanel,
};