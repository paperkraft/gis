import { NetworkFeatureData } from '@/types/network';
import { ParsedProjectData } from '../epanet/inpParser';

const DEFAULT_PATTERNS = [{
    id: "1", description: "Default", multipliers: Array(24).fill(1.0)
}];

export const ProjectLoader = {
    processImport: (data: ParsedProjectData) => {
        const featureMap = new Map<string, NetworkFeatureData>();

        // 1. Initialize Counters
        const counters: any = {
            junction: 1, tank: 1, reservoir: 1,
            pipe: 1, pump: 1, valve: 1
        };

        const extractNumber = (id: string) => {
            const match = id.match(/(\d+)/);
            return match ? parseInt(match[0], 10) : 0;
        };

        // 2. Process Features & Calculate Counters
        data.features.forEach(f => {
            const id = f.id;
            const type = f.type;

            if (id) {
                const props = f.properties;
                const geometryData = f.geometry;

                // Initialize connectivity arrays for nodes
                if (['junction', 'tank', 'reservoir'].includes(type) && !props.connectedLinks) {
                    props.connectedLinks = [];
                }

                const featureData: NetworkFeatureData = {
                    id,
                    type,
                    geometry: geometryData,
                    properties: { ...props, id, type } as any
                };
                // clean up the ol geometry from props if it exists
                delete featureData.properties.geometry;

                featureMap.set(id, featureData);

                // Update Counters based on existing IDs (e.g., "P-100" -> sets counter to 101)
                if (type && counters[type] !== undefined) {
                    const num = extractNumber(id);
                    if (num >= counters[type]) {
                        counters[type] = num + 1;
                    }
                }
            }
        });

        // 3. Rebuild Topology (Connect Nodes <-> Links)
        featureMap.forEach(f => {
            if (['pipe', 'pump', 'valve'].includes(f.type)) {
                const linkId = f.id;
                const start = f.properties.startNodeId || f.properties.source;
                const end = f.properties.endNodeId || f.properties.target;

                [start, end].forEach(nodeId => {
                    if (nodeId) {
                        const node = featureMap.get(nodeId);
                        if (node) {
                            const links = node.properties.connectedLinks || [];
                            if (!links.includes(linkId)) {
                                links.push(linkId);
                                node.properties.connectedLinks = links;
                            }
                        }
                    }
                });
            }
        });

        return {
            features: featureMap,
            counters,
            settings: data.settings,
            patterns: data.patterns || data.settings?.patterns || DEFAULT_PATTERNS,
            curves: data.curves || data.settings?.curves || [],
            controls: data.controls || data.settings?.controls || [],
        };
    }
}
