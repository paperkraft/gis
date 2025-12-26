import {
  CircleSmall,
  Clock,
  Copy,
  Edit2,
  ExternalLink,
  FolderOpen,
  GitBranchMinus,
  MousePointerClick,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

interface PanelProps {
  activeProject: any;
  handleClose: () => void;
  handleDelete: (e: React.MouseEvent, id: string) => void;
}

export const RightPanel = ({
  activeProject,
  handleClose,
  handleDelete,
}: PanelProps) => {
  const route = useRouter();

  const handleOpenProject = (id: string) => {
    route.replace(`/workbench/${id}`);
  };

  return (
    <aside className="w-70 h-[calc(100vh-100px)] bg-white border-l border-slate-200 flex flex-col shrink-0 z-10 shadow-[-5px_0_10px_rgba(0,0,0,0.03)]">
      {/* CONDITIONAL RENDER: PLACEHOLDER VS DETAILS */}
      {!activeProject ? (
        // --- OPTION 1: PLACEHOLDER STATE ---
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <MousePointerClick size={40} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            No Project Selected
          </h3>
          <p className="text-sm text-slate-500 max-w-50 leading-relaxed">
            Select a project from the list to view its details, statistics, and
            simulation results.
          </p>
        </div>
      ) : (
        // --- OPTION 2: PROJECT DETAILS STATE ---
        <>
          {/* Header */}
          <div className="h-12 border-b border-slate-100 flex items-center px-4 shrink-0">
            <div className="flex items-center gap-1">
              <ActionBtn
                icon={ExternalLink}
                tooltip="Open"
                onClick={() => handleOpenProject(activeProject.id)}
              />
              <ActionBtn icon={Copy} tooltip="Copy" />
              <ActionBtn icon={Edit2} tooltip="Settings" />
              <ActionBtn
                icon={Trash2}
                tooltip="Delete"
                onClick={(e: any) => handleDelete(e, activeProject.id)}
              />
            </div>
            <ActionBtn
              icon={X}
              tooltip="Close"
              className="ml-auto"
              onClick={handleClose}
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 animate-in fade-in duration-300">
            {/* Thumbnail */}
            <div className="h-36 bg-slate-100 rounded-lg mb-6 flex items-center justify-center relative overflow-hidden border border-slate-200 group cursor-pointer">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] bg-size-[16px_16px]" />
              <FolderOpen
                size={48}
                className="text-slate-300 group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-[10px] font-bold px-2 py-1 rounded border border-slate-200 shadow-sm text-slate-500 uppercase">
                Self
              </div>
            </div>

            {/* Details */}
            <h2 className="text-base font-medium text-slate-800 mb-2">
              {activeProject.name}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-400 mb-6">
              <span className="flex items-center gap-1">
                <Clock size={12} />{" "}
                {new Date(activeProject.lastModified).toLocaleDateString()}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="flex items-center gap-1">
                <Users size={12} /> Me
              </span>
            </div>

            {/* Description */}
            <h6 className="text-[10px] font-semibold uppercase mb-2 border-b border-slate-100 pb-2">
              Project description
            </h6>
            <div className="text-[11px] text-slate-600 leading-relaxed mb-8">
              {activeProject.description}
            </div>

            {/* Stats */}
            <h6 className="text-[10px] font-semibold uppercase mb-2 border-b border-slate-100 pb-2">
              Statistics
            </h6>
            <div className="grid grid-cols-2 gap-4">
              <StatBox
                label="Nodes"
                value={activeProject.nodeCount}
                icon={CircleSmall}
              />
              <StatBox
                label="Links"
                value={activeProject.linkCount}
                icon={GitBranchMinus}
              />
            </div>
          </div>
        </>
      )}
    </aside>
  );
};

function ActionBtn({
  icon: Icon,
  color = "text-slate-400 hover:text-slate-700 hover:bg-slate-50",
  className,
  onClick,
}: any) {
  return (
    <button
      className={`p-2 rounded transition-colors ${color} ${className}`}
      onClick={onClick}
    >
      <Icon size={18} />
    </button>
  );
}

function StatBox({ label, value, icon: Icon }: any) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
        <Icon size={12} /> {label}
      </span>
      <span className="font-semibold text-slate-700">{value}</span>
    </div>
  );
}
