import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db"; // New DB import
import { projects, nodes, links } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

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
            data: {
                features,
                settings: projectData.settings,
                patterns: projectData.patterns,
                curves: projectData.curves,
                controls: projectData.controls
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
        const { title, data, nodeCount, linkCount } = body;
        const { features, settings, patterns, curves, controls } = data;

        // Separate nodes and links
        const incomingNodes = features.filter((f: any) => ['junction', 'tank', 'reservoir'].includes(f.type));
        const incomingLinks = features.filter((f: any) => ['pipe', 'pump', 'valve'].includes(f.type));

        await db.transaction(async (tx) => {
            // 1. Update Metadata
            await tx.update(projects)
                .set({ title, settings, patterns, curves, controls, nodeCount, linkCount, updatedAt: new Date() })
                .where(eq(projects.id, id));

            // 2. Overwrite Topology (Simplest for consistency)
            await tx.delete(nodes).where(eq(nodes.projectId, id));
            await tx.delete(links).where(eq(links.projectId, id));

            // 3. Insert Nodes (Using Spatial SQL)
            if (incomingNodes.length > 0) {
                await tx.insert(nodes).values(incomingNodes.map((n: any) => ({
                    id: n.id,
                    projectId: id,
                    type: n.type,
                    elevation: n.elevation || 0,
                    baseDemand: n.baseDemand || 0,
                    properties: n, // Save full object as backup properties
                    // Create Point Geometry
                    geom: sql`ST_SetSRID(ST_MakePoint(${n.geometry.coordinates[0]}, ${n.geometry.coordinates[1]}), 4326)`
                })));
            }

            // 4. Insert Links (Using Spatial SQL)
            if (incomingLinks.length > 0) {
                await tx.insert(links).values(incomingLinks.map((l: any) => {
                    let coords = l.geometry.coordinates;

                    // SAFETY 1: Ensure we have an array of points
                    if (!Array.isArray(coords) || coords.length < 2 || !Array.isArray(coords[0])) {
                        // If we somehow got a Point (single array) or empty, default to 0,0 -> 0,0
                        // (Or ideally, log error and skip)
                        console.warn(`Invalid geometry for link ${l.id}. Defaulting to 0 line.`);
                        coords = [[0, 0], [0, 0]];
                    }

                    // SAFETY 2: Ensure numbers are valid
                    // Format: LINESTRING(x1 y1, x2 y2)
                    const wktPoints = coords.map((c: number[]) => {
                        const x = isNaN(c[0]) ? 0 : c[0];
                        const y = isNaN(c[1]) ? 0 : c[1];
                        return `${x} ${y}`;
                    });

                    // Format: LINESTRING(x1 y1, x2 y2)
                    // const wkt = `LINESTRING(${coords.map((c: number[]) => `${c[0]} ${c[1]}`).join(',')})`;
                    const wkt = `LINESTRING(${wktPoints.join(',')})`;

                    // FALLBACK LOGIC: Check all possible keys for connectivity
                    // 1. Top-level 'source' (from our new ProjectService)
                    // 2. Top-level 'startNodeId' (legacy)
                    // 3. Nested properties 'startNodeId' (OpenLayers prop)
                    const source = l.source || l.startNodeId || l.properties?.startNodeId || l.properties?.fromNode;
                    const target = l.target || l.endNodeId || l.properties?.endNodeId || l.properties?.toNode;

                    if (!source || !target) {
                        console.error(`Missing connection for link ${l.id} (${l.type}). Source: ${source}, Target: ${target}`);
                        // We throw here to abort transaction rather than saving broken data
                        throw new Error(`Link ${l.id} is missing source or target node.`);
                    }

                    return {
                        id: l.id,
                        projectId: id,
                        type: l.type,
                        sourceNodeId: source,
                        targetNodeId: target,
                        length: l.length || l.properties?.length || 0,
                        diameter: l.diameter || l.properties?.diameter || 0,
                        roughness: l.roughness || l.properties?.roughness || 100,
                        properties: l,
                        geom: sql`ST_GeomFromText(${wkt}, 4326)`
                    };
                }));
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