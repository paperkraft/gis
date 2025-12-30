import { ChevronRight } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

interface TreeSectionProps {
  title: string;
  children: ReactNode;
  status?: string;
  defaultOpen?: boolean;
  forceOpen: boolean;
}

export default function TreeSection({
  title,
  children,
  status,
  defaultOpen = false,
  forceOpen = false,
}: TreeSectionProps) {
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
        <div className="ml-3 pl-1 border-l border-slate-100 space-y-0.5 mb-2">
          {children}
        </div>
      )}
    </div>
  );
}
