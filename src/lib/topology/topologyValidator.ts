import VectorSource from "ol/source/Vector";
import { Feature } from "ol";
import { Point, LineString } from "ol/geom";
import { NetworkValidation, ValidationError, ValidationWarning } from "@/types/network";

export class TopologyValidator {
    private vectorSource: VectorSource;

    constructor(vectorSource: VectorSource) {
        this.vectorSource = vectorSource;
    }

    /**
     * Run comprehensive network validation
     */
    public validateNetwork(): NetworkValidation {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // 1. Connectivity Checks
        const orphanedNodes = this.findOrphanedNodes();
        const disconnectedComponents = this.findDisconnectedComponents();

        const isolatedNodeIds: string[] = [];
        disconnectedComponents.forEach(component => {
             const hasSource = component.some(nodeId => {
                const node = this.findNodeById(nodeId);
                return node && ['tank', 'reservoir'].includes(node.get('type'));
            });
            if (!hasSource) isolatedNodeIds.push(...component);
        });

        // 2. Topology Checks
        const pipesWithMissingNodes = this.findPipesWithMissingNodes();
        const selfLoops = this.findSelfLoops();
        const crossingPipes = this.findCrossingPipesWithoutJunction();
        const invalidGeometries = this.findInvalidGeometries();

        // 3. Data Integrity Checks
        const duplicateIds = this.findDuplicateFeatureIds();
        const missingProperties = this.findMissingRequiredProperties();

        // --- Compile Results ---

        // Errors (Prevent Simulation)
        if (pipesWithMissingNodes.length > 0) {
            errors.push({
                type: "missing_nodes",
                message: `${pipesWithMissingNodes.length} pipe(s) are not connected to start/end nodes`,
                featureId: pipesWithMissingNodes.map(this.getId).join(", "),
            });
        }

        if (selfLoops.length > 0) {
            errors.push({
                type: "self_loop",
                message: `${selfLoops.length} pipe(s) connect a node to itself`,
                featureId: selfLoops.map(this.getId).join(", "),
            });
        }

        if (invalidGeometries.length > 0) {
            errors.push({
                type: "invalid_geometry",
                message: `${invalidGeometries.length} feature(s) have invalid or empty geometries`,
                featureId: invalidGeometries.map(this.getId).join(", "),
            });
        }

        if (duplicateIds.length > 0) {
            errors.push({
                type: "duplicate_ids",
                message: `${duplicateIds.length} duplicate feature ID(s) found`,
                featureId: duplicateIds.join(", "),
            });
        }

        // Warnings (Issues that might affect results but allow simulation)
        if (orphanedNodes.length > 0) {
            warnings.push({
                type: "orphaned_nodes",
                message: `${orphanedNodes.length} orphaned node(s) (no pipes connected)`,
                featureId: orphanedNodes.map(this.getId).join(", "),
            });
        }

        if (disconnectedComponents.length > 1) {
            warnings.push({
                type: "disconnected_network",
                message: `Network is split into ${disconnectedComponents.length} disconnected sub-networks`,
            });
        }
        
        if (isolatedNodeIds.length > 0) {
             warnings.push({
                type: "isolated_subnetwork",
                message: `${isolatedNodeIds.length} nodes are in sub-networks without a Tank or Reservoir (Hydraulically Isolated)`,
                featureId: isolatedNodeIds.join(", "),
            });
        }

        if (crossingPipes.length > 0) {
            warnings.push({
                type: "crossing_pipes",
                message: `${crossingPipes.length} location(s) where pipes cross without a junction`,
            });
        }

        if (missingProperties.length > 0) {
            warnings.push({
                type: "missing_properties",
                message: `${missingProperties.length} feature(s) missing required hydraulic properties (e.g. elevation, diameter)`,
                featureId: missingProperties.map(this.getId).join(", "),
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Helper to safely get Feature ID
     */
    private getId(feature: Feature): string {
        const id = feature.getId() || feature.get('id');
        return id ? String(id) : 'UNKNOWN';
    }

    // --- Check Implementations ---

    private findOrphanedNodes(): Feature[] {
        const nodes = this.vectorSource
            .getFeatures()
            .filter((f) => ["junction", "tank", "reservoir"].includes(f.get("type")));

        return nodes.filter((node) => {
            const connectedLinks = node.get("connectedLinks") || [];
            return connectedLinks.length === 0;
        });
    }

    private findSelfLoops(): Feature[] {
        return this.vectorSource
            .getFeatures()
            .filter((f) => ["pipe", "pump", "valve"].includes(f.get("type")))
            .filter((link) => {
                const start = link.get("startNodeId");
                const end = link.get("endNodeId");
                return start && end && start === end;
            });
    }

    private findDisconnectedComponents(): string[][] {
        const visited = new Set<string>();
        const components: string[][] = [];

        const nodes = this.vectorSource
            .getFeatures()
            .filter((f) => ["junction", "tank", "reservoir"].includes(f.get("type")));

        nodes.forEach((node) => {
            const nodeId = this.getId(node);
            if (!visited.has(nodeId)) {
                const component = this.traverseNetwork(node, visited);
                if (component.length > 0) {
                    components.push(component);
                }
            }
        });

        return components;
    }

    private traverseNetwork(startNode: Feature, visited: Set<string>): string[] {
        const queue: Feature[] = [startNode];
        const component: string[] = [];

        // Safety check for infinite loops
        let iterations = 0;
        const maxIterations = 10000;

        while (queue.length > 0 && iterations < maxIterations) {
            iterations++;
            const currentNode = queue.shift()!;
            const currentNodeId = this.getId(currentNode);

            if (!visited.has(currentNodeId)) {
                visited.add(currentNodeId);
                component.push(currentNodeId);

                const connectedLinks = currentNode.get("connectedLinks") || [];

                connectedLinks.forEach((linkId: string) => {
                    // Try finding by internal ID first, then property ID
                    const link = this.vectorSource.getFeatureById(linkId) ||
                        this.vectorSource.getFeatures().find(f => this.getId(f) === linkId);

                    if (link) {
                        const startNodeId = link.get("startNodeId");
                        const endNodeId = link.get("endNodeId");
                        const otherNodeId = startNodeId === currentNodeId ? endNodeId : startNodeId;

                        if (otherNodeId) {
                            const otherNode = this.findNodeById(otherNodeId);
                            if (otherNode && !visited.has(this.getId(otherNode))) {
                                queue.push(otherNode);
                            }
                        }
                    }
                });
            }
        }

        return component;
    }

    private findPipesWithMissingNodes(): Feature[] {
        const links = this.vectorSource
            .getFeatures()
            .filter((f) => ["pipe", "pump", "valve"].includes(f.get("type")));

        return links.filter((link) => {
            const startNodeId = link.get("startNodeId");
            const endNodeId = link.get("endNodeId");

            const startNode = this.findNodeById(startNodeId);
            const endNode = this.findNodeById(endNodeId);

            return !startNode || !endNode;
        });
    }

    private findDuplicateFeatureIds(): string[] {
        const idCounts = new Map<string, number>();
        const duplicates: string[] = [];

        this.vectorSource.getFeatures().forEach((feature) => {
            // Skip helper features
            if (feature.get('isPreview') || feature.get('isVertexMarker') || feature.get('isVisualLink')) return;

            const id = this.getId(feature);
            if (id) {
                const count = idCounts.get(id) || 0;
                idCounts.set(id, count + 1);
                if (count === 1) duplicates.push(id);
            }
        });

        return duplicates;
    }

    private findCrossingPipesWithoutJunction(): Feature[] {
        // Checking for visual intersection is expensive (O(N^2))
        // We'll perform a simplified check on the first segment of pipes
        const pipes = this.vectorSource
            .getFeatures()
            .filter((f) => f.get("type") === "pipe");

        const crossings: Feature[] = []; // Store pipes involved in crossings

        for (let i = 0; i < pipes.length; i++) {
            for (let j = i + 1; j < pipes.length; j++) {
                const pipe1 = pipes[i];
                const pipe2 = pipes[j];

                // Skip if they share a node (connected)
                const p1Start = pipe1.get("startNodeId");
                const p1End = pipe1.get("endNodeId");
                const p2Start = pipe2.get("startNodeId");
                const p2End = pipe2.get("endNodeId");

                if (p1Start === p2Start || p1Start === p2End || p1End === p2Start || p1End === p2End) {
                    continue;
                }

                // Check geometric intersection
                const geom1 = pipe1.getGeometry() as LineString;
                const geom2 = pipe2.getGeometry() as LineString;

                if (this.intersects(geom1, geom2)) {
                    // It intersects and they don't share a node ID -> Crossing without junction
                    if (!crossings.includes(pipe1)) crossings.push(pipe1);
                    if (!crossings.includes(pipe2)) crossings.push(pipe2);
                }
            }
        }

        return crossings;
    }

    /**
     * Simple line segment intersection check
     */
    private intersects(line1: LineString, line2: LineString): boolean {
        // Bounding box check first for performance
        if (!line1.getExtent() || !line2.getExtent()) return false;

        const coords1 = line1.getCoordinates();
        const coords2 = line2.getCoordinates();

        // Check all segments against all segments
        for (let i = 0; i < coords1.length - 1; i++) {
            for (let j = 0; j < coords2.length - 1; j++) {
                if (this.segmentsIntersect(
                    coords1[i], coords1[i + 1],
                    coords2[j], coords2[j + 1]
                )) {
                    return true;
                }
            }
        }
        return false;
    }

    private segmentsIntersect(a: number[], b: number[], c: number[], d: number[]): boolean {
        const ccw = (p1: number[], p2: number[], p3: number[]) => {
            return (p3[1] - p1[1]) * (p2[0] - p1[0]) > (p2[1] - p1[1]) * (p3[0] - p1[0]);
        };
        return (ccw(a, c, d) !== ccw(b, c, d)) && (ccw(a, b, c) !== ccw(a, b, d));
    }

    private findInvalidGeometries(): Feature[] {
        return this.vectorSource.getFeatures().filter((feature) => {
            if (feature.get('isPreview') || feature.get('isVertexMarker')) return false;

            const geometry = feature.getGeometry();
            if (!geometry) return true;

            if (geometry instanceof Point) {
                const coords = geometry.getCoordinates();
                return !coords || coords.length < 2 || !isFinite(coords[0]) || !isFinite(coords[1]);
            }
            if (geometry instanceof LineString) {
                const coords = geometry.getCoordinates();
                return !coords || coords.length < 2;
            }
            return false;
        });
    }

    private findMissingRequiredProperties(): Feature[] {
        // Aligned with COMPONENT_TYPES and PropertyPanel
        const requiredProps: Record<string, string[]> = {
            junction: ["elevation"],
            tank: ["elevation", "diameter"],
            reservoir: ["head"],
            pipe: ["diameter", "roughness"],
            pump: [], // Power or curve is often set via "parameters" property string
            valve: ["diameter", "setting"],
        };

        return this.vectorSource.getFeatures().filter((feature) => {
            const type = feature.get("type") as string;
            const required = requiredProps[type];

            if (!required) return false;

            return required.some((prop) => {
                const val = feature.get(prop);
                // Allow 0, but not undefined/null/empty string
                return val === undefined || val === null || val === "";
            });
        });
    }

    private findNodeById(nodeId: string): Feature | undefined {
        return this.vectorSource.getFeatures().find(
            (f) =>
                this.getId(f) === nodeId &&
                ["junction", "tank", "reservoir"].includes(f.get("type"))
        );
    }
}