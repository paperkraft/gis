import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/projects - List all projects (lightweight metadata only)
export async function GET() {
    try {
        const projects = await prisma.project.findMany({
            select: {
                id: true,
                title: true,
                updatedAt: true,
                nodeCount: true,
                linkCount: true,
                // We do NOT fetch the heavy 'data' field here for performance
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        // Map dates to ISO strings for frontend consistency
        const sanitized = projects.map((p: any) => ({
            ...p,
            updatedAt: p.updatedAt.toISOString(), // Ensure serializable dates
            lastModified: p.updatedAt.toISOString() // Alias for frontend compatibility
        }));

        return NextResponse.json(sanitized);
    } catch (error) {
        console.error("Database Error:", error);
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
    }
}

// POST /api/projects - Create a new project
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, data, nodeCount, linkCount } = body;

        const project = await prisma.project.create({
            data: {
                title,
                data,
                nodeCount: nodeCount || 0,
                linkCount: linkCount || 0,
            }
        });

        return NextResponse.json({ success: true, id: project.id });
    } catch (error) {
        console.error("Database Error:", error);
        return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
    }
}