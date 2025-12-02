import { useEffect, useCallback } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { NetworkExporter } from '@/lib/export/networkExporter';

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

    return { handleExport };
}