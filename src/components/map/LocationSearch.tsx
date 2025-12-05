"use client";

import { Loader2, MapPin, Search, X } from "lucide-react";
import { fromLonLat } from "ol/proj";
import { useEffect, useRef, useState } from "react";

import { useMapStore } from "@/store/mapStore";
import { useUIStore } from "@/store/uiStore";

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
  boundingbox?: string[];
}

export function LocationSearch() {

  const map = useMapStore((state) => state.map);
  const { showLocationSearch, setShowLocationSearch } = useUIStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const searchTimeoutRef = useRef<NodeJS.Timeout>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showLocationSearch) {
      setSearchQuery("");
      setSearchResults([]);
      setShowResults(false);
    }
  }, [showLocationSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && inputRef.current.contains(event.target as Node)) {
        return;
      }

      const target = event.target as HTMLElement;
      if (target.closest('[data-search-toggle="true"]')) {
        return;
      }

      if (showLocationSearch) {
        setShowLocationSearch(false);
      }
    };

    if (showLocationSearch) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLocationSearch, setShowLocationSearch]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (!query || query.length < 3) return;

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          `format=json&q=${encodeURIComponent(query)}&` +
          `limit=5&` +
          `addressdetails=1&` +
          `extratags=1`,
        {
          headers: {
            "User-Agent": "WaterNetworkGIS/1.0",
          },
        }
      );

      if (!response.ok) throw new Error("Search failed");

      const data: SearchResult[] = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultSelect = (result: SearchResult) => {
    if (!map) return;

    const lon = parseFloat(result.lon);
    const lat = parseFloat(result.lat);
    const coordinate = fromLonLat([lon, lat]);

    if (result.boundingbox) {
      const [minLat, maxLat, minLon, maxLon] =
        result.boundingbox.map(parseFloat);
      const extent = [
        ...fromLonLat([minLon, minLat]),
        ...fromLonLat([maxLon, maxLat]),
      ];
      map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        duration: 1000,
        maxZoom: 16,
      });
    } else {
      map.getView().animate({
        center: coordinate,
        zoom: 15,
        duration: 1000,
      });
    }

    addLocationMarker(coordinate, result.display_name);
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    setShowLocationSearch(false);
  };

  const addLocationMarker = (coordinate: number[], label: string) => {
    if (!map) return;

    const existingMarker = map.getOverlayById("location-marker");
    if (existingMarker) map.removeOverlay(existingMarker);

    const markerElement = document.createElement("div");
    markerElement.style.cssText = `position: relative; width: 30px; height: 30px;`;

    markerElement.innerHTML = `
      <div style="position: absolute; top: 0; left: 0; width: 30px; height: 30px; background: #EF4444; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(45deg); width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
      </div>
      <div style="position: absolute; top: 35px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; white-space: nowrap; pointer-events: none; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${label}</div>
    `;

    import("ol/Overlay").then(({ default: Overlay }) => {
      const marker = new Overlay({
        id: "location-marker",
        element: markerElement,
        positioning: "center-center",
        stopEvent: false,
        offset: [0, 0],
      });
      marker.setPosition(coordinate);
      map.addOverlay(marker);
      setTimeout(() => map.removeOverlay(marker), 10000);
    });
  };

  const handleClear = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  // Conditional Render based on Store
  if (!showLocationSearch) return null;

  return (
    // Added animate-in classes for smooth toggle appearance
    <div
      className="absolute top-4 right-16 z-20 w-80 animate-in fade-in slide-in-from-right-2 duration-200"
      ref={inputRef}
    >
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4" />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location..."
            className="w-full pl-8 pr-8 py-2.5 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
            autoFocus
          />

          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-blue-500 animate-spin" />
          )}

          {/* Clear Button */}
          {searchQuery && !isSearching && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 hover:text-gray-600"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden max-h-80 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                onClick={() => handleResultSelect(result)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {result.display_name.split(",")[0]}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {result.display_name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 capitalize">
                        {result.type}
                      </span>
                      <span className="text-xs text-gray-300">•</span>
                      <span className="text-xs text-gray-400">
                        {parseFloat(result.lat).toFixed(4)},{" "}
                        {parseFloat(result.lon).toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No Results */}
        {showResults &&
          searchResults.length === 0 &&
          !isSearching &&
          searchQuery.length >= 3 && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-100 px-4 py-4 text-center">
              <p className="text-sm text-gray-500">No locations found</p>
            </div>
          )}
      </div>
    </div>
  );
}
