"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, MapPin, Plus, Trash2, X, Check } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { useBookmarkStore } from "@/store/bookmarkStore";

export function BookmarkPanel() {
  const map = useMapStore((state) => state.map);
  const { bookmarks, isPanelOpen, setPanelOpen, addBookmark, removeBookmark } =
    useBookmarkStore();

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Local State for Naming ---
  const [isAdding, setIsAdding] = useState(false);
  const [customName, setCustomName] = useState("");

  // Reset state when panel closes
  useEffect(() => {
    if (!isPanelOpen) {
      setIsAdding(false);
      setCustomName("");
    }
  }, [isPanelOpen]);

  // Click Outside to Close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && panelRef.current.contains(event.target as Node))
        return;

      const target = event.target as HTMLElement;
      if (target.closest('[data-bookmark-toggle="true"]')) return;

      if (isPanelOpen) setPanelOpen(false);
    };

    if (isPanelOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPanelOpen, setPanelOpen]);

  // --- Actions ---

  // 1. Start the Add Process
  const handleStartAdd = () => {
    setCustomName(`View ${bookmarks.length + 1}`);
    setIsAdding(true);
    // Focus the input after a short delay for render
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // 2. Cancel
  const handleCancel = () => {
    setIsAdding(false);
    setCustomName("");
  };

  // 3. Confirm & Save
  const handleConfirmAdd = () => {
    if (!map) return;
    const view = map.getView();
    const center = view.getCenter();
    const zoom = view.getZoom();

    if (!center || !zoom) return;

    // Use default name if empty
    const finalName = customName.trim() || `View ${bookmarks.length + 1}`;

    addBookmark({
      id: crypto.randomUUID(),
      name: finalName,
      center,
      zoom,
      timestamp: Date.now(),
    });

    setIsAdding(false);
    setCustomName("");
  };

  // Handle "Enter" key in input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirmAdd();
    if (e.key === "Escape") handleCancel();
  };

  const handleGoTo = (b: any) => {
    if (!map) return;
    map.getView().animate({
      center: b.center,
      zoom: b.zoom,
      duration: 1000,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  };

  if (!isPanelOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute top-4 right-16 z-50 w-80 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="bg-white shadow-xl ring-1 ring-slate-900/5 rounded-sm overflow-hidden flex flex-col max-h-100">
        {/* Header */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wide">
            <Bookmark size={14} className="text-blue-600" />
            Saved Locations
          </div>
          <button
            onClick={() => setPanelOpen(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-1 custom-scrollbar min-h-25">
          {bookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-slate-400 text-xs text-center px-4">
              <MapPin size={20} className="mb-2 opacity-50" />
              <p>No bookmarks yet.</p>
              <p className="opacity-70">
                Save key locations to quickly navigate.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {bookmarks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => handleGoTo(b)}
                  className="group flex items-center justify-between p-2 hover:bg-slate-50 rounded-sm cursor-pointer border border-transparent hover:border-blue-100 transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-sm bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <MapPin size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-700 truncate group-hover:text-blue-700">
                        {b.name}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        Lat: {b.center[1].toFixed(2)}, Lon:{" "}
                        {b.center[0].toFixed(2)}
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
              ))}
            </div>
          )}
        </div>

        {/* Footer Action (Dynamic) */}
        <div className="p-2 border-t border-slate-100 bg-white">
          {!isAdding ? (
            // State A: Button
            <button
              onClick={handleStartAdd}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium py-2 rounded-sm shadow-sm transition-all active:scale-[0.98]"
            >
              <Plus size={14} />
              Bookmark Current View
            </button>
          ) : (
            // State B: Input Form
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <input
                ref={inputRef}
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-sm px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="Name this view..."
              />
              <button
                onClick={handleConfirmAdd}
                className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-sm transition-colors"
                title="Save"
              >
                <Check size={14} />
              </button>
              <button
                onClick={handleCancel}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-sm transition-colors"
                title="Cancel"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
