import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, nodes, links, projectShares } from "@/db/schema";
import { and, eq, inArray, sql, or, exists } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// Helper to check access
async function checkProjectAccess(projectId: string, userId: string, requiredRole?: string) {
    const project = await db.query.projects.findFirst({
        where: and(
            eq(projects.id, projectId),
            or(
                eq(projects.ownerId, userId),
                exists(
                    db.select()
                        .from(projectShares)
                        .where(
                            and(
                                eq(projectShares.projectId, projects.id),
                                eq(projectShares.userId, userId),
                                requiredRole ? eq(projectShares.role, requiredRole) : undefined
                            )
                        )
                )
            )
        )
    });
    return project;
}

// --- LOAD PROJECT ---
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;

        // 1. Fetch Metadata with access check
        const projectData = await checkProjectAccess(id, session.id);

        if (!projectData) return NextResponse.json({ error: "Forbidden or Not found" }, { status: 403 });

        // 2. Fetch Nodes (Extract Lat/Lon from PostGIS)
        const dbNodes = await db.select({
            id: nodes.id,
            type: nodes.type,
            elevation: nodes.elevation,
            baseDemand: nodes.baseDemand,
            properties: nodes.properties,
            x: sql<number>`ST_X(geom::geometry)`,
            y: sql<number>`ST_Y(geom::geometry)`,
        }).from(nodes).where(eq(nodes.projectId, id));

        // 3. Fetch Links (Extract GeoJSON)
        const dbLinks = await db.select({
            id: links.id,
            type: links.type,
            source: links.sourceNodeId,
            target: links.targetNodeId,
            length: links.length,
            diameter: links.diameter,
            roughness: links.roughness,
            properties: links.properties,
            geoJSON: sql<string>`ST_AsGeoJSON(geom)::json`
        }).from(links).where(eq(links.projectId, id));

        // 4. Reconstruct "Features" Array
        const features = [
            ...dbNodes.map(n => ({
                id: n.id,
                type: n.type,
                geometry: { type: 'Point', coordinates: [n.x, n.y] },
                elevation: n.elevation,
                baseDemand: n.baseDemand,
                ...n.properties as object
            })),
            ...dbLinks.map(l => {
                const geo: any = l.geoJSON;
                return {
                    id: l.id,
                    type: l.type,
                    geometry: { type: 'LineString', coordinates: geo.coordinates },
                    length: l.length,
                    diameter: l.diameter,
                    roughness: l.roughness,
                    source: l.source,
                    target: l.target,
                    ...l.properties as object
                };
            })
        ];

        return NextResponse.json({
            id: projectData.id,
            title: projectData.title,
            description: projectData.description,
            data: {
                features,
                settings: projectData.settings,
            },
            updatedAt: projectData.updatedAt
        });

    } catch (error) {
        console.error("Load Error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}

// --- SAVE / UPDATE PROJECT ---
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;
        
        // For editing, we check if owner or shared (ignoring specific role for this dummy logic)
        const projectData = await checkProjectAccess(id, session.id);
        if (!projectData) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json();
        const { title, description, modifications, deletions, settings, patterns, curves, controls } = body;

        const upsertNodes = modifications.filter((f: any) => ['junction', 'tank', 'reservoir'].includes(f.type));
        const upsertLinks = modifications.filter((f: any) => ['pipe', 'pump', 'valve'].includes(f.type));

        await db.transaction(async (tx) => {
            await tx.update(projects)
                .set({
                    title,
                    description,
                    settings: { ...settings, patterns, curves, controls },
                    updatedAt: new Date()
                })
                .where(eq(projects.id, id));

            if (deletions && deletions.length > 0) {
                await tx.delete(links).where(and(eq(links.projectId, id), inArray(links.id, deletions)));
                await tx.delete(nodes).where(and(eq(nodes.projectId, id), inArray(nodes.id, deletions)));
            }
            if (upsertNodes.length > 0) {
                const nodeValues = upsertNodes.map((n: any) => ({
                    projectId: id,
                    id: n.id,
                    type: n.type,
                    elevation: n.elevation || 0,
                    baseDemand: n.baseDemand || 0,
                    properties: n,
                    geom: sql`ST_SetSRID(ST_MakePoint(${n.geometry.coordinates[0]}, ${n.geometry.coordinates[1]}), 4326)`
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

            if (upsertLinks.length > 0) {
                const requiredNodes = new Set<string>();
                upsertLinks.forEach((l: any) => {
                    const source = l.source || l.startNodeId || l.properties?.startNodeId;
                    const target = l.target || l.endNodeId || l.properties?.endNodeId;
                    if (source) requiredNodes.add(source);
                    if (target) requiredNodes.add(target);
                });

                const existingNodes = await tx.select({ id: nodes.id })
                    .from(nodes)
                    .where(and(
                        eq(nodes.projectId, id),
                        inArray(nodes.id, Array.from(requiredNodes))
                    ));

                const existingNodeIds = new Set(existingNodes.map(n => n.id));
                upsertNodes.forEach((n: any) => existingNodeIds.add(n.id));

                const validLinks = [];
                for (const l of upsertLinks) {
                    const source = l.source || l.startNodeId || l.properties?.startNodeId;
                    const target = l.target || l.endNodeId || l.properties?.endNodeId;

                    if (!existingNodeIds.has(source) || !existingNodeIds.has(target)) continue;

                    let coords = l.geometry.coordinates;
                    if (!Array.isArray(coords) || coords.length < 2) coords = [[0, 0], [0, 0]];

                    const wktPoints = coords.map((c: number[]) => `${c[0]} ${c[1]}`);
                    const wkt = `LINESTRING(${wktPoints.join(',')})`;

                    validLinks.push({
                        projectId: id,
                        id: l.id,
                        type: l.type,
                        sourceNodeId: source,
                        targetNodeId: target,
                        length: l.length || 0,
                        diameter: l.diameter || 0,
                        roughness: l.roughness || 100,
                        properties: l,
                        geom: sql`ST_GeomFromText(${wkt}, 4326)`
                    });
                }

                if (validLinks.length > 0) {
                    await tx.insert(links)
                        .values(validLinks)
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
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Save Error:", error);
        return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
}

// DELETE: Delete Project
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;

        // ONLY OWNER CAN DELETE
        const project = await db.query.projects.findFirst({
            where: and(eq(projects.id, id), eq(projects.ownerId, session.id))
        });
        if (!project) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        await db.transaction(async (tx) => {
            await tx.delete(links).where(eq(links.projectId, id));
            await tx.delete(nodes).where(eq(nodes.projectId, id));
            await tx.delete(projects).where(eq(projects.id, id));
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete Error:", error);
        return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
    }
}