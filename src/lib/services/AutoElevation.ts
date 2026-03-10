import { NetworkFeatureData } from "@/types/network";
import { transform } from "ol/proj";

export interface ElevationRequestItem {
  id: string;
  lat: number;
  lon: number;
}

export const ElevationService = {
  /**
   * Filter features to find eligible nodes (Junctions, Tanks, Reservoirs)
   */
  identifyNodes: (
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

      // 4. Geometry Check & Transform
      const geom = feature.geometry as number[];
      if (geom && geom.length >= 2) {
        // Transform EPSG:3857 (Web Mercator) -> EPSG:4326 (Lat/Lon)
        const [lon, lat] = transform(geom, "EPSG:3857", "EPSG:4326");
        nodes.push({ id, lat, lon });
      }
    });

    return nodes;
  },

  /**
   * Fetch a single batch of elevations from your local API Proxy
   */
  fetchBatch: async (batch: ElevationRequestItem[]) => {
    // Pipe-separated "lat,lon|lat,lon"
    const locations = batch.map((p) => `${p.lat},${p.lon}`).join("|");

    // Call YOUR Next.js API Route (which proxies to OpenTopoData)
    const response = await fetch(`/api/elevation?locations=${locations}`);

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  }
};