"use client";

import { Eye, EyeOff, Maximize, Palette } from 'lucide-react';
import { createEmpty, extend, isEmpty } from 'ol/extent';
import { useEffect, useRef } from 'react';

import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';
import { useUIStore } from '@/store/uiStore';

export function ContextMenu() {
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    contextMenu,
    setContextMenu,
    toggleLayerVisibility,
    layerVisibility,
    setActiveStyleLayer,
    setActiveModal,
  } = useUIStore();

  const map = useMapStore((state) => state.map);
  const features = useNetworkStore((state) => state.features);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [setContextMenu]);

  if (!contextMenu) return null;

  const { x, y, id, type } = contextMenu;
  const isLayer = type === "layer";
  const isVisible = isLayer ? layerVisibility[id] : true;

  // --- ACTIONS ---
  const handleEditStyle = () => {
    setActiveStyleLayer(id);
    setActiveModal("STYLE_SETTINGS");
    setContextMenu(null);
  };

  const handleToggleVisibility = () => {
    toggleLayerVisibility(id);
    setContextMenu(null);
  };

  const handleZoomToLayer = () => {
    if (!map) return;

    // 1. Filter features belonging to this layer (e.g., 'pipe', 'junction')
    const layerFeatures = Array.from(features.values()).filter(
      (f) => f.get("type") === id
    );

    if (layerFeatures.length === 0) {
      console.warn("No features found for layer:", id);
      setContextMenu(null);
      return;
    }

    // 2. Calculate the total extent
    const totalExtent = createEmpty();
    let hasValidGeo = false;

    layerFeatures.forEach((feature) => {
      const geometry = feature.getGeometry();
      if (geometry) {
        extend(totalExtent, geometry.getExtent());
        hasValidGeo = true;
      }
    });

    // 3. Zoom the map
    if (hasValidGeo && !isEmpty(totalExtent)) {
      map.getView().fit(totalExtent, {
        padding: [100, 100, 100, 100], // Add padding so features aren't at the very edge
        duration: 800, // Smooth animation
        maxZoom: 18, // Prevent zooming in too close on single points
      });
    }

    setContextMenu(null);
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1 text-slate-700 animate-in fade-in zoom-in-95 duration-100"
      style={{ top: y, left: x }}
    >
      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
        {id.toUpperCase()} Options
      </div>

      <MenuItem
        icon={Palette}
        label="Edit Symbology"
        onClick={handleEditStyle}
      />

      <MenuItem
        icon={isVisible ? EyeOff : Eye}
        label={isVisible ? "Hide Layer" : "Show Layer"}
        onClick={handleToggleVisibility}
      />

      <MenuItem
        icon={Maximize}
        label="Zoom to Layer"
        onClick={handleZoomToLayer}
      />
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: any) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors text-left
        ${danger ? "text-red-600 hover:bg-red-50" : "text-slate-600"}
      `}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
