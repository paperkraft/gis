import { db } from "@/db";
import { projects, nodes, links, projectShares } from "@/db/schema";
import { eq, and, inArray, sql, or, exists } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;

        // Check Access
        const projectData = await db.query.projects.findFirst({
            where: and(
                eq(projects.id, id),
                or(
                    eq(projects.ownerId, session.id),
                    exists(
                        db.select()
                            .from(projectShares)
                            .where(
                                and(
                                    eq(projectShares.projectId, id),
                                    eq(projectShares.userId, session.id)
                                )
                            )
                    )
                )
            )
        });

        if (!projectData) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json();
        const { features, deletions, settings, patterns, curves, controls } = body;

        const nodeMods = features.filter((f: any) =>
            ['junction', 'tank', 'reservoir'].includes(f.properties?.type)
        );
        const linkMods = features.filter((f: any) =>
            ['pipe', 'pump', 'valve'].includes(f.properties?.type)
        );

        await db.transaction(async (tx) => {
            await tx.update(projects)
                .set({
                    title: settings.title,
                    description: settings.description,
                    settings: { ...settings, patterns, curves, controls },
                    updatedAt: new Date()
                })
                .where(eq(projects.id, id));

            if (deletions && deletions.length > 0) {
                await tx.delete(links).where(and(eq(links.projectId, id), inArray(links.id, deletions)));
                await tx.delete(nodes).where(and(eq(nodes.projectId, id), inArray(nodes.id, deletions)));
            }

            if (nodeMods.length > 0) {
                const nodeValues = nodeMods.map((f: any) => {
                    const { source, target, fromNode, toNode, geometry, ...cleanProps } = f.properties || {};
                    return {
                        projectId: id,
                        id: String(f.id),
                        type: f.properties.type,
                        elevation: Number(f.properties.elevation || 0),
                        baseDemand: Number(f.properties.demand || f.properties.baseDemand || 0),
                        properties: cleanProps,
                        geom: sql`ST_SetSRID(ST_MakePoint(${f.geometry.coordinates[0]}, ${f.geometry.coordinates[1]}), 4326)`
                    };
                });

                await tx.insert(nodes)
                    .values(nodeValues)
                    .onConflictDoUpdate({
                        target: [nodes.projectId, nodes.id],
                        set: {
                            properties: sql`excluded.properties`,
                            geom: sql`excluded.geom`
                        }
                    });
            }

            if (linkMods.length > 0) {
                const linkValues = linkMods.map((f: any) => {
                    const coords = f.geometry.coordinates;
                    const wktPoints = (coords.length > 1 ? coords : [[0, 0], [0, 0]])
                        .map((c: number[]) => `${c[0]} ${c[1]}`).join(',');

                    return {
                        projectId: id,
                        id: String(f.id),
                        type: f.properties.type,
                        sourceNodeId: f.properties.startNodeId,
                        targetNodeId: f.properties.endNodeId,
                        length: Number(f.properties.length || 0),
                        diameter: Number(f.properties.diameter || 0),
                        roughness: Number(f.properties.roughness || 100),
                        properties: (() => {
                            const { source, target, fromNode, toNode, geometry, ...cleanProps } = f.properties || {};
                            return cleanProps;
                        })(),
                        geom: sql`ST_GeomFromText(${"LINESTRING(" + wktPoints + ")"}, 4326)`
                    };
                });

                await tx.insert(links)
                    .values(linkValues)
                    .onConflictDoUpdate({
                        target: [links.projectId, links.id],
                        set: {
                            sourceNodeId: sql`excluded.source_node_id`,
                            targetNodeId: sql`excluded.target_node_id`,
                            properties: sql`excluded.properties`,
                            geom: sql`excluded.geom`
                        }
                    });
            }
        });

        return NextResponse.json({ success: true, saved: features.length + deletions.length });
    } catch (error) {
        console.error("Delta Save Error:", error);
        return NextResponse.json({ error: "Failed to save changes" }, { status: 500 });
    }
}