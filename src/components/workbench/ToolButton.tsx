interface ToolButtonProps {
  icon: any;
  active?: boolean;
}

export default function ToolButton({ icon: Icon, active }: ToolButtonProps) {
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
