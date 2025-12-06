import { LineString, Polygon } from 'ol/geom';
import Draw from 'ol/interaction/Draw';
import VectorLayer from 'ol/layer/Vector';
import { unByKey } from 'ol/Observable';
import Overlay from 'ol/Overlay';
import VectorSource from 'ol/source/Vector';
import { getArea, getLength } from 'ol/sphere';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { useEffect, useRef } from 'react';

import { useMapStore } from '@/store/mapStore';
import { useUIStore } from '@/store/uiStore';

export function useMeasurement() {
    const map = useMapStore(state => state.map);
    const { measurementActive, measurementType } = useUIStore();

    // Refs to track instances
    const drawRef = useRef<Draw | null>(null);
    const layerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const tooltipRef = useRef<Overlay | null>(null);
    const tooltipElementRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!map) return;

        // --- CLEANUP FUNCTION ---
        const cleanup = () => {
            if (drawRef.current) {
                map.removeInteraction(drawRef.current);
                drawRef.current = null;
            }
            if (layerRef.current) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
            if (tooltipRef.current) {
                map.removeOverlay(tooltipRef.current);
                tooltipRef.current = null;
            }

            // Remove all static measurement tooltips created during this session
            map.getOverlays().getArray().slice().forEach(overlay => {
                const elem = overlay.getElement();
                if (elem && (elem.classList.contains('ol-tooltip-measure') || elem.classList.contains('ol-tooltip-static'))) {
                    map.removeOverlay(overlay);
                }
            });

            map.getViewport().style.cursor = "default";
        };

        // --- ACTIVATE MEASUREMENT ---
        if (measurementActive) {
            // 1. Create Layer
            const source = new VectorSource();
            const layer = new VectorLayer({
                source: source,
                style: new Style({
                    fill: new Fill({ color: 'rgba(31, 184, 205, 0.2)' }),
                    stroke: new Stroke({ color: '#1FB8CD', width: 2 }),
                    image: new CircleStyle({ radius: 7, fill: new Fill({ color: '#1FB8CD' }) }),
                }),
                zIndex: 1000
            });
            map.addLayer(layer);
            map.getViewport().style.cursor = "crosshair";
            layerRef.current = layer;

            // 2. Create Interaction
            const draw = new Draw({
                source: source,
                type: measurementType === 'area' ? 'Polygon' : 'LineString',
                style: new Style({
                    fill: new Fill({ color: 'rgba(31, 184, 205, 0.2)' }),
                    stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.5)', lineDash: [10, 10], width: 2 }),
                    image: new CircleStyle({
                        radius: 5,
                        stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.7)' }),
                        fill: new Fill({ color: 'rgba(255, 255, 255, 0.8)' }),
                    }),
                }),
            });

            // 3. Tooltip Logic
            let sketch: any = null;
            let listener: any;

            const createTooltip = () => {
                if (tooltipElementRef.current) {
                    tooltipElementRef.current.parentNode?.removeChild(tooltipElementRef.current);
                }
                const element = document.createElement('div');
                element.className = 'ol-tooltip ol-tooltip-measure bg-black/80 text-white px-2 py-1 rounded text-xs pointer-events-none';
                const overlay = new Overlay({
                    element: element,
                    offset: [0, -15],
                    positioning: 'bottom-center',
                    stopEvent: false,
                });
                map.addOverlay(overlay);
                tooltipRef.current = overlay;
                tooltipElementRef.current = element;
            };

            createTooltip();

            draw.on('drawstart', (evt: any) => {
                sketch = evt.feature;
                let tooltipCoord = evt.coordinate;

                listener = sketch.getGeometry().on('change', (evt: any) => {
                    const geom = evt.target;
                    let output;
                    if (geom instanceof Polygon) {
                        output = formatArea(geom);
                        tooltipCoord = geom.getInteriorPoint().getCoordinates();
                    } else if (geom instanceof LineString) {
                        output = formatLength(geom);
                        tooltipCoord = geom.getLastCoordinate();
                    }
                    if (tooltipElementRef.current) {
                        tooltipElementRef.current.innerHTML = output || '';
                    }
                    tooltipRef.current?.setPosition(tooltipCoord);
                });

            });



            draw.on('drawend', () => {
                if (tooltipElementRef.current) {
                    tooltipElementRef.current.className = 'ol-tooltip ol-tooltip-static bg-black/70 text-white px-2 py-1 rounded text-xs border border-white/50';
                    tooltipRef.current?.setOffset([0, -7]);
                }
                sketch = null;
                tooltipElementRef.current = null;
                createTooltip(); // Prepare for next measurement
                unByKey(listener);
            });

            map.addInteraction(draw);
            drawRef.current = draw;
        } else {
            cleanup();
        }

        return cleanup;
    }, [map, measurementActive, measurementType]);

    // Helpers
    const formatLength = (line: LineString) => {
        const length = getLength(line);
        return length > 100 ? (length / 1000).toFixed(2) + ' km' : Math.round(length) + ' m';
    };

    const formatArea = (polygon: Polygon) => {
        const area = getArea(polygon);
        return area > 10000 ? (area / 1000000).toFixed(2) + ' km²' : Math.round(area) + ' m²';
    };
}