import { Feature } from 'ol';
import { FeatureType } from '@/types/network';
import { ParsedProjectData } from '../import/inpParser';

const DEFAULT_PATTERNS = [{
    id: "1", description: "Default", multipliers: Array(24).fill(1.0)
}];

export const ProjectLoader = {
    processImport: (data: ParsedProjectData) => {
        const featureMap = new Map<string, Feature>();

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
            const id = f.getId() as string;
            const type = f.get('type') as FeatureType;

            if (id) {
                f.set('id', id);
                // Initialize connectivity arrays for nodes
                if (['junction', 'tank', 'reservoir'].includes(type)) {
                    f.set('connectedLinks', []);
                }

                featureMap.set(id, f);

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
            if (['pipe', 'pump', 'valve'].includes(f.get('type'))) {
                const linkId = f.getId() as string;
                const start = f.get('startNodeId') || f.get('source');
                const end = f.get('endNodeId') || f.get('target');

                [start, end].forEach(nodeId => {
                    if (nodeId) {
                        const node = featureMap.get(nodeId);
                        if (node) {
                            const links = node.get('connectedLinks') || [];
                            if (!links.includes(linkId)) {
                                links.push(linkId);
                                node.set('connectedLinks', links);
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
            patterns: data.settings.patterns || DEFAULT_PATTERNS,
            curves: data.settings.curves || [],
            controls: data.controls || [],
        };
    }
}
