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
        this.vectorSource.removeFeature(feature);

        // Remove from Zustand store
        const networkStore = useNetworkStore.getState();
        networkStore.removeFeature(featureId);

        // Clear selection
        networkStore.selectFeature(null);

        console.log(`${featureType} (${featureId}) deleted successfully`);
    }

    private removeVisualLinkLine(linkId: string) {
        const features = this.vectorSource.getFeatures();
        const visualLine = features.find(
            (f) => f.get('isVisualLink') && f.get('parentLinkId') === linkId
        );

        if (visualLine) {
            this.vectorSource.removeFeature(visualLine);
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
        const connectedLinks = node.get("connectedLinks") || [];
        const networkStore = useNetworkStore.getState();

        connectedLinks.forEach((linkId: string) => {
            const link = this.vectorSource.getFeatures().find((f) => f.getId() === linkId);

            if (link) {
                const startNodeId = link.get("startNodeId");
                const endNodeId = link.get("endNodeId");
                const otherNodeId = startNodeId === node.getId() ? endNodeId : startNodeId;

                if (otherNodeId) {
                    const otherNode = this.vectorSource
                        .getFeatures()
                        .find(
                            (f) =>
                                ["junction", "tank", "reservoir"].includes(f.get("type")) &&
                                f.getId() === otherNodeId
                        );

                    if (otherNode) {
                        networkStore.updateNodeConnections(otherNodeId, linkId, "remove");
                    }
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
                const node = networkStore.getFeatureById(nodeId);
                if (node) {
                    const conns = node.get("connectedLinks") || [];
                    const newConns = conns.filter((id: string) => id !== linkId);

                    // Update OpenLayers Feature
                    node.set("connectedLinks", newConns);

                    // Update Store (triggers reactivity)
                    networkStore.updateNodeConnections(nodeId, linkId, "remove");

                    // OPTIONAL: Auto-delete orphan nodes?
                    // GIS tools often ask: "Delete isolated nodes?" 
                    // If newConns.length === 0, you might highlight this node as an orphan.
                }
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
