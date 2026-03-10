import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import VectorSource from 'ol/source/Vector';
import { NetworkFactory } from '@/lib/topology/networkFactory';
import { useNetworkStore } from '@/store/networkStore';
import { useUIStore } from '@/store/uiStore';
import { PipeDrawingManager } from './pipeDrawingManager';

export class DeleteManager {
    private vectorSource: VectorSource;
    private pipeDrawingManager: PipeDrawingManager | null = null;
    private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

    constructor(vectorSource: VectorSource, pipeDrawingManager?: PipeDrawingManager) {
        this.vectorSource = vectorSource;
        this.pipeDrawingManager = pipeDrawingManager || null;
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

    // ==========================================
    // 1. PUBLIC ENTRY POINTS
    // ==========================================

    public deleteSelectedFeature() {
        const store = useNetworkStore.getState();
        const { selectedFeatureId, selectedFeatureIds } = store as any;
        const ids = (selectedFeatureIds && selectedFeatureIds.length > 0) ? selectedFeatureIds : (selectedFeatureId ? [selectedFeatureId] : []);
        if (ids.length === 0) return;

        const features: Feature[] = [];
        ids.forEach((id: string) => {
            let f = this.getFeature(id);
            if (!f) {
                const storeData = store.features.get(id);
                if (storeData) {
                    // Since we need an OL Feature to initiate delete, try to recreate it or just create a mock Feature with the right ID
                    f = new Feature({ ...storeData.properties, geometry: undefined });
                    f.setId(id);
                    f.set('type', storeData.type);
                }
            }
            if (f) features.push(f);
        });
        this.initiateDelete(features);
    }

    public deleteFeature(feature: Feature) {
        this.initiateDelete([feature]);
    }

    // ==========================================
    // 2. CENTRAL SAFETY LOGIC
    // ==========================================

    private initiateDelete(features: Feature[]) {
        if (features.length === 0) return;

        // Calculate Impact (Orphans, Cascades, Pump Merges)
        const impact = this.calculateImpact(features);

        useUIStore.getState().setDeleteContext({
            features: features,
            impact: impact,
            onCancel: () => useUIStore.getState().setDeleteContext(null),
            onConfirm: () => {
                this.executeTransaction(features);
                useUIStore.getState().setDeleteContext(null);
            }
        });
    }

    // Dry run to predict Orphans and Merges
    private calculateImpact(selectedFeatures: Feature[]) {
        const store = useNetworkStore.getState();
        const itemsToDelete = new Set<string>();

        let orphanCount = 0;
        let isMerge = false;

        // 1. Mark selected items
        selectedFeatures.forEach(f => itemsToDelete.add(f.getId() as string));

        // 2. Simulate Dependencies
        selectedFeatures.forEach(feature => {
            const type = feature.get('type');
            const id = feature.getId() as string;

            // CASE: NODE DELETE -> Delete Connected Pipes (Cascade)
            if (['junction', 'tank', 'reservoir'].includes(type)) {
                const storeNode = store.features.get(id);
                const connectedLinks = storeNode?.properties?.connectedLinks || [];
                connectedLinks.forEach((linkId: string) => {
                    itemsToDelete.add(linkId);
                });
            }

            // CASE: PIPE DELETE -> Delete Orphan Nodes
            if (type === 'pipe') {
                const startId = feature.get('startNodeId');
                const endId = feature.get('endNodeId');

                [startId, endId].forEach(nodeId => {
                    if (itemsToDelete.has(nodeId)) return; // Already deleting this node
                    const nodeData = store.features.get(nodeId);
                    if (!nodeData) return;
                    const conns = nodeData?.properties?.connectedLinks || [];
                    // Check if node has ONLY this pipe (and maybe other deleted pipes)
                    const activeConns = conns.filter((lid: string) => {
                        const strLid = String(lid);
                        return !itemsToDelete.has(strLid) && strLid !== id;
                    });

                    if (activeConns.length === 0) {
                        itemsToDelete.add(nodeId);
                        orphanCount++;
                    }
                });
            }

            // CASE: PUMP/VALVE DELETE -> Merge Nodes
            if (['pump', 'valve'].includes(type)) {
                // If we delete a pump, we merge 2 nodes into 1.
                // This deletes: Pump + Visual + 2 Nodes.
                // But creates: 1 New Node.
                // For impact summary, we flag 'isMerge'
                isMerge = true;
                const visualId = `VIS-${id}`;
                itemsToDelete.add(visualId);

                // Technically we delete 2 nodes, but we replace them. 
                // We'll let the user know via the 'isMerge' flag.
            }
        });

        const totalCount = itemsToDelete.size;
        const cascadeCount = Math.max(0, totalCount - selectedFeatures.length - orphanCount);

        const uniqueTypes = new Set(selectedFeatures.map(f => f.get('type')));
        let primaryType = uniqueTypes.size === 1 ? Array.from(uniqueTypes)[0] : "Mixed";
        primaryType = primaryType.charAt(0).toUpperCase() + primaryType.slice(1);

        return { totalCount, cascadeCount, orphanCount, isMerge, primaryType, affectedIds: Array.from(itemsToDelete) };
    }

    // ==========================================
    // 3. EXECUTION LOGIC
    // ==========================================

    private executeTransaction(features: Feature[]) {
        const store = useNetworkStore.getState();
        store.startTransaction();

        try {
            features.forEach(feature => {
                const type = feature.get('type');

                if (['pump', 'valve'].includes(type)) {
                    // Scenario 3: Pump/Valve -> Merge Logic
                    this.deleteLinkAndMergeNodes(feature);
                } else {
                    // Scenario 1 & 2: Recursive Delete with Orphan Check
                    this.performRecursiveDelete(feature);
                }
            });

            store.selectFeature(null);
            store.selectFeatures([]);
            store.commitTransaction();
        } catch (e) {
            console.error("Delete transaction failed", e);
            store.commitTransaction();
        }
    }

    // Scenario 3: Delete Pump/Valve -> Merge Nodes
    private deleteLinkAndMergeNodes(link: Feature) {
        const store = useNetworkStore.getState();
        const linkId = link.getId() as string;
        const startNodeId = link.get('startNodeId');
        const endNodeId = link.get('endNodeId');

        const startNode = this.getFeature(startNodeId);
        const endNode = this.getFeature(endNodeId);

        if (!startNode || !endNode) {
            this.performRecursiveDelete(link);
            return;
        }

        // 1. Calculate Midpoint & Create New Junction
        const c1 = (startNode.getGeometry() as Point).getCoordinates();
        const c2 = (endNode.getGeometry() as Point).getCoordinates();
        const midPoint = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2];

        const newJunction = NetworkFactory.createNode('junction', midPoint);
        const newJunctionId = newJunction.id as string;

        const mapJunction = new Feature({
            geometry: new Point(midPoint),
            ...newJunction.properties
        });
        mapJunction.setId(newJunction.id);
        mapJunction.set('type', newJunction.type);

        this.vectorSource.addFeature(mapJunction);
        store.addFeature(newJunction);

        // 2. Identify Neighbors (The two pipes connecting to the pump)
        const neighborIds = [
            ...this.getConnectedLinksStore(startNodeId),
            ...this.getConnectedLinksStore(endNodeId)
        ].filter(id => id !== linkId);

        const neighbors: Feature[] = [];

        // 3. Reconnect Neighbors to New Junction
        neighborIds.forEach(neighborId => {
            let pipeFeature = this.getFeature(neighborId);
            if (!pipeFeature) {
                const storeData = store.features.get(neighborId);
                if (storeData) {
                    pipeFeature = new Feature({ ...storeData.properties, geometry: undefined });
                    pipeFeature.setId(neighborId);
                    pipeFeature.set('type', storeData.type);
                }
            }
            if (!pipeFeature) return;

            neighbors.push(pipeFeature); // Track for potential merge later

            const pipeGeom = pipeFeature.getGeometry() as LineString;
            // Clone coords to avoid reference issues
            const coords = pipeGeom.getCoordinates();
            const pStartId = pipeFeature.get('startNodeId');
            const pEndId = pipeFeature.get('endNodeId');

            let modified = false;

            // Update Start Point
            if (pStartId === startNodeId || pStartId === endNodeId) {
                pipeFeature.set('startNodeId', newJunctionId);
                store.updateFeature(neighborId, { startNodeId: newJunctionId });
                coords[0] = midPoint;

                // Update Topology
                store.updateNodeConnections(pStartId, neighborId, 'remove');
                store.updateNodeConnections(newJunctionId, neighborId, 'add');
                modified = true;

            } else if (pEndId === startNodeId || pEndId === endNodeId) {
                pipeFeature.set('endNodeId', newJunctionId);
                store.updateFeature(neighborId, { endNodeId: newJunctionId });
                coords[coords.length - 1] = midPoint;

                store.updateNodeConnections(pEndId, neighborId, 'remove');
                store.updateNodeConnections(newJunctionId, neighborId, 'add');
                modified = true;
            }

            if (modified) {
                pipeGeom.setCoordinates(coords);
                // Recalculate length after stretch
                const newLen = Math.round(pipeGeom.getLength());
                pipeFeature.set('length', newLen);
                store.updateFeature(neighborId, { geometry: coords, length: newLen });
            }

        });

        // 4. Delete Old Components (Pump, J_in, J_out, Visual)
        const visualId = `VIS-${linkId}`;
        const visual = this.getFeature(visualId);

        // Remove strictly
        if (visual) { this.vectorSource.removeFeature(visual); store.removeFeature(visualId); }
        this.vectorSource.removeFeature(link); store.removeFeature(linkId);
        this.vectorSource.removeFeature(startNode); store.removeFeature(startNodeId);
        this.vectorSource.removeFeature(endNode); store.removeFeature(endNodeId);

        // ---------------------------------------------------------
        // AUTO-HEAL LOGIC: Merge pipes if they are identical
        // ---------------------------------------------------------
        // if (neighbors.length === 2 && this.pipeDrawingManager) {
        //     const [pipeA, pipeB] = neighbors;

        //     // Check Compatibility (Diameter, Material, Roughness)
        //     const propsA = pipeA.getProperties();
        //     const propsB = pipeB.getProperties();

        //     const isCompatible =
        //         propsA.diameter === propsB.diameter &&
        //         propsA.material === propsB.material &&
        //         propsA.roughness === propsB.roughness;

        //     if (isCompatible) {
        //         // Perform the merge immediately using the existing logic
        //         // pipeA serves as the template for the new merged pipe
        //         this.pipeDrawingManager.mergePipes(pipeA, pipeB, newJunction, true);
        //     }
        // }
    }

