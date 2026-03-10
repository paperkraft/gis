import { FeatureType, NetworkFeatureData } from '@/types/network';
import { useNetworkStore } from '@/store/networkStore';
import { COMPONENT_TYPES } from '@/constants/networkComponents';
import { transform } from 'ol/proj';

export class NetworkFactory {

    /**
     * Create a standard Node (Junction, Tank, Reservoir)
     */
    static createNode(type: FeatureType, coordinate: number[], existingId?: string, props: any = {}): NetworkFeatureData {
        const store = useNetworkStore.getState();
        const id = existingId || store.generateUniqueId(type);

        return {
            id,
            type,
            geometry: coordinate,
            properties: {
                ...COMPONENT_TYPES[type].defaultProperties,
                ...props,
                type,
                id,
                label: id,
                connectedLinks: [] // Critical for topology
            }
        };
    }

    /**
       * Create a Link (Pipe)
       * @param coordinates - Fallback coordinates (usually just [start, end])
       * @param startNodeId - The start node ID
       * @param endNodeId - The end node ID
       * @param existingId - ID from database
       * @param props - Properties from database (contains 'geometry' array)
       */
    static createPipe(coordinates: number[][], startNodeId: string, endNodeId: string, existingId?: string, props: any = {}): NetworkFeatureData {

        let finalCoordinates = coordinates;

        // 1. CHECK FOR SAVED VERTICES
        if (props.geometry && Array.isArray(props.geometry) && props.geometry.length > 1) {
            // PROJECTION FIX (EPSG:4326 -> EPSG:3857)
            finalCoordinates = props.geometry.map((coord: number[]) => {
                return transform(coord, 'EPSG:4326', 'EPSG:3857');
            });
        }

        const store = useNetworkStore.getState();
        const id = existingId || store.generateUniqueId('pipe');

        // CLEANUP PROPERTIES
        const { geometry, ...cleanProps } = props;

        // Estimate length roughly (Euclidean distance, should use ol/sphere getLength in real scenario)
        let calcLength = 0;
        for (let i = 0; i < finalCoordinates.length - 1; i++) {
            const dx = finalCoordinates[i + 1][0] - finalCoordinates[i][0];
            const dy = finalCoordinates[i + 1][1] - finalCoordinates[i][1];
            calcLength += Math.sqrt(dx * dx + dy * dy);
        }

        const length = props.length || Math.round(calcLength);

        return {
            id,
            type: 'pipe',
            geometry: finalCoordinates,
            properties: {
                ...COMPONENT_TYPES.pipe.defaultProperties,
                ...cleanProps,
                type: 'pipe',
                id,
                label: cleanProps.label || id,
                startNodeId: startNodeId,
                endNodeId: endNodeId,
                length
            }
        };
    }

    /**
     * Create a Complex Link (Pump/Valve) AND its Visual Line
     * Returns an array of features [TheComponent, TheVisualLine]
     */
    static createComplexLink(type: 'pump' | 'valve', startNodeData: NetworkFeatureData, endNodeData: NetworkFeatureData, existingId?: string, props: any = {}): NetworkFeatureData[] {
        const store = useNetworkStore.getState();
        const id = existingId || store.generateUniqueId(type);

        const start = startNodeData.geometry as number[];
        const end = endNodeData.geometry as number[];

        // 1. Create the Component (Point at midpoint)
        const mid = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
        const component: NetworkFeatureData = {
            id,
            type,
            geometry: mid,
            properties: {
                ...COMPONENT_TYPES[type].defaultProperties,
                ...props,
                type,
                id,
                label: id,
                startNodeId: startNodeData.id,
                endNodeId: endNodeData.id
            }
        };

        // 2. Create the Visual Line (Dashed connection)
        const visualId = `VIS-${id}`;
        const visualLine: NetworkFeatureData = {
            id: visualId,
            type: 'visual' as any, // Visual helper — not a real structural pipe
            geometry: [start, end],
            properties: {
                type: 'visual',
                isVisualLink: true,
                parentLinkId: id,
                linkType: type,
                id: visualId,
                startNodeId: startNodeData.id,
                endNodeId: endNodeData.id
            }
        };

        return [component, visualLine];
    }
}