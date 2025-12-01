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
        setActiveTool,
        setDeleteModalOpen,
        setComponentSelectionModalOpen,
        setKeyboardShortcutsModalOpen,
        setShowAttributeTable,
        setShowBaseLayerMenu,
        setShowMeasurementMenu,
        setExportModalOpen,
        setImportModalOpen
    } = useUIStore();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in input fields or content editable elements
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
            const shouldPreventDefault =
                (ctrl && ["s", "o", "f"].includes(key)); // Save, Open, Find

            if (shouldPreventDefault) {
                event.preventDefault();
            }

            // --- Global Shortcuts ---

            // FILE OPERATIONS
            // Ctrl+S - Save/Export
            if (key === "s" && ctrl) {
                event.preventDefault();
                setExportModalOpen(true); // Open modal instead of dispatching event
                return;
            }

            // Ctrl+O - Open/Import
            if (key === "o" && ctrl) {
                event.preventDefault();
                setImportModalOpen(true); // Direct call for consistency
                return;
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

            // P or D - Draw Network tool
            if ((key === "p" || key === "d") && !ctrl) {
                setActiveTool("draw");
                setComponentSelectionModalOpen(true);
                return;
            }

            // DELETE - Delete selected feature
            // NOTE: This relies on selectedFeature dependency
            if (key === "delete" || key === "backspace") {
                if (selectedFeature) {
                    event.preventDefault(); // Prevent browser back navigation
                    setDeleteModalOpen(true);
                }
                return;
            }

            // MAP NAVIGATION
            if (map) {
                const view = map.getView();
                // + or = - Zoom in
                if ((key === "+" || key === "=") && !ctrl) {
                    const zoom = view.getZoom();
                    if (zoom !== undefined) view.animate({ zoom: zoom + 1, duration: 250 });
                    return;
                }

                // - - Zoom out
                if (key === "-" && !ctrl) {
                    const zoom = view.getZoom();
                    if (zoom !== undefined) view.animate({ zoom: zoom - 1, duration: 250 });
                    return;
                }

                // H - Home / Fit to extent
                if (key === "h" && !ctrl) {
                    handleZoomToExtent(map);
                    return;
                }
            }

            // PANELS & MENUS
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

            // ? - Toggle help
            if ((key === "?" || key === "/") && !ctrl) {
                setKeyboardShortcutsModalOpen(true);
                return;
            }

            // F - Search/Find location
            if (key === "f" && ctrl) {
                const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
                if (searchInput) {
                    searchInput.focus();
                }
                return;
            }

            // FILE OPERATIONS
            if (key === "s" && ctrl) {
                window.dispatchEvent(new CustomEvent("exportNetwork"));
                return;
            }

            if (key === "o" && ctrl) {
                window.dispatchEvent(new CustomEvent("importNetwork"));
                return;
            }

            // UNDO/REDO
            if (key === "z" && ctrl && !shift) {
                window.dispatchEvent(new CustomEvent("undo"));
                return;
            }

            if ((key === "y" && ctrl) || (key === "z" && ctrl && shift)) {
                window.dispatchEvent(new CustomEvent("redo"));
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
                window.dispatchEvent(new CustomEvent("quickAddComponent", {
                    detail: { componentType: componentMap[key] }
                }));
                return;
            }
        };

        // KEY CHANGE: Use 'document' instead of 'window' and use 'capture: true'
        // This ensures our shortcuts run before OpenLayers consumes the events.
        document.addEventListener("keydown", handleKeyDown, { capture: true });

        return () => {
            document.removeEventListener("keydown", handleKeyDown, { capture: true });
        };
    }, [
        map,
        selectedFeature, // Vital dependency: ensures Delete works on currently selected item
        setActiveTool,
        setDeleteModalOpen,
        setComponentSelectionModalOpen,
        setKeyboardShortcutsModalOpen,
        setShowAttributeTable,
        setShowBaseLayerMenu,
        setShowMeasurementMenu,
        setExportModalOpen,
        setImportModalOpen
    ]);
}