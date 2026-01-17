import React, { useRef, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Feature } from "ol";
import {
  Trash2,
  Settings,
  Spline,
  XCircle,
  ArrowLeftRight,
} from "lucide-react";

import { COMPONENT_TYPES } from "@/constants/networkComponents";

interface MapContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  type: "CANVAS" | "NODE" | "PIPE" | "VERTEX" | "PUMP" | "VALVE" | null;
  feature: Feature | null;
  onClose: () => void;
  onAction: (action: string, payload?: any) => void;
}

export function MapContextMenu({
  isVisible,
  position,
  type,
  feature,
  onClose,
  onAction,
}: MapContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState(position);

  // 1. Collision Detection: Ensure menu stays inside the Viewport
  useLayoutEffect(() => {
    if (isVisible && menuRef.current) {
      const menu = menuRef.current.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      let { x, y } = position;

      // Flip X if too close to right edge
      if (x + menu.width > viewportW) {
        x -= menu.width;
      }

      // Flip Y if too close to bottom edge
      if (y + menu.height > viewportH) {
        y -= menu.height;
      }

      setAdjustedPos({ x, y });
    }
  }, [isVisible, position]);

  if (!isVisible) return null;

  const handleAction = (action: string) => {
    onAction(action, feature);
    onClose();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const CANVAS_MENUS_OPTIONS = [
    {
      color: COMPONENT_TYPES.junction.color,
      label: COMPONENT_TYPES.junction.name,
      icon: COMPONENT_TYPES.junction.icon,
      action: "ADD_JUNCTION",
    },
    {
      color: COMPONENT_TYPES.tank.color,
      label: COMPONENT_TYPES.tank.name,
      icon: COMPONENT_TYPES.tank.icon,
      action: "ADD_TANK",
    },
    {
      color: COMPONENT_TYPES.reservoir.color,
      label: COMPONENT_TYPES.reservoir.name,
      icon: COMPONENT_TYPES.reservoir.icon,
      action: "ADD_RESERVOIR",
    },
  ];

  const LINK_MENUS_OPTIONS = [
    {
      icon: Spline,
      label: "Vertex",
      action: "ADD_VERTEX",
    },
    {
      icon: ArrowLeftRight,
      label: "Reverse Direction",
      action: "REVERSE_DIRECTION",
      color: COMPONENT_TYPES.pipe.color,
    },
    {
      icon: COMPONENT_TYPES.junction.icon,
      label: COMPONENT_TYPES.junction.name,
      color: COMPONENT_TYPES.junction.color,
      action: "INSERT_JUNCTION",
    },
    {
      icon: COMPONENT_TYPES.pump.icon,
      label: COMPONENT_TYPES.pump.name,
      color: COMPONENT_TYPES.pump.color,
      action: "INSERT_PUMP",
    },
    {
      icon: COMPONENT_TYPES.valve.icon,
      label: COMPONENT_TYPES.valve.name,
      color: COMPONENT_TYPES.valve.color,
      action: "INSERT_VALVE",
    },
    {
      icon: Settings,
      label: "Properties",
      action: "PROPERTIES",
    },
    {
      label: "Delete Pipe",
      icon: Trash2,
      action: "DELETE",
    },
  ];

  const NODE_MENUS_OPTIONS = [
    {
      icon: Settings,
      label: "Properties",
      action: "PROPERTIES",
    },
    {
      icon: Trash2,
      label: "Delete",
      action: "DELETE",
    },
  ];

  const renderPipeOptions = () => (
    <>
      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900/50 mb-1 border-b">
        PIPE {feature?.get("label") || ""}
      </div>

      {LINK_MENUS_OPTIONS.map((menu, idx) => {
        const Icon = menu.icon;
        const isVertex = menu.label.includes("Vertex");
        const isFeature = ["Junction", "Pump", "Valve"].includes(menu.label);
        const label = isVertex ? "Add" : isFeature ? "Insert" : "";

        return (
          <React.Fragment key={menu.label}>
            {(idx === 2 || idx === 5) && (
              <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
            )}

            <MenuItem
              key={menu.label}
              icon={<Icon size={16} color={menu.color} />}
              label={`${label} ${menu.label}`}
              color={menu.action === "DELETE" ? "text-red-600" : undefined}
              onClick={() => handleAction(menu.action)}
            />
          </React.Fragment>
        );
      })}
    </>
  );

  // 2. Use createPortal to render directly into document.body
  // This prevents clipping by the MapContainer's overflow:hidden
  return createPortal(
    <div
      className="fixed z-9999 inset-0"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        ref={menuRef}
        className="fixed z-9999"
        style={{ top: adjustedPos.y, left: adjustedPos.x }}
        onContextMenu={handleContextMenu}
        onClick={(e) => e.stopPropagation()} // Prevent click from closing immediately
      >
        <div className="w-56 p-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl rounded-md overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="flex flex-col text-sm">
            {/* ================= CANVAS MENU ================= */}
            {type === "CANVAS" && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900/50 mb-1 border-b">
                  Canvas
                </div>

                {CANVAS_MENUS_OPTIONS.map((menu) => {
                  const Icon = menu.icon;
                  return (
                    <MenuItem
                      key={menu.label}
                      icon={<Icon size={16} color={menu.color} />}
                      label={`Add ${menu.label}`}
                      onClick={() => handleAction(menu.action)}
                    />
                  );
                })}
              </>
            )}

            {/* ================= NODE / PUMP / VALVE MENU ================= */}
            {(type === "PUMP" || type === "VALVE" || type === "NODE") && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900/50 mb-1 border-b">
                  {type} {feature?.get("label") || ""}
                </div>
                {NODE_MENUS_OPTIONS.map((menu, idx) => {
                  const Icon = menu.icon;
                  return (
                    <React.Fragment key={menu.label}>
                      {idx == 1 && (
                        <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                      )}
                      <MenuItem
                        icon={<Icon size={16} />}
                        label={menu.label}
                        color={menu.action === "DELETE" ? "text-red-600" : undefined}
                        onClick={() => handleAction(menu.action)}
                      />
                    </React.Fragment>
                  );
                })}
              </>
            )}

            {/* ================= VERTEX MENU ================= */}
            {type === "VERTEX" && (
              <>
                <MenuItem
                  icon={<XCircle size={16} />}
                  label="Delete Vertex"
                  color="text-red-600"
                  onClick={() => handleAction("DELETE_VERTEX")}
                />
                <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                {renderPipeOptions()}
              </>
            )}

            {/* ================= PIPE MENU ================= */}
            {type === "PIPE" && renderPipeOptions()}
          </div>
        </div>
      </div>
    </div>,
    document.body // Portal Target
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  color = "text-slate-700 dark:text-slate-200",
}: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm transition-colors text-left ${color}`}
    >
      <span className="mr-2 opacity-70">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
