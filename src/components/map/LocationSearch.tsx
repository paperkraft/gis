"use client";

import { Crosshair, Loader2, Search, X } from "lucide-react";
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
  importance?: number;
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

  // --- Reset when hidden ---
  useEffect(() => {
    if (!showLocationSearch) {
      setSearchQuery("");
      setSearchResults([]);
      setShowResults(false);
    }
  }, [showLocationSearch]);

  // --- Click Outside to Close ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If clicking inside the search box, ignore
      if (inputRef.current && inputRef.current.contains(event.target as Node)) {
        return;
      }
      // If clicking the toggle button (handled by parent usually), ignore
      const target = event.target as HTMLElement;
      if (target.closest('[data-search-toggle="true"]')) {
        return;
      }
      // Close search
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

  // --- Debounced Search ---
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
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const tryParseCoordinates = (query: string): SearchResult | null => {
    // Regex allows: "12.34, 56.78" or "12.34 56.78" or "-12.34, -56.78"
    // Capture Group 1: Lat, Capture Group 4: Lon
    const coordRegex = /^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/;
    const match = query.trim().match(coordRegex);

    if (match) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[3]); // Group 3 is the second number

      // Validate Earth Ranges
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return {
          place_id: -1,
          display_name: `${lat}, ${lon}`,
          lat: lat.toString(),
          lon: lon.toString(),
          type: "coordinate",
        };
      }
    }
    return null;
  };

  const performSearch = async (query: string) => {
    if (!query || query.length < 3) return;

    setIsSearching(true);

    // 1. CHECK FOR COORDINATES FIRST
    const coordResult = tryParseCoordinates(query);

    if (coordResult) {
      setSearchResults([coordResult]);
      setShowResults(true);
      setIsSearching(false);
      return; // Skip API call
    }

    // 2. NOMINATIM API FALLBACK
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          `format=json&q=${encodeURIComponent(query)}&` +
          `limit=5&addressdetails=1&extratags=1`,
        {
          headers: { "User-Agent": "SigmaToolBox/1.0" },
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

    // Handle Bounding Box (Only exists for real places, not coordinates)
    if (result.boundingbox) {
      const [minLat, maxLat, minLon, maxLon] =
        result.boundingbox.map(parseFloat);
      const extent = [
        ...fromLonLat([minLon, minLat]),
        ...fromLonLat([maxLon, maxLat]),
      ];
      map.getView().fit(extent, {
        padding: [100, 100, 100, 100],
        duration: 1000,
        maxZoom: 18,
      });
    } else {
      // Direct Fly-to for Coordinates or Points
      map.getView().animate({
        center: coordinate,
        zoom: 16,
        duration: 1000,
      });
    }

    // Label logic: If it's a coordinate type, show "Go to Coordinate"
    const label =
      result.type === "coordinate"
        ? `Coord: ${result.display_name}`
        : result.display_name;

    addLocationMarker(coordinate, label);

    // Cleanup
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
    markerElement.innerHTML = `
      <div class="relative flex flex-col items-center pointer-events-none transform -translate-y-full">
         <div class="bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap mb-1">
            ${label.split(",")[0]}
         </div>
         <div class="w-3 h-3 bg-primary rounded-full border-2 border-white shadow-sm"></div>
         <div class="w-0.5 h-4 bg-primary"></div>
      </div>
    `;

    import("ol/Overlay").then(({ default: Overlay }) => {
      const marker = new Overlay({
        id: "location-marker",
        element: markerElement,
        positioning: "bottom-center",
        stopEvent: false,
      });
      marker.setPosition(coordinate);
      map.addOverlay(marker);
      // Auto remove after 10s
      setTimeout(() => map.removeOverlay(marker), 10000);
    });
  };

  if (!showLocationSearch) return null;

  return (
    <div
      ref={inputRef}
      className="absolute top-4 right-16 z-50 w-80 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="relative shadow-lg ring-1 ring-slate-900/5 rounded-sm">
        {/* Input Container */}
        <div className="relative flex items-center bg-white rounded-sm overflow-hidden">
          <div className="pl-3 text-slate-400">
            <Search size={16} />
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search place or coordinates..."
            className="w-full p-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none bg-transparent font-medium"
            autoFocus
          />

          <div className="pr-2 flex items-center gap-1">
            {isSearching ? (
              <Loader2 size={14} className="animate-spin text-primary" />
            ) : searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Results Dropdown - Attached seamlessly below */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-px bg-white shadow-xl ring-1 ring-slate-900/5 max-h-75 overflow-y-auto rounded-b-sm">
            <div className="py-1">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => handleResultSelect(result)}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 border-l-2 border-transparent hover:border-primary transition-all group"
                >
                  <div className="flex items-center gap-2">
                    {result.type === "coordinate" && (
                      <Crosshair size={12} className="text-slate-400" />
                    )}
                    <div className="text-xs font-bold text-slate-700 group-hover:text-primary truncate">
                      {result.display_name.split(",")[0]}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5 opacity-80">
                    {result.type === "coordinate"
                      ? "Jump to coordinate"
                      : result.display_name}
                  </div>
                </button>
              ))}
            </div>
            {/* Footer attribution */}
            <div className="px-2 py-1 bg-slate-50 border-t border-slate-100 text-[9px] text-slate-400 text-right">
              {/* Results via OpenStreetMap */}
              Results via
              {searchResults[0]?.type === "coordinate"
                ? " Input"
                : " OpenStreetMap"}
            </div>
          </div>
        )}

        {/* No Results State */}
        {showResults &&
          searchResults.length === 0 &&
          searchQuery.length >= 3 &&
          !isSearching && (
            <div className="absolute top-full left-0 right-0 mt-px bg-white shadow-xl p-4 text-center">
              <p className="text-xs text-slate-500">No locations found.</p>
            </div>
          )}
      </div>
    </div>
  );
}
