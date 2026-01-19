"use client";

import { RotateCcw, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ElevationLogsProps {
  logs: string[];
  onClear: () => void;
}

export function ElevationLogs({ logs, onClear }: ElevationLogsProps) {
  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 border-l border-slate-700/50">
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-slate-700 bg-slate-900/50">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <TerminalSquare size={14} /> Process Log
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="h-6 w-6 hover:bg-slate-800 text-slate-500 hover:text-slate-300"
          title="Clear Logs"
        >
          <RotateCcw size={12} />
        </Button>
      </div>

      {/* Log Body */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-1 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center opacity-30 italic">
            Waiting to start...
          </div>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className="break-all border-b border-white/5 pb-1 mb-1 last:border-0"
            >
              <span className="opacity-40 mr-2">{i + 1}.</span>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
