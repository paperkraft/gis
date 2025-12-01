import { Feature } from 'ol';
import { SimulationResults } from '@/types/simulation';

export class MockSolver {
    /**
     * Run a mock simulation on the provided features
     */
    public static async solve(features: Feature[]): Promise<SimulationResults> {
        return new Promise((resolve) => {
            // Simulate processing delay
            setTimeout(() => {
                const results: SimulationResults = {
                    nodes: {},
                    links: {},
                    timestamp: Date.now(),
                    message: "Simulation converged successfully",
                };

                // Generate Node Results
                features
                    .filter(f => ['junction', 'tank', 'reservoir'].includes(f.get('type')))
                    .forEach(node => {
                        const id = node.getId() as string;
                        const elevation = node.get('elevation') || 0;

                        // Mock calculation: higher elevation = lower pressure
                        const baseHead = 150; // default hydraulic grade
                        const pressure = Math.max(0, (baseHead - elevation) * 0.433); // psi approx

                        results.nodes[id] = {
                            id,
                            head: baseHead,
                            pressure: Number(pressure.toFixed(2)),
                            demand: node.get('demand') || 0,
                        };
                    });

                // Generate Link Results
                features
                    .filter(f => ['pipe', 'pump', 'valve'].includes(f.get('type')))
                    .forEach(link => {
                        const id = link.getId() as string;
                        const diameter = link.get('diameter') || 100;

                        // Mock calculation: random flow based on diameter
                        const flow = (Math.random() * 50) + (diameter / 10);
                        const area = Math.PI * Math.pow((diameter / 1000) / 2, 2);
                        const velocity = (flow / 1000) / area; // m/s approx

                        results.links[id] = {
                            id,
                            flow: Number(flow.toFixed(2)),
                            velocity: Number(velocity.toFixed(2)),
                            headloss: Number((Math.random() * 2).toFixed(4)),
                            status: 'Open',
                        };
                    });

                resolve(results);
            }, 1500); // 1.5s simulated delay
        });
    }
}