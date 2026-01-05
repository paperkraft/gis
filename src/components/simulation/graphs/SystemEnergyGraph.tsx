"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSimulationStore } from "@/store/simulationStore";

export function SystemEnergyGraph() {
  const { history } = useSimulationStore();

  const data = useMemo(() => {
    if (!history) return [];

    return history.snapshots.map((snap, i) => {
      // 1. Calculate Total Energy Consumed (Sum of Pump Energy)
      // Note: EPANET raw result doesn't give kW directly in basic Link result usually,
      // but we can proxy it via Flow * Head for now or assume efficient.
      // Let's use Total Headloss as a proxy for "Energy Dissipated"

      let totalHeadloss = 0;
      let totalFlow = 0;

      Object.values(snap.links).forEach((link: any) => {
        totalHeadloss += Math.abs(link.headloss); // Sum of friction loss
        totalFlow += Math.abs(link.flow);
      });

      let avgPressure = 0;
      const nodes = Object.values(snap.nodes);
      if (nodes.length > 0) {
        avgPressure =
          nodes.reduce((acc, n: any) => acc + n.pressure, 0) / nodes.length;
      }

      const time = history.timestamps[i] / 3600;

      return {
        time: time.toFixed(1),
        headloss: totalHeadloss.toFixed(2),
        pressure: avgPressure.toFixed(2),
        efficiency:
          totalFlow > 0
            ? (avgPressure / (avgPressure + totalHeadloss)) * 100
            : 0,
      };
    });
  }, [history]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorPress" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#e5e7eb"
        />
        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: "12px" }} />
        <Legend wrapperStyle={{ fontSize: "11px" }} />

        <Area
          type="monotone"
          dataKey="headloss"
          stackId="1"
          stroke="#ef4444"
          fill="url(#colorLoss)"
          name="Friction Loss (Head)"
        />
        <Area
          type="monotone"
          dataKey="pressure"
          stackId="1"
          stroke="#22c55e"
          fill="url(#colorPress)"
          name="Avg Pressure"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
