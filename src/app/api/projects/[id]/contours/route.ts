import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contours, projects } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const metaOnly = req.nextUrl.searchParams.get("meta") === "true";

    try {
        if (metaOnly) {
            const result = await db.select({ count: sql<number>`count(*)` })
                .from(contours)
                .where(eq(contours.projectId, id));
            return NextResponse.json({ hasContours: result[0].count > 0 });
        }

        // Fetch full contours for project
        const dbContours = await db.select({
            id: contours.id,
            properties: contours.properties,
            geoJSON: sql<any>`ST_AsGeoJSON(geom)::json`
        }).from(contours).where(eq(contours.projectId, id));

        const features = dbContours.map(c => ({
            type: 'Feature',
            id: c.id,
            properties: c.properties,
            geometry: c.geoJSON
        }));

        return NextResponse.json({ type: 'FeatureCollection', features });
    } catch (err) {
        console.error("Fetch Contours Error:", err);
        return NextResponse.json({ error: "Failed to fetch contours" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;

    try {
        const body = await req.json();
        const { features } = body;

        if (!features || !Array.isArray(features)) {
            return NextResponse.json({ error: "Invalid features data" }, { status: 400 });
        }

        await db.transaction(async (tx) => {
            // 1. Delete existing contours for this project
            await tx.delete(contours).where(eq(contours.projectId, projectId));

            // 2. Insert new features in chunks
            const chunkSize = 500;
            for (let i = 0; i < features.length; i += chunkSize) {
                const chunk = features.slice(i, i + chunkSize);
                const values = chunk.map(f => ({
                    projectId,
                    properties: f.properties,
                    geom: sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(f.geometry)}), 4326)`
                }));
                await tx.insert(contours).values(values);
            }
        });

        return NextResponse.json({ success: true, count: features.length });
    } catch (err) {
        console.error("Save Contours Error:", err);
        return NextResponse.json({ error: "Failed to save contours" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;

    try {
        await db.delete(contours).where(eq(contours.projectId, projectId));
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Delete Contours Error:", err);
        return NextResponse.json({ error: "Failed to delete contours" }, { status: 500 });
    }
}
