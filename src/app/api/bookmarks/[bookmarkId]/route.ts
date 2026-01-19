import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ bookmarkId: string }> }) {
    try {
        const { bookmarkId } = await params;

        if (!bookmarkId) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        await db.delete(bookmarks).where(eq(bookmarks.id, bookmarkId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: "Failed to delete bookmark" }, { status: 500 });
    }
}