import { useCallback } from 'react';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { useNetworkStore } from '@/store/networkStore';
import { createFeatureFromData } from '@/lib/utils/featureUtils';
import GeoJSON from 'ol/format/GeoJSON';

export function useExportProject() {
    const { features, settings } = useNetworkStore();
    const params = useParams();
    const id = params.id as string;

    const exportToINP = useCallback(async () => {
        try {
            if (features.size === 0) {
                toast.error("Network is empty. Nothing to export.");
                return;
            }

            if (!id) {
                toast.error("Project ID not found in URL.");
                return;
            }

            toast.loading("Preparing export...", { id: 'export-inp' });

            const response = await fetch(`/api/projects/${id}/export`);

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Export failed on server");
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `${settings.title.replace(/\s+/g, '_')}.inp`;

            if (contentDisposition && contentDisposition.includes('filename=')) {
                filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

            toast.success("INP Export complete", { id: 'export-inp' });

        } catch (error: any) {
            console.error("Export Failed:", error);
            toast.error("Export failed", { id: 'export-inp', description: error.message || "Check console for details." });
        }
    }, [features.size, id, settings.title]);

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

            const olFeatures = featureList.map(createFeatureFromData);

            // Write features to string
            // Important: Transform from Map Projection (EPSG:3857) to Standard GeoJSON (EPSG:4326)
            const jsonString = format.writeFeatures(olFeatures, {
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