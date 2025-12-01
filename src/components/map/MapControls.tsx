"use client";

import {
  BoxSelect,
  ChevronRight,
  FileUp,
  Home,
  Map as MapIcon,
  MousePointer2,
  Pentagon,
  Ruler,
  Square,
  Table,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  handleZoomIn,
  handleZoomOut,
  handleZoomToExtent,
} from "@/lib/interactions/map-controls";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/store/mapStore";
import { useUIStore } from "@/store/uiStore";
import { layerType } from "@/constants/map";

import { ImportModal } from "../modals/ImportModal";
import { mapbox_token } from "@/constants/map";

export function MapControls() {
  const { map } = useMapStore();
  const {
    activeTool,
    baseLayer,
    measurementType,
    importModalOpen,
    showBaseLayerMenu,
    measurementActive,
    showAttributeTable,
    showMeasurementMenu,
    setBaseLayer,
    setActiveTool,
    setMeasurementType,
    setMeasurementActive,
    setShowBaseLayerMenu,
    setShowAttributeTable,
    setShowMeasurementMenu,
    setImportModalOpen,
  } = useUIStore();

  const [showSelectMenu, setShowSelectMenu] = useState(false);

  const selectOptions = [
    {
      id: "select",
      name: "Select",
      icon: MousePointer2,
      description: "Single click selection",
    },
    {
      id: "select-box",
      name: "Box Select",
      icon: BoxSelect,
      description: "Drag box to select",
    },
    {
      id: "select-polygon",
      name: "Region Select",
      icon: Pentagon,
      description: "Draw polygon to select",
    },
  ];

  const activeSelectTool =
    selectOptions.find((t) => t.id === activeTool) || selectOptions[0];
  const SelectIcon = activeSelectTool.icon;

  const baseLayerOptions = [
    { id: "osm", name: "OpenStreetMap", description: "Standard map view" },
    { id: "mapbox", name: "Mapbox", description: "Mapbox Streets" },
    { id: "satellite", name: "Satellite", description: "Aerial imagery" },
    { id: "terrain", name: "Streets", description: "Aerial streets" },
  ];

  const measurementOptions = [
    {
      id: "distance",
      name: "Distance",
      description: "Measure line distance",
      icon: Ruler,
    },
    {
      id: "area",
      name: "Area",
      description: "Measure polygon area",
      icon: Square,
    },
  ];

  const handleBaseLayerChange = (layerType: layerType) => {
    if (!map) return;

    // Get all layers
    const layers = map.getLayers().getArray();

    // Find and remove old base layer
    const oldBaseLayer = layers.find(
      (layer) =>
        layer.get("name") === "osm" ||
        layer.get("name") === "satellite" ||
        layer.get("name") === "terrain"
    );

    if (oldBaseLayer) {
      map.removeLayer(oldBaseLayer);
    }

    // Import OpenLayers dynamically
    import("ol/source/OSM").then(({ default: OSM }) => {
      import("ol/source/XYZ").then(({ default: XYZ }) => {
        import("ol/layer/Tile").then(({ default: TileLayer }) => {
          let newSource;

          switch (layerType) {
            case "osm":
              newSource = new OSM();
              break;
            case "mapbox":
              // Using Mapbox Streets
              newSource = new XYZ({
                url: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${mapbox_token}`,
                crossOrigin: "anonymous",
                attributions: "Tiles © Mapbox",
              });
              break;
            case "satellite":
              // Using ESRI World Imagery
              newSource = new XYZ({
                url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                attributions: "Tiles © Esri",
              });
              break;
            case "terrain":
              // Using ESRI World Street
              newSource = new XYZ({
                url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
                attributions: "Tiles © Esri",
              });
              break;
          }

          const newBaseLayer = new TileLayer({
            source: newSource,
            properties: { name: layerType },
            zIndex: 0,
          });

          // Add new base layer (it will go to bottom because of zIndex)
          map.addLayer(newBaseLayer);

          // Move to bottom (ensure it's below network layer)
          const allLayers = map.getLayers();
          allLayers.remove(newBaseLayer);
          allLayers.insertAt(0, newBaseLayer);

          setBaseLayer(layerType);
          setShowBaseLayerMenu(false);
        });
      });
    });
  };

  const handleMeasurementTypeSelect = (type: "distance" | "area") => {
    // If measurement is already active, deactivate and reactivate with new type
    if (measurementActive) {
      removeMeasurementInteraction();
    }

    setMeasurementType(type);
    setShowMeasurementMenu(false);

    // Activate with new type
    addMeasurementInteraction(type);
    setMeasurementActive(true);
  };

  const handleToggleMeasurement = () => {
    if (!map) return;

    if (measurementActive) {
      // Deactivate measurement
      removeMeasurementInteraction();
      setMeasurementActive(false);
    } else {
      // Activate measurement
      setShowMeasurementMenu(!showMeasurementMenu);
    }
  };

  const addMeasurementInteraction = (type: "distance" | "area") => {
    if (!map) return;

    import("ol/interaction/Draw").then(({ default: Draw }) => {
      import("ol/source/Vector").then(({ default: VectorSource }) => {
        import("ol/layer/Vector").then(({ default: VectorLayer }) => {
          import("ol/style/Style").then(({ default: Style }) => {
            import("ol/style/Stroke").then(({ default: Stroke }) => {
              import("ol/style/Fill").then(({ default: Fill }) => {
                import("ol/style/Circle").then(({ default: CircleStyle }) => {
                  import("ol/Observable").then(({ unByKey }) => {
                    import("ol/sphere").then(({ getLength, getArea }) => {
                      // Create source and layer for measurements
                      const measureSource = new VectorSource();
                      const measureLayer = new VectorLayer({
                        source: measureSource,
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

                      map.addLayer(measureLayer);

                      // Create draw interaction
                      const draw = new Draw({
                        source: measureSource,
                        type: type === "distance" ? "LineString" : "Polygon",
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

                      let sketch: any;
                      let helpTooltipElement: HTMLElement | null;
                      let measureTooltipElement: HTMLElement | null;
                      let measureTooltip: any;

                      const formatLength = (line: any) => {
                        const length = getLength(line);
                        let output;
                        if (length > 1000) {
                          output =
                            Math.round((length / 1000) * 100) / 100 + " km";
                        } else {
                          output = Math.round(length * 100) / 100 + " m";
                        }
                        return output;
                      };

                      const formatArea = (polygon: any) => {
                        const area = getArea(polygon);
                        let output;
                        if (area > 10000) {
                          output =
                            Math.round((area / 1000000) * 100) / 100 + " km²";
                        } else {
                          output = Math.round(area * 100) / 100 + " m²";
                        }
                        return output;
                      };

                      const createMeasureTooltip = () => {
                        if (measureTooltipElement) {
                          measureTooltipElement.parentNode?.removeChild(
                            measureTooltipElement
                          );
                        }
                        measureTooltipElement = document.createElement("div");
                        measureTooltipElement.className =
                          "ol-tooltip ol-tooltip-measure";
                        measureTooltipElement.style.cssText = `
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
                        `;

                        import("ol/Overlay").then(({ default: Overlay }) => {
                          measureTooltip = new Overlay({
                            element: measureTooltipElement!,
                            offset: [0, -15],
                            positioning: "bottom-center",
                            stopEvent: false,
                          });
                          map.addOverlay(measureTooltip);
                        });
                      };

                      draw.on("drawstart", (evt: any) => {
                        sketch = evt.feature;
                        createMeasureTooltip();

                        let tooltipCoord = evt.coordinate;

                        sketch.getGeometry().on("change", (evt: any) => {
                          const geom = evt.target;
                          let output;
                          if (geom.getType() === "Polygon") {
                            output = formatArea(geom);
                            tooltipCoord = geom
                              .getInteriorPoint()
                              .getCoordinates();
                          } else if (geom.getType() === "LineString") {
                            output = formatLength(geom);
                            tooltipCoord = geom.getLastCoordinate();
                          }
                          if (measureTooltipElement) {
                            measureTooltipElement.innerHTML = output || "";
                          }
                          measureTooltip.setPosition(tooltipCoord);
                        });
                      });

                      draw.on("drawend", () => {
                        if (measureTooltipElement) {
                          measureTooltipElement.className =
                            "ol-tooltip ol-tooltip-static";
                        }
                        measureTooltip.setOffset([0, -7]);
                        sketch = null;
                        measureTooltipElement = null;
                        createMeasureTooltip();
                      });

                      map.addInteraction(draw);
                      map.set("measurementDraw", draw);
                      map.set("measurementLayer", measureLayer);
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  };

  const removeMeasurementInteraction = () => {
    if (!map) return;

    const draw = map.get("measurementDraw");
    const layer = map.get("measurementLayer");

    if (draw) {
      map.removeInteraction(draw);
      map.unset("measurementDraw");
    }

    if (layer) {
      map.removeLayer(layer);
      map.unset("measurementLayer");
    }

    // Remove tooltips
    map
      .getOverlays()
      .getArray()
      .slice()
      .forEach((overlay) => {
        const element = overlay.getElement();
        if (element?.className.includes("ol-tooltip")) {
          map.removeOverlay(overlay);
        }
      });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (measurementActive) {
        removeMeasurementInteraction();
      }
    };
  }, [measurementActive]);

  return (
    <>
      {/* Zoom Controls - Right Side Top */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 space-y-1">
        <button
          onClick={() => handleZoomIn(map)}
          className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>

        <div className="h-px bg-gray-200" />

        <button
          onClick={() => handleZoomOut(map)}
          className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </button>

        <div className="h-px bg-gray-200" />

        <button
          onClick={() => handleZoomToExtent(map)}
          className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          title="Zoom to Extent"
        >
          <Home className="w-5 h-5 text-gray-700" />
        </button>

        <div className="h-px bg-gray-200" />

        {/* SELECTION TOOLS DROPDOWN */}
        <div className="relative">
          <button
            onClick={() => setShowSelectMenu(!showSelectMenu)}
            className={cn(
              "size-10 flex items-center justify-center rounded-md transition-colors group relative",
              ["select", "select-box", "select-polygon"].includes(
                activeTool || ""
              )
                ? "bg-blue-100"
                : "hover:bg-gray-100"
            )}
            title="Select Tools"
          >
            <SelectIcon
              className={cn(
                "size-5",
                ["select", "select-box", "select-polygon"].includes(
                  activeTool || ""
                )
                  ? "text-blue-600"
                  : "text-gray-700"
              )}
            />
            <ChevronRight className="absolute bottom-0.5 right-0.5 w-2 h-2 text-gray-500 transform rotate-90" />
          </button>

          {showSelectMenu && (
            <>
              <div className="absolute right-full top-0 mr-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 w-48 z-50">
                <div className="text-xs font-semibold text-gray-500 px-2 mb-2">
                  SELECTION TOOLS
                </div>
                {selectOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        setActiveTool(option.id as any);
                        setShowSelectMenu(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3",
                        activeTool === option.id
                          ? "bg-blue-50 text-blue-700"
                          : "hover:bg-gray-100 text-gray-700"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <div>
                        <div className="text-sm font-medium">{option.name}</div>
                        <div className="text-xs opacity-70">
                          {option.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSelectMenu(false)}
              />
            </>
          )}
        </div>

        {/* Measurement Tool */}
        <div className="relative">
          <button
            onClick={handleToggleMeasurement}
            className={cn(
              "size-10 flex items-center justify-center rounded-md transition-colors group relative",
              showMeasurementMenu || measurementActive
                ? "bg-blue-100"
                : "hover:bg-gray-100"
            )}
            title="Measurement Tool"
          >
            {measurementType === "distance" ? (
              <Ruler
                className={cn(
                  "size-5",
                  showMeasurementMenu || measurementActive
                    ? "text-blue-600"
                    : "text-gray-700"
                )}
              />
            ) : (
              <Square
                className={cn(
                  "size-5",
                  measurementActive || measurementActive
                    ? "text-blue-600"
                    : "text-gray-700"
                )}
              />
            )}
            <div className="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
              {measurementActive ? "Stop Measuring" : "Measurement Tool"}
            </div>
          </button>

          {/* Measurement Type Dropdown */}
          {showMeasurementMenu && !measurementActive && (
            <>
              <div className="absolute right-full top-0 mr-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 w-52 z-50">
                <div className="text-xs font-semibold text-gray-500 px-2 mb-2">
                  MEASUREMENT TYPE
                </div>
                {measurementOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() =>
                        handleMeasurementTypeSelect(option.id as any)
                      }
                      className="w-full text-left px-3 py-2.5 rounded-md transition-colors hover:bg-gray-100 text-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-gray-600" />
                        <div>
                          <div className="text-sm font-medium">
                            {option.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Click outside to close menu */}
              {showMeasurementMenu && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setShowMeasurementMenu(false);
                  }}
                />
              )}
            </>
          )}
        </div>

        <div className="h-px bg-gray-200" />

        {/* Base Layer Toggle Button */}
        <div className="relative">
          <button
            onClick={() => setShowBaseLayerMenu(!showBaseLayerMenu)}
            className={cn(
              "size-10 flex items-center justify-center rounded-md transition-colors group relative",
              showBaseLayerMenu ? "bg-blue-100" : "hover:bg-gray-100"
            )}
            title="Change Base Layer"
          >
            <MapIcon
              className={cn(
                "size-5",
                showBaseLayerMenu ? "text-blue-600" : "text-gray-700"
              )}
            />
            <div className="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
              Base Layer
            </div>
          </button>

          {/* Base Layer Dropdown */}
          {showBaseLayerMenu && (
            <>
              <div className="absolute right-full top-0 mr-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 w-48 z-50">
                <div className="text-xs font-semibold text-gray-500 px-2 mb-2">
                  BASE LAYER
                </div>
                {baseLayerOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleBaseLayerChange(option.id as any)}
                    className={`
                      w-full text-left px-3 py-2 rounded-md transition-colors
                      ${
                        baseLayer === option.id
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "hover:bg-gray-100 text-gray-700"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      {baseLayer === option.id && (
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      )}
                      <div>
                        <div className="text-sm font-medium">{option.name}</div>
                        <div className="text-xs text-gray-500">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowBaseLayerMenu(false)}
              />
            </>
          )}
        </div>

        <div className="h-px bg-gray-200" />

        {/* Attribute Table Toggle */}
        <button
          onClick={() => setShowAttributeTable(!showAttributeTable)}
          className={cn(
            "size-10 flex items-center justify-center rounded-md transition-colors group relative",
            showAttributeTable ? "bg-blue-100" : "hover:bg-gray-100"
          )}
          title="Attribute Table"
        >
          <Table
            className={cn(
              "size-5",
              showAttributeTable ? "text-blue-600" : "text-gray-700"
            )}
          />
          <div className="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            {showAttributeTable ? "Close Table" : "Attribute Table"}
          </div>
        </button>

        <div className="h-px bg-gray-200" />

        {/* Import Button */}
        <button
          onClick={() => setImportModalOpen(true)}
          className="size-10 flex items-center justify-center rounded-md transition-colors group relative hover:bg-gray-100"
          title="Import Network"
        >
          <FileUp className="w-5 h-5 text-gray-700" />
          <div className="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            {importModalOpen ? "Close" : "Import Network"}
          </div>
        </button>
      </div>

      {/* Active Tool Indicator */}
      {activeTool !== "select" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-medium">
            {activeTool === "draw" && "Drawing Mode"}
            {activeTool === "modify" && "Modify Mode"}
            {activeTool === "select-box" && "Box Select Mode"}
            {activeTool === "select-polygon" && "Region Select Mode"}
          </span>
          <button
            onClick={() => setActiveTool("select")}
            className="ml-2 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded"
          >
            ESC
          </button>
        </div>
      )}

      {/* Measurement Active Indicator */}
      {measurementActive && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-10">
          {measurementType === "distance" ? (
            <>
              <Ruler className="w-4 h-4" />
              <span className="text-sm font-medium">
                Click to measure distance
              </span>
            </>
          ) : (
            <>
              <Square className="w-4 h-4" />
              <span className="text-sm font-medium">Click to measure area</span>
            </>
          )}
          <button
            onClick={handleToggleMeasurement}
            className="ml-2 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded"
          >
            Stop
          </button>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </>
  );
}
