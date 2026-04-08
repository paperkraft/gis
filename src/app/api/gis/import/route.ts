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
        const formData = await req.formData();
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const settings = JSON.parse((formData.get("settings") as string) || "{}");
        const projection = formData.get("projection") as string;
        const mandatorySetupStatusesRaw = formData.get("mandatorySetupStatuses") as string;
        const mandatorySetupStatuses = mandatorySetupStatusesRaw ? JSON.parse(mandatorySetupStatusesRaw) : undefined;
        
        const file = formData.get("file") as File;
        const fileType = formData.get("fileType") as string;
        let geojson: any;

        if (file) {
            const buffer = await file.arrayBuffer();
            if (fileType === 'zip' || file.name.toLowerCase().endsWith('.zip')) {
                const shpjs = (await import('shpjs')).default;
                geojson = await shpjs(buffer);
                if (Array.isArray(geojson)) geojson = geojson[0];
            } else if (fileType === 'geojson' || file.name.toLowerCase().endsWith('.json') || file.name.toLowerCase().endsWith('.geojson')) {
                const text = new TextDecoder().decode(buffer);
                geojson = JSON.parse(text);
            }
        }

        // 1. Setup UI Variables & Defaults
        // Matches the parameters expected by your stored procedure
        const sourceEpsg = Number(projection) || 4326;
        // Use sourceEpsg as utmSrid if it's a projected coordinate system (not 4326)
        // Otherwise default to 3857 for topological operations
        const utmSrid = Number(settings?.utmSrid) || (sourceEpsg !== 4326 ? sourceEpsg : 3857);
        const tolerance = Number(settings?.tolerance) || 5;
        const maxPipeLength = Number(settings?.maxPipeLength) || 150;
        
        // --- COMPONENT DEFAULTS ---
        // 1. Nodes (Junctions)
        const nodeDefaults = (() => {
            const { source, target, fromNode, toNode, ...clean } = {
                ...(COMPONENT_TYPES.junction?.defaultProperties || {}),
                ...(settings?.componentDefaults?.junction || {})
            };
            return clean;
        })();
        
        // 2. Links (Pipes)
        const linkDefaults = (() => {
            const { source, target, fromNode, toNode, ...clean } = {
                ...(COMPONENT_TYPES.pipe?.defaultProperties || {}),
                ...(settings?.componentDefaults?.pipe || {}),
                // Override with specific settings from modal if they exist
                ...(settings?.defaultDiameter ? { diameter: Number(settings.defaultDiameter) } : {}),
                ...(settings?.defaultRoughness ? { roughness: Number(settings.defaultRoughness) } : {})
            };
            return clean;
        })();

        const validFeatures = geojson?.features?.filter((f: any) =>
            f.geometry && (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString')
        );

        if (!validFeatures || validFeatures.length === 0) {
            return NextResponse.json({ error: "No valid LineStrings found in the uploaded file." }, { status: 400 });
        }

        // 2. Execute the Database Transaction
        const result = await db.transaction(async (tx) => {
            // A. Create Project Record
            const projString = projection ? (String(projection).startsWith('EPSG:') ? projection : `EPSG:${projection}`) : 'EPSG:4326';
            const [newProject] = await tx.insert(projects).values({
                title,
                description,
                settings: { 
                    ...settings, 
                    title, 
                    description,
                    projection: projString,
                    isGeographic: projString !== 'Simple' && projString !== 'EPSG:Simple',
                    mandatorySetupStatuses: mandatorySetupStatuses
                },
                ownerId: session.id
            }).returning({ id: projects.id });

            const projectId = newProject.id;

            // B. Ensure the global `raw_lines` staging table exists 
            // (Your stored procedure expects this table to be present)
            await tx.execute(sql.raw(`
                CREATE TABLE IF NOT EXISTS raw_lines (
                    id SERIAL PRIMARY KEY,
                    project_id UUID,
                    geom GEOMETRY(LineString, 4326),
                    status_input VARCHAR DEFAULT 'OPEN'
                );
            `));

            const featuresStr = JSON.stringify(validFeatures);

            // C. Insert parsed LineStrings into the staging table
            await tx.execute(sql`
                WITH feature_data AS (
                    SELECT jsonb_array_elements(${featuresStr}::jsonb) AS f
                ),
                raw_parsed AS (
                    SELECT 
                        -- ST_Dump explodes MultiLineStrings into individual LineStrings safely
                        (ST_Dump(ST_Force2D(ST_GeomFromGeoJSON((f->'geometry')::text)))).geom AS geom,
                        COALESCE((f->'properties'->>'status_input'), 'OPEN') AS status_input
                    FROM feature_data
                    WHERE f->'geometry' IS NOT NULL
                )
                INSERT INTO raw_lines (project_id, geom, status_input)
                SELECT 
                    ${projectId}::uuid,
                    ST_Transform(ST_SetSRID(geom, ${sourceEpsg}), 4326),
                    status_input
                FROM raw_parsed 
                -- Ensure we only insert actual LineStrings (ignoring accidental points/polygons)
                WHERE ST_GeometryType(geom) = 'ST_LineString' 
                AND ST_Length(ST_Transform(ST_SetSRID(geom, ${sourceEpsg}), 4326)::geography) > 0.1;
            `);

            // D. TRIGGER THE MASTERCLASS STORED PROCEDURE
            // This runs your entire C-compiled topological pipeline in milliseconds
            await tx.execute(sql`
                SELECT build_from_raw_lines(
                    ${projectId}::uuid, 
                    ${tolerance}::double precision, 
                    ${maxPipeLength}::double precision, 
                    ${utmSrid}::integer,
                    ${JSON.stringify(nodeDefaults)}::jsonb,
                    ${JSON.stringify(linkDefaults)}::jsonb
                );
            `);

            // E. Clean up the staging table
            await tx.execute(sql`
                DELETE FROM raw_lines WHERE project_id = ${projectId}::uuid;
            `);

            return { id: projectId };
        });

        return NextResponse.json({
            id: result.id,
            message: `Network seamlessly imported and topologically coupled.`
        });

    } catch (error: any) {
        console.error("GIS Import Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}