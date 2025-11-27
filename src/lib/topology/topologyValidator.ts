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

        // Run all validation checks
        const orphanedNodes = this.findOrphanedNodes();
        const disconnectedComponents = this.findDisconnectedComponents();
        const pipesWithMissingNodes = this.findPipesWithMissingNodes();
        const duplicateIds = this.findDuplicateFeatureIds();
        const crossingPipes = this.findCrossingPipesWithoutJunction();
        const invalidGeometries = this.findInvalidGeometries();
        const missingProperties = this.findMissingRequiredProperties();

        // Process orphaned nodes
        if (orphanedNodes.length > 0) {
            warnings.push({
                type: "orphaned_nodes",
                message: `${orphanedNodes.length} orphaned node(s) found (no connected pipes)`,
                featureId: orphanedNodes.map((n) => n.getId() as string).join(", "),
            });
        }

        // Process disconnected components
        if (disconnectedComponents.length > 1) {
            warnings.push({
                type: "disconnected_network",
                message: `Network has ${disconnectedComponents.length} disconnected components`,
            });
        }

        // Process pipes with missing nodes
        if (pipesWithMissingNodes.length > 0) {
            errors.push({
                type: "missing_nodes",
                message: `${pipesWithMissingNodes.length} pipe(s) have missing node references`,
                featureId: pipesWithMissingNodes.map((p) => p.getId() as string).join(", "),
            });
        }

        // Process duplicate IDs
        if (duplicateIds.length > 0) {
            errors.push({
                type: "duplicate_ids",
                message: `${duplicateIds.length} duplicate feature ID(s) found`,
                featureId: duplicateIds.join(", "),
            });
        }

        // Process crossing pipes
        if (crossingPipes.length > 0) {
            warnings.push({
                type: "crossing_pipes",
                message: `${crossingPipes.length} pipe crossing(s) without junction detected`,
            });
        }

        // Process invalid geometries
        if (invalidGeometries.length > 0) {
            errors.push({
                type: "invalid_geometry",
                message: `${invalidGeometries.length} feature(s) have invalid geometries`,
                featureId: invalidGeometries.map((f) => f.getId() as string).join(", "),
            });
        }

        // Process missing properties
        if (missingProperties.length > 0) {
            warnings.push({
                type: "missing_properties",
                message: `${missingProperties.length} feature(s) missing required properties`,
                featureId: missingProperties.map((f) => f.getId() as string).join(", "),
            });
        }

        const isValid = errors.length === 0;

        return {
            isValid,
            errors,
            warnings,
        };
    }

    /**
     * Find nodes with no connected pipes
     */
    private findOrphanedNodes(): Feature[] {
        const nodes = this.vectorSource
            .getFeatures()
            .filter((f) => ["junction", "tank", "reservoir"].includes(f.get("type")));

        return nodes.filter((node) => {
            const connectedLinks = node.get("connectedLinks") || [];
            return connectedLinks.length === 0;
        });
    }

    /**
     * Find disconnected network components
     */
    private findDisconnectedComponents(): string[][] {
        const visited = new Set<string>();
        const components: string[][] = [];

        const nodes = this.vectorSource
            .getFeatures()
            .filter((f) => ["junction", "tank", "reservoir"].includes(f.get("type")));

        nodes.forEach((node) => {
            const nodeId = node.getId() as string;
            if (!visited.has(nodeId)) {
                const component = this.traverseNetwork(node, visited);
                if (component.length > 0) {
                    components.push(component);
                }
            }
        });

        return components;
    }

    /**
     * Traverse network using BFS to find connected component
     */
    private traverseNetwork(startNode: Feature, visited: Set<string>): string[] {
        const queue: Feature[] = [startNode];
        const component: string[] = [];

        while (queue.length > 0) {
            const currentNode = queue.shift()!;
            const currentNodeId = currentNode.getId() as string;

            if (!visited.has(currentNodeId)) {
                visited.add(currentNodeId);
                component.push(currentNodeId);

                const connectedLinks = currentNode.get("connectedLinks") || [];

                connectedLinks.forEach((linkId: string) => {
                    const link = this.vectorSource
                        .getFeatures()
                        .find((f) => f.getId() === linkId);

                    if (link) {
                        const startNodeId = link.get("startNodeId");
                        const endNodeId = link.get("endNodeId");
                        const otherNodeId =
                            startNodeId === currentNodeId ? endNodeId : startNodeId;

                        const otherNode = this.vectorSource
                            .getFeatures()
                            .find(
                                (f) =>
                                    f.getId() === otherNodeId &&
                                    ["junction", "tank", "reservoir"].includes(f.get("type"))
                            );

                        if (otherNode && !visited.has(otherNodeId)) {
                            queue.push(otherNode);
                        }
                    }
                });
            }
        }

        return component;
    }

    /**
     * Find pipes with missing start or end nodes
     */
    private findPipesWithMissingNodes(): Feature[] {
        const pipes = this.vectorSource
            .getFeatures()
            .filter((f) => f.get("type") === "pipe");

        return pipes.filter((pipe) => {
            const startNodeId = pipe.get("startNodeId");
            const endNodeId = pipe.get("endNodeId");

            const startNode = this.findNodeById(startNodeId);
            const endNode = this.findNodeById(endNodeId);

            return !startNode || !endNode;
        });
    }

    /**
     * Find features with duplicate IDs
     */
    private findDuplicateFeatureIds(): string[] {
        const featureIds = new Map<string, number>();
        const duplicates: string[] = [];

        this.vectorSource.getFeatures().forEach((feature) => {
            const id = feature.getId() as string;
            if (id) {
                const count = featureIds.get(id) || 0;
                featureIds.set(id, count + 1);

                if (count === 1) {
                    duplicates.push(id);
                }
            }
        });

        return duplicates;
    }

    /**
     * Find pipes that cross without a junction at intersection
     */
    private findCrossingPipesWithoutJunction(): Array<{ pipe1: string; pipe2: string; intersection: number[] }> {
        const pipes = this.vectorSource
            .getFeatures()
            .filter((f) => f.get("type") === "pipe");

        const crossings: Array<{ pipe1: string; pipe2: string; intersection: number[] }> = [];

        for (let i = 0; i < pipes.length; i++) {
            for (let j = i + 1; j < pipes.length; j++) {
                const pipe1 = pipes[i];
                const pipe2 = pipes[j];

                // Check if pipes share nodes (they connect at nodes)
                const pipe1StartNode = pipe1.get("startNodeId");
                const pipe1EndNode = pipe1.get("endNodeId");
                const pipe2StartNode = pipe2.get("startNodeId");
                const pipe2EndNode = pipe2.get("endNodeId");

                const shareNode =
                    pipe1StartNode === pipe2StartNode ||
                    pipe1StartNode === pipe2EndNode ||
                    pipe1EndNode === pipe2StartNode ||
                    pipe1EndNode === pipe2EndNode;

                if (shareNode) {
                    continue; // Pipes properly connected at node
                }

                // Check for geometric intersection
                const intersection = this.findLineIntersection(
                    pipe1.getGeometry() as LineString,
                    pipe2.getGeometry() as LineString
                );

                if (intersection) {
                    // Check if there's a junction at intersection point
                    const junctionAtIntersection = this.findNodeAtCoordinate(intersection);

                    if (!junctionAtIntersection) {
                        crossings.push({
                            pipe1: pipe1.getId() as string,
                            pipe2: pipe2.getId() as string,
                            intersection,
                        });
                    }
                }
            }
        }

        return crossings;
    }

    /**
     * Find intersection point between two line segments
     */
    private findLineIntersection(line1: LineString, line2: LineString): number[] | null {
        const coords1 = line1.getCoordinates();
        const coords2 = line2.getCoordinates();

        // Simple implementation - check first segment only
        // In production, check all segments
        if (coords1.length < 2 || coords2.length < 2) return null;

        const p1 = coords1[0];
        const p2 = coords1[coords1.length - 1];
        const p3 = coords2[0];
        const p4 = coords2[coords2.length - 1];

        const x1 = p1[0], y1 = p1[1];
        const x2 = p2[0], y2 = p2[1];
        const x3 = p3[0], y3 = p3[1];
        const x4 = p4[0], y4 = p4[1];

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

        if (Math.abs(denom) < 1e-10) {
            return null; // Lines are parallel
        }

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            // Intersection exists
            const intersectionX = x1 + t * (x2 - x1);
            const intersectionY = y1 + t * (y2 - y1);

            // Check if intersection is at endpoints (which is okay)
            const isEndpoint =
                this.isCoordinateEqual([intersectionX, intersectionY], p1) ||
                this.isCoordinateEqual([intersectionX, intersectionY], p2) ||
                this.isCoordinateEqual([intersectionX, intersectionY], p3) ||
                this.isCoordinateEqual([intersectionX, intersectionY], p4);

            if (isEndpoint) {
                return null; // Endpoint intersection is okay
            }

            return [intersectionX, intersectionY];
        }

        return null;
    }

    /**
     * Find features with invalid geometries
     */
    private findInvalidGeometries(): Feature[] {
        return this.vectorSource.getFeatures().filter((feature) => {
            const geometry = feature.getGeometry();

            if (!geometry) return true;

            if (geometry instanceof Point) {
                const coords = geometry.getCoordinates();
                return coords.length !== 2 || !isFinite(coords[0]) || !isFinite(coords[1]);
            }

            if (geometry instanceof LineString) {
                const coords = geometry.getCoordinates();
                return coords.length < 2 || coords.some((c) => !isFinite(c[0]) || !isFinite(c[1]));
            }

            return false;
        });
    }

    /**
     * Find features missing required properties
     */
    private findMissingRequiredProperties(): Feature[] {
        const requiredProps: Record<string, string[]> = {
            junction: ["elevation"],
            tank: ["elevation", "capacity", "diameter"],
            reservoir: ["head"],
            pipe: ["diameter", "length", "roughness"],
            pump: ["capacity", "headGain"],
            valve: ["diameter", "status"],
        };

        return this.vectorSource.getFeatures().filter((feature) => {
            const featureType = feature.get("type");
            const required = requiredProps[featureType];

            if (!required) return false;

            return required.some((prop) => {
                const value = feature.get(prop);
                return value === undefined || value === null;
            });
        });
    }

    /**
     * Analyze network connectivity
     */
    public analyzeNetworkConnectivity(): {
        totalNodes: number;
        totalPipes: number;
        connectedComponents: number;
        largestComponent: number;
        networkDensity: number;
        averageNodeDegree: number;
    } {
        const nodes = this.vectorSource
            .getFeatures()
            .filter((f) => ["junction", "tank", "reservoir"].includes(f.get("type")));

        const pipes = this.vectorSource
            .getFeatures()
            .filter((f) => f.get("type") === "pipe");

        const components = this.findDisconnectedComponents();
        const largestComponent = Math.max(...components.map((c) => c.length), 0);

        const networkDensity = this.calculateNetworkDensity(nodes.length, pipes.length);
        const averageNodeDegree = this.calculateAverageNodeDegree(nodes);

        return {
            totalNodes: nodes.length,
            totalPipes: pipes.length,
            connectedComponents: components.length,
            largestComponent,
            networkDensity,
            averageNodeDegree,
        };
    }

    /**
     * Calculate network density
     */
    private calculateNetworkDensity(nodeCount: number, pipeCount: number): number {
        if (nodeCount < 2) return 0;

        const maxPossibleConnections = (nodeCount * (nodeCount - 1)) / 2;
        return pipeCount / maxPossibleConnections;
    }

    /**
     * Calculate average node degree (connections per node)
     */
    private calculateAverageNodeDegree(nodes: Feature[]): number {
        if (nodes.length === 0) return 0;

        const totalConnections = nodes.reduce((sum, node) => {
            const connections = node.get("connectedLinks") || [];
            return sum + connections.length;
        }, 0);

        return totalConnections / nodes.length;
    }

    /**
     * Helper: Find node by ID
     */
    private findNodeById(nodeId: string): Feature | undefined {
        return this.vectorSource
            .getFeatures()
            .find(
                (f) =>
                    ["junction", "tank", "reservoir"].includes(f.get("type")) &&
                    f.getId() === nodeId
            );
    }

    /**
     * Helper: Find node at coordinate
     */
    private findNodeAtCoordinate(coordinate: number[]): Feature | null {
        const tolerance = 1e-6;

        return (
            this.vectorSource
                .getFeatures()
                .find((feature) => {
                    if (!["junction", "tank", "reservoir"].includes(feature.get("type"))) {
                        return false;
                    }

                    const geometry = feature.getGeometry();
                    if (geometry instanceof Point) {
                        const nodeCoord = geometry.getCoordinates();
                        return this.isCoordinateEqual(coordinate, nodeCoord, tolerance);
                    }
                    return false;
                }) || null
        );
    }

    /**
     * Helper: Check if two coordinates are equal within tolerance
     */
    private isCoordinateEqual(
        coord1: number[],
        coord2: number[],
        tolerance: number = 1e-6
    ): boolean {
        return (
            Math.abs(coord1[0] - coord2[0]) < tolerance &&
            Math.abs(coord1[1] - coord2[1]) < tolerance
        );
    }

    /**
     * Get validation summary as formatted string
     */
    public getValidationSummary(validation: NetworkValidation): string {
        let summary = "";

        if (validation.isValid) {
            summary += "✓ Network is valid\n\n";
        } else {
            summary += "✗ Network has errors\n\n";
        }

        if (validation.errors.length > 0) {
            summary += "ERRORS:\n";
            validation.errors.forEach((error, index) => {
                summary += `${index + 1}. ${error.message}\n`;
                if (error.featureId) {
                    summary += `   Affected features: ${error.featureId}\n`;
                }
            });
            summary += "\n";
        }

        if (validation.warnings.length > 0) {
            summary += "WARNINGS:\n";
            validation.warnings.forEach((warning, index) => {
                summary += `${index + 1}. ${warning.message}\n`;
                if (warning.featureId) {
                    summary += `   Affected features: ${warning.featureId}\n`;
                }
            });
        }

        return summary;
    }
}
