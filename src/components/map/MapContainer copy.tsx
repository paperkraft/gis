"use client";
import "ol/ol.css";

import { Feature } from "ol";
import { click } from "ol/events/condition";
import { LineString, Point } from "ol/geom";
import { Select } from "ol/interaction";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import Map from "ol/Map";
import Overlay from "ol/Overlay";
import { fromLonLat, toLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import {
  Circle as CircleStyle,
  Fill,
  RegularShape,
  Stroke,
  Style,
} from "ol/style";
import View from "ol/View";
import React, { useEffect, useRef, useState } from "react";

import {
  COMPONENT_TYPES,
  SNAPPING_TOLERANCE,
} from "@/constants/networkComponents";
import { ContextMenuManager } from "@/lib/topology/contextMenuManager";
import { DeleteManager } from "@/lib/topology/deleteManager";
import { ModifyManager } from "@/lib/topology/modifyManager";
import { PipeDrawingManager } from "@/lib/topology/pipeDrawingManager";
import { useMapStore } from "@/store/mapStore";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";
import { FeatureType } from "@/types/network";

import { MapControls } from "./MapControls";
import { ComponentSelectionModal } from "../modals/ComponentSelectionModal";
import { DeleteConfirmationModal } from "../modals/DeleteConfirmationModal";
import { PropertyPanel } from "./PropertyPanel";

export function MapContainer() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const selectInteractionRef = useRef<Select | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const vectorLayerRef = useRef<VectorLayer<any> | null>(null);

  // Managers
  const pipeDrawingManagerRef = useRef<PipeDrawingManager | null>(null);
  const contextMenuManagerRef = useRef<ContextMenuManager | null>(null);
  const modifyManagerRef = useRef<ModifyManager | null>(null);
  const deleteManagerRef = useRef<DeleteManager | null>(null);

  // Zustand stores
  const { addFeature, updateFeature, selectFeature, generateUniqueId } =
    useNetworkStore();
  const { setMap, setVectorSource, activeTool, setActiveTool } = useMapStore();
  const {
    layerVisibility,
    componentSelectionModalOpen,
    setComponentSelectionModalOpen,
  } = useUIStore();

  const [coordinates, setCoordinates] = useState<string>("77.2090, 28.6139");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [featureToDelete, setFeatureToDelete] = useState<Feature | null>(null);
  const [selectedFeatureProps, setSelectedFeatureProps] = useState<any>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create vector source
    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

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

    // Vector layer with dynamic styling
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: (feature) => getFeatureStyle(feature as Feature), // SINGLE SOURCE OF TRUTH
      properties: {
        name: "network",
        title: "Network Layer",
      },
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      zIndex: 100, // Ensure network layer is on top
    });

    vectorLayerRef.current = vectorLayer;

    // Initialize map
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
        center: fromLonLat([77.209, 28.6139]), // Delhi coordinates
        // center: fromLonLat([77.5946, 12.9716]), // Bangalore
        zoom: 16,
      }),
      controls: [],
    });

    mapInstanceRef.current = map;
    setMap(map);
    setVectorSource(vectorSource);

    // Initialize Select interaction
    const selectInteraction = new Select({
      layers: [vectorLayer],
      condition: click,
      style: (feature) => getSelectedStyle(feature as Feature),
      filter: (feature) =>
        !feature.get("isPreview") && !feature.get("isVertexMarker"),
    });

    selectInteraction.on("select", (event) => {
      if (event.selected.length > 0) {
        const feature = event.selected[0];
        selectFeature(feature.getId() as string);
        setSelectedFeatureProps(feature.getProperties());
      } else {
        selectFeature(null);
        setSelectedFeatureProps(null);
      }
    });

    map.addInteraction(selectInteraction);
    selectInteractionRef.current = selectInteraction;

    // Track mouse coordinates
    map.on("pointermove", (event) => {
      const coord = toLonLat(event.coordinate);
      setCoordinates(`${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}`);
    });

    // Initialize managers
    const pipeDrawingManager = new PipeDrawingManager(map, vectorSource);
    const contextMenuManager = new ContextMenuManager(map, vectorSource);
    const modifyManager = new ModifyManager(map, vectorSource);
    const deleteManager = new DeleteManager(map, vectorSource);

    pipeDrawingManager.registerWithContextMenu(contextMenuManager);
    contextMenuManager.setPipeDrawingManager(pipeDrawingManager);

    pipeDrawingManagerRef.current = pipeDrawingManager;
    contextMenuManagerRef.current = contextMenuManager;
    modifyManagerRef.current = modifyManager;
    deleteManagerRef.current = deleteManager;

    // Load sample data
    // loadSampleData(vectorSource);

    return () => {
      pipeDrawingManager.cleanup();
      contextMenuManager.cleanup();
      modifyManager.cleanup();
      deleteManager.cleanup();
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, []);

  // Initialize DeleteManager with callback
  useEffect(() => {
    if (!mapInstanceRef.current || !vectorSourceRef.current) return;

    const deleteManager = new DeleteManager(
      mapInstanceRef.current,
      vectorSourceRef.current
    );

    // Set the delete request callback
    deleteManager.onDeleteRequest = (feature: Feature) => {
      setFeatureToDelete(feature);
      setDeleteModalOpen(true);
    };

    deleteManagerRef.current = deleteManager;

    return () => {
      deleteManager.cleanup();
    };
  }, []);

  // Handle tool changes
  useEffect(() => {
    if (!mapInstanceRef.current || !pipeDrawingManagerRef.current) return;

    const map = mapInstanceRef.current;

    // Clear all active interactions
    modifyManagerRef.current?.cleanup();

    switch (activeTool) {
      case "select":
        map.getViewport().style.cursor = "default";
        break;
      case "modify":
        modifyManagerRef.current?.startModifying();
        break;
      case "pipe":
        pipeDrawingManagerRef.current.startDrawing();
        break;
      case "junction":
      case "tank":
      case "reservoir":
      case "pump":
      case "valve":
        startPointDrawing(activeTool);
        break;
      default:
        break;
    }
  }, [activeTool]);

  // Handle layer visibility changes
  // useEffect(() => {
  //   if (!vectorSourceRef.current) return;

  //   vectorSourceRef.current.getFeatures().forEach((feature) => {
  //     const featureType = feature.get("type");
  //     if (layerVisibility[featureType] === false) {
  //       feature.setStyle(new Style({})); // Hide
  //     } else {
  //       feature.setStyle(undefined); // Use default style
  //     }
  //   });
  // }, [layerVisibility]);

  // Start point drawing for nodes
  // NEW - Simple point drawing
  const startPointDrawing = (componentType: string) => {
    if (!mapInstanceRef.current || !vectorSourceRef.current) return;

    const map = mapInstanceRef.current;
    const vectorSource = vectorSourceRef.current;

    map.getViewport().style.cursor = "crosshair";

    const clickHandler = (event: any) => {
      const coordinate = event.coordinate;

      console.log(`📍 Placing ${componentType} at:`, coordinate);

      // Check if on pipe - let PipeDrawingManager handle split
      const pipeAtLocation = findPipeNearCoordinate(coordinate, vectorSource);

      if (pipeAtLocation && pipeDrawingManagerRef.current) {
        // Place on pipe - manager will handle split
        console.log("  On pipe - will split");

        if (componentType === "pump" || componentType === "valve") {
          pipeDrawingManagerRef.current.insertLinkOnPipe(
            pipeAtLocation,
            coordinate,
            componentType as "pump" | "valve"
          );
        } else {
          pipeDrawingManagerRef.current.insertJunctionOnPipe(
            pipeAtLocation,
            coordinate
          );
        }
      } else {
        // Place in empty space
        console.log("  In empty space");
        createSimpleNode(componentType, coordinate);
      }

      // Clean up
      map.un("singleclick", clickHandler);
      map.getViewport().style.cursor = "default";
      setActiveTool("select");
    };

    map.on("singleclick", clickHandler);
  };

  // Helper: Find pipe near coordinate
  const findPipeNearCoordinate = (
    coordinate: number[],
    vectorSource: VectorSource
  ): Feature | null => {
    const pixel = mapInstanceRef.current!.getPixelFromCoordinate(coordinate);
    const features = vectorSource.getFeatures();

    return features.find((feature) => {
      if (feature.get("type") !== "pipe") return false;

      const geometry = feature.getGeometry();
      if (geometry instanceof LineString) {
        const closestPoint = geometry.getClosestPoint(coordinate);
        const closestPixel =
          mapInstanceRef.current!.getPixelFromCoordinate(closestPoint);
        const distance = Math.sqrt(
          Math.pow(pixel[0] - closestPixel[0], 2) +
            Math.pow(pixel[1] - closestPixel[1], 2)
        );
        return distance <= SNAPPING_TOLERANCE;
      }
      return false;
    }) as Feature | null;
  };

  // Helper: Create simple node
  const createSimpleNode = (componentType: string, coordinate: number[]) => {
    if (!vectorSourceRef.current) return;

    console.log(`📍 Creating ${componentType} at:`, coordinate);

    // Check if placing on a pipe
    const pipeAtLocation = findPipeNearCoordinate(
      coordinate,
      vectorSourceRef.current
    );

    if (pipeAtLocation && pipeDrawingManagerRef.current) {
      console.log("  📌 Detected pipe nearby - will auto-split");

      // Use PipeDrawingManager to place and split
      if (
        componentType === "junction" ||
        componentType === "tank" ||
        componentType === "reservoir"
      ) {
        const junction = pipeDrawingManagerRef.current.insertJunctionOnPipe(
          pipeAtLocation,
          coordinate
        );
        console.log(`✅ ${componentType} placed and pipe split`);
        return junction;
      }
    }

    // No pipe nearby - create simple node
    console.log("  No pipe nearby - placing standalone");

    const feature = new Feature({
      geometry: new Point(coordinate),
    });

    const id = generateUniqueId(componentType as any);
    feature.setId(id);
    feature.set("type", componentType);
    feature.set("isNew", true);
    feature.setProperties({
      ...COMPONENT_TYPES[componentType].defaultProperties,
      label: `${COMPONENT_TYPES[componentType].name}-${id}`,
    });
    feature.set("connectedLinks", []);

    vectorSourceRef.current.addFeature(feature);
    addFeature(feature);

    console.log(`✅ ${componentType} created:`, id);
    return feature;
  };

  // Feature styling
  const getFeatureStyle = (feature: Feature): Style | Style[] => {
    const featureType = feature.get("type");
    const featureId = feature.getId();

    // Debug log
    console.log("🎨 getFeatureStyle called:", {
      id: featureId,
      type: featureType,
      isPreview: feature.get("isPreview"),
      isMarker: feature.get("isVertexMarker"),
      allProperties: feature.getProperties(),
    });

    // Don't style temporary features
    if (feature.get("isPreview") || feature.get("isVertexMarker")) {
      return feature.getStyle() as Style;
    }

    const isHidden = feature.get("hidden");
    if (isHidden) {
      console.log("  ❌ Feature is hidden");
      return new Style({}); // Invisible style
    }

    const componentConfig = COMPONENT_TYPES[featureType];

    if (featureType === "pipe") {
      console.log("  ✅ Creating PIPE style for:", featureId);

      const lineStyle = new Style({
        stroke: new Stroke({
          color: "#0066cc",
          width: 4,
        }),
      });

      // Arrow style for direction
      const geometry = feature.getGeometry() as LineString;
      const coords = geometry.getCoordinates();

      if (coords && coords.length >= 2) {
        const start = coords[0];
        const end = coords[coords.length - 1];
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const rotation = Math.atan2(dy, dx);
        const midPoint = [(end[0] + start[0]) / 2, (end[1] + start[1]) / 2];

        const arrowStyle = new Style({
          geometry: new Point(midPoint),
          image: new RegularShape({
            fill: new Fill({ color: "#555555" }),
            stroke: new Stroke({ color: "#ffffff", width: 1 }),
            points: 3,
            radius: 8,
            rotation: -rotation,
            angle: -0,
          }),
        });

        console.log("  ✅ Returning [lineStyle + arrowStyle]");
        return [lineStyle, arrowStyle];
      }

      return lineStyle;
    }

    if (componentConfig) {
      if (featureType === "junction") {
        return new Style({
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({ color: componentConfig.color }),
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
          }),
        });
      } else if (featureType === "tank") {
        return new Style({
          image: new RegularShape({
            fill: new Fill({ color: componentConfig.color }),
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
            points: 4,
            radius: 12,
          }),
        });
      } else if (featureType === "reservoir") {
        return new Style({
          image: new RegularShape({
            fill: new Fill({ color: componentConfig.color }),
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
            points: 6,
            radius: 10,
          }),
        });
      } else if (featureType === "pump") {
        return new Style({
          image: new RegularShape({
            fill: new Fill({ color: componentConfig.color }),
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
            points: 3,
            radius: 10,
          }),
        });
      } else if (featureType === "valve") {
        return new Style({
          image: new RegularShape({
            fill: new Fill({ color: componentConfig.color }),
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
            points: 4,
            radius: 8,
            angle: Math.PI / 4,
          }),
        });
      }
    }

    return new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: "#cccccc" }),
        stroke: new Stroke({ color: "#ffffff", width: 2 }),
      }),
    });
  };

  // Selected feature styling
  const getSelectedStyle = (feature: Feature): Style | Style[] => {
    const featureType = feature.get("type");

    if (featureType === "pipe") {
      return [
        new Style({
          stroke: new Stroke({
            color: "rgba(31, 184, 205, 0.6)",
            width: 10,
          }),
        }),
        new Style({
          stroke: new Stroke({
            color: "rgba(31, 184, 205, 0.9)",
            width: 6,
          }),
        }),
        new Style({
          stroke: new Stroke({
            color: "#1FB8CD",
            width: 4,
          }),
        }),
      ];
    } else {
      const baseColor = COMPONENT_TYPES[featureType]?.color || "#cccccc";
      return [
        new Style({
          image: new CircleStyle({
            radius: 14,
            fill: new Fill({ color: "rgba(31, 184, 205, 0.25)" }),
            stroke: new Stroke({ color: "rgba(31, 184, 205, 0.5)", width: 6 }),
          }),
        }),
        new Style({
          image: new CircleStyle({
            radius: 10,
            fill: new Fill({ color: baseColor }),
            stroke: new Stroke({ color: "#1FB8CD", width: 4 }),
          }),
        }),
      ];
    }
  };

  // Handle delete request from PropertyPanel
  const handleDeleteRequestFromPanel = () => {
    const selectedFeatureId = useNetworkStore.getState().selectedFeatureId;
    if (!selectedFeatureId || !vectorSourceRef.current) return;

    const feature = vectorSourceRef.current
      .getFeatures()
      .find((f) => f.getId() === selectedFeatureId);

    if (feature) {
      setFeatureToDelete(feature);
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (featureToDelete && deleteManagerRef.current) {
      deleteManagerRef.current.executeDelete(featureToDelete);
      // Close modal
      setDeleteModalOpen(false);
      setFeatureToDelete(null);

      // Close property panel by clearing selection
      useNetworkStore.getState().selectFeature(null);
      setSelectedFeatureProps(null);
    }
  };

  // Watch for selection changes to update property panel
  useEffect(() => {
    const selectedFeatureId = useNetworkStore.getState().selectedFeatureId;

    if (!selectedFeatureId) {
      setSelectedFeatureProps(null);
      return;
    }

    if (vectorSourceRef.current) {
      const feature = vectorSourceRef.current
        .getFeatures()
        .find((f) => f.getId() === selectedFeatureId);

      if (feature) {
        setSelectedFeatureProps(feature.getProperties());
      } else {
        setSelectedFeatureProps(null);
      }
    }
  }, [useNetworkStore.getState().selectedFeatureId]);

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setFeatureToDelete(null);
  };

  const cascadeInfo = featureToDelete
    ? deleteManagerRef.current?.getCascadeInfo(featureToDelete)
    : undefined;

  const handleComponentSelection = (componentType: FeatureType | "skip") => {
    setComponentSelectionModalOpen(false);

    if (componentType === "skip") {
      // Start pipe drawing without initial component
      if (pipeDrawingManagerRef.current) {
        pipeDrawingManagerRef.current.startDrawing();
      }
    } else {
      // Place component then start pipe drawing
      startComponentPlacement(componentType);
    }
  };

  const startComponentPlacement = (componentType: FeatureType) => {
    if (!mapInstanceRef.current || !vectorSourceRef.current) return;

    const map = mapInstanceRef.current;
    const vectorSource = vectorSourceRef.current;

    map.getViewport().style.cursor = "crosshair";
    console.log("📍 Click on map to place component...");

    // Create a one-time placement interaction
    let placementComplete = false;

    const placementHandler = (event: any) => {
      // Prevent multiple triggers
      if (placementComplete) return;
      placementComplete = true;

      const coordinate = event.coordinate;

      // Stop event propagation
      event.stopPropagation();

      // Create the starting component
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

      // Style the node
      feature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({ color: COMPONENT_TYPES[componentType].color }),
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
          }),
        })
      );

      vectorSource.addFeature(feature);
      addFeature(feature);

      console.log(`✅ ${COMPONENT_TYPES[componentType].name} placed: ${id}`);

      // Remove handler
      map.un("singleclick", placementHandler);

      // Wait for event to fully complete, then start pipe drawing
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (pipeDrawingManagerRef.current) {
            console.log("🎯 Starting pipe drawing mode...");

            // First start drawing mode (this sets up the handlers)
            pipeDrawingManagerRef.current.startDrawing();

            // Then set the initial node
            pipeDrawingManagerRef.current.continueDrawingFromNode(feature);

            console.log(
              "✅ Pipe drawing active - click to add next node or right-click for junction"
            );
          }
        }, 150);
      });
    };

    map.on("singleclick", placementHandler);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      <MapControls />

      <ComponentSelectionModal
        isOpen={componentSelectionModalOpen}
        onClose={() => setComponentSelectionModalOpen(false)}
        onSelectComponent={handleComponentSelection}
      />

      {selectedFeatureProps && (
        <PropertyPanel
          properties={selectedFeatureProps}
          onDeleteRequest={handleDeleteRequestFromPanel}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        featureName={
          featureToDelete?.get("label") || featureToDelete?.getId() || "Unknown"
        }
        featureType={featureToDelete?.get("type") || "Feature"}
        featureId={featureToDelete?.getId()?.toString() || "Unknown"}
        cascadeInfo={cascadeInfo}
      />

      <div className="absolute bottom-4 right-4 text-xs text-gray-600 bg-white/90 px-3 py-1.5 rounded-md shadow-sm">
        Coordinates: {coordinates}
      </div>
    </div>
  );
}
