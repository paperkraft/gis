import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { simulationRuns, simulationResults } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const projectId = (await params).id;

        // 1. Get the LATEST Run for this project
        const run = await db.query.simulationRuns.findFirst({
            where: eq(simulationRuns.projectId, projectId),
            orderBy: [desc(simulationRuns.executedAt)],
        });

        if (!run) {
            return NextResponse.json({ found: false });
        }

        // 2. Get all Results for this run
        const rows = await db
            .select({
                id: simulationResults.featureId,
                data: simulationResults.timeSeries,
            })
            .from(simulationResults)
            .where(eq(simulationResults.runId, run.id));

        if (rows.length === 0) {
            return NextResponse.json({ found: false });
        }

        // 3. RECONSTRUCT: Pivot from "Feature-Centric" to "Time-Centric"
        const timestampsSet = new Set<string>();
        const nodeResults: Record<string, Record<string, any>> = {}; // time -> { nodeId: data }
        const linkResults: Record<string, Record<string, any>> = {}; // time -> { linkId: data }

        // First pass: Collect all unique timestamps and organize by time
        rows.forEach((row) => {
            const featureId = row.id;
            const timeSeries = row.data as Record<string, any>;

            Object.entries(timeSeries).forEach(([tStr, val]) => {
                timestampsSet.add(tStr);

                if ("p" in val) {
                    if (!nodeResults[tStr]) nodeResults[tStr] = {};
                    nodeResults[tStr][featureId] = {
                        pressure: val.p,
                        head: val.h,
                        demand: val.d ?? 0
                    };
                } else if ("f" in val) {
                    if (!linkResults[tStr]) linkResults[tStr] = {};
                    linkResults[tStr][featureId] = {
                        flow: val.f,
                        velocity: val.v,
                        status: val.s === 1 ? "Open" : "Closed"
                    };
                }
            });
        });

        // 4. Sort Timestamps
        const timestamps = Array.from(timestampsSet)
            .map(Number)
            .sort((a, b) => a - b);

        // 5. Build Snapshots Array
        const snapshots = timestamps.map((t) => {
            const tStr = t.toString();
            return {
                time: t,
                nodes: nodeResults[tStr] || {},
                links: linkResults[tStr] || {},
            };
        });

        return NextResponse.json({
            found: true,
            history: {
                timestamps,
                snapshots,
                summary: {
                    duration: run.duration || timestamps[timestamps.length - 1],
                    nodeCount: Object.keys(snapshots[0]?.nodes || {}).length,
                    linkCount: Object.keys(snapshots[0]?.links || {}).length
                }
            },
            report: run.report,
            warnings: run.warnings,
        });

    } catch (error) {
        console.error("Failed to load simulation:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}