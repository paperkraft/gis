import { Project, Workspace } from "epanet-js";

export interface WorkerInput {
    inpData: string;
}

export interface WorkerOutput {
    success: boolean;
    data?: any; // SimulationHistory
    error?: string;
    warnings?: string[];
    report?: string;
}

self.onmessage = async (event: MessageEvent<WorkerInput>) => {
    const { inpData } = event.data;

    try {

        // 1. Initialize EPANET (WASM)
        const ws = new Workspace();
        await ws.loadModule();
        const model = new Project(ws);

        // 2. Setup Files
        const inputFileName = "net.inp";
        const reportFileName = "report.rpt";
        const outputFileName = "out.bin";

        ws.writeFile(inputFileName, inpData);

        // 3. Open Project
        model.open(inputFileName, reportFileName, outputFileName);

        // 4. Metadata Extraction
        const nodeCount = model.getCount(1); // 1 = Nodes
        const linkCount = model.getCount(2); // 2 = Links

        const nodeIds: string[] = [];
        const linkIds: string[] = [];

        for (let i = 1; i <= nodeCount; i++) {
            nodeIds.push(model.getNodeId(i));
        }
        for (let i = 1; i <= linkCount; i++) {
            linkIds.push(model.getLinkId(i));
        }

        // 5. Run Hydraulic Simulation (Step-by-Step)
        const timestamps: number[] = [];
        const snapshots: any[] = [];

        let tStep = 1;
        let currentTime = 0;

        // Initialize Hydraulic Analysis
        model.openH();

        while (tStep > 0) {
            // A. Run single time step
            currentTime = model.runH();
            timestamps.push(currentTime);

            // B. Extract Node Results
            const nodeResults: Record<string, any> = {};
            for (let i = 1; i <= nodeCount; i++) {
                const id = nodeIds[i - 1];
                // 11 = Pressure, 10 = Demand, 8 = Head
                nodeResults[id] = {
                    pressure: model.getNodeValue(i, 11),
                    demand: model.getNodeValue(i, 10),
                    head: model.getNodeValue(i, 8)
                };
            }

            // C. Extract Link Results
            const linkResults: Record<string, any> = {};
            for (let i = 1; i <= linkCount; i++) {
                const id = linkIds[i - 1];
                // 8 = Flow, 9 = Velocity, 10 = Headloss, 11 = Status
                linkResults[id] = {
                    flow: model.getLinkValue(i, 8),
                    velocity: model.getLinkValue(i, 9),
                    headloss: model.getLinkValue(i, 10),
                    status: model.getLinkValue(i, 11) === 1 ? 'Open' : 'Closed'
                };
            }

            // D. Save Snapshot
            snapshots.push({
                time: currentTime,
                nodes: nodeResults,
                links: linkResults
            });

            // E. Advance to next step
            tStep = model.nextH();
        }

        // 6. Cleanup
        model.closeH();
        model.close();

        // --- 7. CAPTURE WARNINGS & ERRORS ---
        // Read the report file from virtual memory
        const reportContent = ws.readFile(reportFileName);

        // Parse the report for specific keywords
        const warnings: string[] = [];
        const lines = reportContent.split('\n');

        lines.forEach(line => {
            // EPANET typical warning phrases
            if (line.includes("WARNING:") ||
                line.includes("System unbalanced") ||
                line.includes("Negative pressure")) {
                warnings.push(line.trim());
            }
        });

        // 8. Send Success
        const history = {
            timestamps,
            snapshots,
            summary: { nodeCount, linkCount, duration: currentTime }
        };

        self.postMessage({
            success: true,
            data: history,
            warnings: warnings.length > 0 ? warnings : undefined,
            report: reportContent
        });

    } catch (err: any) {
        console.error("Worker Error:", err);
        self.postMessage({ success: false, error: err.message || "Simulation Failed" });
    }
};