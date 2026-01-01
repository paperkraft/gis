import { Feature } from "ol";
import { Point, LineString } from "ol/geom";

export interface ValidationError {
  id: string;
  type: "ERROR" | "WARNING";
  message: string;
  featureId?: string;
}

export const ValidationService = {
  validate: (featuresArr: Feature[]): ValidationError[] => {
    const issues: ValidationError[] = [];
    
    // 1. Create Lookup Map for O(1) access (Replaces vectorSource.getFeatureById)
    const featureMap = new Map<string, Feature>();
    featuresArr.forEach(f => {
        const id = f.getId()?.toString();
        if(id) featureMap.set(id, f);
    });

    // --- HELPER: Get ID safely ---
    const getId = (f: Feature) => f.getId()?.toString() || 'UNKNOWN';

    // --- HELPER: Get Node By ID ---
    const findNodeById = (nodeId: string) => {
        const f = featureMap.get(nodeId);
        return (f && ["junction", "tank", "reservoir"].includes(f.get("type"))) ? f : undefined;
    };

    // =========================================================
    // 1. CONNECTIVITY CHECKS
    // =========================================================

    // A. Orphaned Nodes
    const nodes = featuresArr.filter(f => ["junction", "tank", "reservoir"].includes(f.get("type")));
    const orphanedNodes = nodes.filter(node => {
        const connectedLinks = node.get("connectedLinks") || [];
        return connectedLinks.length === 0;
    });

    if (orphanedNodes.length > 0) {
        issues.push({
            id: 'orphaned_nodes',
            type: 'WARNING',
            message: `${orphanedNodes.length} orphaned node(s) (no pipes connected)`,
            featureId: orphanedNodes.map(getId).join(", ")
        });
    }

    // B. Disconnected Components (BFS)
    const visited = new Set<string>();
    const components: string[][] = [];

    const traverseNetwork = (startNode: Feature) => {
        const queue: Feature[] = [startNode];
        const component: string[] = [];
        let iterations = 0;
        
        while (queue.length > 0 && iterations < 10000) {
            iterations++;
            const current = queue.shift()!;
            const currentId = getId(current);

            if (!visited.has(currentId)) {
                visited.add(currentId);
                component.push(currentId);

                const links = current.get("connectedLinks") || [];
                links.forEach((linkId: string) => {
                    const link = featureMap.get(linkId);
                    if (link) {
                        const sId = link.get("startNodeId");
                        const eId = link.get("endNodeId");
                        const otherId = sId === currentId ? eId : sId;
                        const otherNode = findNodeById(otherId);
                        if (otherNode && !visited.has(getId(otherNode))) {
                            queue.push(otherNode);
                        }
                    }
                });
            }
        }
        return component;
    };

    nodes.forEach(node => {
        if (!visited.has(getId(node))) {
            const comp = traverseNetwork(node);
            if (comp.length > 0) components.push(comp);
        }
    });

    if (components.length > 1) {
        issues.push({
            id: 'disconnected_net',
            type: 'WARNING',
            message: `Network is split into ${components.length} disconnected sub-networks`,
            featureId: ""
        });
    }

    // C. Isolated Subnetworks (No Tank/Reservoir)
    const isolatedNodeIds: string[] = [];
    components.forEach(comp => {
        const hasSource = comp.some(nodeId => {
            const node = featureMap.get(nodeId);
            return node && ['tank', 'reservoir'].includes(node.get('type'));
        });
        if (!hasSource) isolatedNodeIds.push(...comp);
    });

    if (isolatedNodeIds.length > 0) {
        issues.push({
            id: 'isolated_subnet',
            type: 'WARNING',
            message: `${isolatedNodeIds.length} nodes are hydraulically isolated (no Tank/Reservoir)`,
            featureId: isolatedNodeIds.join(", ")
        });
    }


    // =========================================================
    // 2. TOPOLOGY CHECKS
    // =========================================================

    // D. Missing Nodes
    const links = featuresArr.filter(f => ["pipe", "pump", "valve"].includes(f.get("type")));
    const missingNodeLinks = links.filter(link => {
        return !findNodeById(link.get("startNodeId")) || !findNodeById(link.get("endNodeId"));
    });

    if (missingNodeLinks.length > 0) {
        issues.push({
            id: 'missing_nodes',
            type: 'ERROR',
            message: `${missingNodeLinks.length} pipe(s) are not connected to valid start/end nodes`,
            featureId: missingNodeLinks.map(getId).join(", ")
        });
    }

    // E. Self Loops
    const selfLoops = links.filter(link => {
        const s = link.get("startNodeId");
        const e = link.get("endNodeId");
        return s && e && s === e;
    });

    if (selfLoops.length > 0) {
        issues.push({
            id: 'self_loop',
            type: 'ERROR',
            message: `${selfLoops.length} pipe(s) connect a node to itself`,
            featureId: selfLoops.map(getId).join(", ")
        });
    }

    // F. Invalid Geometries
    const invalidGeoms = featuresArr.filter(f => {
        if (f.get('isPreview') || f.get('isVertexMarker')) return false;
        const g = f.getGeometry();
        if (!g) return true;
        if (g instanceof Point) {
            const c = g.getCoordinates();
            return !c || c.length < 2 || !isFinite(c[0]) || !isFinite(c[1]);
        }
        if (g instanceof LineString) {
            const c = g.getCoordinates();
            return !c || c.length < 2;
        }
        return false;
    });

    if (invalidGeoms.length > 0) {
        issues.push({
            id: 'invalid_geom',
            type: 'ERROR',
            message: `${invalidGeoms.length} feature(s) have invalid geometries`,
            featureId: invalidGeoms.map(getId).join(", ")
        });
    }

    // G. Crossing Pipes (Simplified)
    // Helper for intersection
    const segmentsIntersect = (a: number[], b: number[], c: number[], d: number[]) => {
        const ccw = (p1: number[], p2: number[], p3: number[]) => (p3[1]-p1[1])*(p2[0]-p1[0]) > (p2[1]-p1[1])*(p3[0]-p1[0]);
        return (ccw(a,c,d) !== ccw(b,c,d)) && (ccw(a,b,c) !== ccw(a,b,d));
    };

    const pipes = featuresArr.filter(f => f.get("type") === "pipe");
    const crossings: Feature[] = [];
    
    for (let i = 0; i < pipes.length; i++) {
        for (let j = i + 1; j < pipes.length; j++) {
            const p1 = pipes[i];
            const p2 = pipes[j];
            
            // Skip connected
            const s1 = p1.get("startNodeId"), e1 = p1.get("endNodeId");
            const s2 = p2.get("startNodeId"), e2 = p2.get("endNodeId");
            if (s1 === s2 || s1 === e2 || e1 === s2 || e1 === e2) continue;

            const g1 = p1.getGeometry();
            const g2 = p2.getGeometry();

            if (g1 instanceof LineString && g2 instanceof LineString) {
                // Check extent first
                const ext1 = g1.getExtent();
                const ext2 = g2.getExtent();
                // Basic extent intersection check could be added here for speed
                
                const c1 = g1.getCoordinates();
                const c2 = g2.getCoordinates();

                // Segment check
                let intersect = false;
                for(let k=0; k<c1.length-1; k++) {
                    for(let m=0; m<c2.length-1; m++) {
                        if(segmentsIntersect(c1[k], c1[k+1], c2[m], c2[m+1])) {
                            intersect = true; 
                            break;
                        }
                    }
                    if(intersect) break;
                }

                if (intersect) {
                    if(!crossings.includes(p1)) crossings.push(p1);
                    if(!crossings.includes(p2)) crossings.push(p2);
                }
            }
        }
    }

    if (crossings.length > 0) {
        issues.push({
            id: 'crossing_pipes',
            type: 'WARNING',
            message: `${crossings.length} pipe(s) cross without a junction`,
            featureId: crossings.map(getId).join(", ")
        });
    }

    // =========================================================
    // 3. DATA INTEGRITY CHECKS
    // =========================================================

    // H. Duplicate IDs
    const idCounts = new Map<string, number>();
    const duplicates: string[] = [];
    featuresArr.forEach(f => {
        if(f.get('isPreview') || f.get('isVertexMarker')) return;
        const id = getId(f);
        idCounts.set(id, (idCounts.get(id)||0)+1);
        if(idCounts.get(id) === 2) duplicates.push(id);
    });

    if (duplicates.length > 0) {
        issues.push({
            id: 'dup_ids',
            type: 'ERROR',
            message: `${duplicates.length} duplicate feature ID(s) found`,
            featureId: duplicates.join(", ")
        });
    }

    // I. Missing Properties
    const requiredProps: Record<string, string[]> = {
        junction: ["elevation"],
        tank: ["elevation", "diameter"],
        reservoir: ["head"],
        pipe: ["diameter", "roughness"],
        valve: ["diameter", "setting"],
    };

    const missingProps = featuresArr.filter(f => {
        const type = f.get("type");
        const req = requiredProps[type];
        if (!req) return false;
        return req.some(p => {
            const v = f.get(p);
            return v === undefined || v === null || v === "";
        });
    });

    if (missingProps.length > 0) {
        issues.push({
            id: 'missing_props',
            type: 'WARNING',
            message: `${missingProps.length} feature(s) missing required hydraulic properties`,
            featureId: missingProps.map(getId).join(", ")
        });
    }

    return issues;
  }
};