import { Feature } from 'ol';
import Point from 'ol/geom/Point';
import Geometry from 'ol/geom/Geometry';

/**
 * Calculates IDW interpolated elevation from contour lines for given network nodes.
 * Assumes geometries are already in the same projection (e.g. Map projection EPSG:3857).
 */
export function calculateElevationsFromContours(
  networkFeatures: Feature<Geometry>[],
  contourFeatures: Feature<Geometry>[],
  elevationProperty: string,
  numNeighbors: number = 3
): Record<string, number> {
  const result: Record<string, number> = {};

  // Find network nodes (Points with specific types: junction, tank, reservoir)
  const nodes = networkFeatures.filter((f) => {
    const type = f.get('type');
    const geom = f.getGeometry();
    return (
      (type === 'junction' || type === 'tank' || type === 'reservoir') &&
      geom instanceof Point
    );
  });

  if (nodes.length === 0 || contourFeatures.length === 0) return result;

  // Filter valid contours having a numeric elevation property
  const validContours = contourFeatures.filter((f) => {
    const elev = Number(f.get(elevationProperty));
    const geom = f.getGeometry();
    return !isNaN(elev) && geom && typeof geom.getClosestPoint === 'function';
  });

  if (validContours.length === 0) return result;

  for (const node of nodes) {
    const pointGeom = node.getGeometry() as Point;
    const coord = pointGeom.getCoordinates();

    // Calculate distance to all contours
    const distances = validContours.map((contour) => {
      const geom = contour.getGeometry();
      if (!geom) return { dist: Infinity, elev: 0 };
      
      const closestPt = geom.getClosestPoint(coord);
      const dx = closestPt[0] - coord[0];
      const dy = closestPt[1] - coord[1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      return {
        dist,
        elev: Number(contour.get(elevationProperty)),
      };
    });

    // Remove invalid ones, if any
    const validDistances = distances.filter(d => d.dist !== Infinity);

    // Sort by distance (closest first)
    validDistances.sort((a, b) => a.dist - b.dist);

    if (validDistances.length === 0) continue;

    // If exactly on a contour line (distance ~ 0)
    if (validDistances[0].dist < 0.001) {
      result[node.getId() as string] = validDistances[0].elev;
      continue;
    }

    // Take top N nearest contour lines
    const topN = validDistances.slice(0, numNeighbors);

    // Compute IDW (Inverse Distance Weighting)
    let sumWeight = 0;
    let sumWeightedElev = 0;
    for (const d of topN) {
      // power of 2 implies standard IDW
      const weight = 1 / Math.pow(d.dist, 2);
      sumWeight += weight;
      sumWeightedElev += d.elev * weight;
    }

    if (sumWeight > 0) {
      const interpolated = sumWeightedElev / sumWeight;
      result[node.getId() as string] = Math.round(interpolated * 100) / 100;
    }
  }

  return result;
}
