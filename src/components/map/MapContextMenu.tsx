import React, { useRef, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Feature } from "ol";
import {
  Trash2,
  Settings,
  Spline,
  XCircle,
  Circle,
  Pentagon,
  Hexagon,
  Triangle,
  Square,
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

  const renderPipeOptions = () => (
    <>
      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900/50 mb-1 border-b">
        PIPE {feature?.get("label") || ""}
      </div>
      <MenuItem
        icon={<Spline size={16} />}
        label="Add Vertex"
        onClick={() => handleAction("ADD_VERTEX")}
      />
      <MenuItem
        icon={<ArrowLeftRight size={16} color={COMPONENT_TYPES.pipe.color} />}
        label="Reverse Direction"
        onClick={() => handleAction("REVERSE_DIRECTION")}
      />
      <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
      <MenuItem
        icon={<Circle size={16} color={COMPONENT_TYPES.junction.color} />}
        label="Insert Junction"
        onClick={() => handleAction("INSERT_JUNCTION")}
      />
      <MenuItem
        icon={<Triangle size={16} color={COMPONENT_TYPES.pump.color} />}
        label="Insert Pump"
        onClick={() => handleAction("INSERT_PUMP")}
      />
      <MenuItem
        icon={<Square size={16} color={COMPONENT_TYPES.valve.color} />}
        label="Insert Valve"
        onClick={() => handleAction("INSERT_VALVE")}
      />
      <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
      <MenuItem
        icon={<Trash2 size={16} />}
        label="Delete Pipe"
        color="text-red-600"
        onClick={() => handleAction("DELETE")}
      />
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
                <MenuItem
                  icon={<Circle size={16} />}
                  label="Add Junction"
                  onClick={() => handleAction("ADD_JUNCTION")}
                />
                <MenuItem
                  icon={<Pentagon size={16} />}
                  label="Add Tank"
                  onClick={() => handleAction("ADD_TANK")}
                />
                <MenuItem
                  icon={<Hexagon size={16} />}
                  label="Add Reservoir"
                  onClick={() => handleAction("ADD_RESERVOIR")}
                />
              </>
            )}

            {/* ================= NODE MENU ================= */}
            {type === "NODE" && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900/50 mb-1 border-b">
                  {feature?.get("type")?.toUpperCase() || "NODE"}{" "}
                  {feature?.get("label") || ""}
                </div>
                <MenuItem
                  icon={<Settings size={16} />}
                  label="Properties"
                  onClick={() => handleAction("PROPERTIES")}
                />
                <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                <MenuItem
                  icon={<Trash2 size={16} />}
                  label="Delete"
                  color="text-red-600"
                  onClick={() => handleAction("DELETE")}
                />
              </>
            )}

            {/* ================= PUMP / VALVE MENU ================= */}
            {(type === "PUMP" || type === "VALVE") && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900/50 mb-1 border-b">
                  {type} {feature?.get("label") || ""}
                </div>
                <MenuItem
                  icon={<Settings size={16} />}
                  label="Properties"
                  onClick={() => handleAction("PROPERTIES")}
                />
                <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                <MenuItem
                  icon={<Trash2 size={16} />}
                  label="Delete"
                  color="text-red-600"
                  onClick={() => handleAction("DELETE")}
                />
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
