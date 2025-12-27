import { Project, Workspace } from 'epanet-js';
import { NextResponse } from 'next/server';

import { buildINP } from '@/lib/epanet/inpBuilder';

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


export async function POST(request: Request) {
    const ws = new Workspace();
    const model = new Project(ws);

    try {
        const body = await request.json();
        const { nodes, links, options } = body;

        // 1. Setup Files
        const inpContent = buildINP(nodes, links, options);

        const inputFileName = "network.inp";
        const reportFileName = "report.rpt";
        const outputFileName = "out.bin";

        ws.writeFile(inputFileName, inpContent);

        // 2. Open Project
        await model.open(inputFileName, reportFileName, outputFileName);

        const nodeCount = await model.getCount(EN_NODECOUNT);
        const linkCount = await model.getCount(EN_LINKCOUNT);

        // 3. Initialize Hydraulic Engine
        await model.openH();
        await model.initH(0);

        const timestamps: number[] = [];
        const snapshots: any[] = [];
        let tStep = Infinity;

        // 4. Run Loop
        do {
            const t = await model.runH();

            const nodeResults: Record<string, any> = {};
            const linkResults: Record<string, any> = {};

            // Extract Node Results
            for (let i = 1; i <= nodeCount; i++) {
                const nodeId = await model.getNodeId(i);
                nodeResults[nodeId] = {
                    id: nodeId,
                    pressure: parseFloat((await model.getNodeValue(i, EN_PRESSURE)).toFixed(2)),
                    head: parseFloat((await model.getNodeValue(i, EN_HEAD)).toFixed(2)),
                    demand: parseFloat((await model.getNodeValue(i, EN_DEMAND)).toFixed(2)),
                };
            }

            // Extract Link Results
            for (let i = 1; i <= linkCount; i++) {
                const linkId = await model.getLinkId(i);
                const status = await model.getLinkValue(i, EN_STATUS);
                linkResults[linkId] = {
                    id: linkId,
                    flow: parseFloat((await model.getLinkValue(i, EN_FLOW)).toFixed(2)),
                    velocity: parseFloat((await model.getLinkValue(i, EN_VELOCITY)).toFixed(2)),
                    headloss: parseFloat((await model.getLinkValue(i, EN_HEADLOSS)).toFixed(4)),
                    status: status >= 1 ? "Open" : "Closed",
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

        // 5. Cleanup & Return
        await model.closeH();
        await model.close();

        return NextResponse.json({
            success: true,
            data: {
                timestamps,
                snapshots,
                summary: {
                    nodeCount,
                    linkCount,
                    duration: timestamps[timestamps.length - 1]
                }
            }
        });

    } catch (error: any) {
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