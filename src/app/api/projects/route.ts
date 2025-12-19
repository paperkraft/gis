import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { desc } from 'drizzle-orm';

// GET LIST
export async function GET() {
    try {
        // We only fetch metadata, not the heavy nodes/links
        const allProjects = await db.select({
            id: projects.id,
            title: projects.title,
            updatedAt: projects.updatedAt,
            nodeCount: projects.nodeCount,
            linkCount: projects.linkCount
        })
            .from(projects)
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
        const { title, data, nodeCount, linkCount } = body;

        // Insert metadata only. 
        // NOTE: For 'Create from File', the frontend usually calls PUT immediately after 
        // to save the nodes/links. If you want to do it here, you'd replicate the PUT logic.
        const [newProject] = await db.insert(projects).values({
            title,
            settings: data?.settings || {},
            patterns: data?.patterns || [],
            curves: data?.curves || [],
            controls: data?.controls || [],
            nodeCount: nodeCount || 0,
            linkCount: linkCount || 0
        }).returning({ id: projects.id });

        return NextResponse.json({ success: true, id: newProject.id });
    } catch (error) {
        return NextResponse.json({ error: "Create failed" }, { status: 500 });
    }
}