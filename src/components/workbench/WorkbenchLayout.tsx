"use client";
import { MousePointer, Move, Search, X, ZoomIn } from 'lucide-react';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { Header } from '@/components/layout/Header';
import { MenuItem, WORKBENCH_MENU } from '@/data/workbenchMenu';
import { useNetworkStore } from '@/store/networkStore';
import { useUIStore, WorkbenchModalType } from '@/store/uiStore';

import { SimulationPanel } from '../simulation/SimulationPanel';
import { ContextMenu } from './ContextMenu';
import ToolButton from './ToolButton';
import TreeGroup from './TreeGroup';
import TreeItem from './TreeItem';
import TreeSection from './TreeSection';
import { WorkbenchModal } from './WorkbenchModal';

export default function WorkbenchLayout({ children }: { children: ReactNode }) {

  //!SECTION
  const [searchTerm, setSearchTerm] = useState("");
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);

  const {
    activeModal,
    activePanel,
    layerVisibility,
    activeStyleLayer,
    setActiveModal,
    setActivePanel,
    setContextMenu,
    toggleLayerVisibility,
  } = useUIStore();

  const { selectFeature, features, settings } = useNetworkStore();

  // --- CALCULATE DYNAMIC COUNTS ---
  const layerCounts = useMemo(() => {
    const counts: Record<string, number> = {
      pipe: 0,
      junction: 0,
      reservoir: 0,
      tank: 0,
      valve: 0,
      pump: 0,
    };

    features.forEach((f) => {
      const type = f.get("type") as string;
      if (Object.prototype.hasOwnProperty.call(counts, type)) {
        counts[type]++;
      }
      // if (counts[type] !== undefined) {
      //   counts[type]++;
      // }
    });
    return counts;
  }, [features]);

  // --- HANDLE MODAL CLOSE ---
  const handleModalClose = useCallback(() => {
    setActiveModal("NONE");

    // If we are closing a property panel, we must also deselect the map feature
    if (activeModal.endsWith("_PROP")) {
      selectFeature(null);
    }
  }, [activeModal, setActiveModal, selectFeature]);

  // --- KEYBOARD SHORTCUT ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyB") {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- RESIZE LOGIC ---
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        e.preventDefault();
        const newWidth = e.clientX - 16; // Adjust for left padding

        // LOGIC: If currently collapsed, check if we dragged far enough to OPEN it
        if (isCollapsed) {
          if (newWidth > 60) {
            // Threshold to snap open
            setIsCollapsed(false);
            setSidebarWidth(Math.max(260, newWidth));
          }
        }
        // LOGIC: If currently open, check if we dragged far enough to CLOSE it
        else {
          if (newWidth < 80) {
            setIsCollapsed(true);
          } else {
            // Normal resizing constraints
            setSidebarWidth(Math.min(400, Math.max(260, newWidth)));
          }
        }
      }
    },
    [isResizing, isCollapsed]
  );

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // --- RECURSIVE FILTER FUNCTION ---
  const filterTree = useCallback(
    (nodes: MenuItem[], term: string): MenuItem[] => {
      return nodes
        .map((node) => {
          // 1. Check if the node matches strictly
          const matchesSelf = node.label
            .toLowerCase()
            .includes(term.toLowerCase());

          // 2. Recursively check children
          const filteredChildren = node.children
            ? filterTree(node.children, term)
            : [];

          // 3. Keep node if: It matches ITSELF, or it has MATCHING CHILDREN
          if (matchesSelf || filteredChildren.length > 0) {
            return {
              ...node,
              children:
                filteredChildren.length > 0 ? filteredChildren : node.children,
            };
          }

          return null;
        })
        .filter((n) => n !== null) as MenuItem[];
    },
    []
  );

  // --- DERIVED STATE: FILTERED MENU ---
  const filteredMenu = useMemo(() => {
    if (!searchTerm) return WORKBENCH_MENU;
    return filterTree(WORKBENCH_MENU, searchTerm);
  }, [searchTerm, filterTree]);

  const isSearching = searchTerm.length > 0;

  // --- RECURSIVE RENDERER ---
  const renderTreeNodes = (nodes: MenuItem[]) => {
    return nodes.map((node) => {
      // GROUP RENDER
      if (node.type === "GROUP") {
        return (
          <TreeGroup
            key={node.id}
            label={node.label}
            count={node.count}
            forceOpen={isSearching}
          >
            {node.children && renderTreeNodes(node.children)}
          </TreeGroup>
        );
      }

      // ITEM RENDER
      if (node.type === "ITEM") {
        let dynamicCount: number | undefined = undefined;
        // Inject dynamic counts for layers
        if (node.layerKey && typeof layerCounts[node.layerKey] === "number") {
          dynamicCount = layerCounts[node.layerKey];
        }

        const isVisible = node.layerKey
          ? layerVisibility[node.layerKey]
          : undefined;

        const isActive =
          (node.modalType && activeModal === node.modalType) ||
          (node.layerKey &&
            activeModal === "STYLE_SETTINGS" &&
            activeStyleLayer === node.layerKey);

        return (
          <TreeItem
            key={node.id}
            label={node.label}
            icon={node.icon}
            active={isActive}
            count={dynamicCount}
            isVisible={isVisible}
            // LEFT CLICK: Open Style Settings if it's a layer, or specific modal if defined
            onClick={
              !node.layerKey && node.modalType
                ? () => setActiveModal(node.modalType as WorkbenchModalType)
                : node.modalPanel 
                ? () => setActivePanel(node.modalPanel as string)
                : undefined
            }
            // VISIBILITY TOGGLE
            onToggleVisibility={
              node.layerKey
                ? (e: any) => {
                    e.stopPropagation();
                    if (node.layerKey) toggleLayerVisibility(node.layerKey);
                  }
                : undefined
            }
            // RIGHT CLICK: Context Menu
            onContextMenu={
              node.layerKey
                ? (e: React.MouseEvent) => {
                    e.preventDefault();
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      type: "layer",
                      id: node.layerKey!,
                    });
                  }
                : undefined
            }
          />
        );
      }
      return null;
    });
  };

  const isSimulationMode = (activePanel === "SIMULATION_CONFIG" || activeModal === "SIMULATION_GRAPHS");

  return (
    <div className="h-screen w-screen bg-slate-50 overflow-hidden flex flex-col font-sans text-slate-700">
      <Header
        isWorkbench
        projectName={settings.title}
        description={settings.description}
      />

      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-slate-200">
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            {children}
          </div>
        </div>

        <div className="absolute inset-0 z-10 pointer-events-none p-3 pb-10 flex justify-between">
          <div
            className="relative pointer-events-auto flex transition-all duration-300 ease-in-out"
            style={{
              width: isCollapsed ? 0 : sidebarWidth,
              minWidth: isCollapsed ? 0 : 260,
              maxWidth: 400,
            }}
          >
            <div
              className={`flex-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden flex-col transition-opacity duration-300 ${
                isCollapsed ? "opacity-0 flex" : "opacity-100 flex"
              }`}
            >
              {isSimulationMode ? (
                <SimulationPanel />
              ) : (
                <>
                  {/* --- SEARCH INPUT --- */}
                  <div className="p-3 border-b border-slate-100">
                    <div className="relative">
                      <Search
                        className="absolute left-2.5 top-2 text-slate-400"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Filter tree..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setSearchTerm("");
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                      {/* Clear Button */}
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="absolute right-2 top-2 text-slate-400 hover:text-red-500 font-bold"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* --- DYNAMIC TREE --- */}
                  <div className="flex-1 overflow-y-auto p-1 space-y-1">
                    {filteredMenu.length > 0 ? (
                      filteredMenu.map((section) => (
                        <TreeSection
                          key={section.id}
                          title={section.label}
                          status={section.status}
                          defaultOpen={section.defaultOpen}
                          forceOpen={isSearching}
                        >
                          {section.children &&
                            renderTreeNodes(section.children)}
                        </TreeSection>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400 italic">
                        No items found for "{searchTerm}"
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Resize Handle */}
            <div
              className="absolute top-0 bottom-0 -right-2 w-4 z-50 cursor-col-resize flex items-center justify-center group touch-none"
              onMouseDown={startResizing}
              onClick={(e) => {
                if (!isResizing) setIsCollapsed(!isCollapsed);
              }}
              title={
                isCollapsed ? "Click to Expand (Ctrl+B)" : "Drag to Resize"
              }
            >
              <div
                className={`w-1 h-12 rounded-full transition-all duration-200 ${
                  isResizing
                    ? "bg-blue-600 h-16"
                    : "bg-slate-300 group-hover:bg-blue-400"
                }`}
              />
            </div>
          </div>

          {/* Drawing tools Hidden*/}
          <div className="hidden absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto">
            <div className="bg-white/90 backdrop-blur rounded-full shadow-lg border border-slate-200 p-1 flex items-center gap-1">
              <ToolButton icon={MousePointer} active />
              <ToolButton icon={Move} />
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <ToolButton icon={ZoomIn} />
            </div>
          </div>
        </div>

        {activeModal !== "NONE" && (
          <WorkbenchModal
            key={activeModal}
            type={activeModal}
            onClose={handleModalClose}
            sidebarWidth={isCollapsed ? 0 : sidebarWidth}
            maximized={activeModal === "SIMULATION_GRAPHS"}
          />
        )}

        <ContextMenu />
      </div>
    </div>
  );
}
