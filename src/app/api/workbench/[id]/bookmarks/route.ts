import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks, projects, projectShares } from "@/db/schema";
import { eq, desc, and, or, exists } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const projectId = (await params).id;

        // Check Access
        const project = await db.query.projects.findFirst({
            where: and(
                eq(projects.id, projectId),
                or(
                    eq(projects.ownerId, session.id),
                    exists(
                        db.select()
                            .from(projectShares)
                            .where(
                                and(
                                    eq(projectShares.projectId, projectId),
                                    eq(projectShares.userId, session.id)
                                )
                            )
                    )
                )
            )
        });

        if (!project) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const data = await db.select()
            .from(bookmarks)
            .where(eq(bookmarks.projectId, projectId))
            .orderBy(desc(bookmarks.createdAt));

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const projectId = (await params).id;

        // Check Access
        const project = await db.query.projects.findFirst({
            where: and(
                eq(projects.id, projectId),
                or(
                    eq(projects.ownerId, session.id),
                    exists(
                        db.select()
                            .from(projectShares)
                            .where(
                                and(
                                    eq(projectShares.projectId, projectId),
                                    eq(projectShares.userId, session.id)
                                )
                            )
                    )
                )
            )
        });

        if (!project) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json();
        const { name, center, zoom } = body;

        const [newBookmark] = await db.insert(bookmarks).values({
            projectId: projectId,
            name,
            center,
            zoom,
        }).returning();

        return NextResponse.json(newBookmark);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create bookmark" }, { status: 500 });
    }
}