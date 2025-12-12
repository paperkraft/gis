import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';

interface Params {
    params: { id: string };
}

// GET /api/projects/:id - Load full project data
export async function GET(req: NextRequest, { params }: Params) {
    try {
        const project = await prisma.project.findUnique({
            where: { id: params.id },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json({
            ...project,
            updatedAt: project.updatedAt.toISOString(),
            createdAt: project.createdAt.toISOString(),
        });
    } catch (error) {
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}

// PUT /api/projects/:id - Update existing project
export async function PUT(req: NextRequest, { params }: Params) {
    try {
        const body = await req.json();
        const { title, data, nodeCount, linkCount } = body;

        const project = await prisma.project.update({
            where: { id: params.id },
            data: {
                title,
                data,
                nodeCount,
                linkCount,
            },
        });

        return NextResponse.json({ success: true, id: project.id });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
    }
}

// DELETE /api/projects/:id - Delete project
export async function DELETE(req: NextRequest, { params }: Params) {
    try {
        await prisma.project.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
    }
}