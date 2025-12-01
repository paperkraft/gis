import { NextRequest, NextResponse } from "next/server";
import { Project, Workspace } from "epanet-js";

// EPANET Node Parameter Codes
const EN_DEMAND = 9;
const EN_HEAD = 10;
const EN_PRESSURE = 11;

// EPANET Link Parameter Codes
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
            return NextResponse.json(
                { error: "No INP data provided" },
                { status: 400 }
            );
        }

        // 1. Setup
        const inputFileName = "network.inp";
        const reportFileName = "report.rpt";
        const outputFileName = "out.bin";

        ws.writeFile(inputFileName, inp);

        // 2. Run Simulation
        await model.open(inputFileName, reportFileName, outputFileName);
        await model.openH();
        await model.initH(0);

        let t = 0;
        do {
            t = await model.runH();
        } while (t > 0);

        // 3. Extract Results
        const nodeResults: Record<string, any> = {};
        const linkResults: Record<string, any> = {};

        // --- Nodes ---
        const nodeCount = await model.getCount(1); // 1 = CountNodes
        for (let i = 1; i <= nodeCount; i++) {
            const id = await model.getNodeId(i);

            // FIX: Use correct constants (9, 10, 11)
            const demand = await model.getNodeValue(i, EN_DEMAND);
            const head = await model.getNodeValue(i, EN_HEAD);
            const pressure = await model.getNodeValue(i, EN_PRESSURE);

            nodeResults[id] = {
                id,
                pressure: parseFloat(pressure.toFixed(2)),
                demand: parseFloat(demand.toFixed(2)),
                head: parseFloat(head.toFixed(2)),
            };
        }

        // --- Links ---
        const linkCount = await model.getCount(2); // 2 = CountLinks
        for (let i = 1; i <= linkCount; i++) {
            const id = await model.getLinkId(i);

            // FIX: Use correct constants
            const flow = await model.getLinkValue(i, EN_FLOW);
            const velocity = await model.getLinkValue(i, EN_VELOCITY);
            const headloss = await model.getLinkValue(i, EN_HEADLOSS);
            const statusVal = await model.getLinkValue(i, EN_STATUS);

            linkResults[id] = {
                id,
                flow: parseFloat(flow.toFixed(2)),
                velocity: parseFloat(velocity.toFixed(2)),
                headloss: parseFloat(headloss.toFixed(4)),
                status: statusVal >= 1 ? "Open" : "Closed",
            };
        }

        await model.closeH();
        await model.close();

        return NextResponse.json({
            nodes: nodeResults,
            links: linkResults,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error("Simulation Server Error:", error);
        return NextResponse.json(
            { error: "Simulation failed", details: String(error) },
            { status: 500 }
        );
    }
}