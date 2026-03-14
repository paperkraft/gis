import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { simulationRuns, simulationResults, projects, projectShares } from "@/db/schema";
import { desc, eq, and, or, exists } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const projectId = (await params).id;

        // Check Access
        const project = await db.query.projects.findFirst({
            where: and(
                eq(projects.id, projectId),
                or(
                    eq(projects.ownerId, session.id),
                    exists(
                        db.select()
                            .from(projectShares)
                            .where(
                                and(
                                    eq(projectShares.projectId, projectId),
                                    eq(projectShares.userId, session.id)
                                )
                            )
                    )
                )
            )
        });

        if (!project) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const run = await db.query.simulationRuns.findFirst({
            where: eq(simulationRuns.projectId, projectId),
            orderBy: [desc(simulationRuns.executedAt)],
        });

        if (!run) return NextResponse.json({ found: false });

        const rows = await db
            .select({
                id: simulationResults.featureId,
                data: simulationResults.timeSeries,
            })
            .from(simulationResults)
            .where(eq(simulationResults.runId, run.id));

        if (rows.length === 0) return NextResponse.json({ found: false });

        const timestampsSet = new Set<string>();
        const nodeResults: Record<string, Record<string, any>> = {};
        const linkResults: Record<string, Record<string, any>> = {};

        rows.forEach((row) => {
            const featureId = row.id;
            const timeSeries = row.data as Record<string, any>;
            Object.entries(timeSeries).forEach(([tStr, val]) => {
                timestampsSet.add(tStr);
                if ("p" in val) {
                    if (!nodeResults[tStr]) nodeResults[tStr] = {};
                    nodeResults[tStr][featureId] = { pressure: val.p, head: val.h, demand: val.d ?? 0 };
                } else if ("f" in val) {
                    if (!linkResults[tStr]) linkResults[tStr] = {};
                    linkResults[tStr][featureId] = { flow: val.f, velocity: val.v, status: val.s === 1 ? "Open" : "Closed" };
                }
            });
        });

        const timestamps = Array.from(timestampsSet).map(Number).sort((a, b) => a - b);
        const snapshots = timestamps.map((t) => {
            const tStr = t.toString();
            return { time: t, nodes: nodeResults[tStr] || {}, links: linkResults[tStr] || {} };
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