import { Map } from 'ol';
import { Feature } from 'ol';
import { getVertexStyle } from '@/lib/styles/vertexStyles';

export class VertexHoverManager {
    private map: Map;
    private currentHoveredVertex: Feature | null = null;

    constructor(map: Map) {
        this.map = map;
        this.setupHoverEffect();
    }

    private setupHoverEffect() {
        this.map.on('pointermove', (evt) => {
            if (evt.dragging) return;

            const pixel = this.map.getEventPixel(evt.originalEvent);
            const feature = this.map.forEachFeatureAtPixel(
                pixel,
                (feature) => feature as Feature,
                {
                    hitTolerance: 5,
                }
            );

            // Reset previous hover
            if (this.currentHoveredVertex && this.currentHoveredVertex !== feature) {
                this.currentHoveredVertex.setStyle(undefined);
                this.currentHoveredVertex = null;
            }

            // Apply hover style
            if (feature && feature.get('isVertex')) {
                this.currentHoveredVertex = feature;
                feature.setStyle(getVertexStyle({ isHighlighted: true }));
                this.map.getViewport().style.cursor = 'pointer';
            } else {
                this.map.getViewport().style.cursor = 'default';
            }
        });
    }

    public cleanup() {
        if (this.currentHoveredVertex) {
            this.currentHoveredVertex.setStyle(undefined);
            this.currentHoveredVertex = null;
        }
    }
}
