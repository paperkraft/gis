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

// Epanet Constants
const EN_NODECOUNT = 0;
const EN_LINKCOUNT = 2;
// Nodes
const EN_DEMAND = 9;
const EN_HEAD = 10;
const EN_PRESSURE = 11;
// Links
const EN_FLOW = 8;
const EN_VELOCITY = 9;
const EN_HEADLOSS = 10;
const EN_STATUS = 11;

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
        const nodeCount = model.getCount(EN_NODECOUNT); // 0 = Nodes (Total), 1 = Tanks/Res
        const linkCount = model.getCount(EN_LINKCOUNT); // 2 = Links

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
        model.initH(0); // 0 = Default initialization

        while (tStep > 0) {
            // A. Run single time step
            currentTime = model.runH();
            timestamps.push(currentTime);

            // B. Extract Node Results
            const nodeResults: Record<string, any> = {};
            for (let i = 1; i <= nodeCount; i++) {
                const id = nodeIds[i - 1];
                // Indices for EN_DEMAND=9, EN_HEAD=10, EN_PRESSURE=11
                nodeResults[id] = {
                    demand: model.getNodeValue(i, EN_DEMAND),
                    head: model.getNodeValue(i, EN_HEAD),
                    pressure: model.getNodeValue(i, EN_PRESSURE)
                };
            }

            // C. Extract Link Results
            const linkResults: Record<string, any> = {};
            for (let i = 1; i <= linkCount; i++) {
                const id = linkIds[i - 1];
                // Indices for EN_FLOW=8, EN_VELOCITY=9, EN_HEADLOSS=10, EN_STATUS=11
                linkResults[id] = {
                    flow: model.getLinkValue(i, EN_FLOW),
                    velocity: model.getLinkValue(i, EN_VELOCITY),
                    headloss: model.getLinkValue(i, EN_HEADLOSS),
                    status: model.getLinkValue(i, EN_STATUS) >= 1 ? 'Open' : 'Closed'
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