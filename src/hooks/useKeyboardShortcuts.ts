"use client";

import { useEffect } from 'react';

import { handleZoomToExtent } from '@/lib/interactions/map-controls';
import { useMapStore } from '@/store/mapStore';
import { useNetworkStore } from '@/store/networkStore';
import { useUIStore } from '@/store/uiStore';

export function useKeyboardShortcuts() {
    const map = useMapStore(state => state.map);
    const { selectedFeatureIds } = useNetworkStore();
    const {
        setActiveTool,
        setDeleteModalOpen,
        setKeyboardShortcutsModalOpen,
        setShowAttributeTable,
        setExportModalOpen,
        setImportModalOpen,
        toggleSidebar
    } = useUIStore();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in input fields
            const target = event.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            const key = event.key.toLowerCase();
            const ctrl = event.ctrlKey || event.metaKey;
            const shift = event.shiftKey;

            // --- Prevent Default for Specific Actions ---
            if (ctrl && ["s", "o", "f"].includes(key)) {
                event.preventDefault();
            }

            // --- Global Shortcuts ---

            // ESC - Exit current tool to Pan
            if (key === "escape") {
                setActiveTool("pan");
                useNetworkStore.getState().selectFeature(null);
                setKeyboardShortcutsModalOpen(false);
                return;
            }

            // --- Tool Shortcuts ---
            if (!ctrl && !shift) {
                switch (key) {
                    case "s":
                        setActiveTool("select");
                        return;
                    case "m":
                        setActiveTool("modify");
                        return;
                    case "h":
                        setActiveTool("pan");
                        return;
                    case "z":
                        setActiveTool("zoom-box");
                        return;

                    // Drawing Tools (1-6)
                    case "1":
                        setActiveTool("add-junction");
                        return;
                    case "2":
                        setActiveTool("add-tank");
                        return;
                    case "3":
                        setActiveTool("add-reservoir");
                        return;
                    case "4":
                        setActiveTool("draw-pipe");
                        return;
                    case "5":
                        setActiveTool("add-pump");
                        return;
                    case "6":
                        setActiveTool("add-valve");
                        return;
                }
            }

            // --- Feature Operations ---
            if (key === "delete" || key === "backspace") {
                if (selectedFeatureIds.length > 0) {
                    event.preventDefault();
                    setDeleteModalOpen(true);
                }
                return;
            }

            // --- Map Navigation ---
            if (map) {
                const view = map.getView();
                if ((key === "+" || key === "=") && !ctrl) {
                    const zoom = view.getZoom();
                    if (zoom !== undefined) view.animate({ zoom: zoom + 1, duration: 250 });
                    return;
                }
                if (key === "-" && !ctrl) {
                    const zoom = view.getZoom();
                    if (zoom !== undefined) view.animate({ zoom: zoom - 1, duration: 250 });
                    return;
                }
                if (key === "f" && !ctrl) { // Home / Fit Extent
                    handleZoomToExtent(map);
                    return;
                }
            }

            // --- Panels & Menus ---
            if (key === "t" && !ctrl) {
                setShowAttributeTable(true);
                return;
            }
            if (key === "b" && ctrl) {
                toggleSidebar();
                return;
            }
            if ((key === "?" || key === "/") && !ctrl) {
                setKeyboardShortcutsModalOpen(true);
                return;
            }

            // --- File Operations ---
            if (key === "s" && ctrl) {
                setExportModalOpen(true);
                return;
            }
            if (key === "o" && ctrl) {
                setImportModalOpen(true);
                return;
            }

            // --- Undo/Redo ---
            if (key === "z" && ctrl && !shift) {
                window.dispatchEvent(new CustomEvent("undo"));
                return;
            }
            if ((key === "y" && ctrl) || (key === "z" && ctrl && shift)) {
                window.dispatchEvent(new CustomEvent("redo"));
                return;
            }
        };

        document.addEventListener("keydown", handleKeyDown, { capture: true });

        return () => {
            document.removeEventListener("keydown", handleKeyDown, { capture: true });
        };
    }, [
        map,
        selectedFeatureIds,
        setActiveTool,
        setDeleteModalOpen,
        setKeyboardShortcutsModalOpen,
        setShowAttributeTable,
        setExportModalOpen,
        setImportModalOpen
    ]);
}