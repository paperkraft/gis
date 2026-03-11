import { OPEN_ELEVATION_API } from '@/constants/map';
import { toLonLat } from 'ol/proj';

export interface ElevationResult {
    latitude: number;
    longitude: number;
    elevation: number;
}

export class ElevationService {
    /**
     * Get elevation for a single coordinate [x, y] (EPSG:3857)
     */
    public static async getElevation(coordinate: number[]): Promise<number | null> {
        try {
            const [lon, lat] = toLonLat(coordinate);

            const response = await fetch(OPEN_ELEVATION_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locations: [{
                        latitude: Number(lat.toFixed(6)),
                        longitude: Number(lon.toFixed(6))
                    }]
                })
            });

            if (!response.ok) throw new Error('Elevation API failed');

            const data = await response.json();
            if (data.results && data.results.length > 0) {
                return data.results[0].elevation;
            }
            return null;
        } catch (error) {
            console.error('Error fetching elevation:', error);
            return null;
        }
    }

    /**
     * Get elevation for multiple coordinates (batch)
     * Input: Array of { id: string, coordinate: number[] }
     */
    public static async getElevations(
        items: { id: string; coordinate: number[] }[]
    ): Promise<Record<string, number>> {
        if (items.length === 0) return {};

        try {
            // Prepare payload
            const locations = items.map(item => {
                const [lon, lat] = toLonLat(item.coordinate);
                return {
                    latitude: Number(lat.toFixed(6)),
                    longitude: Number(lon.toFixed(6))
                };
            });

            // Open-Elevation usually handles batches well, but for massive networks
            // we might need to chunk this. For now, sending all at once.
            const response = await fetch(OPEN_ELEVATION_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ locations })
            });

            if (!response.ok) throw new Error(`Elevation API failed: ${response.statusText}`);

            const data = await response.json();
            const resultMap: Record<string, number> = {};

            if (data.results && Array.isArray(data.results)) {
                data.results.forEach((result: any, index: number) => {
                    if (items[index]) {
                        const id = items[index].id;
                        // results are returned in the same order as input
                        resultMap[id] = result.elevation;
                    }
                });
            }

            return resultMap;
        } catch (error) {
            console.error('Error fetching batch elevation:', error);
            throw error;
        }
    }
}