import { Feature } from 'ol';
import VectorSource from 'ol/source/Vector';
import { useNetworkStore } from '@/store/networkStore';
import { parseINP } from './inpParser';

export type ImportFormat = 'inp' | 'geojson' | 'shapefile' | 'kml';

export interface ImportResult {
    success: boolean;
    features: Feature[];
    message: string;
    stats?: {
        junctions: number;
        tanks: number;
        reservoirs: number;
        pipes: number;
        pumps: number;
        valves: number;
    };
}

export class FileImporter {
    private vectorSource: VectorSource;

    constructor(vectorSource: VectorSource) {
        this.vectorSource = vectorSource;
    }

    /**
     * Import file based on extension
     */
    public async importFile(file: File): Promise<ImportResult> {
        const extension = file.name.split('.').pop()?.toLowerCase();
        try {
            let result: ImportResult;

            switch (extension) {
                case 'inp':
                    result = await this.importINP(file);
                    break;
                case 'geojson':
                case 'json':
                    result = await this.importGeoJSON(file);
                    break;
                case 'shp':
                case 'zip':
                    result = await this.importShapefile(file);
                    break;
                case 'kml':
                    result = await this.importKML(file);
                    break;
                default:
                    return {
                        success: false,
                        features: [],
                        message: `Unsupported file format: ${extension}`,
                    };
            }

            if (result.success) {
                this.addFeaturesToMap(result.features);
            }

            return result;
        } catch (error) {
            console.error('❌ Import failed:', error);
            return {
                success: false,
                features: [],
                message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Import EPANET INP file
     */
    private async importINP(file: File): Promise<ImportResult> {
        const text = await file.text();
        return parseINP(text);
    }

    /**
     * Import GeoJSON file
     */
    private async importGeoJSON(file: File): Promise<ImportResult> {
        const text = await file.text();
        const data = JSON.parse(text);
        // return parseGeoJSON(data);
        return data
    }

    /**
     * Import Shapefile (zipped)
     */
    private async importShapefile(file: File): Promise<ImportResult> {
        const arrayBuffer = await file.arrayBuffer();
        // TODO: Implement KML parser
        return {
            success: false,
            features: [],
            message: 'Shapefile import not yet implemented',
        };
    }

    /**
     * Import KML file
     */
    private async importKML(file: File): Promise<ImportResult> {
        const text = await file.text();
        // TODO: Implement KML parser
        return {
            success: false,
            features: [],
            message: 'KML import not yet implemented',
        };
    }

    /**
     * Add imported features to map and store
     */
    private addFeaturesToMap(features: Feature[]) {
        const store = useNetworkStore.getState();

        features.forEach(feature => {
            this.vectorSource.addFeature(feature);
            store.addFeature(feature);
        });

        this.vectorSource.changed();
    }

    /**
     * Clear existing network
     */
    public clearNetwork() {
        this.vectorSource.clear();
        useNetworkStore.getState().clearFeatures();
    }
}