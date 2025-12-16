import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, nodes, links } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Project, Workspace } from "epanet-js";
import { buildINPFromDB } from "@/lib/export/inpGenerator";

// EPANET Constants
const EN_NODECOUNT = 0;
const EN_LINKCOUNT = 2;

const EN_DEMAND = 9;
const EN_HEAD = 10;
const EN_PRESSURE = 11;

const EN_FLOW = 8;
const EN_VELOCITY = 9;
const EN_HEADLOSS = 10;
const EN_STATUS = 11;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const ws = new Workspace();
    const model = new Project(ws);

    try {
        const { id } = await params;

        // 1. Fetch Project Data from DB
        const projectData = await db.query.projects.findFirst({
            where: eq(projects.id, id)
        });

        if (!projectData) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        // Fetch Nodes (with coordinates for INP)
        const dbNodes = await db.select({
            id: nodes.id,
            type: nodes.type,
            elevation: nodes.elevation,
            baseDemand: nodes.baseDemand,
            properties: nodes.properties,
            x: sql<number>`ST_X(geom::geometry)`,
            y: sql<number>`ST_Y(geom::geometry)`,
        }).from(nodes).where(eq(nodes.projectId, id));

        // Fetch Links
        const dbLinks = await db.select().from(links).where(eq(links.projectId, id));

        if (dbNodes.length === 0) {
            return NextResponse.json({ error: "Network is empty" }, { status: 400 });
        }

        // 2. Generate INP File
        const inpContent = buildINPFromDB(projectData as any, dbNodes, dbLinks);

        console.log(`🚀 Simulating Project: ${projectData.title} (${dbNodes.length} nodes, ${dbLinks.length} links)`);

        // 3. Setup Virtual Files
        const inputFileName = "network.inp";
        const reportFileName = "report.rpt";
        const outputFileName = "out.bin";
        ws.writeFile(inputFileName, inpContent);

        // 4. Run Simulation
        await model.open(inputFileName, reportFileName, outputFileName);

        const enNodeCount = await model.getCount(EN_NODECOUNT);
        const enLinkCount = await model.getCount(EN_LINKCOUNT);
        console.log(`📊 EPANET Loaded: ${enNodeCount} Nodes, ${enLinkCount} Links`);

        await model.openH();
        await model.initH(0);

        const timestamps: number[] = [];
        const snapshots: any[] = [];
        let tStep = Infinity;

        // 5. Simulation Loop
        do {
            const t = await model.runH();

            const nodeResults: Record<string, any> = {};
            const linkResults: Record<string, any> = {};

            // Extract Node Results
            for (let i = 1; i <= enNodeCount; i++) {
                const nodeId = await model.getNodeId(i);
                nodeResults[nodeId] = {
                    id: nodeId,
                    pressure: parseFloat((await model.getNodeValue(i, EN_PRESSURE)).toFixed(2)),
                    demand: parseFloat((await model.getNodeValue(i, EN_DEMAND)).toFixed(2)),
                    head: parseFloat((await model.getNodeValue(i, EN_HEAD)).toFixed(2)),
                };
            }

            // Extract Link Results
            for (let i = 1; i <= enLinkCount; i++) {
                const linkId = await model.getLinkId(i);
                const statusVal = await model.getLinkValue(i, EN_STATUS);
                linkResults[linkId] = {
                    id: linkId,
                    flow: parseFloat((await model.getLinkValue(i, EN_FLOW)).toFixed(2)),
                    velocity: parseFloat((await model.getLinkValue(i, EN_VELOCITY)).toFixed(2)),
                    headloss: parseFloat((await model.getLinkValue(i, EN_HEADLOSS)).toFixed(4)),
                    status: statusVal >= 1 ? "Open" : "Closed",
                };
            }

            timestamps.push(t);
            snapshots.push({
                nodes: nodeResults,
                links: linkResults,
                timeStep: t,
                timestamp: Date.now()
            });

            tStep = await model.nextH();

        } while (tStep > 0);

        await model.closeH();
        await model.close();

        return NextResponse.json({
            success: true,
            timestamps,
            snapshots,
            generatedAt: Date.now()
        });

    } catch (error) {
        console.error("Simulation Failed:", error);

        // Try to read report for more info
        let details = String(error);
        try {
            const report = ws.readFile("report.rpt");
            if (report) details += "\nEPANET Log:\n" + report;
        } catch (e) { }

        return NextResponse.json({ error: "Simulation failed", details }, { status: 500 });
    }
}