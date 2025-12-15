import { NextRequest, NextResponse } from "next/server";
import { Project, Workspace } from "epanet-js";

// EPANET Constants
const EN_NODECOUNT = 0;
const EN_TANKCOUNT = 1;
const EN_LINKCOUNT = 2;

// EPANET Parameter Codes
const EN_DEMAND = 9;
const EN_HEAD = 10;
const EN_PRESSURE = 11;
const EN_FLOW = 8;
const EN_VELOCITY = 9;
const EN_HEADLOSS = 10;
const EN_STATUS = 11;

export async function POST(req: NextRequest) {
    const ws = new Workspace();
    const model = new Project(ws);

    try {
        const { inp } = await req.json();

        if (!inp) {
            return NextResponse.json({ error: "No INP data" }, { status: 400 });
        }

        // 1. Setup Virtual File System
        const inputFileName = "network.inp";
        const reportFileName = "report.rpt";
        const outputFileName = "out.bin";
        ws.writeFile(inputFileName, inp);

        // 2. Initialize Simulation
        await model.open(inputFileName, reportFileName, outputFileName);

        const nodeCount = await model.getCount(EN_NODECOUNT);
        const linkCount = await model.getCount(EN_LINKCOUNT);

        if (nodeCount === 0 && linkCount === 0) {
            throw new Error("EPANET failed to load any network elements. Check INP format.");
        }

        await model.openH();
        await model.initH(0);

        // 3. Run Step-by-Step Loop
        const timestamps: number[] = [];
        const snapshots: any[] = [];

        let tStep = Infinity;

        do {
            // A. Solve Hydraulics for current time
            const t = await model.runH();

            // B. Extract Results
            const nodeResults: Record<string, any> = {};
            const linkResults: Record<string, any> = {};

            // Nodes
            for (let i = 1; i <= nodeCount; i++) {
                const id = await model.getNodeId(i);
                nodeResults[id] = {
                    id,
                    pressure: parseFloat((await model.getNodeValue(i, EN_PRESSURE)).toFixed(2)),
                    demand: parseFloat((await model.getNodeValue(i, EN_DEMAND)).toFixed(2)),
                    head: parseFloat((await model.getNodeValue(i, EN_HEAD)).toFixed(2)),
                };
            }

            // Links
            for (let i = 1; i <= linkCount; i++) {
                const id = await model.getLinkId(i);
                const statusVal = await model.getLinkValue(i, EN_STATUS);
                linkResults[id] = {
                    id,
                    flow: parseFloat((await model.getLinkValue(i, EN_FLOW)).toFixed(2)),
                    velocity: parseFloat((await model.getLinkValue(i, EN_VELOCITY)).toFixed(2)),
                    headloss: parseFloat((await model.getLinkValue(i, EN_HEADLOSS)).toFixed(4)),
                    status: statusVal >= 1 ? "Open" : "Closed",
                };
            }

            // Store Snapshot
            timestamps.push(t);
            snapshots.push({
                nodes: nodeResults,
                links: linkResults,
                timeStep: t,
                timestamp: Date.now()
            });

            // C. Advance Time
            tStep = await model.nextH();

        } while (tStep > 0);

        // 4. Cleanup
        await model.closeH();
        await model.close();

        // 5. Response
        return NextResponse.json({
            timestamps,
            snapshots,
            generatedAt: Date.now()
        });

    } catch (error) {
        let details = String(error);
        try {
            const report = ws.readFile("report.rpt");
            if (report) details += "\nEPANET Report:\n" + report;
        } catch (e) { }

        console.error("Simulation Failed:", details);
        return NextResponse.json(
            { error: "Simulation failed", details },
            { status: 500 }
        );
    }
}
