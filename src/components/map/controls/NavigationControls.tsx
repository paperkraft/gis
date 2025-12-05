"use client";

import {
  Eye,
  Globe,
  Home,
  Layers,
  Map as MapIcon,
  Mountain,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { layerType } from "@/constants/map";
import {
  handleZoomIn,
  handleZoomOut,
  handleZoomToExtent,
} from "@/lib/interactions/map-controls";
import { switchBaseLayer } from "@/lib/map/baseLayers";
import { useMapStore } from "@/store/mapStore";
import { useUIStore } from "@/store/uiStore";

import { ControlGroup, ToolBtn } from "./Shared";

interface NavigationControlsProps {
  activeGroup: string | null;
  onToggle: (id: string) => void;
}

export function NavigationControls({
  activeGroup,
  onToggle,
}: NavigationControlsProps) {
  const map = useMapStore((state) => state.map);
  const { baseLayer, showLocationSearch, setBaseLayer, setShowLocationSearch } =
    useUIStore();

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
          icon={Eye}
          title="OpenStreetMap"
          label="OSM"
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
