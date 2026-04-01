"use client";

import {
  Bookmark,
  ExpandIcon,
  MapIcon,
  Maximize,
  Search,
  ShrinkIcon,
  SquareMousePointer,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import {
  handleZoomIn,
  handleZoomOut,
  handleZoomToExtent,
} from "@/lib/interactions/map-controls";
import { useMapStore } from "@/store/mapStore";
import { useUIStore } from "@/store/uiStore";

import { ControlGroup, Divider, ToolBtn } from "./Shared";
import { useEffect, useState } from "react";

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
    activeRightPanel,
    setActiveRightPanel,
    setActiveTool,
  } = useUIStore();

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const isActiveGroup = activeTool === "zoom-box" || isFullscreen || activeRightPanel === "BOOKMARK"

  const toggleFullscreen = () => {
    const container = document.getElementById('map-viewport-container');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
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
        isActiveGroup={isActiveGroup}
      >
        <ToolBtn
          onClick={() => setActiveRightPanel(activeRightPanel === 'LOCATION' ? 'NONE' : 'LOCATION')}
          isActive={activeRightPanel === 'LOCATION'}
          icon={Search}
          title="Search"
        />

        <Divider />

        <ToolBtn
          onClick={() => handleZoomIn(map)}
          icon={ZoomIn}
          title="Zoom In +"
        />

        <ToolBtn
          onClick={() => handleZoomOut(map)}
          icon={ZoomOut}
          title="Zoom Out -"
        />

        <ToolBtn
          onClick={() => handleZoomToExtent(map)}
          icon={Maximize}
          title="Zoom Extent F"
        />

        <ToolBtn
          onClick={() => setActiveTool("zoom-box")}
          isActive={activeTool === "zoom-box"}
          icon={SquareMousePointer}
          title="Zoom to Box Z"
        />

        <ToolBtn
          onClick={toggleFullscreen}
          isActive={isFullscreen}
          icon={isFullscreen ? ShrinkIcon : ExpandIcon}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        />

        <Divider />

        <ToolBtn
          onClick={() => setActiveRightPanel(activeRightPanel === 'BOOKMARK' ? 'NONE' : 'BOOKMARK')}
          isActive={activeRightPanel === "BOOKMARK"}
          icon={Bookmark}
          title="Bookmarks"
        />
      </ControlGroup>
    </>
  );
}
