import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search");

        let query;

        if (search) {
            // If the user types in the dropdown, search both the SRID number and the Auth Name
            const searchTerm = `%${search}%`;
            query = sql`
                SELECT auth_name, srid 
                FROM spatial_ref_sys 
                WHERE srid::text ILIKE ${searchTerm} OR auth_name ILIKE ${searchTerm}
                ORDER BY srid ASC
                LIMIT 50;
            `;
        } else {
            // Default fallback: If they just open the dropdown, show common EPSG codes
            // We limit to 100 so it doesn't crash the browser
            query = sql`
                SELECT auth_name, srid 
                FROM spatial_ref_sys 
                WHERE auth_name = 'EPSG'
                ORDER BY srid ASC
                LIMIT 100;
            `;
        }

        const result = await db.execute(query);

        // Drizzle returns the raw rows in the `rows` property
        return NextResponse.json({ projections: result.rows }, { status: 200 });

    } catch (error: any) {
        console.error("Projections Fetch Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}