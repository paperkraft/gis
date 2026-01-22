import { Point, LineString } from 'ol/geom';
import { useNetworkStore } from '@/store/networkStore';

export interface TopologyError {
    id: string;
    featureId: string;
    type: 'ERROR' | 'WARNING';
    message: string;
    coordinate: number[];
}

export class TopologyValidator {

    static validate(): TopologyError[] {
        const store = useNetworkStore.getState();
        const features = Array.from(store.features.values());
        const errors: TopologyError[] = [];

        // Helper to check connections
        const getNodeConnections = (nodeId: string) => {
            const node = store.features.get(nodeId);
            if (!node) return [];
            return node.get('connectedLinks') || [];
        };

        features.forEach(feature => {
            const type = feature.get('type');
            const id = feature.getId() as string;

            // 1. CHECK ORPHAN NODES (Nodes with 0 connections)
            if (['junction', 'tank', 'reservoir'].includes(type)) {
                const connections = feature.get('connectedLinks') || [];
                if (connections.length === 0) {
                    errors.push({
                        id: `orphan-${id}`,
                        featureId: id,
                        type: 'WARNING',
                        message: 'Disconnected Node (Orphan)',
                        coordinate: (feature.getGeometry() as Point).getCoordinates()
                    });
                }
            }

            // 2. CHECK INVALID PIPES
            if (type === 'pipe') {
                const geom = feature.getGeometry() as LineString;
                const length = geom.getLength();
                const startId = feature.get('startNodeId');
                const endId = feature.get('endNodeId');

                // A. Zero Length
                if (length < 0.1) {
                    errors.push({
                        id: `zero-${id}`,
                        featureId: id,
                        type: 'ERROR',
                        message: 'Pipe length is near zero',
                        coordinate: geom.getCoordinateAt(0.5)
                    });
                }

                // B. Missing Nodes
                if (!store.features.has(startId) || !store.features.has(endId)) {
                    errors.push({
                        id: `broken-${id}`,
                        featureId: id,
                        type: 'ERROR',
                        message: 'Pipe connected to missing node',
                        coordinate: geom.getCoordinateAt(0.5)
                    });
                }

                // C. Self-Loop
                if (startId === endId) {
                    errors.push({
                        id: `loop-${id}`,
                        featureId: id,
                        type: 'ERROR',
                        message: 'Pipe connects to itself',
                        coordinate: geom.getCoordinateAt(0.5)
                    });
                }
            }

            // 3. CHECK PUMPS/VALVES (Must have 2 connections)
            if (['pump', 'valve'].includes(type)) {
                const startId = feature.get('startNodeId');
                const endId = feature.get('endNodeId');

                // Check if Inlet/Outlet nodes actually exist
                if (!store.features.has(startId) || !store.features.has(endId)) {
                    errors.push({
                        id: `link-broken-${id}`,
                        featureId: id,
                        type: 'ERROR',
                        message: 'Link missing inlet or outlet',
                        coordinate: (feature.getGeometry() as Point).getCoordinates()
                    });
                }
            }
        });

        return errors;
    }
}