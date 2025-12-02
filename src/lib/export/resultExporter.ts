import { SimulationHistory, SimulationSnapshot } from "@/types/simulation";

export class ResultExporter {
    /**
     * Export the current time step results to CSV
     */
    public static exportSnapshotCSV(snapshot: SimulationSnapshot) {
        const time = this.formatTime(snapshot.timeStep);
        const filenameTime = time.replace(':', '');

        // 1. Generate Nodes CSV
        const nodeHeader = "Time,ID,Demand,Head,Pressure,Quality";
        const nodeRows = Object.values(snapshot.nodes).map(n =>
            `${time},${n.id},${n.demand.toFixed(4)},${n.head.toFixed(4)},${n.pressure.toFixed(4)},${n.quality || 0}`
        );
        this.downloadFile(nodeHeader + "\n" + nodeRows.join("\n"), `nodes_t${filenameTime}.csv`);

        // 2. Generate Links CSV
        const linkHeader = "Time,ID,Status,Flow,Velocity,Headloss,Quality";
        const linkRows = Object.values(snapshot.links).map(l =>
            `${time},${l.id},${l.status},${l.flow.toFixed(4)},${l.velocity.toFixed(4)},${l.headloss.toFixed(4)},${l.quality || 0}`
        );
        this.downloadFile(linkHeader + "\n" + linkRows.join("\n"), `links_t${filenameTime}.csv`);
    }

    /**
     * Export the full simulation history to CSV
     */
    public static exportHistoryCSV(history: SimulationHistory) {
        // 1. Generate Nodes CSV
        const nodeRows: string[] = ["Time,ID,Demand,Head,Pressure,Quality"];

        // 2. Generate Links CSV
        const linkRows: string[] = ["Time,ID,Status,Flow,Velocity,Headloss,Quality"];

        history.snapshots.forEach(snap => {
            const t = this.formatTime(snap.timeStep);

            Object.values(snap.nodes).forEach(n => {
                nodeRows.push(`${t},${n.id},${n.demand.toFixed(4)},${n.head.toFixed(4)},${n.pressure.toFixed(4)},${n.quality || 0}`);
            });

            Object.values(snap.links).forEach(l => {
                linkRows.push(`${t},${l.id},${l.status},${l.flow.toFixed(4)},${l.velocity.toFixed(4)},${l.headloss.toFixed(4)},${l.quality || 0}`);
            });
        });

        this.downloadFile(nodeRows.join("\n"), `simulation_nodes_full.csv`);
        this.downloadFile(linkRows.join("\n"), `simulation_links_full.csv`);
    }

    private static downloadFile(content: string, filename: string) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }

    private static formatTime(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
}