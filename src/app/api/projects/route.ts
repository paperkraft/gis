import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { links, nodes, projects } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

// GET LIST
export async function GET() {
    try {
        // We only fetch metadata, not the heavy nodes/links
        const allProjects = await db.select({
            id: projects.id,
            title: projects.title,
            description: projects.description,
            updatedAt: projects.updatedAt,

            // Subquery to count nodes for this specific project
            nodeCount: sql<number>`count(distinct ${nodes.id})`.mapWith(Number),
            linkCount: sql<number>`count(distinct ${links.id})`.mapWith(Number),
        })
            .from(projects)
            .leftJoin(nodes, eq(projects.id, nodes.projectId))
            .leftJoin(links, eq(projects.id, links.projectId))
            .groupBy(projects.id)
            .orderBy(desc(projects.updatedAt));

        return NextResponse.json(allProjects);
    } catch (error) {
        return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }
}

// CREATE NEW
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, description, settings } = body;

        // Insert metadata only. 
        const [newProject] = await db.insert(projects).values({ title, description, settings }).returning({ id: projects.id });
        return NextResponse.json({ success: true, id: newProject.id });
    } catch (error) {
        return NextResponse.json({ error: "Create failed" }, { status: 500 });
    }
}