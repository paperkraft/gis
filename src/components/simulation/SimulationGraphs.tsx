"use client";

import React, { useMemo, useState } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { MousePointer2 } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useNetworkStore } from "@/store/networkStore";

export function SimulationGraphs() {
  const { history } = useSimulationStore();
  const { selectedFeatureId } = useNetworkStore(); 
  const [metric, setMetric] = useState<"pressure" | "head" | "flow" | "velocity">("pressure");

  // Transform Data
  const chartData = useMemo(() => {
    if (!history || !history.snapshots) return [];
    
    return history.snapshots.map((snap, index) => {
      const rawTime = snap.time !== undefined ? snap.time : (history.timestamps ? history.timestamps[index] : 0);
      const timeLabel = (Number(rawTime) / 3600).toFixed(1);

      let val = 0;
      if (selectedFeatureId) {
         const node = snap.nodes[selectedFeatureId];
         if (node) val = (node as any)[metric] || 0;
         else {
           const link = snap.links[selectedFeatureId];
           if (link) val = (link as any)[metric] || 0;
         }
      } else {
         const items = metric === 'flow' || metric === 'velocity' ? Object.values(snap.links) : Object.values(snap.nodes);
         const sum = items.reduce((acc: number, item: any) => acc + (item[metric] || 0), 0);
         val = items.length ? sum / items.length : 0;
      }
      return {
        time: isNaN(Number(timeLabel)) ? index : timeLabel,
        value: parseFloat(val.toFixed(2))
      };
    });
  }, [history, selectedFeatureId, metric]);

  const label = selectedFeatureId ? `${selectedFeatureId} (${metric})` : `System Avg ${metric}`;

  return (
    <div className="flex flex-col h-full bg-white p-2">
      
      {/* Controls Bar */}
      <div className="flex justify-between items-center mb-4 px-1">
         <select 
            value={metric} 
            onChange={(e) => setMetric(e.target.value as any)}
            className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white outline-none focus:border-blue-500 shadow-sm"
         >
             <option value="pressure">Pressure (m)</option>
             <option value="head">Total Head (m)</option>
             <option value="demand">Demand (LPS)</option>
             <option value="flow">Flow (LPS)</option>
             <option value="velocity">Velocity (m/s)</option>
         </select>
         
         {!selectedFeatureId && (
             <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                 <MousePointer2 size={10} /> Select item on map
             </div>
         )}
      </div>

      {/* Chart Area */}
      <div className="flex-1 min-h-62.5 w-full">
         <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" fontSize={10} tickFormatter={(v) => `${v}h`} stroke="#94a3b8" />
              <YAxis fontSize={10} stroke="#94a3b8" />
              <Tooltip 
                 contentStyle={{ fontSize: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                 labelStyle={{ color: '#64748b', marginBottom: '4px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}/>
              <Line 
                type="monotone" 
                dataKey="value" 
                name={label} 
                stroke="#2563eb" 
                strokeWidth={2} 
                dot={false} 
                activeDot={{ r: 5, strokeWidth: 0 }} 
                animationDuration={500}
              />
            </LineChart>
         </ResponsiveContainer>
      </div>
    </div>
  );
}