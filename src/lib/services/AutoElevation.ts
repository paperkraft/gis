import { NetworkFeatureData } from "@/types/network";

export interface ElevationRequestItem {
  id: string;
  coordinate: number[];
}

/**
 * Filter features to find eligible nodes (Junctions, Tanks, Reservoirs) for batch elevation processing.
 */
export const identifyNodesForElevation = (
  features: Map<string, NetworkFeatureData>,
  useSelection: boolean,
  selectedIds: string[],
  overwrite: boolean
): ElevationRequestItem[] => {
  const nodes: ElevationRequestItem[] = [];

  features.forEach((feature) => {
    const id = feature.id;
    if (!id) return;

    const type = feature.type;

    // 1. Type Check
    if (!["junction", "tank", "reservoir"].includes(type)) return;

    // 2. Selection Check
    if (useSelection && !selectedIds.includes(id)) return;

    // 3. Overwrite Check
    if (!overwrite) {
      const currentElev = feature.properties.elevation;
      if (currentElev !== undefined && currentElev !== null && currentElev !== 0) return;
    }

    // 4. Geometry Check
    const geom = feature.geometry as number[];
    if (geom && geom.length >= 2) {
      nodes.push({ id, coordinate: geom });
    }
  });

  return nodes;
};