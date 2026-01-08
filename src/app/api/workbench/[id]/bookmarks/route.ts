import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const projectId = (await params).id;

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
    try {
        const projectId = (await params).id;

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