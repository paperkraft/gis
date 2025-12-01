import React from "react";

import { useMapStore } from "@/store/mapStore";

export function Cordinates() {
  const { coordinates } = useMapStore();
  return (
    <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md border border-gray-200">
      <div className="flex items-center gap-2">
        <svg
          className="w-3 h-3 text-blue-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-xs font-mono text-gray-700 font-medium">
          {coordinates}
        </span>
      </div>
    </div>
  );
}
