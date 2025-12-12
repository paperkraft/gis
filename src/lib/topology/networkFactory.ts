import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { COMPONENT_TYPES } from '@/constants/networkComponents';
import { useNetworkStore } from '@/store/networkStore';
import { FeatureType } from '@/types/network';

export class NetworkFactory {

    /**
     * Create a standard Node (Junction, Tank, Reservoir)
     */
    static createNode(type: FeatureType, coordinate: number[], existingId?: string, props: any = {}): Feature {
        const feature = new Feature({ geometry: new Point(coordinate) });

        // Use existing ID (Import) or generate new (Draw)
        const store = useNetworkStore.getState();
        const id = existingId || store.generateUniqueId(type);

        feature.setId(id);
        feature.setProperties({
            ...COMPONENT_TYPES[type].defaultProperties,
            ...props,
            type,
            id,
            label: id,
            connectedLinks: [] // Critical for topology
        });

        return feature;
    }

    /**
     * Create a Link (Pipe)
     */
    static createPipe(coordinates: number[][], startNode: Feature, endNode: Feature, existingId?: string, props: any = {}): Feature {
        const feature = new Feature({ geometry: new LineString(coordinates) });

        const store = useNetworkStore.getState();
        const id = existingId || store.generateUniqueId('pipe');

        // Calculate length automatically if not provided
        const geom = feature.getGeometry() as LineString;
        const length = props.length || Math.round(geom.getLength());

        feature.setId(id);
        feature.setProperties({
            ...COMPONENT_TYPES.pipe.defaultProperties,
            ...props,
            type: 'pipe',
            id,
            label: id,
            startNodeId: startNode.getId(),
            endNodeId: endNode.getId(),
            length
        });

        return feature;
    }

    /**
     * Create a Complex Link (Pump/Valve) AND its Visual Line
     * Returns an array of features [TheComponent, TheVisualLine]
     */
    static createComplexLink(type: 'pump' | 'valve', startNode: Feature, endNode: Feature, existingId?: string, props: any = {}): Feature[] {
        const store = useNetworkStore.getState();
        const id = existingId || store.generateUniqueId(type);

        const start = (startNode.getGeometry() as Point).getCoordinates();
        const end = (endNode.getGeometry() as Point).getCoordinates();

        // 1. Create the Component (Point at midpoint)
        const mid = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
        const component = new Feature({ geometry: new Point(mid) });

        component.setId(id);
        component.setProperties({
            ...COMPONENT_TYPES[type].defaultProperties,
            ...props,
            type,
            id,
            label: id,
            startNodeId: startNode.getId(),
            endNodeId: endNode.getId()
        });

        // 2. Create the Visual Line (Dashed connection)
        // We use a deterministic ID so we can find/delete it later
        const visualId = `VIS-${id}`;
        const visualLine = new Feature({ geometry: new LineString([start, end]) });

        visualLine.setId(visualId);
        visualLine.setProperties({
            type: 'visual',
            isVisualLink: true,
            parentLinkId: id,
            linkType: type,
            id: visualId
        });

        return [component, visualLine];
    }
}