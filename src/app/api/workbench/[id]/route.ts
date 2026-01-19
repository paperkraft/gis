import { db } from "@/db";
import { projects, nodes, links } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();

        // 1. Deconstruct Delta Payload
        const { features, deletions, settings, patterns, curves, controls } = body;

        // Separate modified features by type
        const nodeMods = features.filter((f: any) =>
            ['junction', 'tank', 'reservoir'].includes(f.properties?.type)
        );
        const linkMods = features.filter((f: any) =>
            ['pipe', 'pump', 'valve'].includes(f.properties?.type)
        );

        await db.transaction(async (tx) => {
            // --- A. UPDATE METADATA (Always Sync) ---
            await tx.update(projects)
                .set({
                    title: settings.title,
                    description: settings.description,
                    settings: { ...settings, patterns, curves, controls },
                    updatedAt: new Date()
                })
                .where(eq(projects.id, id));

            // --- B. PROCESS DELETIONS ---
            // Explicitly delete items the user removed
            if (deletions && deletions.length > 0) {
                // Delete Links first (FK constraints)
                await tx.delete(links).where(and(eq(links.projectId, id), inArray(links.id, deletions)));
                await tx.delete(nodes).where(and(eq(nodes.projectId, id), inArray(nodes.id, deletions)));
            }

            // --- C. PROCESS UPSERTS (Modifications) ---

            // 1. Upsert Nodes
            if (nodeMods.length > 0) {
                const nodeValues = nodeMods.map((f: any) => ({
                    projectId: id,
                    id: String(f.id),
                    type: f.properties.type,
                    elevation: Number(f.properties.elevation || 0),
                    baseDemand: Number(f.properties.demand || f.properties.baseDemand || 0),
                    properties: f.properties,
                    geom: sql`ST_SetSRID(ST_MakePoint(${f.geometry.coordinates[0]}, ${f.geometry.coordinates[1]}), 4326)`
                }));

                await tx.insert(nodes)
                    .values(nodeValues)
                    .onConflictDoUpdate({
                        target: [nodes.projectId, nodes.id],
                        set: {
                            elevation: sql`excluded.elevation`,
                            baseDemand: sql`excluded.base_demand`,
                            properties: sql`excluded.properties`,
                            geom: sql`excluded.geom`
                        }
                    });
            }

            // 2. Upsert Links
            if (linkMods.length > 0) {
                const linkValues = linkMods.map((f: any) => {
                    const coords = f.geometry.coordinates;
                    // Guard against empty coords
                    const wktPoints = (coords.length > 1 ? coords : [[0, 0], [0, 0]])
                        .map((c: number[]) => `${c[0]} ${c[1]}`).join(',');

                    return {
                        projectId: id,
                        id: String(f.id),
                        type: f.properties.type,
                        sourceNodeId: f.properties.startNodeId || f.properties.source,
                        targetNodeId: f.properties.endNodeId || f.properties.target,
                        length: Number(f.properties.length || 0),
                        diameter: Number(f.properties.diameter || 0),
                        roughness: Number(f.properties.roughness || 100),
                        properties: f.properties,
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
                            length: sql`excluded.length`,
                            diameter: sql`excluded.diameter`,
                            roughness: sql`excluded.roughness`,
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