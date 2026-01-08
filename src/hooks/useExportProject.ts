import { useCallback } from 'react';
import { toast } from 'sonner';
import { useNetworkStore } from '@/store/networkStore';
import { buildINP } from '@/lib/epanet/inpBuilder';
import GeoJSON from 'ol/format/GeoJSON';

export function useExportProject() {
    const { features, settings, patterns, curves, controls } = useNetworkStore();

    const exportToINP = useCallback(() => {
        try {
            if (features.size === 0) {
                toast.error("Network is empty. Nothing to export.");
                return;
            }

            // toast.loading("Generating INP file...");

            // 1. Build the INP Content string
            const featureList = Array.from(features.values());

            const fileContent = buildINP(
                featureList,
                patterns,
                curves,
                controls,
                settings
            );

            downloadFile(fileContent, 'inp', settings.title);

            // toast.dismiss();
            toast.success("INP Export complete");

        } catch (error) {
            console.error("Export Failed:", error);
            toast.dismiss();
            toast.error("Export failed", { description: "Check console for details." });
        }
    }, [features, settings, patterns, curves, controls]);

    // --- 2. NEW GEOJSON EXPORT ---
    const exportToGeoJSON = useCallback(() => {
        try {
            if (features.size === 0) {
                toast.error("Network is empty. Nothing to export.");
                return;
            }

            // toast.loading("Generating GeoJSON...");

            const featureList = Array.from(features.values());
            const format = new GeoJSON();

            // Write features to string
            // Important: Transform from Map Projection (EPSG:3857) to Standard GeoJSON (EPSG:4326)
            const jsonString = format.writeFeatures(featureList, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857',
                decimals: 6 // Keep high precision for coordinates
            });

            downloadFile(jsonString, 'geojson', settings.title);

            // toast.dismiss();
            toast.success("GeoJSON Export complete");

        } catch (error) {
            console.error("GeoJSON Export Failed:", error);
            toast.dismiss();
            toast.error("Export failed", { description: "Could not generate GeoJSON." });
        }
    }, [features, settings]);

    return { exportToINP, exportToGeoJSON };
}


// --- Helper: Shared Download Logic ---
function downloadFile(content: string, extension: string, title: string) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const fileName = `${title.replace(/\s+/g, '_') || 'network'}_${Date.now()}.${extension}`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}