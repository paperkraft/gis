import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, nodes, links } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { generateINP } from "@/lib/epanet/inpWriter";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;

        // 1. Fetch Project Metadata & Settings
        const project = await db.query.projects.findFirst({
            where: and(eq(projects.id, id), eq(projects.ownerId, session.id))
        });

        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        const settings = project.settings as any;
        const targetProjection = settings.projection || 'EPSG:4326';
        
        let targetSrid = 4326;
        const isSimple = targetProjection === 'Simple' || targetProjection === 'EPSG:Simple';
        
        if (!isSimple) {
            if (targetProjection.startsWith('EPSG:')) {
                targetSrid = parseInt(targetProjection.split(':')[1], 10);
            } else if (!isNaN(parseInt(targetProjection, 10))) {
                targetSrid = parseInt(targetProjection, 10);
            }
        }

        // 2. Fetch Nodes with Transformation
        const dbNodes = await db.select({
            id: nodes.id,
            type: nodes.type,
            properties: nodes.properties,
            geom: isSimple 
                ? sql<string>`ST_AsGeoJSON(geom)::json`
                : sql<string>`ST_AsGeoJSON(ST_Transform(geom, ${targetSrid}::int))::json`
        }).from(nodes).where(eq(nodes.projectId, id));

        // 3. Fetch Links with Transformation
        const dbLinks = await db.select({
            id: links.id,
            type: links.type,
            properties: links.properties,
            geom: isSimple
                ? sql<string>`ST_AsGeoJSON(geom)::json`
                : sql<string>`ST_AsGeoJSON(ST_Transform(geom, ${targetSrid}::int))::json`
        }).from(links).where(eq(links.projectId, id));

        // 4. Transform to NetworkFeatureData
        const features = [
            ...dbNodes.map(n => ({
                id: n.id,
                type: n.type as any,
                geometry: n.geom ? (n.geom as any).coordinates : null,
                properties: n.properties as any
            })).filter(f => f.geometry !== null),
            ...dbLinks.map(l => ({
                id: l.id,
                type: l.type as any,
                geometry: l.geom ? (l.geom as any).coordinates : null,
                properties: l.properties as any
            })).filter(f => f.geometry !== null)
        ];

        // 5. Generate INP
        let inpContent = "";
        try {
            inpContent = generateINP(
                features,
                settings,
                settings.patterns || [],
                settings.curves || [],
                settings.controls || []
            );
        } catch (genError) {
            console.error("INP Generation Logic Error:", genError);
            throw new Error("Failed to generate INP content string from feature data.");
        }

        // 6. Return as File Download
        const filename = `${project.title.replace(/\s+/g, '_')}_export.inp`;
        
        return new NextResponse(inpContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });

    } catch (error) {
        console.error("Server-side INP Export failed:", error);
        return NextResponse.json({ error: "Export failed" }, { status: 500 });
    }
}
