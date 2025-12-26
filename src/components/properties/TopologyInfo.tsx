import { ArrowRightLeft } from "lucide-react";

interface TopologyPorps {
  connectionInfo: any;
  handleClick?: () => void;
}

export const TopologyInfo = ({
  connectionInfo,
  handleClick,
}: TopologyPorps) => {
  if (!connectionInfo) return null;

  return (
    <div className="bg-primary-foreground/50 border border-primary/10 rounded p-2 text-xs flex flex-col gap-2">
      <div className="flex justify-between items-center text-muted-foreground">
        <span>Topology</span>
        {connectionInfo?.type === "link" && connectionInfo?.isPipe && (
          <button
            onClick={handleClick}
            className="flex items-center gap-1 text-primary/80 hover:text-primary text-[10px] uppercase font-bold cursor-pointer"
          >
            <ArrowRightLeft size={10} /> Reverse
          </button>
        )}

        {connectionInfo?.type === "node" && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Connections:&nbsp;</span>
            <span className="text-primary font-bold">
              {connectionInfo?.count}
            </span>
          </div>
        )}
      </div>

      {connectionInfo?.type === "link" && (
        <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
          <div className="bg-white p-1 rounded border border-slate-200 text-center">
            Source:&nbsp;
            {connectionInfo.startNodeId || "?"}
          </div>
          <div className="bg-white p-1 rounded border border-slate-200 text-center">
            Target:&nbsp;
            {connectionInfo.endNodeId || "?"}
          </div>
        </div>
      )}

      {connectionInfo?.type === "node" &&
        connectionInfo?.connections?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {connectionInfo?.connections?.map((id: any) => (
              <span
                key={id}
                className="px-1 py-0.5 border rounded text-[10px] font-mono bg-background"
              >
                {id}
              </span>
            ))}
          </div>
        )}
    </div>
  );
};
