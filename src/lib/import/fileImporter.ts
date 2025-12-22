import { Feature } from 'ol';
import VectorSource from 'ol/source/Vector';
import { useNetworkStore } from '@/store/networkStore';
import { parseINP, ParsedProjectData } from './inpParser';

export type ImportFormat = 'inp' | 'geojson' | 'shapefile' | 'kml';

export interface ImportOptions {
    sourceProjection?: string;
}

export interface ImportResult {
    success: boolean;
    features: Feature[];
    message: string;
    // Extended fields
    settings?: any;
    patterns?: any[];
    curves?: any[];
    controls?: any[]; // NEW
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
    public async importFile(file: File, options: ImportOptions = {}): Promise<ImportResult> {
        const extension = file.name.split('.').pop()?.toLowerCase();
        try {
            let result: ImportResult;

            switch (extension) {
                case 'inp':
                    result = await this.importINP(file, options.sourceProjection);
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
                this.handleSuccess(result);
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
    private async importINP(file: File, sourceProjection?: string): Promise<ImportResult> {
        const text = await file.text();

        // 1. Parse using options
        const projectData: ParsedProjectData = parseINP(text, sourceProjection);

        // 2. Generate stats
        const stats = {
            junctions: projectData.features.filter(f => f.get('type') === 'junction').length,
            tanks: projectData.features.filter(f => f.get('type') === 'tank').length,
            reservoirs: projectData.features.filter(f => f.get('type') === 'reservoir').length,
            pipes: projectData.features.filter(f => f.get('type') === 'pipe').length,
            pumps: projectData.features.filter(f => f.get('type') === 'pump').length,
            valves: projectData.features.filter(f => f.get('type') === 'valve').length,
        };

        // 3. Wrap in ImportResult
        return {
            success: true,
            features: projectData.features,
            message: "Project imported successfully",
            stats,
            settings: projectData.settings,
            patterns: projectData.patterns,
            curves: projectData.curves
        };
    }

    private async importGeoJSON(file: File): Promise<ImportResult> {
        return {
            success: false,
            features: [],
            message: "GeoJSON import logic needs update to match new types"
        };
    }

    private async importShapefile(file: File): Promise<ImportResult> {
        return {
            success: false,
            features: [],
            message: 'Shapefile import not yet implemented',
        };
    }

    private async importKML(file: File): Promise<ImportResult> {
        return {
            success: false,
            features: [],
            message: 'KML import not yet implemented',
        };
    }

    private handleSuccess(result: ImportResult) {
        const store = useNetworkStore.getState();

        // Use bulk operations to prevent UI freeze
        console.log(`Processing ${result.features.length} features...`);

        // CASE A: Full Project Import (INP) -> Replace Everything
        if (result.settings) {
            store.loadProject({
                features: result.features,
                settings: { ...result.settings, title: store.settings.title },
                patterns: result.patterns || [],
                curves: result.curves || [],
                controls: result.controls || []
            }, true);

            this.vectorSource.clear();
            this.vectorSource.addFeatures(result.features);
        }
        // CASE B: Simple Geometry Import (GeoJSON/etc) -> Merge/Add
        else {
            // Assign IDs if missing
            const validFeatures = result.features.map(feature => {
                if (!feature.getId()) {
                    const type = feature.get('type') || 'junction';
                    feature.setId(store.generateUniqueId(type));
                }
                return feature;
            });
            // Batch Add
            this.vectorSource.addFeatures(validFeatures);
            store.addFeatures(validFeatures); // New bulk action
        }
    }

    public clearNetwork() {
        this.vectorSource.clear();
        useNetworkStore.getState().clearFeatures();
    }
}