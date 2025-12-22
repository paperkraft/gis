import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db"; // New DB import
import { projects, nodes, links } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

// --- LOAD PROJECT ---
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // 1. Fetch Metadata
        const projectData = await db.query.projects.findFirst({
            where: eq(projects.id, id)
        });

        if (!projectData) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // 2. Fetch Nodes (Extract Lat/Lon from PostGIS)
        const dbNodes = await db.select({
            id: nodes.id,
            type: nodes.type,
            elevation: nodes.elevation,
            baseDemand: nodes.baseDemand,
            properties: nodes.properties,
            // Convert Geometry back to numbers
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
            // Get Geometry as JSON
            geoJSON: sql<string>`ST_AsGeoJSON(geom)::json`
        }).from(links).where(eq(links.projectId, id));

        // 4. Reconstruct "Features" Array for Frontend
        // (This matches the format your ProjectService expects)
        const features = [

            ...dbNodes.map(n => ({
                id: n.id,
                type: n.type,
                geometry: { type: 'Point', coordinates: [n.x, n.y] },
                elevation: n.elevation,
                baseDemand: n.baseDemand,
                ...n.properties as object // Restore UI props
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
    try {
        const { id } = await params;
        const body = await req.json();

        // Deconstruct the frontend payload
        const { title, description, modifications, deletions, settings, patterns, curves, controls } = body;

        // Separate nodes and links
        const upsertNodes = modifications.filter((f: any) => ['junction', 'tank', 'reservoir'].includes(f.type));
        const upsertLinks = modifications.filter((f: any) => ['pipe', 'pump', 'valve'].includes(f.type));

        await db.transaction(async (tx) => {
            // 1. Update Metadata
            await tx.update(projects)
                .set({
                    title,
                    description,
                    settings: { ...settings, patterns, curves, controls },
                    updatedAt: new Date()
                })
                .where(eq(projects.id, id));

            // 2. Process Deletions (Links first to avoid FK constraint violations)
            if (deletions && deletions.length > 0) {
                await tx.delete(links).where(and(eq(links.projectId, id), inArray(links.id, deletions)));
                await tx.delete(nodes).where(and(eq(nodes.projectId, id), inArray(nodes.id, deletions)));
            }
            // 3. Upsert Nodes (Use ON CONFLICT DO UPDATE)
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
                        target: [nodes.projectId, nodes.id], // Requires Composite PK defined in schema
                        set: {
                            elevation: sql`excluded.elevation`,
                            baseDemand: sql`excluded.base_demand`,
                            properties: sql`excluded.properties`,
                            geom: sql`excluded.geom`
                        }
                    });
            }

            // 4. TOPOLOGY CHECK & Upsert Links
            if (upsertLinks.length > 0) {
                // We need to ensure source/target nodes exist.
                // They are either in the DB already OR in the 'upsertNodes' array we just processed.

                // Get list of all Node IDs referenced by these links
                const requiredNodes = new Set<string>();
                upsertLinks.forEach((l: any) => {
                    const source = l.source || l.startNodeId || l.properties?.startNodeId;
                    const target = l.target || l.endNodeId || l.properties?.endNodeId;
                    if (source) requiredNodes.add(source);
                    if (target) requiredNodes.add(target);
                });

                // Check DB for these nodes
                const existingNodes = await tx.select({ id: nodes.id })
                    .from(nodes)
                    .where(and(
                        eq(nodes.projectId, id),
                        inArray(nodes.id, Array.from(requiredNodes))
                    ));

                const existingNodeIds = new Set(existingNodes.map(n => n.id));

                // Also check the nodes we JUST upserted in this transaction
                upsertNodes.forEach((n: any) => existingNodeIds.add(n.id));

                const validLinks = [];

                for (const l of upsertLinks) {
                    const source = l.source || l.startNodeId || l.properties?.startNodeId;
                    const target = l.target || l.endNodeId || l.properties?.endNodeId;

                    // STRICT CHECK
                    if (!existingNodeIds.has(source) || !existingNodeIds.has(target)) {
                        console.error(`Topology Error: Link ${l.id} connects to missing nodes (${source} -> ${target})`);
                        // Option A: Skip this link
                        continue;
                        // Option B: Throw error to abort transaction (Recommended for data integrity)
                        // throw new Error(`Link ${l.id} references missing node.`);
                    }

                    // Prepare Link Geometry (WKT)
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
    try {
        const { id } = await params;

        // Perform Manual Cascade Delete in a Transaction
        await db.transaction(async (tx) => {
            // 1. Delete all Links associated with this project
            await tx.delete(links).where(eq(links.projectId, id));

            // 2. Delete all Nodes associated with this project
            await tx.delete(nodes).where(eq(nodes.projectId, id));

            // 3. Finally, delete the Project itself
            const result = await tx.delete(projects)
                .where(eq(projects.id, id))
                .returning({ id: projects.id });

            if (result.length === 0) {
                throw new Error("Project not found");
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete Error:", error);
        const status = error.message === "Project not found" ? 404 : 500;
        return NextResponse.json({ error: error.message || "Failed to delete project" }, { status });
    }
}