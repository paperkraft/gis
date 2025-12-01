"use client";
import "ol/ol.css";

import { Feature, MapBrowserEvent } from "ol";
import { click } from "ol/events/condition";
import { Point } from "ol/geom";
import { Select } from "ol/interaction";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import Map from "ol/Map";
import { fromLonLat, toLonLat } from "ol/proj";
import { XYZ } from "ol/source";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import View from "ol/View";
import { useEffect, useRef, useState } from "react";

import { ComponentSelectionModal } from "@/components/modals/ComponentSelectionModal";
import { COMPONENT_TYPES } from "@/constants/networkComponents";
import { useFlowAnimation } from "@/hooks/useFlowAnimation";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { handleZoomToExtent } from "@/lib/interactions/map-controls";
import { createCombinedFlowStyles } from "@/lib/styles/animatedFlowStyles";
import {
  getFeatureStyle,
  getSelectedStyle,
  isJunctionConnectedToLink,
} from "@/lib/styles/featureStyles";
import { ContextMenuManager } from "@/lib/topology/contextMenuManager";
import { DeleteManager } from "@/lib/topology/deleteManager";
import { ModifyManager } from "@/lib/topology/modifyManager";
import { PipeDrawingManager } from "@/lib/topology/pipeDrawingManager";
import { VertexLayerManager } from "@/lib/topology/vertexManager";
import { useMapStore } from "@/store/mapStore";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";
import { FeatureType } from "@/types/network";

import { DeleteConfirmationModal } from "../modals/DeleteConfirmationModal";
import { AttributeTable } from "./AttributeTable";
import { FlowAnimationControls } from "./FlowAnimationControls";
import { LocationSearch } from "./LocationSearch";
import { MapControls } from "./MapControls";
import { PropertyPanel } from "./PropertyPanel";
import { Cordinates } from "./Cordinates";

