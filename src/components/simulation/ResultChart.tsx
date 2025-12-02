"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { SimulationHistory } from "@/types/simulation";

interface ResultChartProps {
  featureId: string;
  type: "node" | "link";
  history: SimulationHistory;
  dataType: "pressure" | "demand" | "flow" | "velocity";
  color?: string;
  unit?: string;
}

export function ResultChart({
  featureId,
  type,
  history,
  dataType,
  color = "#8884d8",
  unit,
}: ResultChartProps) {
  // Transform data for Recharts
  const data = useMemo(() => {
    if (!history) return [];

    return history.snapshots.map((snap, index) => {
      // Calculate hour for X-Axis
      const time = history.timestamps[index];
      const hours = Math.floor(time / 3600);

      let value = 0;

      if (type === "node") {
        const node = snap.nodes[featureId];
        value = node ? (node[dataType as keyof typeof node] as number) : 0;
      } else {
        const link = snap.links[featureId];
        value = link ? (link[dataType as keyof typeof link] as number) : 0;
        // Absolute value for flow (magnitude)
        if (dataType === "flow") value = Math.abs(value);
      }

      return {
        time: hours, // 0, 1, 2...
        value: value,
        formattedTime: `${hours.toString().padStart(2, "0")}:00`,
      };
    });
  }, [history, featureId, type, dataType]);

  if (data.length === 0)
    return <div className="text-xs text-gray-400 p-4">No data available</div>;

  return (
    <div className="h-48 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient
              id={`color-${featureId}-${dataType}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e5e7eb"
          />
          <XAxis
            dataKey="formattedTime"
            tick={{ fontSize: 10 }}
            interval={3} // Show every 3rd label
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
            labelStyle={{ color: "#6b7280", marginBottom: "4px" }}
            formatter={(val: number) => [
              `${val.toFixed(2)} ${unit || ""}`,
              dataType.charAt(0).toUpperCase() + dataType.slice(1),
            ]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fillOpacity={1}
            fill={`url(#color-${featureId}-${dataType})`}
            strokeWidth={2}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
