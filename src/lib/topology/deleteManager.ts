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

        // 1. Find the external pipe neighbors and work out the best merge-point position.
        //    The pump has 2 internal inlet/outlet junctions. The external pipes connect to those
        //    internal junctions. We want to place the merged junction where the EXTERNAL pipes meet.

        const allNeighborIds = [
            ...this.getConnectedLinksStore(startNodeId),
            ...this.getConnectedLinksStore(endNodeId)
        ].filter(id => id !== linkId);

        // For each external pipe, find which end connects to the internal junction and use the OTHER end's coordinate
        let mergePoint: number[] | null = null;

        // Strategy: place the merged junction at the midpoint of the external pipe far-ends.
        const farEndCoords: number[][] = [];
        allNeighborIds.forEach(neighborId => {
            const pipeData = store.features.get(neighborId);
            if (!pipeData) return;
            const pStartId = pipeData.properties?.startNodeId;
            const pEndId = pipeData.properties?.endNodeId;

            // The far-end node is the one NOT connected to this pump's internal nodes
            const farNodeId = (pStartId === startNodeId || pStartId === endNodeId) ? pEndId : pStartId;
            if (!farNodeId) return;
            const farNodeData = store.features.get(farNodeId);
            if (farNodeData) {
                farEndCoords.push(farNodeData.geometry as number[]);
            }
        });

        if (farEndCoords.length >= 2) {
            // Midpoint between the two external far-end nodes
            mergePoint = [
                (farEndCoords[0][0] + farEndCoords[1][0]) / 2,
                (farEndCoords[0][1] + farEndCoords[1][1]) / 2
            ];
        } else {
            // Fallback: midpoint between the pump's two internal nodes
            const c1 = (startNode.getGeometry() as Point).getCoordinates();
            const c2 = (endNode.getGeometry() as Point).getCoordinates();
            mergePoint = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2];
        }

        // 2. Create New Junction at merge point
        const newJunction = NetworkFactory.createNode('junction', mergePoint);
        const newJunctionId = newJunction.id as string;

        const mapJunction = new Feature({
            geometry: new Point(mergePoint),
            ...newJunction.properties
        });
        mapJunction.setId(newJunction.id);
        mapJunction.set('type', newJunction.type);

        this.vectorSource.addFeature(mapJunction);
        store.addFeature(newJunction);

        // 3. Reconnect Neighbors to New Junction
        allNeighborIds.forEach(neighborId => {
            // Always read fresh state — store may have been mutated by previous addFeature/updateFeature calls
            const freshStore = useNetworkStore.getState();
            const pipeStoreData = freshStore.features.get(neighborId);
            if (!pipeStoreData) return;

            // Read node IDs from store properties (authoritative), not from OL feature.get()
            const pStartId = pipeStoreData.properties?.startNodeId || pipeStoreData.properties?.source;
            const pEndId = pipeStoreData.properties?.endNodeId || pipeStoreData.properties?.target;

            // Get current pipe coordinates from fresh store
            const pipeCoords = [...((pipeStoreData.geometry as number[][]) || [])];

            let modified = false;

            if (pStartId === startNodeId || pStartId === endNodeId) {
                // Update BOTH startNodeId AND source — saveCurrentProject reads `props.source || props.startNodeId`
                store.updateFeature(neighborId, { startNodeId: newJunctionId, source: newJunctionId });
                if (pipeCoords.length >= 2) pipeCoords[0] = mergePoint!;

                store.updateNodeConnections(pStartId, neighborId, 'remove');
                store.updateNodeConnections(newJunctionId, neighborId, 'add');
                modified = true;
            } else if (pEndId === startNodeId || pEndId === endNodeId) {
                // Update BOTH endNodeId AND target — saveCurrentProject reads `props.target || props.endNodeId`
                store.updateFeature(neighborId, { endNodeId: newJunctionId, target: newJunctionId });
                if (pipeCoords.length >= 2) pipeCoords[pipeCoords.length - 1] = mergePoint!;

                store.updateNodeConnections(pEndId, neighborId, 'remove');
                store.updateNodeConnections(newJunctionId, neighborId, 'add');
                modified = true;
            }

            if (modified && pipeCoords.length >= 2) {
                // Update map feature geometry
                const pipeMapFeature = this.getFeature(neighborId);
                if (pipeMapFeature) {
                    const pipeGeom = pipeMapFeature.getGeometry() as LineString;
                    if (pipeGeom) {
                        pipeGeom.setCoordinates(pipeCoords);
                        const newLen = Math.round(pipeGeom.getLength());
                        pipeMapFeature.set('length', newLen);
                        store.updateFeature(neighborId, { geometry: pipeCoords, length: newLen });
                    }
                } else {
                    // Map feature not in source — update store geometry directly
                    const newLen = Math.round(new LineString(pipeCoords).getLength());
                    store.updateFeature(neighborId, { geometry: pipeCoords, length: newLen });
                }
            }
        });

        // 4. Delete Old Components (Pump, J_in, J_out, Visual)
        const visualId = `VIS-${linkId}`;
        const visual = this.getFeature(visualId);

        if (visual) { this.vectorSource.removeFeature(visual); store.removeFeature(visualId); }
        this.vectorSource.removeFeature(link); store.removeFeature(linkId);
        if (startNode) { this.vectorSource.removeFeature(startNode); store.removeFeature(startNodeId); }
        if (endNode) { this.vectorSource.removeFeature(endNode); store.removeFeature(endNodeId); }
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

            // Then check if nodes are now orphans — read FRESH store state after disconnect
            [startId, endId].forEach(nodeId => {
                const freshStore = useNetworkStore.getState();
                const nodeData = freshStore.features.get(nodeId);
                if (nodeData) {
                    const conns = nodeData.properties?.connectedLinks || [];
                    if (conns.length === 0) {
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