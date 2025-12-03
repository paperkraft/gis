import { Map } from "ol";
import { getArea, getLength } from "ol/sphere";
import { LineString, Polygon } from "ol/geom";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import { Draw } from "ol/interaction";
import { Style, Fill, Stroke, Circle as CircleStyle } from "ol/style";
import Overlay from "ol/Overlay";
import { unByKey } from "ol/Observable";

export type MeasurementType = "distance" | "area";

export class MeasurementManager {
    private map: Map;
    private measureSource: VectorSource;
    private measureLayer: VectorLayer<VectorSource>;
    private drawInteraction: Draw | null = null;
    private sketch: any = null;
    private measureTooltipElement: HTMLElement | null = null;
    private measureTooltip: Overlay | null = null;
    private listener: any = null;

    constructor(map: Map) {
        this.map = map;
        this.measureSource = new VectorSource();

        // Style for the measurement vector layer
        this.measureLayer = new VectorLayer({
            source: this.measureSource,
            properties: { name: "measurement-layer" },
            zIndex: 1000,
            style: new Style({
                fill: new Fill({
                    color: "rgba(31, 184, 205, 0.2)",
                }),
                stroke: new Stroke({
                    color: "#1FB8CD",
                    width: 3,
                }),
                image: new CircleStyle({
                    radius: 5,
                    fill: new Fill({
                        color: "#1FB8CD",
                    }),
                    stroke: new Stroke({
                        color: "#fff",
                        width: 2,
                    }),
                }),
            }),
        });
    }

    public startMeasurement(type: MeasurementType) {
        // Ensure clean state
        this.stopMeasurement();

        // Add layer to map
        this.map.addLayer(this.measureLayer);

        // Add interaction
        this.addInteraction(type);
        this.map.getViewport().style.cursor = 'default';
    }

    public stopMeasurement() {
        // Remove interaction
        if (this.drawInteraction) {
            this.map.removeInteraction(this.drawInteraction);
            this.drawInteraction = null;
        }

        // Remove layer
        this.map.removeLayer(this.measureLayer);
        this.measureSource.clear();

        // Remove active tooltips
        this.cleanupTooltips();

        // Clean up listeners
        if (this.listener) {
            unByKey(this.listener);
            this.listener = null;
        }
        this.sketch = null;
    }

    private cleanupTooltips() {
        // Remove overlays managed by this manager
        this.map.getOverlays().getArray().slice().forEach((overlay) => {
            const element = overlay.getElement();
            if (element && (
                element.className.includes("ol-tooltip-measure") ||
                element.className.includes("ol-tooltip-static")
            )) {
                this.map.removeOverlay(overlay);
            }
        });

        this.measureTooltipElement = null;
        this.measureTooltip = null;
    }

    private addInteraction(type: MeasurementType) {
        const typeStr = type === "distance" ? "LineString" : "Polygon";

        this.drawInteraction = new Draw({
            source: this.measureSource,
            type: typeStr,
            style: new Style({
                fill: new Fill({
                    color: "rgba(31, 184, 205, 0.2)",
                }),
                stroke: new Stroke({
                    color: "#1FB8CD",
                    lineDash: [10, 10],
                    width: 3,
                }),
                image: new CircleStyle({
                    radius: 5,
                    stroke: new Stroke({
                        color: "#1FB8CD",
                        width: 2,
                    }),
                    fill: new Fill({
                        color: "rgba(255, 255, 255, 0.8)",
                    }),
                }),
            }),
        });

        this.map.addInteraction(this.drawInteraction);
        this.createMeasureTooltip();

        this.drawInteraction.on("drawstart", (evt: any) => {
            this.sketch = evt.feature;
            let tooltipCoord = evt.coordinate;

            this.listener = this.sketch.getGeometry().on("change", (evt: any) => {
                const geom = evt.target;
                let output;
                if (geom instanceof Polygon) {
                    output = this.formatArea(geom);
                    tooltipCoord = geom.getInteriorPoint().getCoordinates();
                } else if (geom instanceof LineString) {
                    output = this.formatLength(geom);
                    tooltipCoord = geom.getLastCoordinate();
                }

                if (this.measureTooltipElement) {
                    this.measureTooltipElement.innerHTML = output || "";
                }
                this.measureTooltip?.setPosition(tooltipCoord);
            });
        });

        this.drawInteraction.on("drawend", () => {
            if (this.measureTooltipElement) {
                this.measureTooltipElement.className = "ol-tooltip ol-tooltip-static";
                this.measureTooltipElement.style.backgroundColor = "rgba(0,0,0,0.6)";
                this.measureTooltipElement.style.border = "1px solid #fff";
            }
            this.measureTooltip?.setOffset([0, -7]);

            // Prepare for next measurement
            this.sketch = null;
            this.measureTooltipElement = null;
            this.createMeasureTooltip();
            unByKey(this.listener);
        });
    }

    private createMeasureTooltip() {
        if (this.measureTooltipElement) {
            this.measureTooltipElement.parentNode?.removeChild(this.measureTooltipElement);
        }

        this.measureTooltipElement = document.createElement("div");
        this.measureTooltipElement.className = "ol-tooltip ol-tooltip-measure";
        this.measureTooltipElement.style.cssText = `
            position: absolute;
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
            pointer-events: none;
            z-index: 10000;
            transition: opacity 0.3s;
        `;

        this.measureTooltip = new Overlay({
            element: this.measureTooltipElement,
            offset: [0, -15],
            positioning: "bottom-center",
            stopEvent: false,
        });

        this.map.addOverlay(this.measureTooltip);
    }

    private formatLength(line: LineString): string {
        const length = getLength(line);
        if (length > 1000) {
            return Math.round((length / 1000) * 100) / 100 + " km";
        } else {
            return Math.round(length * 100) / 100 + " m";
        }
    }

    private formatArea(polygon: Polygon): string {
        const area = getArea(polygon);
        if (area > 10000) {
            return Math.round((area / 1000000) * 100) / 100 + " km²";
        } else {
            return Math.round(area * 100) / 100 + " m²";
        }
    }
}