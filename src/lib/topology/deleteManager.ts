import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import VectorSource from 'ol/source/Vector';

import { NetworkFactory } from '@/lib/topology/networkFactory';
import { useNetworkStore } from '@/store/networkStore';

export class DeleteManager {
    private vectorSource: VectorSource;
    private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;
    public onDeleteRequest: ((feature: Feature) => void) | null = null;

    constructor(vectorSource: VectorSource) {
        this.vectorSource = vectorSource;
        this.setupKeyboardShortcuts();
    }

    private setupKeyboardShortcuts() {
        this.keyboardHandler = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).contentEditable === "true") return;
            if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                this.deleteSelectedFeature();
            }
        };
        document.addEventListener("keydown", this.keyboardHandler);
    }

    public deleteSelectedFeature() {
        const networkStore = useNetworkStore.getState();
        const { selectedFeatureId, selectedFeatureIds } = networkStore as any;

        // Handle multiple or single selection
        const ids = (selectedFeatureIds && selectedFeatureIds.length > 0)
            ? selectedFeatureIds
            : (selectedFeatureId ? [selectedFeatureId] : []);

        if (ids.length === 0) {
            console.log("No feature selected for deletion");
            return;
        }

        if (this.onDeleteRequest) {
            // Trigger modal for the first feature to confirm action
            const feature = this.getFeature(ids[0]);
            if (feature) this.onDeleteRequest(feature);
        } else {
            // Direct delete fallback
            ids.forEach((id: string) => {
                const feature = this.getFeature(id);
                if (feature) this.executeDelete(feature);
            });
        }
    }

    public getCascadeInfo(feature: Feature): { willCascade: boolean; message: string } {
        const featureType = feature.get("type");
        const connectedLinks = feature.get("connectedLinks") || [];

        if (featureType === 'pump' || featureType === 'valve') {
            return { willCascade: true, message: "Deleting this link will merge the connected nodes into a single junction." };
        }
        if (["junction", "tank", "reservoir"].includes(featureType)) {
            if (connectedLinks.length === 2 && featureType === 'junction') {
                return { willCascade: true, message: "Deleting this node will merge the two connected pipes into one." };
            }
            if (connectedLinks.length > 0) {
                return { willCascade: true, message: `This node has ${connectedLinks.length} connected pipe(s). Connected pipes will be deleted.` };
            }
        }
        return { willCascade: false, message: "" };
    }

    public executeDelete(feature: Feature) {
        const store = useNetworkStore.getState();

        // 1. Start Transaction
        store.startTransaction();

        const type = feature.get("type");

        try {
            // 1. Special Case: Pump/Valve Merge
            if (type === 'pump' || type === 'valve') {
                this.handlePumpValveMerge(feature);
                return;
            }

            // 2. Special Case: Junction Merge (Pipe Join)
            if (type === 'junction') {
                const wasMerged = this.handleJunctionDelete(feature);
                if (wasMerged) return;
            }

            // 3. Standard Delete
            this.performStandardDelete(feature);

            // 4. Post-Delete Cleanup (Orphans)
            if (type === 'pipe') {
                this.cleanupOrphanNodes(feature);
            }
            store.commitTransaction();
        } catch (error) {
            console.error("Delete Failed", error);
            store.commitTransaction();
        }

    }

    // =========================================================================
    // SCENARIO 1: MERGE INLET/OUTLET ON PUMP/VALVE DELETE
    // =========================================================================
    private handlePumpValveMerge(link: Feature) {
        const store = useNetworkStore.getState();
        const linkId = link.getId() as string;
        const startNodeId = link.get('startNodeId');
        const endNodeId = link.get('endNodeId');

        const startNode = this.getFeature(startNodeId);
        const endNode = this.getFeature(endNodeId);

        if (!startNode || !endNode) {
            this.performStandardDelete(link);
            return;
        }

        // 1. Calculate Midpoint
        const c1 = (startNode.getGeometry() as Point).getCoordinates();
        const c2 = (endNode.getGeometry() as Point).getCoordinates();
        const midPoint = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2];

        // 2. Create New Junction
        const newJunction = NetworkFactory.createNode('junction', midPoint);
        const newJunctionId = newJunction.getId() as string;

        // 3. Identify pipes to re-route
        const linksToMove = [
            ...this.getConnectedLinks(startNode),
            ...this.getConnectedLinks(endNode)
        ].filter(id => id !== linkId);

        const newConnectedLinks: string[] = []; // Track links for the new node

        // 4. Re-route pipes
        const uniqueLinks = [...new Set(linksToMove)];
        uniqueLinks.forEach(pipeId => {
            const pipe = this.getFeature(pipeId);
            if (!pipe) return;

            const pStart = pipe.get('startNodeId');
            const pEnd = pipe.get('endNodeId');
            let updated = false;

            if (pStart === startNodeId || pStart === endNodeId) {
                pipe.set('startNodeId', newJunctionId);
                this.updateLineGeometryStart(pipe, midPoint);
                updated = true;
            }

            if (pEnd === startNodeId || pEnd === endNodeId) {
                pipe.set('endNodeId', newJunctionId);
                this.updateLineGeometryEnd(pipe, midPoint);
                updated = true;
            }

            if (updated) {
                store.updateFeature(pipeId, (pipe.getGeometry() as LineString).getCoordinates());
                store.updateNodeConnections(newJunctionId, pipeId, 'add');

                // Add to our local tracking list
                newConnectedLinks.push(pipeId);
            }
        });

        // 5. Explicitly set connectedLinks on the new Feature
        // This fixes the issue where the new node appeared "disconnected"
        newJunction.set('connectedLinks', newConnectedLinks);

        // 6. Add to System
        this.vectorSource.addFeature(newJunction);
        store.addFeature(newJunction);

        // 7. Cleanup Old
        this.vectorSource.removeFeature(link);
        store.removeFeature(linkId);
        this.removeVisualLinkLine(linkId);

        if (this.vectorSource.getFeatureById(startNodeId)) this.vectorSource.removeFeature(startNode);
        if (this.vectorSource.getFeatureById(endNodeId)) this.vectorSource.removeFeature(endNode);

        store.removeFeature(startNodeId);
        store.removeFeature(endNodeId);
        store.selectFeature(null);
    }

    // =========================================================================
    // SCENARIO 2: MERGE PIPES ON JUNCTION DELETE
    // =========================================================================
    private handleJunctionDelete(node: Feature): boolean {
        const connectedLinks = this.getConnectedLinks(node);
        const uniqueLinks = [...new Set(connectedLinks)];

        if (uniqueLinks.length === 2) {
            const link1 = this.getFeature(uniqueLinks[0]);
            const link2 = this.getFeature(uniqueLinks[1]);

            if (link1?.get('type') === 'pipe' && link2?.get('type') === 'pipe') {
                this.mergePipes(node, link1, link2);
                return true;
            }
        }
        return false;
    }

    private mergePipes(midNode: Feature, pipe1: Feature, pipe2: Feature) {
        const midId = midNode.getId();
        const p1Start = pipe1.get('startNodeId');
        const p1End = pipe1.get('endNodeId');
        const p2Start = pipe2.get('startNodeId');
        const p2End = pipe2.get('endNodeId');

        const outerNode1Id = p1Start === midId ? p1End : p1Start;
        const outerNode2Id = p2Start === midId ? p2End : p2Start;

        const outerNode1 = this.getFeature(outerNode1Id);
        const outerNode2 = this.getFeature(outerNode2Id);

        if (!outerNode1 || !outerNode2) return;

        // Geometry Merge
        const coords1 = (pipe1.getGeometry() as LineString).getCoordinates();
        const coords2 = (pipe2.getGeometry() as LineString).getCoordinates();

        // Order: Outer1 -> Mid -> Outer2
        const segment1 = (p1Start === outerNode1Id) ? coords1 : coords1.reverse();
        const segment2 = (p2Start === midId) ? coords2 : coords2.reverse();
        const mergedCoords = [...segment1, ...segment2.slice(1)];

        // Create New Pipe
        const newPipe = NetworkFactory.createPipe(mergedCoords, outerNode1, outerNode2);
        const newPipeId = newPipe.getId() as string;

        // Preserve properties
        const props = pipe1.getProperties();
        newPipe.set('diameter', props.diameter || 100);
        newPipe.set('roughness', props.roughness || 100);

        // Update System
        const store = useNetworkStore.getState();
        this.vectorSource.addFeature(newPipe);
        store.addFeature(newPipe);

        store.updateNodeConnections(outerNode1Id, newPipeId, 'add');
        store.updateNodeConnections(outerNode2Id, newPipeId, 'add');

        // Delete Old
        this.performStandardDelete(pipe1);
        this.performStandardDelete(pipe2);
        this.performStandardDelete(midNode);
    }

    // =========================================================================
    // STANDARD LOGIC & HELPERS
    // =========================================================================

    private performStandardDelete(feature: Feature) {
        const featureType = feature.get("type");
        const featureId = feature.getId() as string;

        // Ensure visual line is removed for links
        if (featureType === 'pump' || featureType === 'valve') {
            this.removeVisualLinkLine(featureId);
        }

        // Cascade logic
        if (["junction", "tank", "reservoir"].includes(featureType)) {
            this.deleteNodeWithConnectedPipes(feature);
        } else if (["pipe", "pump", "valve"].includes(featureType)) {
            this.deleteLinkAndUpdateNodes(feature);
        }

        // Physical Removal
        if (this.vectorSource.getFeatureById(featureId)) {
            this.vectorSource.removeFeature(feature);
        }

        const networkStore = useNetworkStore.getState();
        networkStore.removeFeature(featureId);
        networkStore.selectFeature(null);
    }

    private removeVisualLinkLine(linkId: string) {
        // 1. Try Deterministic ID
        const visualId = `VIS-${linkId}`;
        let visualLine = this.vectorSource.getFeatureById(visualId);

        // 2. Fallback: Search by Property
        if (!visualLine) {
            visualLine = this.vectorSource.getFeatures().find(
                (f) => f.get('isVisualLink') === true && f.get('parentLinkId') === linkId
            ) || null;
        }

        if (visualLine) {
            this.vectorSource.removeFeature(visualLine);
            const vid = visualLine.getId() as string;
            // Also remove from store to prevent "ghost" re-appearance
            if (vid) useNetworkStore.getState().removeFeature(vid);
            console.log(`[DeleteManager] Visual line removed for ${linkId}`);
        } else {
            console.warn(`[DeleteManager] Visual line NOT FOUND for ${linkId}`);
        }
    }

    private cleanupOrphanNodes(deletedPipe: Feature) {
        const startNodeId = deletedPipe.get('startNodeId');
        const endNodeId = deletedPipe.get('endNodeId');

        [startNodeId, endNodeId].forEach(id => {
            const node = this.getFeature(id);
            if (node && node.get('type') === 'junction') {
                const updatedLinks = useNetworkStore.getState().features.get(id)?.get('connectedLinks') || [];
                if (updatedLinks.length === 0) {
                    this.performStandardDelete(node);
                }
            }
        });
    }

    // --- Helpers ---

    private deleteNodeWithConnectedPipes(node: Feature) {
        let connectedLinks = node.get("connectedLinks") || [];
        const nodeId = node.getId() as string;

        // Fallback if metadata missing
        if (connectedLinks.length === 0) {
            this.vectorSource.getFeatures().forEach(f => {
                if (['pipe', 'pump', 'valve'].includes(f.get('type'))) {
                    if (f.get('startNodeId') == nodeId || f.get('endNodeId') == nodeId) {
                        connectedLinks.push(f.getId());
                    }
                }
            });
        }

        const uniqueLinks = [...new Set(connectedLinks)] as string[];
        uniqueLinks.forEach((linkId: string) => {
            const link = this.getFeature(linkId);
            if (link) {
                // Update other node
                const s = link.get("startNodeId");
                const e = link.get("endNodeId");
                const otherId = s === nodeId ? e : s;
                if (otherId) useNetworkStore.getState().updateNodeConnections(otherId, linkId, "remove");

                // Remove link
                this.vectorSource.removeFeature(link);
                useNetworkStore.getState().removeFeature(linkId);
            }
        });
    }

    private deleteLinkAndUpdateNodes(link: Feature) {
        const linkId = link.getId() as string;
        const start = link.get("startNodeId");
        const end = link.get("endNodeId");
        const store = useNetworkStore.getState();

        [start, end].forEach(nodeId => {
            if (nodeId) {
                const mapNode = this.getFeature(nodeId);
                if (mapNode) {
                    const conns = mapNode.get("connectedLinks") || [];
                    mapNode.set("connectedLinks", conns.filter((id: string) => id !== linkId));
                }
                store.updateNodeConnections(nodeId, linkId, "remove");
            }
        });
    }

    private getFeature(id: string): Feature | undefined {
        return this.vectorSource.getFeatureById(id) ||
            this.vectorSource.getFeatures().find(f => f.getId() === id);
    }

    private getConnectedLinks(node: Feature): string[] {
        return node.get('connectedLinks') || [];
    }

    private updateLineGeometryStart(line: Feature, newStart: number[]) {
        const geom = line.getGeometry() as LineString;
        const coords = geom.getCoordinates();
        coords[0] = newStart;
        geom.setCoordinates(coords);
    }

    private updateLineGeometryEnd(line: Feature, newEnd: number[]) {
        const geom = line.getGeometry() as LineString;
        const coords = geom.getCoordinates();
        coords[coords.length - 1] = newEnd;
        geom.setCoordinates(coords);
    }

    public cleanup() {
        if (this.keyboardHandler) {
            document.removeEventListener("keydown", this.keyboardHandler);
            this.keyboardHandler = null;
        }
    }
}