"use client";
import {
  ChevronRight,
  Eye,
  EyeOff,
  MoreVertical,
  MousePointer,
  Move,
  Search,
  X,
  ZoomIn,
} from "lucide-react";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { Header } from "@/components/new_layout/Header";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore, WorkbenchModalType } from "@/store/uiStore";

import { DraggableModal } from "./DraggableModal";
import { MenuItem, WORKBENCH_MENU } from "@/data/workbenchMenu";
import { ContextMenu } from "./ContextMenu";

export default function WorkbenchLayout({ children }: { children: ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    activeModal,
    layerVisibility,
    activeStyleLayer,
    setActiveModal,
    setContextMenu,
    setActiveStyleLayer,
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
            // onClick={() => {
            //   if (node.layerKey) {
            //     setActiveStyleLayer(node.layerKey);
            //     setActiveModal("STYLE_SETTINGS");
            //   } else if (node.modalType) {
            //     setActiveModal(node.modalType as WorkbenchModalType);
            //   }
            // }}

            onClick={
              !node.layerKey && node.modalType
                ? () => setActiveModal(node.modalType as WorkbenchModalType)
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
                      {section.children && renderTreeNodes(section.children)}
                    </TreeSection>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    No items found for "{searchTerm}"
                  </div>
                )}
              </div>
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

          {/* Drawing tools */}
          <div className="hidden absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto">
            <div className="bg-white/90 backdrop-blur rounded-full shadow-lg border border-slate-200 p-1 flex items-center gap-1">
              <ToolBtn icon={MousePointer} active />
              <ToolBtn icon={Move} />
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <ToolBtn icon={ZoomIn} />
            </div>
          </div>
        </div>

        {activeModal !== "NONE" && (
          <DraggableModal
            key={activeModal}
            type={activeModal}
            onClose={handleModalClose}
            sidebarWidth={isCollapsed ? 0 : sidebarWidth}
          />
        )}

        <ContextMenu />
      </div>
    </div>
  );
}

function TreeSection({
  title,
  children,
  status,
  defaultOpen = false,
  forceOpen = false,
}: any) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    } else {
      setIsOpen(defaultOpen);
    }
  }, [forceOpen, defaultOpen]);

  const statusColor =
    status === "ready"
      ? "bg-green-500"
      : status === "warning"
      ? "bg-amber-400"
      : "bg-slate-300";

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center px-2 py-1.5 hover:bg-slate-50 transition-colors group"
      >
        <span
          className={`text-slate-400 mr-1 transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        >
          <ChevronRight size={10} />
        </span>
        <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex-1 text-left group-hover:text-slate-700">
          {title}
        </span>
        <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
      </button>
      {isOpen && (
        <div className="ml-1 pl-2 border-l border-slate-100 space-y-0.5 mb-2">
          {children}
        </div>
      )}
    </div>
  );
}

function TreeGroup({ label, count, children, forceOpen = false }: any) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [forceOpen]);

  return (
    <div className="ml-2">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-2 py-1 cursor-pointer rounded-sm hover:bg-slate-100 text-slate-600"
      >
        <ChevronRight
          size={10}
          className={`mr-1.5 text-slate-400 transition-transform ${
            isOpen ? "rotate-90" : ""
          }`}
        />
        <span className="text-xs truncate flex-1">{label}</span>
        {count && (
          <span className="text-[9px] bg-slate-100 text-slate-400 px-1 rounded">
            {count}
          </span>
        )}
      </div>
      {isOpen && (
        <div className="ml-4 border-l border-slate-200 pl-1">{children}</div>
      )}
    </div>
  );
}

function TreeItem({
  label,
  active,
  icon: Icon,
  onClick,
  count,
  isVisible,
  onToggleVisibility,
  onContextMenu,
}: any) {
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`ml-2 flex items-center px-2 py-1.5 cursor-pointer rounded-sm text-xs transition-all relative ${
        active
          ? "bg-blue-50 text-blue-700 font-medium"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {active && (
        <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-600 rounded-r" />
      )}
      {Icon ? (
        <Icon size={12} className="mr-2 opacity-70" />
      ) : (
        <div className="w-1 h-1 bg-current rounded-full mr-3 opacity-50" />
      )}
      <span className="truncate">{label}</span>

      {/* Layer Controls (Visibility Toggle & Count) */}
      <div className="ml-auto flex items-center gap-2">
        {onToggleVisibility && (
          <button
            onClick={onToggleVisibility}
            className={`p-0.5 rounded hover:bg-slate-200 transition-colors ${
              isVisible === false
                ? "text-slate-300"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {isVisible === false ? <EyeOff size={10} /> : <Eye size={10} />}
          </button>
        )}
        {count !== undefined && typeof count === "number" && (
          <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono min-w-5 text-center">
            {count}
          </span>
        )}
        {!onToggleVisibility && count === undefined && (
          <MoreVertical
            size={10}
            className="ml-auto opacity-0 group-hover:opacity-100 text-slate-400"
          />
        )}
      </div>
    </div>
  );
}

function ToolBtn({ icon: Icon, active }: any) {
  return (
    <button
      className={`p-1.5 rounded-full transition-all ${
        active
          ? "bg-blue-100 text-blue-600"
          : "hover:bg-slate-100 text-slate-500"
      }`}
    >
      <Icon size={16} />
    </button>
  );
}
