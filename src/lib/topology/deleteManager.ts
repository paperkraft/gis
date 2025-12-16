import Map from "ol/Map";
import VectorSource from "ol/source/Vector";
import { Feature } from "ol";
import { useNetworkStore } from "@/store/networkStore";
export class DeleteManager {
    private map: Map;
    private vectorSource: VectorSource;
    private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

    // Callback for showing modal (will be set from React component)
    public onDeleteRequest: ((feature: Feature) => void) | null = null;

    constructor(map: Map, vectorSource: VectorSource) {
        this.map = map;
        this.vectorSource = vectorSource;
        this.setupKeyboardShortcuts();
    }

    private setupKeyboardShortcuts() {
        this.keyboardHandler = (e: KeyboardEvent) => {
            // Only trigger if not in input/textarea
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement ||
                (e.target as HTMLElement).contentEditable === "true"
            ) {
                return;
            }

            if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                this.deleteSelectedFeature();
            }
        };

        document.addEventListener("keydown", this.keyboardHandler);
    }

    public deleteSelectedFeature() {
        const networkStore = useNetworkStore.getState();
        const selectedFeatureId = networkStore.selectedFeatureId;

        if (!selectedFeatureId) {
            console.log("No feature selected for deletion");
            return;
        }

        const feature = this.vectorSource
            .getFeatures()
            .find((f) => f.getId() === selectedFeatureId);

        if (feature && this.onDeleteRequest) {
            this.onDeleteRequest(feature);
        }
    }

    public getCascadeInfo(feature: Feature): { willCascade: boolean; message: string } {
        const featureType = feature.get("type");

        if (["junction", "tank", "reservoir"].includes(featureType)) {
            const connectedLinks = feature.get("connectedLinks") || [];
            if (connectedLinks.length > 0) {
                return {
                    willCascade: true,
                    message: `This node has ${connectedLinks.length} connected pipe(s). All connected pipes will also be deleted.`,
                };
            }
        }

        return { willCascade: false, message: "" };
    }

    public executeDelete(feature: Feature) {
        window.dispatchEvent(new CustomEvent('takeSnapshot'));
        const featureType = feature.get("type");
        const featureId = feature.getId() as string;

        // If deleting pump/valve, also remove visual link line
        if (featureType === 'pump' || featureType === 'valve') {
            this.removeVisualLinkLine(featureId);
        }

        // Perform topology-aware deletion
        this.handleFeatureDeletion(feature);

        // Remove from vector source
        if (this.vectorSource.getFeatureById(featureId)) {
            this.vectorSource.removeFeature(feature);
        }

        // Remove from Zustand store
        const networkStore = useNetworkStore.getState();
        networkStore.removeFeature(featureId);

        // Clear selection
        networkStore.selectFeature(null);

        console.log(`${featureType} (${featureId}) deleted successfully`);
    }

    private removeVisualLinkLine(linkId: string) {
        const features = this.vectorSource.getFeatures();
        // Try finding by deterministic ID first (primary logic)
        const visualId = `VIS-${linkId}`;
        let visualLine = this.vectorSource.getFeatureById(visualId);

        // Fallback search if ID scheme wasn't used historically
        if (!visualLine) {
            visualLine = features.find(
                (f) => f.get('isVisualLink') && f.get('parentLinkId') === linkId
            ) || null;
        }

        if (visualLine) {
            this.vectorSource.removeFeature(visualLine);
            // CRITICAL: Remove from store to persist deletion
            const visualLineId = visualLine.getId() as string;
            if (visualLineId) {
                useNetworkStore.getState().removeFeature(visualLineId);
            }
            console.log('  🗑️ Visual link line removed');
        }
    }

    private handleFeatureDeletion(feature: Feature) {
        const featureType = feature.get("type");

        if (["junction", "tank", "reservoir"].includes(featureType)) {
            this.deleteNodeWithConnectedPipes(feature);
        } else if (["pipe", "pump", "valve"].includes(featureType)) {
            this.deleteLinkAndUpdateNodes(feature);
        }
    }

    private deleteNodeWithConnectedPipes(node: Feature) {
        let connectedLinks = node.get("connectedLinks") || [];
        const nodeId = node.getId() as string;

        // --- FALLBACK: If topology metadata is missing, scan the vector source ---
        if (connectedLinks.length === 0) {
            console.warn("DeleteManager: Node has no connectedLinks metadata. Scanning vector source...");
            this.vectorSource.getFeatures().forEach(f => {
                if (['pipe', 'pump', 'valve'].includes(f.get('type'))) {
                    // Check loosely for ID string match
                    if (f.get('startNodeId') == nodeId || f.get('endNodeId') == nodeId) {
                        connectedLinks.push(f.getId());
                    }
                }
            });
        }

        const networkStore = useNetworkStore.getState();

        // Use a Set to ensure unique IDs and avoid duplicate deletion attempts
        const uniqueLinks = Array.from(new Set(connectedLinks)) as string[];

        uniqueLinks.forEach((linkId: string) => {
            const link = this.vectorSource.getFeatures().find((f) => f.getId() === linkId);

            if (link) {
                const startNodeId = link.get("startNodeId");
                const endNodeId = link.get("endNodeId");
                const otherNodeId = startNodeId === nodeId ? endNodeId : startNodeId;

                if (otherNodeId) {
                    // const otherNode = this.vectorSource
                    //     .getFeatures()
                    //     .find(
                    //         (f) =>
                    //             ["junction", "tank", "reservoir"].includes(f.get("type")) &&
                    //             f.getId() === otherNodeId
                    //     );

                    // if (otherNode) {
                    // }
                    networkStore.updateNodeConnections(otherNodeId, linkId, "remove");
                }

                this.vectorSource.removeFeature(link);
                networkStore.removeFeature(linkId);

                console.log(`Cascade deleted pipe: ${linkId}`);
            }
        });
    }

    private deleteLinkAndUpdateNodes(link: Feature) {
        const linkId = link.getId() as string;
        const startNodeId = link.get("startNodeId");
        const endNodeId = link.get("endNodeId");
        const networkStore = useNetworkStore.getState();

        [startNodeId, endNodeId].forEach(nodeId => {
            if (nodeId) {
                // 1. UPDATE MAP FEATURE (Critical for Topology)
                // We must find the feature in the vector source to update its metadata
                const mapNode = this.vectorSource.getFeatureById(nodeId) ||
                    this.vectorSource.getFeatures().find(f => f.getId() === nodeId);
                if (mapNode) {
                    const conns = mapNode.get("connectedLinks") || [];
                    const newConns = conns.filter((id: string) => id !== linkId);
                    mapNode.set("connectedLinks", newConns);
                }
                networkStore.updateNodeConnections(nodeId, linkId, "remove");
            }
        });
    }

    public deleteFeatures(features: Feature[]) {
        if (features.length === 0) return;

        const networkStore = useNetworkStore.getState();

        features.forEach((feature) => {
            this.handleFeatureDeletion(feature);
            this.vectorSource.removeFeature(feature);
            networkStore.removeFeature(feature.getId() as string);
        });

        networkStore.selectFeature(null);
        console.log(`Deleted ${features.length} features successfully`);
    }

    public cleanup() {
        if (this.keyboardHandler) {
            document.removeEventListener("keydown", this.keyboardHandler);
            this.keyboardHandler = null;
        }
    }
}
