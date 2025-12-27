import { useEffect, useCallback } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { NetworkExporter } from '@/lib/export/networkExporter';
import { Point } from 'ol/geom';

export function useNetworkExport() {
    const { features } = useNetworkStore();

    const handleExport = useCallback(() => {
        const featureList = Array.from(features.values());

        if (featureList.length === 0) {
            alert("Network is empty. Nothing to export.");
            return;
        }

        // Simple prompt for format selection
        // In a real app, you'd use a nice modal
        const format = window.prompt("Enter export format (inp or geojson):", "inp");

        if (format === 'inp' || format === 'geojson') {
            NetworkExporter.export(featureList, format);
        } else if (format !== null) {
            alert("Invalid format. Please use 'inp' or 'geojson'.");
        }
    }, [features]);

    useEffect(() => {
        const onExport = () => handleExport();

        window.addEventListener('exportNetwork', onExport);

        return () => {
            window.removeEventListener('exportNetwork', onExport);
        };
    }, [handleExport]);

    const exportNetwork = useCallback(() => {
        const nodes: Record<string, any> = {};
        const links: Record<string, any> = {};

        features.forEach((feature) => {
            const type = feature.get('type');
            const id = feature.getId()?.toString() || '';
            const properties = feature.getProperties();

            // --- EXPORT NODES ---
            if (['junction', 'tank', 'reservoir'].includes(type)) {
                nodes[id] = {
                    id: id,
                    type: type,
                    elevation: parseFloat(properties.elevation || 0),
                    demand: parseFloat(properties.demand || 0),
                    head: parseFloat(properties.head || 0), // Initial head if applicable
                    pattern: properties.pattern || '',
                    // Geometry for visualization (optional for solver, but good for save files)
                    x: (feature.getGeometry() as Point).getCoordinates()[0],
                    y: (feature.getGeometry() as Point).getCoordinates()[1]
                };
            }

            // --- EXPORT LINKS ---
            else if (['pipe', 'pump', 'valve'].includes(type)) {
                links[id] = {
                    id: id,
                    type: type,
                    startNodeId: properties.startNodeId,
                    endNodeId: properties.endNodeId,
                    diameter: parseFloat(properties.diameter || 100),
                    roughness: parseFloat(properties.roughness || 100),
                    length: parseFloat(properties.length || 0), // Should be auto-calculated or user-defined
                    status: properties.status || 'OPEN',
                    // Special Properties
                    power: type === 'pump' ? parseFloat(properties.power || 0) : undefined,
                    setting: type === 'valve' ? parseFloat(properties.setting || 0) : undefined
                };
            }
        });

        return { nodes, links };
    }, [features]);

    return { handleExport, exportNetwork };
}