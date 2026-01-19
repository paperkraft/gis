"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Box,
  Navigation,
  Circle,
  Pentagon,
  Hexagon,
  Minus,
  Triangle,
  Square,
} from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";
import { Feature } from "ol";
import { Point } from "ol/geom"; // Import Point for type checking

export function AssetSearch() {
  const map = useMapStore((state) => state.map);
  const vectorSource = useMapStore((state) => state.vectorSource); // Get VectorSource
  const { features, selectFeature } = useNetworkStore();
  const { showAssetSearch, setShowAssetSearch } = useUIStore();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard Shortcut (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowAssetSearch(true);
      }
      if (e.key === "Escape" && showAssetSearch) {
        setShowAssetSearch(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAssetSearch, setShowAssetSearch]);

  useEffect(() => {
    if (showAssetSearch && inputRef.current) {
      inputRef.current.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [showAssetSearch]);

  const filteredAssets = useMemo(() => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();

    return Array.from(features.values())
      .filter((f) => {
        const id = f.getId()?.toString().toLowerCase() || "";
        const label = f.get("label")?.toString().toLowerCase() || "";
        const type = f.get("type")?.toString().toLowerCase() || "";
        return (
          id.includes(lowerQuery) ||
          label.includes(lowerQuery) ||
          type.includes(lowerQuery)
        );
      })
      .slice(0, 10);
  }, [query, features]);

  // --- FIXED NAVIGATION LOGIC ---
  const handleSelect = (storeFeature: Feature) => {
    if (!map) return;

    const id = storeFeature.getId();
    if (!id) return;

    // 1. Try to get the LIVE feature from the map (ensures geometry is rendered)
    // Fallback to storeFeature if not found on map yet
    const feature = vectorSource?.getFeatureById(id) || storeFeature;
    const geometry = feature.getGeometry();

    if (geometry) {
      const type = geometry.getType();

      if (type === "Point") {
        // NODES: Use Animate to Center (Fit often fails on single points)
        const center = (geometry as Point).getCoordinates();
        map.getView().animate({
          center: center,
          zoom: 19, // Close-up zoom
          duration: 800,
        });
      } else {
        // PIPES / LINKS: Use Fit Extent
        map.getView().fit(geometry.getExtent(), {
          padding: [100, 100, 100, 100],
          maxZoom: 19,
          duration: 800,
        });
      }

      // 2. Select the feature (Opens Property Panel)
      selectFeature(id.toString());
    }

    setShowAssetSearch(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredAssets.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredAssets[selectedIndex]) {
        handleSelect(filteredAssets[selectedIndex]);
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "junction":
        return <Circle className="size-4 text-green-600" />;
      case "tank":
        return <Pentagon className="size-4 text-blue-600" />;
      case "reservoir":
        return <Hexagon className="size-4 text-violet-500" />;
      case "pipe":
        return <Minus className="size-4 text-blue-500" />;
      case "pump":
        return <Triangle className="size-4 text-red-500" />;
      case "valve":
        return <Square className="size-4 text-orange-500" />;
      default:
        return <Box className="size-4" />;
    }
  };

  if (!showAssetSearch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transform transition-all scale-100">
        <div className="flex items-center border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
            placeholder="Search assets (e.g., J-100, Pipe-1)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <button
            onClick={() => setShowAssetSearch(false)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
          >
            <div className="text-xs text-gray-400 font-mono border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">
              ESC
            </div>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredAssets.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {query ? "No assets found" : "Type to search network assets"}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredAssets.map((feature, index) => {
                const id = feature.getId()?.toString();
                const type = feature.get("type");
                const label = feature.get("label");
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={id}
                    onClick={() => handleSelect(feature)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-md ${
                        isSelected
                          ? "bg-white dark:bg-gray-800 shadow-sm"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      {getIcon(type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">
                          {id}
                        </span>
                        {label && label !== id && (
                          <span className="text-xs text-gray-500 truncate">
                            ({label})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {type}
                      </div>
                    </div>
                    {isSelected && (
                      <Navigation className="w-4 h-4 text-indigo-500 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
