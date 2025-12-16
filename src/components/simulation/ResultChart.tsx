"use client";

import { useMemo } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { SimulationHistory } from "@/types/simulation";

interface ResultChartProps {
  featureId: string;
  type: "node" | "link";
  history: SimulationHistory;
  dataType: "pressure" | "demand" | "flow" | "velocity" | "head";
  color?: string;
  unit?: string;
  activeIndex?: number;
}

export function ResultChart({
  featureId,
  type,
  history,
  dataType,
  color = "#8884d8",
  unit,
  activeIndex = 0,
}: ResultChartProps) {
  // Transform data for Recharts
  const data = useMemo(() => {
    if (!history || !history.snapshots || history.snapshots.length === 0)
      return [];

    // DEBUG: Check if ID exists in first snapshot
    const firstSnap = history.snapshots[0];
    const collection = type === "node" ? firstSnap.nodes : firstSnap.links;

    // ID Resolution Logic: Try exact -> Case insensitive
    let resolvedId = featureId;
    if (collection && !collection[resolvedId]) {
      const foundId = Object.keys(collection).find(
        (k) => k.toLowerCase() === featureId.toLowerCase()
      );
      if (foundId) resolvedId = foundId;
    }

    return history.snapshots.map((snap, index) => {
      // Calculate hour for X-Axis
      const time = history.timestamps[index];
      const hours = Math.floor(time / 3600);

      let value = 0;

      if (type === "node") {
        const node = snap.nodes[resolvedId];
        // Safely access property
        value = node ? (node[dataType as keyof typeof node] as number) : 0;
      } else {
        const link = snap.links[resolvedId];
        value = link ? (link[dataType as keyof typeof link] as number) : 0;
        // Absolute value for flow/velocity magnitude
        if (dataType === "flow" || dataType === "velocity")
          value = Math.abs(value);
      }

      return {
        index,
        time: hours,
        value: Number(value.toFixed(3)), // Clean number
        formattedTime: `${hours.toString().padStart(2, "0")}:00`,
      };
    });
  }, [history, featureId, type, dataType]);

  const activePoint = data[activeIndex];

  if (!data || data.length === 0)
    return (
      <div className="text-xs text-gray-400 p-4 flex items-center justify-center bg-gray-50 h-32">
        No simulation data available
      </div>
    );

  // Check if all values are zero (potential ID mismatch still)
  const isAllZero = data.every((d) => d.value === 0);

  // Sanitize ID for SVG defs
  const safeId = featureId.replace(/[^a-zA-Z0-9]/g, "");

  return (
    <div className="h-48 w-full mt-2 relative">
      {isAllZero && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-xs text-gray-500 bg-white/90 border border-gray-200 px-2 py-1 rounded shadow-sm">
            Value is 0 or ID mismatch
          </span>
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id={`color-${safeId}-${dataType}`}
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
            tick={{ fontSize: 10, fill: "#6B7280" }}
            interval="preserveStartEnd"
            minTickGap={30}
            axisLine={false}
            tickLine={false}
            dy={5}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(value) =>
              value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
            }
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              fontSize: "12px",
              border: "1px solid #E5E7EB",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
            labelStyle={{ color: "#6b7280", marginBottom: "4px" }}
            formatter={(val: number) => [
              `${val} ${unit || ""}`,
              dataType.charAt(0).toUpperCase() + dataType.slice(1),
            ]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fillOpacity={1}
            fill={`url(#color-${safeId}-${dataType})`}
            strokeWidth={2}
            animationDuration={1000}
            isAnimationActive={false}
          />

          {activePoint && (
            <>
              <ReferenceLine
                x={activePoint.formattedTime}
                stroke="#ef4444"
                strokeDasharray="3 3"
                opacity={0.8}
              />
              <ReferenceDot
                x={activePoint.formattedTime}
                y={activePoint.value}
                r={4}
                fill="#ef4444"
                stroke="white"
                strokeWidth={2}
              />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
