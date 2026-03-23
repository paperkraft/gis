export type ColumnDef = {
  key: string;
  label: string;
  width?: string;
  type: 'text' | 'number' | 'select' | 'readonly';
  options?: string[];
  isResult?: boolean;
};

export const TABLE_CONFIG: Record<string, ColumnDef[]> = {
  junction: [
    { key: 'id', label: 'ID', width: 'w-24', type: 'readonly' },
    { key: 'elevation', label: 'Elevation', width: 'w-24', type: 'number' },
    { key: 'demand', label: 'Base Demand', width: 'w-28', type: 'number' },
    { key: 'pattern', label: 'Pattern', width: 'w-24', type: 'text' },
    // Results
    { key: 'sim_head', label: 'Head (m)', width: 'w-24', type: 'readonly', isResult: true },
    { key: 'sim_pressure', label: 'Pressure', width: 'w-24', type: 'readonly', isResult: true },
  ],
  pipe: [
    { key: 'id', label: 'ID', width: 'w-24', type: 'readonly' },
    { key: 'length', label: 'Length', width: 'w-24', type: 'number' },
    { key: 'diameter', label: 'Diam (mm)', width: 'w-24', type: 'number' },
    { key: 'roughness', label: 'Roughness', width: 'w-24', type: 'number' },
    { key: 'status', label: 'Status', width: 'w-24', type: 'select', options: ['OPEN', 'CLOSED', 'CV'] },
    // Results
    { key: 'sim_flow', label: 'Flow', width: 'w-24', type: 'readonly', isResult: true },
    { key: 'sim_velocity', label: 'Velocity', width: 'w-24', type: 'readonly', isResult: true },
    { key: 'sim_headloss', label: 'Loss', width: 'w-24', type: 'readonly', isResult: true },
  ],
  tank: [
    { key: 'id', label: 'ID', width: 'w-24', type: 'readonly' },
    { key: 'elevation', label: 'Elevation', width: 'w-24', type: 'number' },
    { key: 'level', label: 'Init Lvl', width: 'w-24', type: 'number' },
    { key: 'minLevel', label: 'Min Lvl', width: 'w-24', type: 'number' },
    { key: 'maxLevel', label: 'Max Lvl', width: 'w-24', type: 'number' },
    { key: 'diameter', label: 'Diam', width: 'w-24', type: 'number' },
    // Results
    { key: 'sim_head', label: 'Head', width: 'w-24', type: 'readonly', isResult: true },
    { key: 'sim_pressure', label: 'Pressure', width: 'w-24', type: 'readonly', isResult: true },
  ],
  reservoir: [
    { key: 'id', label: 'ID', width: 'w-24', type: 'readonly' },
    { key: 'head', label: 'Total Head', width: 'w-24', type: 'number' },
    { key: 'pattern', label: 'Pattern', width: 'w-24', type: 'text' },
    // Results
    { key: 'sim_pressure', label: 'Pressure', width: 'w-24', type: 'readonly', isResult: true },
  ],
  pump: [
    { key: 'id', label: 'ID', width: 'w-24', type: 'readonly' },
    { key: 'source', label: 'Inlet', width: 'w-24', type: 'readonly' },
    { key: 'target', label: 'Outlet', width: 'w-24', type: 'readonly' },
    { key: 'keyword', label: 'Type', width: 'w-24', type: 'select', options: ['HEAD', 'POWER'] },
    { key: 'value', label: 'Value/ID', width: 'w-24', type: 'text' },
    { key: 'status', label: 'Status', width: 'w-24', type: 'select', options: ['OPEN', 'CLOSED'] },
    // Results
    { key: 'sim_flow', label: 'Flow', width: 'w-24', type: 'readonly', isResult: true },
  ],
  valve: [
     { key: 'id', label: 'ID', width: 'w-24', type: 'readonly' },
     { key: 'diameter', label: 'Diameter', width: 'w-24', type: 'number' },
     { key: 'valveType', label: 'Type', width: 'w-24', type: 'select', options: ['PRV', 'PSV', 'PBV', 'FCV', 'TCV', 'GPV'] },
     { key: 'setting', label: 'Setting', width: 'w-24', type: 'number' },
     // Results
     { key: 'sim_flow', label: 'Flow', width: 'w-24', type: 'readonly', isResult: true },
     { key: 'sim_velocity', label: 'Velocity', width: 'w-24', type: 'readonly', isResult: true },
  ]
};