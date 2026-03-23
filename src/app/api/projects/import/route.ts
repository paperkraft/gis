import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, nodes, links } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { sql } from "drizzle-orm";
import { parseINP } from "@/lib/epanet/inpParser";

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { title, description, inpContent, sourceProjection } = await req.json();

        if (!inpContent) return NextResponse.json({ error: "No INP content provided" }, { status: 400 });

        // 1. Parse INP (Note: parseINP on server uses ol/proj, we need to ensure this works or skip transformation)
        // Actually, we WANT raw coordinates for PostGIS transformation if possible, 
        // but our current parseINP is hardcoded to transform to 3857.
        // For the server-side, we'll let it transform to 3857 and then we'll transform to 4326 in PostGIS.
        // Alternatively, we can use 'Simple' projection for parseINP to get raw coords.

        const data = parseINP(inpContent, sourceProjection || 'Simple', true); // Get raw coordinates, skip client-side transform

        // 2. Start Transaction
        const result = await db.transaction(async (tx) => {
            // A. Create Project
            const [newProject] = await tx.insert(projects).values({
                title,
                description,
                settings: {
                    ...data.settings,
                    title,
                    description,
                    patterns: data.patterns,
                    curves: data.curves,
                    controls: data.controls,
                    isGeographic: sourceProjection !== 'Simple',
                    projection: sourceProjection
                },
                ownerId: session.id
            }).returning({ id: projects.id });

            const projectId = newProject.id;

            // B. Bulk Insert Nodes
            const junctionFeatures = data.features.filter(f => ['junction', 'tank', 'reservoir'].includes(f.type));
            if (junctionFeatures.length > 0) {
                const nodeValues = junctionFeatures.map((n: any) => {
                    const coords = n.geometry as number[];

                    // Skip if coordinates are invalid
                    if (!coords || coords.length < 2 || isNaN(coords[0]) || isNaN(coords[1])) {
                        console.warn(`Skipping node ${n.id} due to invalid coordinates`, coords);
                        return null;
                    }

                    let geomSql;
                    if (sourceProjection === 'Simple' || sourceProjection === 'EPSG:Simple') {
                        geomSql = sql`ST_SetSRID(ST_MakePoint(${coords[0]}, ${coords[1]}), 4326)`;
                    } else {
                        const srid = sourceProjection.startsWith('EPSG:') ? sourceProjection.split(':')[1] : '4326';
                        geomSql = sql`ST_Transform(ST_SetSRID(ST_MakePoint(${coords[0]}, ${coords[1]}), ${sql.raw(srid)}), 4326)`;
                    }

                    return {
                        projectId,
                        id: n.id,
                        type: n.type,
                        elevation: Number.isFinite(n.properties.elevation) ? n.properties.elevation : 0,
                        baseDemand: Number.isFinite(n.properties.demand) ? n.properties.demand : 0,
                        properties: (() => {
                            const { source, target, fromNode, toNode, geometry, ...cleanProps } = n.properties || {};
                            return cleanProps;
                        })(),
                        geom: geomSql
                    };
                }).filter(v => v !== null);

                // Chunked Insert
                const CHUNK_SIZE = 500;
                for (let i = 0; i < nodeValues.length; i += CHUNK_SIZE) {
                    await tx.insert(nodes)
                        .values(nodeValues.slice(i, i + CHUNK_SIZE))
                        .onConflictDoNothing();
                }
            }

            // C. Bulk Insert Links
            const nodeCoordMap = new Map<string, number[]>();
            junctionFeatures.forEach((f: any) => {
                const coords = f.geometry as number[];
                if (coords && coords.length >= 2) nodeCoordMap.set(f.id, coords);
            });

            const linkFeatures = data.features.filter(f => ['pipe', 'pump', 'valve'].includes(f.type));
            if (linkFeatures.length > 0) {
                const linkValues = linkFeatures.map((l: any) => {
                    let coords = l.geometry as number[][];

                    // HANDLE PUMPS & VALVES (Point -> LineString)
                    if (['pump', 'valve'].includes(l.type)) {
                        const sId = l.properties.startNodeId;
                        const eId = l.properties.endNodeId;
                        const sC = nodeCoordMap.get(sId);
                        const eC = nodeCoordMap.get(eId);

                        if (sC && eC) {
                            coords = [sC, eC];
                        } else {
                            console.warn(`Skipping link ${l.id} due to missing start/end nodes: ${sId}, ${eId}`);
                            return null;
                        }
                    }

                    // Validate coordinates (Need at least 2 points for a LINESTRING)
                    if (!coords || !Array.isArray(coords) || coords.length < 2 || (Array.isArray(coords[0]) && coords.some(c => isNaN(c[0]) || isNaN(c[1])))) {
                        console.warn(`Skipping link ${l.id} due to invalid/insufficient points`, coords);
                        return null;
                    }

                    const wktPoints = coords.map((c: number[]) => `${c[0]} ${c[1]}`).join(',');
                    const wkt = `LINESTRING(${wktPoints})`;

                    let geomSql;
                    if (sourceProjection === 'Simple' || sourceProjection === 'EPSG:Simple') {
                        geomSql = sql`ST_GeomFromText(${wkt}, 4326)`;
                    } else {
                        const srid = sourceProjection.startsWith('EPSG:') ? sourceProjection.split(':')[1] : '4326';
                        geomSql = sql`ST_Transform(ST_GeomFromText(${wkt}, ${sql.raw(srid)}), 4326)`;
                    }

                    return {
                        projectId,
                        id: l.id,
                        type: l.type,
                        sourceNodeId: l.properties.startNodeId,
                        targetNodeId: l.properties.endNodeId,
                        length: Number.isFinite(l.properties.length) ? l.properties.length : 0,
                        diameter: Number.isFinite(l.properties.diameter) ? l.properties.diameter : 0,
                        roughness: Number.isFinite(l.properties.roughness) ? l.properties.roughness : 100,
                        properties: (() => {
                            const { source, target, fromNode, toNode, geometry, ...cleanProps } = l.properties || {};
                            return cleanProps;
                        })(),
                        geom: geomSql
                    };
                }).filter(v => v !== null);

                // Chunked Insert
                const CHUNK_SIZE = 500;
                for (let i = 0; i < linkValues.length; i += CHUNK_SIZE) {
                    await tx.insert(links)
                        .values(linkValues.slice(i, i + CHUNK_SIZE))
                        .onConflictDoNothing();
                }
            }

            return projectId;
        });

        return NextResponse.json({ success: true, id: result });

    } catch (error) {
        console.error("Server-side import failed:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed" }, { status: 500 });
    }
}
