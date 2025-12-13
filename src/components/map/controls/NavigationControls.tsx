"use client";

import {
  Globe,
  Home,
  Layers,
  Map as MapIcon,
  MapPin,
  MapPinnedIcon,
  Mountain,
  Search,
  SquareMousePointer,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { layerType } from "@/constants/map";
import {
  handleZoomIn,
  handleZoomOut,
  handleZoomToExtent,
} from "@/lib/interactions/map-controls";
import { switchBaseLayer } from "../../../lib/map/baseLayers";
import { useMapStore } from "@/store/mapStore";
import { useUIStore } from "@/store/uiStore";

import { ControlGroup, Divider, ToolBtn } from "./Shared";

interface NavigationControlsProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
}

export function NavigationControls({
  activeGroup,
  onToggle,
}: NavigationControlsProps) {
  const map = useMapStore((state) => state.map);
  const {
    activeTool,
    baseLayer,
    showLocationSearch,
    setActiveTool,
    setBaseLayer,
    setShowLocationSearch,
  } = useUIStore();

  const handleBaseLayerChange = (layerType: layerType) => {
    if (!map) return;
    switchBaseLayer(map, layerType);
    setBaseLayer(layerType);
  };

  return (
    <>
      {/* Main Nav Group */}
      <ControlGroup
        id="nav"
        icon={MapIcon}
        label="Navigation"
        activeGroup={activeGroup}
        onToggle={onToggle}
      >
        <ToolBtn
          onClick={() => setShowLocationSearch(!showLocationSearch)}
          isActive={showLocationSearch}
          icon={Search}
          title="Search"
        />
        <Divider />

        {/* NEW: Zoom Box Tool */}
        <ToolBtn
          onClick={() => setActiveTool("zoom-box")}
          isActive={activeTool === "zoom-box"}
          icon={SquareMousePointer}
          title="Zoom to Box"
        />

        <Divider />
        <ToolBtn
          onClick={() => handleZoomIn(map)}
          icon={ZoomIn}
          title="Zoom In"
        />
        <ToolBtn
          onClick={() => handleZoomOut(map)}
          icon={ZoomOut}
          title="Zoom Out"
        />
        <ToolBtn
          onClick={() => handleZoomToExtent(map)}
          icon={Home}
          title="Zoom Extent"
        />
      </ControlGroup>

      {/* Base Layer Sub-Group */}
      <ControlGroup
        id="layers"
        icon={Layers}
        label="Base Layers"
        activeGroup={activeGroup}
        onToggle={onToggle}
      >
        <ToolBtn
          onClick={() => handleBaseLayerChange("osm")}
          isActive={baseLayer === "osm"}
          icon={MapPin}
          title="OpenStreetMap"
          label="OSM"
        />

        <ToolBtn
          onClick={() => handleBaseLayerChange("mapbox")}
          isActive={baseLayer === "mapbox"}
          icon={MapPinnedIcon}
          title="Mapbox"
          label="Box"
        />
        <ToolBtn
          onClick={() => handleBaseLayerChange("satellite")}
          isActive={baseLayer === "satellite"}
          icon={Globe}
          title="Satellite"
          label="Sat"
        />
        <ToolBtn
          onClick={() => handleBaseLayerChange("terrain")}
          isActive={baseLayer === "terrain"}
          icon={Mountain}
          title="Terrain"
          label="Topo"
        />
      </ControlGroup>
    </>
  );
}