    // Scenario 1 & 2: Recursive Delete
    private performRecursiveDelete(feature: Feature) {
        const store = useNetworkStore.getState();
        const featureId = feature.getId() as string;
        const type = feature.get('type');

        if (!store.features.has(featureId)) return; // Already deleted

        // A. If Node: Delete Connected Pipes
        if (['junction', 'tank', 'reservoir'].includes(type)) {
            const connectedLinks = this.getConnectedLinksStore(featureId);
            connectedLinks.forEach(linkId => {
                let linkFeature = this.getFeature(linkId);
                if (!linkFeature) {
                    const storeData = store.features.get(linkId);
                    if (storeData) {
                        linkFeature = new Feature({ ...storeData.properties, geometry: undefined });
                        linkFeature.setId(linkId);
                        linkFeature.set('type', storeData.type);
                    }
                }
                if (linkFeature) this.performRecursiveDelete(linkFeature);
            });
        }

        // B. If Pipe: Check for Orphan Nodes AFTER delete (Simulated here by checking state)
        if (type === 'pipe') {
            const startId = feature.get('startNodeId');
            const endId = feature.get('endNodeId');

            // First delete the pipe
            this.disconnectLinkFromNode(startId, featureId);
            this.disconnectLinkFromNode(endId, featureId);

            // Then check if nodes are now orphans
            [startId, endId].forEach(nodeId => {
                const nodeData = store.features.get(nodeId);
                if (nodeData) {
                    const conns = nodeData.properties?.connectedLinks || [];
                    // Since we just disconnected, if length is 0, it's an orphan
                    if (conns.length === 0) {
                        // Mock Feature for delete
                        const nodeFeat = new Feature();
                        nodeFeat.setId(nodeId);
                        nodeFeat.set('type', nodeData.type);
                        this.performRecursiveDelete(nodeFeat);
                    }
                }
            });
        }

        // C. Pump/Valve Visuals
        if (['pump', 'valve'].includes(type)) {
            const visualId = `VIS-${featureId}`;
            const visual = this.getFeature(visualId);
            if (visual) {
                this.vectorSource.removeFeature(visual);
                store.removeFeature(visualId);
            }
            // Disconnect from nodes
            this.disconnectLinkFromNode(feature.get('startNodeId'), featureId);
            this.disconnectLinkFromNode(feature.get('endNodeId'), featureId);
        }

        // Final Delete
        const mapFeature = this.vectorSource.getFeatureById(featureId);
        if (mapFeature) this.vectorSource.removeFeature(mapFeature);
        store.removeFeature(featureId);
    }

    private getFeature(id: string): Feature | undefined {
        return this.vectorSource.getFeatureById(id) ||
            this.vectorSource.getFeatures().find(f => f.getId() === id);
    }

    private getConnectedLinks(node: Feature): string[] {
        return node.get('connectedLinks') || [];
    }

    private getConnectedLinksStore(nodeId: string): string[] {
        const store = useNetworkStore.getState();
        const storeNode = store.features.get(nodeId);
        return storeNode?.properties?.connectedLinks || [];
    }

    private disconnectLinkFromNode(nodeId: string, linkId: string) {
        if (!nodeId) return;
        const store = useNetworkStore.getState();
        store.updateNodeConnections(nodeId, linkId, "remove");

        // Try map
        const nodeFeature = this.getFeature(nodeId);
        if (nodeFeature) {
            const conns = nodeFeature.get("connectedLinks") || [];
            nodeFeature.set("connectedLinks", conns.filter((id: string) => id !== linkId));
        }
    }

    public cleanup() {
        if (this.keyboardHandler) {
            document.removeEventListener("keydown", this.keyboardHandler);
            this.keyboardHandler = null;
        }
    }
}