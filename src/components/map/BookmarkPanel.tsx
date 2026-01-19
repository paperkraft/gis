"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Check, Loader2, MapPin, Trash2, X } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { useUIStore } from "@/store/uiStore";
import { useBookmarkStore } from "@/store/bookmarkStore";
import { Button } from "@/components/ui/button";
import { FloatingPanel } from "./FloatingPanel";
import { easeOut } from "ol/easing";
import { useParams } from "next/navigation";

export function BookmarkPanel() {
  const params = useParams();
  const map = useMapStore((state) => state.map);
  const { bookmarks, isLoading, addBookmark, fetchBookmarks, removeBookmark } =
    useBookmarkStore();
  const { activeModal, setActiveModal } = useUIStore();

  const inputRef = useRef<HTMLInputElement>(null);

  // --- Local State for Naming ---
  const [isAdding, setIsAdding] = useState(false);
  const [customName, setCustomName] = useState("");

  const isOpen = activeModal === "BOOKMARK";
  const projectId = params.id as string;

  useEffect(() => {
    if (projectId) {
      fetchBookmarks(projectId);
    }
  }, [projectId]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setIsAdding(false);
      setCustomName("");
    }
  }, [isOpen]);

  // --- Actions ---

  const handleStartAdd = () => {
    setCustomName(`View ${bookmarks.length + 1}`);
    setIsAdding(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setCustomName("");
  };

  const handleConfirmAdd = async () => {
    if (!map) return;

    const view = map.getView();
    const center = view.getCenter();
    const zoom = view.getZoom();

    if (!center || !zoom) return;

    const finalName = customName.trim() || `View ${bookmarks.length + 1}`;

    await addBookmark(projectId, {
      name: finalName,
      center,
      zoom,
    });

    setIsAdding(false);
    setCustomName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirmAdd();
    if (e.key === "Escape") handleCancel();
  };

  const handleGoTo = (b: any) => {
    if (!map) return;
    const view = map.getView();

    const startCenter = view.getCenter();
    const startZoom = view.getZoom() || 10;

    if (!startCenter) return;

    // 1. Calculate Distance
    const dist = Math.sqrt(
      Math.pow(b.center[0] - startCenter[0], 2) +
        Math.pow(b.center[1] - startCenter[1], 2)
    );

    // 2. Determine "Flight Altitude"
    // If the distance is huge, we must zoom out far (e.g. to Zoom 4 or 5)
    // This prevents loading all the detailed street tiles in between.
    let flightZoom = startZoom;
    let duration = 2000;

    if (dist > 1000000) {
      // Very Long (Continent/Country)
      flightZoom = 4;
      duration = 3500;
    } else if (dist > 50000) {
      // Long (Inter-city)
      flightZoom = 8;
      duration = 2500;
    } else if (dist > 5000) {
      // Medium (City-wide)
      flightZoom = Math.min(startZoom, b.zoom) - 2;
      duration = 1500;
    }

    // 3. Execute the Sequence (Using callbacks for strict ordering)
    // We cannot run concurrent animations reliably for long hops.
    // We strictly: Pan -> Zoom Out -> Zoom In.

    if (dist > 5000) {
      // --- LONG DISTANCE FLIGHT ---
      view.animate({
        center: b.center,
        duration: duration,
        easing: easeOut,
      });

      // The "Bounce" zoom: Out then In
      view.animate(
        {
          zoom: flightZoom,
          duration: duration / 2,
          easing: easeOut,
        },
        {
          zoom: b.zoom,
          duration: duration / 2,
          easing: easeOut,
        }
      );
    } else {
      // --- SHORT HOP (No Zoom Out) ---
      view.animate({
        center: b.center,
        zoom: b.zoom,
        duration: 800,
        easing: easeOut,
      });
    }
  };

  const handleClose = () => setActiveModal("NONE");

  // Define Footer Content
  const footerContent = !isAdding ? (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClose}
        className="text-xs"
      >
        Cancel
      </Button>
      <Button
        size="sm"
        onClick={handleStartAdd}
        disabled={isAdding}
        className="text-xs"
      >
        {isAdding ? "Saving..." : "Bookmark"}
      </Button>
    </>
  ) : (
    <div className="w-full flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <input
        ref={inputRef}
        type="text"
        value={customName}
        onChange={(e) => setCustomName(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-slate-50 border border-slate-200 rounded-sm px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all h-8"
        placeholder="Name this view..."
      />
      <button
        onClick={handleConfirmAdd}
        className="p-1.5 bg-primary hover:bg-primary/90 text-white rounded-sm transition-colors h-8 w-8 flex items-center justify-center"
        title="Save"
      >
        <Check size={14} />
      </button>
      <button
        onClick={handleCancel}
        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-sm transition-colors h-8 w-8 flex items-center justify-center"
        title="Cancel"
      >
        <X size={14} />
      </button>
    </div>
  );

  return (
    <FloatingPanel
      title="Saved Locations"
      icon={Bookmark}
      isOpen={isOpen}
      onClose={() => setActiveModal("NONE")}
      footer={footerContent}
    >
      <div className="space-y-1">
        {isLoading && bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
            <Loader2 size={24} className="animate-spin text-blue-500" />
            <span className="text-xs">Loading bookmarks...</span>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-slate-400 text-xs text-center px-4">
            <MapPin size={20} className="mb-2 opacity-50" />
            <p>No bookmarks yet.</p>
            <p className="opacity-70">
              Save key locations to quickly navigate.
            </p>
          </div>
        ) : (
          bookmarks.map((b) => (
            <div
              key={b.id}
              onClick={() => handleGoTo(b)}
              className="group flex items-center justify-between p-2 hover:bg-slate-50 rounded-md cursor-pointer border border-transparent hover:border-blue-100 transition-all"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 group-hover:bg-blue-50 group-hover:text-primary transition-colors">
                  <MapPin size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-700 truncate group-hover:text-primary">
                    {b.name}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    Lat: {b.center[1].toFixed(2)}, Lon: {b.center[0].toFixed(2)}
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeBookmark(b.id);
                }}
                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="Delete Bookmark"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </FloatingPanel>
  );
}
