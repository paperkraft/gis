"use client";

import { MousePointer2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useNetworkStore } from "@/store/networkStore";
import { useScenarioStore } from "@/store/scenarioStore";
import { useSimulationStore } from "@/store/simulationStore";
import { FormSelect } from "@/components//form-controls/FormSelect";

export function TimeSeriesGraph() {
  const { history, currentTimeIndex } = useSimulationStore();
  const { scenarios } = useScenarioStore();

  const { selectedFeatureId } = useNetworkStore();
  const [metric, setMetric] = useState<
    "pressure" | "head" | "flow" | "velocity"
  >("pressure");

  // Helper to extract value from a snapshot
  const getValue = (snap: any, id: string | null, metric: string) => {
    if (id) {
      // Specific Item
      if (snap.nodes[id]) return snap.nodes[id][metric] || 0;
      if (snap.links[id]) return snap.links[id][metric] || 0;
      return 0;
    } else {
      // System Avg
      const items =
        metric === "flow" || metric === "velocity"
          ? Object.values(snap.links)
          : Object.values(snap.nodes);
      const sum = items.reduce(
        (acc: number, item: any) => acc + (item[metric] || 0),
        0
      );
      return items.length ? sum / items.length : 0;
    }
  };

  // Transform Data
  const chartData = useMemo(() => {
    if (!history || !history.snapshots) return [];

    // Base: Current Simulation
    return history.snapshots.map((snap, i) => {
      const rawTime =
        snap.time !== undefined
          ? snap.time
          : history.timestamps
          ? history.timestamps[i]
          : 0;
      const timeLabel = (Number(rawTime) / 3600).toFixed(1);

      const dataPoint: any = {
        time: isNaN(Number(timeLabel)) ? i : timeLabel,
        current: parseFloat(
          getValue(snap, selectedFeatureId, metric).toFixed(2)
        ),
      };

      // Merge: Saved Scenarios
      scenarios.forEach((scen) => {
        if (scen.isVisible && scen.results.snapshots[i]) {
          const val = getValue(
            scen.results.snapshots[i],
            selectedFeatureId,
            metric
          );
          dataPoint[scen.id] = parseFloat(val.toFixed(2));
        }
      });

      return dataPoint;
    });
  }, [history, scenarios, selectedFeatureId, metric]);

  // 3. Calculate where the Red Line should be
  const currentRefTime = useMemo(() => {
    if (!history || !history.timestamps) return null;
    const t = history.timestamps[currentTimeIndex] || 0;
    return (t / 3600).toFixed(1);
  }, [history, currentTimeIndex]);

  const hourTicks = useMemo(() => Array.from({ length: 25 }, (_, i) => i), []);

  const label = selectedFeatureId
    ? `${selectedFeatureId} (${metric})`
    : `System Avg ${metric}`;

  const graphOptions = [
    { label: "Pressure (m)", value: "pressure" },
    { label: "Total Head (m)", value: "head" },
    { label: "Flow (LPS)", value: "flow" },
    { label: "Velocity (m/s)", value: "velocity" },
  ];

  return (
    <div className="flex flex-col h-full bg-white p-2">
      {/* Controls Bar */}
      <div className="flex justify-between items-center mb-4 px-1">
        <FormSelect
          label=""
          value={metric || ""}
          onChange={(v) => setMetric(v)}
          options={graphOptions}
        />

        {!selectedFeatureId && (
          <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">
            <MousePointer2 size={10} /> Select item on map
          </div>
        )}
      </div>

      {/* Chart Area */}
      <div className="flex-1 min-h-62.5 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="time"
              type="number"
              domain={["dataMin", "dataMax"]}
              fontSize={10}
              ticks={hourTicks}
              interval={0}
              tickFormatter={(v) => `${v.toFixed(1)}h`}
              stroke="#94a3b8"
            />
            <YAxis fontSize={10} stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                fontSize: "12px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
              }}
              labelStyle={{ color: "#64748b" }}
            />

            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />

            {/* THE LIVE CURSOR */}
            {currentRefTime && (
              <ReferenceLine
                x={currentRefTime}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  position: "insideTopRight",
                  value: "PLAYHEAD",
                  fill: "#ef4444",
                  fontSize: 9,
                  fontWeight: "bold",
                }}
              />
            )}

            {/* Data Lines */}
            <Line
              type="monotone"
              dataKey="current"
              name={`Current: ${label}`}
              stroke="#2563eb"
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />

            {/* SCENARIO LINES (Dynamic Colors) */}
            {scenarios.map(
              (scen) =>
                scen.isVisible && (
                  <Line
                    key={scen.id}
                    type="monotone"
                    dataKey={scen.id}
                    name={scen.name}
                    stroke={scen.color}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    isAnimationActive={false}
                  />
                )
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