export function MapContainer() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const vectorLayerRef = useRef<VectorLayer<any> | null>(null);
  const selectInteractionRef = useRef<Select | null>(null);

  const pipeDrawingManagerRef = useRef<PipeDrawingManager | null>(null);
  const contextMenuManagerRef = useRef<ContextMenuManager | null>(null);
  const vertexLayerManagerRef = useRef<VertexLayerManager | null>(null);
  const modifyManagerRef = useRef<ModifyManager | null>(null);
  const deleteManagerRef = useRef<DeleteManager | null>(null);

  const [vectorLayer, setVectorLayer] = useState<VectorLayer<any> | null>(null);

  const {
    features,
    addFeature,
    selectFeature,
    selectedFeature,
    selectedFeatureId,
    setSelectedFeature,
    generateUniqueId,
  } = useNetworkStore();

  const { setMap, setCoordinates, setVectorSource } = useMapStore();

  const {
    activeTool,
    showPipeArrows,
    showLabels,
    layerVisibility,
    deleteModalOpen,
    showAttributeTable,
    componentSelectionModalOpen,
    setActiveTool,
    setDeleteModalOpen,
    setShowAttributeTable,
    setComponentSelectionModalOpen,
    resetAllTools,
  } = useUIStore();

  useKeyboardShortcuts();

  // Hook: Flow Animation
  const flowAnimation = useFlowAnimation(vectorLayer, {
    enabled: false,
    speed: 1,
    style: "dashes",
  });

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    // RESTORE DATA: Add existing features from store to the new source
    if (features && features.size > 0) {
      vectorSource.addFeatures(Array.from(features.values()));
    }

    // Base layers
    const osmLayer = new TileLayer({
      source: new OSM(),
      visible: true,
      properties: { name: "osm", title: "OpenStreetMap" },
    });

    const mapboxLayer = new TileLayer({
      source: new XYZ({
        url: "https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=YOUR_MAPBOX_TOKEN",
        tileSize: 512,
        maxZoom: 22,
        crossOrigin: "anonymous",
      }),
      visible: false,
      properties: { name: "mapbox", title: "Mapbox Streets" },
    });

    const esriStreetLayer = new TileLayer({
      source: new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      }),
      visible: false,
      properties: { name: "esri-street", title: "ESRI World Street" },
    });

    const esriImageryLayer = new TileLayer({
      source: new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      }),
      visible: false,
      properties: { name: "esri-imagery", title: "ESRI World Imagery" },
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: (feature) => getFeatureStyle(feature as Feature),
      properties: { name: "network" },
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      zIndex: 100,
    });

    vectorLayerRef.current = vectorLayer;
    setVectorLayer(vectorLayer);

    const map = new Map({
      target: mapRef.current,
      layers: [
        osmLayer,
        mapboxLayer,
        esriStreetLayer,
        esriImageryLayer,
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat([74.2626, 16.6767]),
        zoom: 16,
      }),
      controls: [],
    });

    mapInstanceRef.current = map;
    setMap(map);
    setVectorSource(vectorSource);

    // AUTOMATIC ZOOM TO EXTENT
    // If there are features, zoom to them on load
    if (features.size > 0) {
      // Small delay to ensure map is rendered and size is calculated
      setTimeout(() => {
        handleZoomToExtent(map);
      }, 100);
    }

    // CRITICAL: Initialize Select interaction
    const selectInteraction = new Select({
      layers: [vectorLayer],
      condition: click,
      style: (feature) => getSelectedStyle(feature as Feature),
      filter: (feature) =>
        !feature.get("isPreview") &&
        !feature.get("isVertexMarker") &&
        !feature.get("isVisualLink"),
    });

    selectInteraction.on("select", (event) => {
      if (event.selected.length > 0) {
        const feature = event.selected[0];
        const featureId = feature.getId() as string;
        const props = feature.getProperties();

        // Update store
        selectFeature(featureId);

        // Update local state for property panel
        setSelectedFeature(feature);
      } else {
        selectFeature(null);
        setSelectedFeature(null);
      }
    });

    map.addInteraction(selectInteraction);
    selectInteractionRef.current = selectInteraction;

    // Track coordinates
    map.on("pointermove", (event) => {
      const coord = event.coordinate;
      const [lat, lon] = toLonLat(coord);
      setCoordinates(`${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);
    });

    // ============================================
    // Initialize Managers
    // ============================================

    const pipeDrawingManager = new PipeDrawingManager(map, vectorSource);
    const contextMenuManager = new ContextMenuManager(map, vectorSource);
    const vertexLayerManager = new VertexLayerManager(map, vectorSource);
    const modifyManager = new ModifyManager(map, vectorSource);
    const deleteManager = new DeleteManager(map, vectorSource);

    // Connect managers
    pipeDrawingManager.registerWithContextMenu(contextMenuManager);
    contextMenuManager.setPipeDrawingManager(pipeDrawingManager);

    // Sync drawing mode
    const originalStartDrawing =
      pipeDrawingManager.startDrawing.bind(pipeDrawingManager);

    pipeDrawingManager.startDrawing = () => {
      originalStartDrawing();
      contextMenuManager.setDrawingMode(true);
    };

    const originalStopDrawing =
      pipeDrawingManager.stopDrawing.bind(pipeDrawingManager);
    pipeDrawingManager.stopDrawing = () => {
      originalStopDrawing();
      contextMenuManager.setDrawingMode(false);
    };

    deleteManager.onDeleteRequest = (feature: Feature) => {
      setSelectedFeature(feature);
      setDeleteModalOpen(true);
    };

    pipeDrawingManagerRef.current = pipeDrawingManager;
    contextMenuManagerRef.current = contextMenuManager;
    vertexLayerManagerRef.current = vertexLayerManager;
    modifyManagerRef.current = modifyManager;
    deleteManagerRef.current = deleteManager;

    return () => {
      pipeDrawingManager.cleanup();
      contextMenuManager.cleanup();
      vertexLayerManager.cleanup();
      modifyManager.cleanup();
      deleteManager.cleanup();
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle tool changes
  useEffect(() => {
    if (!mapInstanceRef.current || !pipeDrawingManagerRef.current) return;

    modifyManagerRef.current?.cleanup();

    // Clear selection when changing tools
    if (selectInteractionRef.current) {
      selectInteractionRef.current.getFeatures().clear();
    }

    setSelectedFeature(null);
    selectFeature(null);

    switch (activeTool) {
      case "select":
        mapInstanceRef.current.getViewport().style.cursor = "default";
        break;
      case "modify":
        modifyManagerRef.current?.startModifying();
        break;
      case "draw":
        pipeDrawingManagerRef.current.startDrawing();
        break;
    }
  }, [activeTool]);

  // Sync with store selection
  useEffect(() => {
    if (!vectorSourceRef.current || !selectInteractionRef.current) return;

    if (selectedFeatureId) {
      // Find feature by ID
      const feature = vectorSourceRef.current
        .getFeatures()
        .find((f) => f.getId() === selectedFeatureId);

      if (feature) {
        // Update select interaction
        const selectedFeatures = selectInteractionRef.current.getFeatures();
        selectedFeatures.clear();
        selectedFeatures.push(feature);

        // Update local state
        setSelectedFeature(feature);
      }
    } else {
      // Clear selection
      selectInteractionRef.current.getFeatures().clear();
      setSelectedFeature(null);
    }
  }, [selectedFeatureId]);

  // Handle layer visibility and arrow/label toggling
  useEffect(() => {
    if (!vectorLayer) return;

    vectorLayer
      .getSource()
      ?.getFeatures()
      .forEach((feature: any) => {
        const featureType = feature.get("type");
        feature.set("hidden", layerVisibility[featureType] === false);
      });

    vectorLayer?.setStyle((feature) => {
      const styles = [];
      const baseStyles = getFeatureStyle(feature as Feature);
      if (Array.isArray(baseStyles)) styles.push(...baseStyles);
      else styles.push(baseStyles);

      if (
        feature.get("type") === "pipe" &&
        flowAnimation.isAnimating &&
        !feature.get("hidden")
      ) {
        const animStyles = createCombinedFlowStyles(
          feature as Feature,
          flowAnimation.animationTime,
          {
            showDashes: ["dashes", "combined"].includes(
              flowAnimation.options.style
            ),
            showParticles: ["particles", "combined"].includes(
              flowAnimation.options.style
            ),
            showGlow: ["glow", "combined"].includes(
              flowAnimation.options.style
            ),
          }
        );
        styles.push(...animStyles);
      }
      return styles;
    });

    // Force redraw for both visibility and toggle changes
    if (flowAnimation.isAnimating) vectorLayer?.changed();
  }, [
    layerVisibility,
    showPipeArrows,
    showLabels,
    flowAnimation.isAnimating,
    flowAnimation.animationTime,
    flowAnimation.options.style,
  ]);

  // Add event listeners for custom events
  useEffect(() => {
    const handleFitToExtent = () => {
      // Trigger the fit to extent function from MapControls
      window.dispatchEvent(new CustomEvent("triggerFitToExtent"));
    };

    window.addEventListener("fitToExtent", handleFitToExtent);

    return () => {
      window.removeEventListener("fitToExtent", handleFitToExtent);
    };
  }, [selectedFeature]);

  // ESC key to reset all tools
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        resetAllTools();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [resetAllTools]);

  // Tooltip why junction can't be moved
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const handlePointerMove = (event: any) => {
      const feature = mapInstanceRef.current?.forEachFeatureAtPixel(
        event.pixel,
        (f) => f as Feature
      );

      if (feature && feature.get("type") === "junction") {
        const isLinkJunction = isJunctionConnectedToLink(feature);

        if (isLinkJunction) {
          mapInstanceRef.current!.getViewport().style.cursor = "not-allowed";
          mapInstanceRef.current!.getViewport().title =
            "This junction is part of a pump/valve. Move the pump/valve to reposition.";
        } else {
          mapInstanceRef.current!.getViewport().style.cursor = "pointer";
          mapInstanceRef.current!.getViewport().title = "";
        }
      }
    };

    mapInstanceRef.current.on("pointermove", handlePointerMove);

    return () => {
      mapInstanceRef.current?.un("pointermove", handlePointerMove);
    };
  }, []);

  // Register callback
  useEffect(() => {
    if (contextMenuManagerRef.current && pipeDrawingManagerRef.current) {
      contextMenuManagerRef.current.setComponentPlacedCallback(
        (component: Feature) => {
          // This should only continue drawing, not create a pipe
          pipeDrawingManagerRef.current?.continueDrawingFromNode(component);
        }
      );
    }
  }, []);

  // ============================================
  // COMPONENT SELECTION
  // ============================================

  const handleComponentSelection = (componentType: FeatureType | "skip") => {
    setComponentSelectionModalOpen(false);
    setActiveTool("draw");

    if (componentType === "skip") {
      pipeDrawingManagerRef.current?.startDrawing();
    } else {
      startComponentPlacementWithAutoDrawing(componentType);
    }
  };

  const startComponentPlacementWithAutoDrawing = (
    componentType: FeatureType
  ) => {
    if (!mapInstanceRef.current || !vectorSourceRef.current) return;

    const map = mapInstanceRef.current;
    const vectorSource = vectorSourceRef.current;

    map.getViewport().style.cursor = "crosshair";

    // Use map click (not singleclick) to avoid OpenLayers event conflicts
    const placementHandler = (event: MapBrowserEvent<any>) => {
      const coordinate = map.getCoordinateFromPixel(event.pixel);

      const feature = new Feature({
        geometry: new Point(coordinate),
      });

      const id = generateUniqueId(componentType);

      feature.setId(id);
      feature.set("type", componentType);
      feature.set("isNew", true);
      feature.setProperties({
        ...COMPONENT_TYPES[componentType].defaultProperties,
        label: `${COMPONENT_TYPES[componentType].name}-${id}`,
      });
      feature.set("connectedLinks", []);

      vectorSource.addFeature(feature);
      addFeature(feature);

      // Remove handler
      map.un("click", placementHandler);

      // CRITICAL: Start drawing on NEXT frame cycle
      requestAnimationFrame(() => {
        if (pipeDrawingManagerRef.current) {
          pipeDrawingManagerRef.current.startDrawing();

          requestAnimationFrame(() => {
            if (pipeDrawingManagerRef.current) {
              pipeDrawingManagerRef.current.continueDrawingFromNode(feature);

              map.getViewport().style.cursor = "crosshair";
              setActiveTool("draw");
            }
          });
        }
      });
    };

    // Use 'click' instead of 'singleclick'
    map.once("click", placementHandler);
  };

  // ============================================
  // DELETE HANDLING
  // ============================================

  const handleDeleteRequestFromPanel = () => {
    const selectedFeatureId = useNetworkStore.getState().selectedFeatureId;
    if (!selectedFeatureId || !vectorSourceRef.current) return;

    const feature = vectorSourceRef.current
      .getFeatures()
      .find((f) => f.getId() === selectedFeatureId);

    if (feature) {
      setSelectedFeature(feature);
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedFeature && deleteManagerRef.current) {
      deleteManagerRef.current.executeDelete(selectedFeature);
      setDeleteModalOpen(false);
      selectFeature(null);
      setSelectedFeature(null);
      useNetworkStore.getState().selectFeature(null);
    }
  };

  const cascadeInfo = selectedFeature
    ? deleteManagerRef.current?.getCascadeInfo(selectedFeature)
    : undefined;

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      <MapControls />
      <LocationSearch />

      <FlowAnimationControls
        isAnimating={flowAnimation.isAnimating}
        speed={flowAnimation.options.speed}
        style={flowAnimation.options.style}
        onToggle={flowAnimation.toggleAnimation}
        onSpeedChange={flowAnimation.setSpeed}
        onStyleChange={flowAnimation.setStyle}
      />

      <AttributeTable
        isOpen={showAttributeTable}
        onClose={() => setShowAttributeTable(false)}
        vectorSource={vectorSourceRef.current || undefined}
      />

      <ComponentSelectionModal
        isOpen={componentSelectionModalOpen}
        onClose={() => setComponentSelectionModalOpen(false)}
        onSelectComponent={handleComponentSelection}
      />

      {selectedFeature && activeTool === "select" && (
        <PropertyPanel
          properties={selectedFeature.getProperties() as any}
          onDeleteRequest={handleDeleteRequestFromPanel}
        />
      )}

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        featureName={selectedFeature?.get("label") || "Unknown"}
        featureType={selectedFeature?.get("type") || "Feature"}
        featureId={selectedFeature?.getId()?.toString() || "Unknown"}
        cascadeInfo={cascadeInfo}
      />

      <Cordinates />
    </div>
  );
}
