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
        setComponentSelectionModalOpen,
        setKeyboardShortcutsModalOpen,
        setShowAttributeTable,
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

            // ESC - Exit current tool / Clear selection
            if (key === "escape") {
                setActiveTool("pan");
                return;
            }

            // TOOLS
            // S - Select tool
            if ((key === "s" || key === "v") && !ctrl) {
                setActiveTool("select");
                return;
            }

            // M - Modify tool
            if (key === "m" && !ctrl) {
                setActiveTool("modify");
                return;
            }

            // H - Pan
            if (key === "h" && !ctrl) {
                setActiveTool('pan');
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
                if (selectedFeatureIds.length > 0) {
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


                // F - Home / Fit to extent
                if (key === 'f' && !ctrl) {
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
            // Ctrl+S - Save/Export
            if (key === "s" && ctrl) {
                // window.dispatchEvent(new CustomEvent("exportNetwork"));
                event.preventDefault();
                setExportModalOpen(true);
                return;
            }

            // Ctrl+O - Open/Import
            if (key === "o" && ctrl) {
                // window.dispatchEvent(new CustomEvent("importNetwork"));
                event.preventDefault();
                setImportModalOpen(true);
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
                    "1": "add-junction",
                    "2": "add-tank",
                    "3": "add-reservoir",
                    "4": "draw-pipe",
                    "5": "add-pump",
                    "6": "add-valve",
                };
                setActiveTool(componentMap[key] as any);
                return;
            }
        };

        // This ensures our shortcuts run before OpenLayers consumes the events.
        document.addEventListener("keydown", handleKeyDown, { capture: true });

        return () => {
            document.removeEventListener("keydown", handleKeyDown, { capture: true });
        };
    }, [
        map,
        selectedFeatureIds,
        setActiveTool,
        setDeleteModalOpen,
        setComponentSelectionModalOpen,
        setKeyboardShortcutsModalOpen,
        setShowAttributeTable,
        setExportModalOpen,
        setImportModalOpen
    ]);
}