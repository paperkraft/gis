import { db } from "@/db";
import { projects } from "@/db/schema";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { COMPONENT_TYPES } from "@/constants/networkComponents";

export const maxDuration = 60;

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const payload = await req.json();
        const { title, description, layers, settings, projection } = payload;

        const sourceEpsg = Number(projection) || 4326;
        const utmSrid = Number(settings?.utmSrid) || (sourceEpsg !== 4326 ? sourceEpsg : 3857);
        const tolerance = Number(settings?.tolerance) || 5;
        const maxPipeLength = Number(settings?.maxPipeLength) || 150;

        const result = await db.transaction(async (tx) => {
            // 1. Create Project
            const projString = projection ? `EPSG:${projection}` : 'EPSG:4326';
            const [newProject] = await tx.insert(projects).values({
                title,
                description,
                settings: { 
                    ...settings, 
                    title, 
                    description,
                    projection: projString,
                    isGeographic: projString !== 'Simple'
                },
                ownerId: session.id
            }).returning({ id: projects.id });

            const projectId = newProject.id;

            // 2. Create Staging Tables (Temporary for this transaction)
            await tx.execute(sql.raw(`
                CREATE TEMP TABLE raw_pipes (id SERIAL, project_id UUID, geom GEOMETRY, properties JSONB);
                CREATE TEMP TABLE raw_junctions (id SERIAL, project_id UUID, geom GEOMETRY, properties JSONB);
                CREATE TEMP TABLE raw_tanks (id SERIAL, project_id UUID, geom GEOMETRY, properties JSONB);
                CREATE TEMP TABLE raw_reservoirs (id SERIAL, project_id UUID, geom GEOMETRY, properties JSONB);
                CREATE TEMP TABLE raw_pumps (id SERIAL, project_id UUID, geom GEOMETRY, properties JSONB);
                CREATE TEMP TABLE raw_valves (id SERIAL, project_id UUID, geom GEOMETRY, properties JSONB);
            `));

            // 3. Load Layers into Staging
            const layerMapping = [
                { key: 'pipe', table: 'raw_pipes' },
                { key: 'junction', table: 'raw_junctions' },
                { key: 'tank', table: 'raw_tanks' },
                { key: 'reservoir', table: 'raw_reservoirs' },
                { key: 'pump', table: 'raw_pumps' },
                { key: 'valve', table: 'raw_valves' }
            ];

            for (const { key, table } of layerMapping) {
                const layer = layers[key];
                if (layer && layer.features && layer.features.length > 0) {
                    const featuresStr = JSON.stringify(layer.features);
                    await tx.execute(sql`
                        INSERT INTO ${sql.raw(table)} (project_id, geom, properties)
                        SELECT 
                            ${projectId}::uuid,
                            ST_Transform(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON((f->'geometry')::text), ${sourceEpsg})), 4326),
                            (f->'properties')::jsonb
                        FROM (SELECT jsonb_array_elements(${featuresStr}::jsonb) AS f) AS feature_data
                        WHERE f->'geometry' IS NOT NULL;
                    `);
                }
            }

            // 4. Trigger the new build_from_layers procedure
            await tx.execute(sql`
                SELECT build_from_layers(
                    ${projectId}::uuid, 
                    ${tolerance}::double precision, 
                    ${maxPipeLength}::double precision, 
                    ${utmSrid}::integer,
                    ${JSON.stringify(COMPONENT_TYPES.junction.defaultProperties)}::jsonb,
                    ${JSON.stringify(COMPONENT_TYPES.pipe.defaultProperties)}::jsonb
                );
            `);

            return { id: projectId };
        });

        return NextResponse.json({
            id: result.id,
            message: `Project created and built from layers successfully.`
        });

    } catch (error: any) {
        console.error("Multi-Layer Build Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
