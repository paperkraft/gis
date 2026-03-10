import GeoJSON from 'ol/format/GeoJSON';
import { generateINP } from '../epanet/inpWriter';
import { NetworkFeatureData } from '@/types/network';
import { createFeatureFromData } from '@/hooks/map/useMapFeatureSync';

export class NetworkExporter {
    /**
     * Export features to a file
     */
    public static export(features: NetworkFeatureData[], format: 'inp' | 'geojson' = 'inp') {
        try {
            let content = '';
            let filename = `network_export_${new Date().toISOString().slice(0, 10)}`;
            let mimeType = 'text/plain';

            if (format === 'inp') {
                content = generateINP(features);
                filename += '.inp';
            } else if (format === 'geojson') {
                const writer = new GeoJSON();
                const olFeatures = features.map(createFeatureFromData);
                content = writer.writeFeatures(olFeatures, {
                    featureProjection: 'EPSG:3857', // Assuming map is 3857
                    dataProjection: 'EPSG:4326'     // Standard GeoJSON is Lat/Lon
                });
                filename += '.geojson';
                mimeType = 'application/json';
            }

            this.downloadFile(content, filename, mimeType);

            return { success: true, count: features.length };
        } catch (error) {
            console.error('Export failed:', error);
            return { success: false, error };
        }
    }

    private static downloadFile(content: string, filename: string, mimeType: string) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}