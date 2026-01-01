import { Feature } from "ol";
import { Point } from "ol/geom";
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
    features: Map<string, Feature>,
    useSelection: boolean,
    selectedIds: string[],
    overwrite: boolean
  ): ElevationRequestItem[] => {
    const nodes: ElevationRequestItem[] = [];

    features.forEach((feature) => {
      const id = feature.getId()?.toString();
      if (!id) return;

      const type = feature.get("type");
      
      // 1. Type Check
      if (!["junction", "tank", "reservoir"].includes(type)) return;

      // 2. Selection Check
      if (useSelection && !selectedIds.includes(id)) return;

      // 3. Overwrite Check
      if (!overwrite) {
        const currentElev = feature.get("elevation");
        if (currentElev !== undefined && currentElev !== null && currentElev !== 0) return;
      }

      // 4. Geometry Check & Transform
      const geom = feature.getGeometry();
      if (geom instanceof Point) {
        const coords = geom.getCoordinates();
        // Transform EPSG:3857 (Web Mercator) -> EPSG:4326 (Lat/Lon)
        const [lon, lat] = transform(coords, "EPSG:3857", "EPSG:4326");
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