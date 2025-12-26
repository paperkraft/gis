import { ChevronRight } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

interface TreeGroupProps {
  label: string;
  count?: number;
  children: ReactNode;
  forceOpen: boolean;
}

export default function TreeGroup({
  label,
  count,
  children,
  forceOpen = false,
}: TreeGroupProps) {
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
