import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { links, nodes, projects, projectShares } from '@/db/schema';
import { desc, eq, or, sql, exists, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

// GET LIST
export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Fetch projects owned by user or shared with user
        const allProjects = await db.select({
            id: projects.id,
            title: projects.title,
            description: projects.description,
            updatedAt: projects.updatedAt,
            ownerId: projects.ownerId,

            // Optimized: Use subqueries instead of leftJoins to avoid massive Cartesian products
            // Qualification (${projects}.${projects.id}) is necessary to avoid collision with node/link "id" columns
            nodeCount: sql<number>`(SELECT count(*) FROM ${nodes} WHERE ${nodes.projectId} = ${projects}.${projects.id})`.mapWith(Number),
            linkCount: sql<number>`(SELECT count(*) FROM ${links} WHERE ${links.projectId} = ${projects}.${projects.id})`.mapWith(Number),
        })
            .from(projects)
            .where(
                or(
                    eq(projects.ownerId, session.id),
                    exists(
                        db.select()
                            .from(projectShares)
                            .where(
                                and(
                                    eq(projectShares.projectId, projects.id),
                                    eq(projectShares.userId, session.id)
                                )
                            )
                    )
                )
            )
            .orderBy(desc(projects.updatedAt));

        return NextResponse.json(allProjects);
    } catch (error) {
        console.error("Fetch failed", error);
        return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }
}

// CREATE NEW
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, description, settings } = body;

        // Insert metadata only. 
        const [newProject] = await db.insert(projects).values({ 
            title, 
            description, 
            settings,
            ownerId: session.id 
        }).returning({ id: projects.id });
        
        return NextResponse.json({ success: true, id: newProject.id });
    } catch (error) {
        console.error("Create failed", error);
        return NextResponse.json({ error: "Create failed" }, { status: 500 });
    }
}