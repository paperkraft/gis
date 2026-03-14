import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks, projects, projectShares } from "@/db/schema";
import { eq, and, or, exists } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ bookmarkId: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { bookmarkId } = await params;

        if (!bookmarkId) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        // Check Access (Bookmark must belong to a project the user has access to)
        const bookmark = await db.query.bookmarks.findFirst({
            where: eq(bookmarks.id, bookmarkId),
            with: {
                // We'd ideally use a join or check if project owner/shared
            }
        });
        
        // Simpler check: find bookmark and project in one query or sequential
        const data = await db.select({
            projectId: bookmarks.projectId
        })
        .from(bookmarks)
        .where(eq(bookmarks.id, bookmarkId));

        if (data.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
        
        const projectId = data[0].projectId;
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

        await db.delete(bookmarks).where(eq(bookmarks.id, bookmarkId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: "Failed to delete bookmark" }, { status: 500 });
    }
}