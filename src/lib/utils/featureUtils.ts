import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { NetworkFeatureData } from '@/types/network';

/**
 * Instantiate an OpenLayers Feature from a plain NetworkFeatureData model.
 * Single source of truth — import from here, NOT from useMapFeatureSync.
 */
export function createFeatureFromData(data: NetworkFeatureData): Feature {
    let geom;
    if (data.type === 'pipe' || data.type === 'visual') {
        geom = new LineString(data.geometry as number[][]);
    } else {
        geom = new Point(data.geometry as number[]);
    }

    const feature = new Feature({ geometry: geom });
    feature.setId(data.id);
    feature.setProperties(data.properties);
    return feature;
}
