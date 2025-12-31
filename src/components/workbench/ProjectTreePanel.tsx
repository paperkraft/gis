"use client";
import { Search, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import TreeGroup from "@/components/workbench/TreeGroup";
import TreeItem from "@/components/workbench/TreeItem";
import TreeSection from "@/components/workbench/TreeSection";
import { MenuItem, WORKBENCH_MENU } from "@/data/workbenchMenu";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";

export function ProjectTreePanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const {
    activeModal,
    setActiveModal,
    setActivePanel,
    layerVisibility,
    toggleLayerVisibility,
    activeStyleLayer,
    setContextMenu,
  } = useUIStore();

  const { features } = useNetworkStore();

  // --- 1. DYNAMIC COUNTS ---
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
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [features]);

  // --- 2. FILTER LOGIC ---
  const filterTree = useCallback(
    (nodes: MenuItem[], term: string): MenuItem[] => {
      return nodes
        .map((node) => {
          const matchesSelf = node.label
            .toLowerCase()
            .includes(term.toLowerCase());
          const filteredChildren = node.children
            ? filterTree(node.children, term)
            : [];
          if (matchesSelf || filteredChildren.length > 0) {
            return {
              ...node,
              children:
                filteredChildren.length > 0 ? filteredChildren : node.children,
            };
          }
          return null;
        })
        .filter(Boolean) as MenuItem[];
    },
    []
  );

  const filteredMenu = useMemo(() => {
    return searchTerm ? filterTree(WORKBENCH_MENU, searchTerm) : WORKBENCH_MENU;
  }, [searchTerm, filterTree]);

  // --- 3. RENDERER (Recursive) ---
  const renderTreeNodes = (nodes: MenuItem[]) => {
    return nodes.map((node) => {
      if (node.type === "GROUP") {
        return (
          <TreeGroup
            key={node.id}
            label={node.label}
            count={node.count}
            forceOpen={!!searchTerm}
          >
            {node.children && renderTreeNodes(node.children)}
          </TreeGroup>
        );
      }
      if (node.type === "ITEM") {
        const count = node.layerKey ? layerCounts[node.layerKey] : undefined;
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
            count={count}
            isVisible={isVisible}
            onClick={() => {
              if (node.modalType) setActiveModal(node.modalType);
              if (node.panelType) setActivePanel(node.panelType);
              if (!node.modalType) setActiveModal("NONE");
              if (!node.panelType) setActivePanel("NONE");
            }}
            onToggleVisibility={
              node.layerKey
                ? (e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(node.layerKey!);
                  }
                : undefined
            }
            onContextMenu={
              node.layerKey
                ? (e) => {
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
    <div className="flex flex-col h-full bg-background">
      {/* Search Header */}
      <div className="p-3 border-b border-slate-100 shrink-0">
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
            className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-2 text-slate-400 hover:text-red-500"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-1 space-y-1 custom-scrollbar">
        {filteredMenu.length > 0 ? (
          filteredMenu.map((section) => (
            <TreeSection
              key={section.id}
              title={section.label}
              status={section.status}
              defaultOpen={section.defaultOpen}
              forceOpen={!!searchTerm}
            >
              {section.children && renderTreeNodes(section.children)}
            </TreeSection>
          ))
        ) : (
          <div className="p-4 text-center text-xs text-slate-400 italic">
            No items found.
          </div>
        )}
      </div>
    </div>
  );
}
