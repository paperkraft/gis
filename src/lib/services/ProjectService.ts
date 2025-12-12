import { parseINP } from "../import/inpParser";
import { useNetworkStore } from "@/store/networkStore";
import { ProjectSettings } from "@/types/network";

export interface ProjectMetadata {
    id: string;
    name: string;
    lastModified: number;
    nodeCount: number;
    linkCount: number;
}

export class ProjectService {

    // --- READ (List) ---
    static async getProjects(): Promise<ProjectMetadata[]> {
        try {
            const res = await fetch('/api/projects', { cache: 'no-store' });
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();

            return data.map((p: any) => ({
                id: p.id,
                name: p.title,
                lastModified: p.updatedAt,
                nodeCount: p.nodeCount,
                linkCount: p.linkCount
            }));
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    // --- READ (Single) ---
    static async loadProject(id: string): Promise<boolean> {
        try {
            const res = await fetch(`/api/projects/${id}`, { cache: 'no-store' });
            if (!res.ok) throw new Error("Project not found");

            const project = await res.json();
            const data = project.data;

            const { useNetworkStore } = await import("@/store/networkStore");
            const { Feature } = await import("ol");
            const { Point, LineString } = await import("ol/geom");

            // Rehydrate Features from JSON
            const features = data.features.map((f: any) => {
                let geom;
                if (f.geometry.type === 'Point') {
                    geom = new Point(f.geometry.coordinates);
                } else {
                    geom = new LineString(f.geometry.coordinates);
                }

                const feature = new Feature({ geometry: geom });
                feature.setId(f.id);

                // Restore all properties
                const { geometry, ...rest } = f;
                rest.id = f.id;
                feature.setProperties(rest);

                return feature;
            });

            useNetworkStore.getState().loadProject({
                features,
                settings: data.settings,
                patterns: data.patterns,
                curves: data.curves,
                controls: data.controls
            });

            return true;
        } catch (e) {
            console.error("Failed to load project", e);
            return false;
        }
    }

    // --- WRITE (Save/Update) ---
    static async saveCurrentProject(id: string, name: string) {
        const store = useNetworkStore.getState();

        // Serialize OpenLayers Features to JSON
        const features = Array.from(store.features.values()).map(f => {
            const geom = f.getGeometry();
            const props = f.getProperties();

            const { geometry, ...safeProps } = props;

            return {
                ...safeProps,
                id: f.getId(),
                geometry: {
                    type: geom?.getType(),
                    coordinates: (geom as any)?.getCoordinates()
                }
            };
        });

        const projectData = {
            features,
            settings: { ...store.settings, title: name },
            patterns: store.patterns,
            curves: store.curves,
            controls: store.controls
        };

        const nodeCount = features.filter((f: any) => ['junction', 'tank', 'reservoir'].includes(f.type)).length;
        const linkCount = features.filter((f: any) => ['pipe', 'pump', 'valve'].includes(f.type)).length;

        try {
            const check = await fetch(`/api/projects/${id}`, { cache: 'no-store' });

            const method = check.status === 404 ? 'POST' : 'PUT';
            const url = check.status === 404 ? '/api/projects' : `/api/projects/${id}`;

            await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    title: name,
                    data: projectData,
                    nodeCount,
                    linkCount
                })
            });

            console.log("Project saved to database.");
        } catch (e) {
            console.error("Save failed", e);
        }
    }

    // --- CREATE FROM FILE (Direct to DB) ---
    static async createProjectFromFile(name: string, inpContent: string, sourceProjection: string = 'EPSG:3857'): Promise<string> {
        try {
            // 1. Parse the INP content
            const data = parseINP(inpContent, sourceProjection);

            // 2. Transform Features to JSON (Serializable)
            // Note: We don't load them into the map store here; we just process data.
            const serializableFeatures = data.features.map(f => {
                const props = f.getProperties();
                const geom = f.getGeometry();
                const { geometry, ...safeProps } = props;
                return {
                    ...safeProps,
                    id: f.getId(),
                    geometry: {
                        type: geom?.getType(),
                        coordinates: (geom as any)?.getCoordinates()
                    }
                };
            });

            // 3. Construct the Full Project Data Object
            const projectData = {
                features: serializableFeatures,
                settings: { ...data.settings, title: name }, // Override title with user input
                patterns: data.patterns,
                curves: data.curves,
                controls: data.controls
            };

            // 4. Calculate Stats
            const nodeCount = serializableFeatures.filter((f: any) => ['junction', 'tank', 'reservoir'].includes(f.type)).length;
            const linkCount = serializableFeatures.filter((f: any) => ['pipe', 'pump', 'valve'].includes(f.type)).length;

            // 5. Send to API (Create New)
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: name,
                    data: projectData,
                    nodeCount,
                    linkCount
                })
            });

            if (!res.ok) throw new Error("Failed to create project in database");

            return (await res.json()).id;
        } catch (e) {
            console.error("Error creating project from file:", e);
            throw e;
        }
    }

    // --- CREATE BLANK ---
    static async createProjectFromSettings(name: string, settings: ProjectSettings): Promise<string> {
        // Construct empty project payload
        const projectData = {
            features: [],
            settings: { ...settings, title: name },
            patterns: [],
            curves: [],
            controls: []
        };

        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: name,
                    data: projectData,
                    nodeCount: 0,
                    linkCount: 0
                })
            });
            return res.ok ? (await res.json()).id : "";
        } catch (e) {
            console.error("Failed to create blank project", e);
            throw e;
        }
    }

    // --- DELETE ---
    static async deleteProject(id: string) {
        try {
            await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        } catch (e) {
            console.error("Delete failed", e);
        }
    }
}