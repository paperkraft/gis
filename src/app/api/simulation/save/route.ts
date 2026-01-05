import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { simulationRuns, simulationResults } from "@/db/schema";
import { SimulationHistory } from "@/store/simulationStore";
import { eq, inArray } from "drizzle-orm"; // Import 'eq'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { projectId, history, report, warnings } = body;

        if (!projectId || !history) {
            return NextResponse.json({ error: "Missing project ID or history data" }, { status: 400 });
        }

        // A. Find existing runs for this project
        const existingRuns = await db
            .select({ id: simulationRuns.id })
            .from(simulationRuns)
            .where(eq(simulationRuns.projectId, projectId));

        const runIds = existingRuns.map(r => r.id);

        // B. If runs exist, delete their results first
        if (runIds.length > 0) {
            await db.delete(simulationResults)
                .where(inArray(simulationResults.runId, runIds));

            // C. Now it is safe to delete the runs
            await db.delete(simulationRuns)
                .where(inArray(simulationRuns.id, runIds));
        }

        // 2. Create a NEW Simulation Run Record
        const [run] = await db
            .insert(simulationRuns)
            .values({
                projectId: projectId,
                status: "completed",
                duration: history.summary.duration,
                report: report || "",
                warnings: warnings || [],
            })
            .returning({ id: simulationRuns.id });

        const runId = run.id;

        // 3. Prepare Data for Bulk Insert
        const featureMap = new Map<string, { min: number, max: number, series: Record<string, any> }>();

        const getOrCreate = (id: string) => {
            if (!featureMap.has(id)) {
                featureMap.set(id, { min: Infinity, max: -Infinity, series: {} });
            }
            return featureMap.get(id)!;
        };

        history.snapshots.forEach((snap: any) => {
            const t = snap.time.toString();

            // Nodes (Pressure)
            Object.entries(snap.nodes).forEach(([id, data]: [string, any]) => {
                const entry = getOrCreate(id);
                if (data.pressure < entry.min) entry.min = data.pressure;
                if (data.pressure > entry.max) entry.max = data.pressure;
                entry.series[t] = { p: Number(data.pressure.toFixed(2)), h: Number(data.head.toFixed(2)) };
            });

            // Links (Velocity)
            Object.entries(snap.links).forEach(([id, data]: [string, any]) => {
                const entry = getOrCreate(id);
                if (data.velocity < entry.min) entry.min = data.velocity;
                if (data.velocity > entry.max) entry.max = data.velocity;
                entry.series[t] = { f: Number(data.flow.toFixed(2)), v: Number(data.velocity.toFixed(2)) };
            });
        });

        // 4. Convert Map to Rows
        const rowsToInsert = Array.from(featureMap.entries()).map(([featureId, data]) => ({
            runId: runId,
            featureId: featureId,
            minVal: data.min === Infinity ? 0 : data.min,
            maxVal: data.max === -Infinity ? 0 : data.max,
            timeSeries: data.series
        }));

        // 5. Batch Insert
        if (rowsToInsert.length > 0) {
            const chunkSize = 500;
            for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
                await db.insert(simulationResults).values(rowsToInsert.slice(i, i + chunkSize));
            }
        }

        return NextResponse.json({ success: true, runId });

    } catch (error) {
        console.error("Failed to save simulation results:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}