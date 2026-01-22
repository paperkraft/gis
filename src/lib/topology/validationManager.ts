import { Map, Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Circle as CircleStyle, Stroke, Fill } from 'ol/style';
import { Point } from 'ol/geom';
import { TopologyValidator } from './topologyValidator';

export class ValidationManager {
    private layer: VectorLayer<VectorSource>;
    private source: VectorSource;

    constructor(map: Map) {
        this.source = new VectorSource();
        this.layer = new VectorLayer({
            source: this.source,
            zIndex: 2000, // On top of everything
            style: new Style({
                image: new CircleStyle({
                    radius: 12,
                    stroke: new Stroke({ color: '#ef4444', width: 3 }), // Red-500
                    fill: new Fill({ color: 'rgba(239, 68, 68, 0.2)' })
                })
            })
        });
        map.addLayer(this.layer);
    }

    public runValidation() {
        this.source.clear();

        const errors = TopologyValidator.validate();

        errors.forEach(err => {
            const feature = new Feature({
                geometry: new Point(err.coordinate),
                error: err // Store metadata
            });
            this.source.addFeature(feature);
        });

        return errors;
    }

    public clear() {
        this.source.clear();
    }
}