"use client";

import { useEffect } from "react";
import { useMapStore } from "@/store/mapStore";
import { useUIStore } from "@/store/uiStore";
import { useNetworkStore } from "@/store/networkStore";
import { handleZoomToExtent } from "@/lib/interactions/map-controls";

export function useKeyboardShortcuts() {
    const { map } = useMapStore();
    const { selectedFeature } = useNetworkStore();
    const {
        activeTool,
        setActiveTool,
        setDeleteModalOpen,
        setComponentSelectionModalOpen,
        setKeyboardShortcutsModalOpen,
        setShowAttributeTable,
        setShowBaseLayerMenu,
        setShowMeasurementMenu
    } = useUIStore();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in input fields
            if (
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            const key = event.key.toLowerCase();
            const ctrl = event.ctrlKey || event.metaKey;
            const shift = event.shiftKey;

            // Prevent default for our shortcuts
            const shouldPreventDefault = [
                "s", "m", "p", "d", "Delete", "Escape",
                "=", "-", "h", "f", "r"
            ].includes(key) || (ctrl && ["z", "y", "s", "o", "e"].includes(key));

            if (shouldPreventDefault) {
                event.preventDefault();
            }

            // ESC - Exit current tool / Clear selection
            if (key === "escape") {
                setActiveTool("select");
                return;
            }

            // TOOLS
            // S - Select tool
            if (key === "s" && !ctrl) {
                setActiveTool("select");
                return;
            }

            // M - Modify tool
            if (key === "m" && !ctrl) {
                setActiveTool("modify");
                return;
            }

            // P - Pipe/Draw Network tool
            if (key === "p" && !ctrl) {
                setActiveTool("draw");
                setComponentSelectionModalOpen(true);
                return;
            }

            // D - Draw (alias for pipe)
            if (key === "d" && !ctrl) {
                setActiveTool("draw");
                setComponentSelectionModalOpen(true);
                return;
            }

            // DELETE - Delete selected feature
            if (key === "delete" || key === "backspace") {
                if (selectedFeature) {
                    setDeleteModalOpen(true);
                }
                return;
            }

            // MAP NAVIGATION
            // + or = - Zoom in
            if ((key === "+" || key === "=") && !ctrl) {
                if (map) {
                    const view = map.getView();
                    const zoom = view.getZoom();
                    if (zoom !== undefined) {
                        view.animate({ zoom: zoom + 1, duration: 250 });
                    }
                }
                return;
            }

            // - - Zoom out
            if (key === "-" && !ctrl) {
                if (map) {
                    const view = map.getView();
                    const zoom = view.getZoom();
                    if (zoom !== undefined) {
                        view.animate({ zoom: zoom - 1, duration: 250 });
                    }
                }
                return;
            }

            // H - Home / Fit to extent
            if (key === "h" && !ctrl) {
                handleZoomToExtent(map);
                return;
            }

            // F - Search/Find location
            if (key === "f" && ctrl) {
                event.preventDefault();
                const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
                if (searchInput) {
                    searchInput.focus();
                }
                return;
            }

            // T - Toggle Attribute Table
            if (key === "t" && !ctrl) {
                setShowAttributeTable(true);
                return;
            }

            // L - Toggle Base Layer Map
            if (key === "l" && !ctrl) {
                setShowBaseLayerMenu(true);
                return;
            }

            // R - Ruler/Measure tool
            if (key === "r" && !ctrl) {
                setShowMeasurementMenu(true);
                return;
            }

            // FILE OPERATIONS
            // Ctrl+S - Save/Export
            if (key === "s" && ctrl) {
                event.preventDefault();
                window.dispatchEvent(new CustomEvent("exportNetwork"));
                return;
            }

            // Ctrl+O - Open/Import
            if (key === "o" && ctrl) {
                event.preventDefault();
                window.dispatchEvent(new CustomEvent("importNetwork"));
                return;
            }

            // UNDO/REDO (for future implementation)
            // Ctrl+Z - Undo
            if (key === "z" && ctrl && !shift) {
                event.preventDefault();
                window.dispatchEvent(new CustomEvent("undo"));
                return;
            }

            // Ctrl+Y or Ctrl+Shift+Z - Redo
            if ((key === "y" && ctrl) || (key === "z" && ctrl && shift)) {
                event.preventDefault();
                window.dispatchEvent(new CustomEvent("redo"));
                return;
            }



            // ? - Toggle help
            if ((key === "?" || key === "/") && !ctrl) {
                setKeyboardShortcutsModalOpen(true);
                return;
            }


            // NUMBER KEYS - Quick component selection
            if (!ctrl && !shift && ["1", "2", "3", "4", "5", "6"].includes(key)) {
                const componentMap: Record<string, string> = {
                    "1": "junction",
                    "2": "tank",
                    "3": "reservoir",
                    "4": "pipe",
                    "5": "pump",
                    "6": "valve",
                };

                const component = componentMap[key];
                window.dispatchEvent(new CustomEvent("quickAddComponent", {
                    detail: { componentType: component }
                }));
                return;
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [activeTool, map]);
}