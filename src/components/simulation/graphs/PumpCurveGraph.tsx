"use client";

import { useMemo } from 'react';
import {
  CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis, ReferenceDot
} from 'recharts';
import { useNetworkStore } from '@/store/networkStore';
import { useSimulationStore } from '@/store/simulationStore';

export function PumpCurveGraph({ pumpId }: { pumpId: string }) {
  const { history, currentTimeIndex } = useSimulationStore();
  const { curves, features } = useNetworkStore();

  const pumpData = useMemo(() => {
    const pump = features.get(pumpId);
    if (!pump) return null;
    
    // 1. Get the Curve ID assigned to this pump
    const curveId = pump.getProperties().curve; // e.g., "C-1"
    const curveDef = curves.find(c => c.id === curveId);
    
    // 2. Format Static Curve Data for Recharts
    // Sort points by flow (x) to draw a smooth line
    const staticCurveData = curveDef 
      ? [...curveDef.points].sort((a, b) => a.x - b.x).map(p => ({ flow: p.x, head: p.y }))
      : [];

    return { staticCurveData, curveId: curveId || 'N/A' };
  }, [pumpId, features, curves]);

  const operatingPoint = useMemo(() => {
    if (!history || !history.snapshots[currentTimeIndex]) return null;
    const snap = history.snapshots[currentTimeIndex];
    const linkRes = snap.links[pumpId];

    if (!linkRes) return null;

    return {
      flow: Math.abs(linkRes.flow), // Flow is X
      head: Math.abs(linkRes.headloss) // Head added by pump is 'headloss' (usually negative in EPANET for pumps, but we treat magnitude)
    };
  }, [history, currentTimeIndex, pumpId]);

  if (!pumpData) return <div className="p-4 text-sm text-gray-500">Selected item is not a pump or has no curve.</div>;

  return (
    <div className="w-full h-full flex flex-col">
       <div className="mb-2 text-xs font-semibold text-gray-500 text-center">
         Curve: {pumpData.curveId} | Op Point: {operatingPoint?.flow.toFixed(1)} GPM @ {operatingPoint?.head.toFixed(1)}m
       </div>
       <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis 
            dataKey="flow" 
            type="number" 
            label={{ value: 'Flow (GPM)', position: 'insideBottom', offset: -10, fontSize: 10 }}
            domain={['dataMin', 'auto']}
          />
          <YAxis 
            label={{ value: 'Head (m)', angle: -90, position: 'insideLeft', fontSize: 10 }} 
          />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

          {/* The Static Pump Curve */}
          <Line 
            data={pumpData.staticCurveData} 
            type="monotone" 
            dataKey="head" 
            name="Pump Curve" 
            stroke="#2563eb" 
            strokeWidth={2} 
            dot={{ r: 3 }} 
          />

          {/* The Dynamic Operating Point */}
          {operatingPoint && (
             <ReferenceDot 
                x={operatingPoint.flow} 
                y={operatingPoint.head} 
                r={6} 
                fill="#ef4444" 
                stroke="white" 
                strokeWidth={2}
                label={{ value: 'OP', position: 'top', fill: '#ef4444', fontSize: 10 }}
             />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}