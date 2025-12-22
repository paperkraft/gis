import { useMapStore } from "@/store/mapStore";
import { parseINP } from "../import/inpParser";
import { useNetworkStore } from "@/store/networkStore";
import { ProjectSettings } from "@/types/network";
import { Point } from "ol/geom";
import { transform } from "ol/proj";
import { Feature } from "ol";

export interface ProjectMetadata {
    id: string;
    name: string;
    description?: string;
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
                description: p.description,
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

            const features: any[] = [];

            data.features.forEach((f: any) => {
                const props = { ...f };
                delete props.geometry; // Separate props from geometry

                // HANDLE PUMPS & VALVES (Special Case: Database=LineString -> App=Point+Visual)
                if (['pump', 'valve'].includes(f.type) && f.geometry.type === 'LineString') {
                    const coords = f.geometry.coordinates; // [[lon, lat], [lon, lat]] (4326)

                    // 1. Create Main Component (Point at Midpoint)
                    // We must transform coordinates individually or after creation
                    // Let's create geometry in 4326 first, then transform.
                    const midX = (coords[0][0] + coords[1][0]) / 2;
                    const midY = (coords[0][1] + coords[1][1]) / 2;

                    const pointGeom = new Point([midX, midY]).transform('EPSG:4326', 'EPSG:3857');

                    const mainFeature = new Feature({ geometry: pointGeom });
                    mainFeature.setId(f.id);
                    mainFeature.setProperties(props);
                    features.push(mainFeature);

                    // 2. Create Visual Link (Dashed Line)
                    const lineGeom = new LineString(coords).transform('EPSG:4326', 'EPSG:3857');
                    const visualId = `VIS-${f.id}`;

                    const visualFeature = new Feature({ geometry: lineGeom });
                    visualFeature.setId(visualId);
                    visualFeature.setProperties({
                        type: 'visual',
                        isVisualLink: true,
                        parentLinkId: f.id,
                        linkType: f.type,
                        id: visualId
                    });

                    features.push(visualFeature);

                    return; // Skip standard processing
                }

                // STANDARD HANDLING (Pipes, Junctions, Tanks)
                let geom;
                if (f.geometry.type === 'Point') {
                    geom = new Point(f.geometry.coordinates).transform('EPSG:4326', 'EPSG:3857');
                } else {
                    geom = new LineString(f.geometry.coordinates).transform('EPSG:4326', 'EPSG:3857');
                }

                const feature = new Feature({ geometry: geom });
                feature.setId(f.id);
                feature.setProperties(props);
                features.push(feature);
            });

            useNetworkStore.getState().loadProject({
                features,
                settings: { ...data.settings, description: project?.description },
                patterns: data.patterns,
                curves: data.curves,
                controls: data.controls
            });

            return true;
        } catch (e) {
            console.error("Failed to load", e);
            return false;
        }
    }

    // --- CREATE BLANK ---
    static async createProjectFromSettings(name: string, description: string, settings: ProjectSettings): Promise<string> {
        // Construct empty project payload
        const payload = {
            title: name,
            description: description,
            settings: { ...settings, title: name },
        };

        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return res.ok ? (await res.json()).id : "";
        } catch (e) {
            console.error("Failed to create blank project", e);
            throw e;
        }
    }

    // --- WRITE (Save/Update) ---
    static async saveCurrentProject(id: string, name?: string) {
        const networkStore = useNetworkStore.getState();
        const mapStore = useMapStore.getState();

        // 1. Get Tracking Sets
        const modifiedIds = networkStore.modifiedIds;
        const deletedIds = Array.from(networkStore.deletedIds);

        // If nothing changed, return early
        if (modifiedIds.size === 0 && deletedIds.length === 0 && !name && !networkStore.hasUnsavedChanges) {
            console.log("No changes to save.");
            return { success: true };
        }

        let rawFeatures: Feature[] = [];

        if (mapStore.vectorSource) {
            rawFeatures = mapStore.vectorSource.getFeatures();
        } else {
            // Fallback to store if headless or map not initialized
            rawFeatures = Array.from(networkStore.features.values());
        }

        // Filter only Modified Features
        const featuresToUpsert = rawFeatures.filter(f => {
            const fid = f.getId();
            return fid && modifiedIds.has(fid.toString());
        });

        // Build a Lookup Map of *Current* Features (Critical for Pump/Valve Geometry Reconstruction)
        const currentFeaturesMap = new Map<string, Feature>();
        rawFeatures.forEach(f => {
            const id = f.getId();
            if (id) currentFeaturesMap.set(id.toString(), f);
        });

        const features = featuresToUpsert
            .filter(f => {
                const type = f.get('type');
                // Filter out Visual Links, Markers, Previews
                return ['junction', 'tank', 'reservoir', 'pipe', 'pump', 'valve'].includes(type)
                    && !f.get('isVisualLink')
                    && !f.get('isVertexMarker')
                    && !f.get('isPreview');
            })
            .map(f => {
                const props = f.getProperties();
                const type = f.get('type');
                const safeProps = this.deepSanitize(props);

                // Clone & Transform Geometry
                // Using .clone() ensures we don't break the map view by transforming in place
                let geometryType = f.getGeometry()?.getType();
                let coordinates = (f.getGeometry() as any)?.getCoordinates();

                // Normalize IDs
                const sourceId = props.source || props.startNodeId || props.fromNode || props.properties?.startNodeId;
                const targetId = props.target || props.endNodeId || props.toNode || props.properties?.endNodeId;

                // SPECIAL HANDLING: Pump/Valve (Point -> LineString)
                // We must use 'currentFeaturesMap' to get the MOVED node positions
                if (['pump', 'valve'].includes(type) && geometryType === 'Point' && sourceId && targetId) {
                    const sNode = currentFeaturesMap.get(sourceId);
                    const tNode = currentFeaturesMap.get(targetId);

                    if (sNode && tNode) {
                        const sGeom = (sNode.getGeometry() as Point).getCoordinates();
                        const tGeom = (tNode.getGeometry() as Point).getCoordinates();

                        geometryType = 'LineString';
                        coordinates = [sGeom, tGeom]; // [Start, End]
                    }
                }

                // TRANSFORM: Map (3857) -> DB (4326)
                // Assuming coordinates are currently in Map Projection (3857)
                let finalCoords = coordinates;
                if (coordinates && coordinates.length > 0) {
                    if (geometryType === 'Point') {
                        finalCoords = transform(coordinates, 'EPSG:3857', 'EPSG:4326');
                    } else if (geometryType === 'LineString') {
                        finalCoords = coordinates.map((c: number[]) => transform(c, 'EPSG:3857', 'EPSG:4326'));
                    }
                }

                return {
                    ...safeProps,
                    id: f.getId(),
                    type: type,
                    source: sourceId,
                    target: targetId,
                    geometry: {
                        type: geometryType,
                        coordinates: finalCoords
                    }
                };
            });

        // 4. Construct Incremental Payload
        const payload = {
            title: name ?? networkStore.settings.title,
            description: networkStore.settings.description ?? "",
            modifications: features,
            deletions: deletedIds,
            // Always send settings/metadata as they are lightweight
            settings: networkStore.settings,
            patterns: networkStore.patterns,
            curves: networkStore.curves,
            controls: networkStore.controls,
        };

        try {
            const res = await fetch(`/api/projects/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Server Error:", err);
                throw new Error(err.error || "Save failed");
            }

            console.log("Project saved to PostGIS.");
            networkStore.markSaved();
            return { success: true };
        } catch (e) {
            console.error("Save failed", e);
            return { success: false };
        }
    }

    // --- CREATE FROM FILE ---
    static async createProjectFromFile(name: string, description: string, inpContent: string, sourceProjection: string = 'EPSG:3857'): Promise<string> {
        try {
            // 1. Parse the INP content (Returns OpenLayers Features)
            const data = parseINP(inpContent, sourceProjection);

            // 2. Create Node Lookup Map (Critical for building Pump/Valve geometries)
            const nodeMap = new Map<string, number[]>();
            data.features.forEach(f => {
                if (['junction', 'tank', 'reservoir'].includes(f.get('type'))) {
                    // Coordinates in Source Projection (e.g. 3857 or local)
                    const coords = (f.getGeometry() as Point).getCoordinates();
                    nodeMap.set(f.getId() as string, coords);
                }
            });

            // 3. Prepare Features for DB (Transform to EPSG:4326)
            const serializableFeatures = data.features.map(f => {
                const props = f.getProperties();
                const type = f.get('type');
                const id = f.getId();

                // Sanitize props
                const safeProps = this.deepSanitize(props);

                // Normalize IDs
                const sourceId = props.source || props.startNodeId || props.fromNode;
                const targetId = props.target || props.endNodeId || props.toNode;

                let geometryType = f.getGeometry()?.getType();
                let coordinates = (f.getGeometry() as any)?.getCoordinates();

                // FIX: Ensure Links (Pumps/Valves) are LineStrings for DB
                if (['pump', 'valve', 'pipe'].includes(type)) {
                    // If geometry is missing or just a point (some parsers do this), rebuild it
                    if (geometryType !== 'LineString' || !coordinates || coordinates.length < 2) {
                        const start = nodeMap.get(sourceId);
                        const end = nodeMap.get(targetId);

                        if (start && end) {
                            geometryType = 'LineString';
                            coordinates = [start, end];
                        } else {
                            console.warn(`Could not rebuild geometry for link ${id}`);
                            // Fallback to avoid crash, backend will handle/ignore 0,0
                            coordinates = [[0, 0], [0, 0]];
                        }
                    }
                }

                // TRANSFORM: Convert to EPSG:4326 (Lat/Lon) for PostGIS
                let finalCoords = coordinates;
                if (coordinates && coordinates.length > 0) {
                    if (geometryType === 'Point') {
                        finalCoords = transform(coordinates, sourceProjection, 'EPSG:4326');
                    } else if (geometryType === 'LineString') {
                        finalCoords = coordinates.map((c: number[]) =>
                            transform(c, sourceProjection, 'EPSG:4326')
                        );
                    }
                }

                return {
                    ...safeProps,
                    id: id,
                    type: type,
                    source: sourceId,
                    target: targetId,
                    geometry: {
                        type: geometryType,
                        coordinates: finalCoords
                    }
                };
            });

            // 5. STEP 1: Create Project Shell (POST)
            const payload = {
                title: name,
                description,
                settings: {
                    ...data.settings,
                    title: name,
                    description,
                    patterns: data.patterns[0] || [],
                    curves: data.curves[0] || [],
                    controls: data.controls[0] || []
                }
            }

            const createRes = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!createRes.ok) throw new Error("Failed to create project shell");
            const { id } = await createRes.json();

            // 6. STEP 2: Save Spatial Features (PUT)
            // We reuse the exact same format as saveCurrentProject
            const savePayload = {
                ...payload,
                modifications: serializableFeatures,
                deletions: [],
            };

            const saveRes = await fetch(`/api/projects/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(savePayload)
            });

            if (!saveRes.ok) throw new Error("Failed to save project features");

            return id;

        } catch (e) {
            console.error("Error creating project from file:", e);
            throw e;
        }
    }

    // --- DELETE ---
    static async deleteProject(id: string) {
        try {
            const res = await fetch(`/api/projects/${id}`, {
                method: 'DELETE',
                cache: 'no-store'
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Delete failed:", err);
                return false;
            }

            return true;
        } catch (e) {
            console.error("Network error during delete", e);
            return false;
        }
    }

    // --- HELPER: Deep Sanitize ---
    private static deepSanitize(obj: any, seen = new WeakSet()): any {
        if (obj === null || obj === undefined) return obj;

        const type = typeof obj;

        // Keep Primitives
        if (type !== 'object') return obj;

        // Detect Circular References
        if (seen.has(obj)) return undefined;
        seen.add(obj);

        // Handle Arrays
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepSanitize(item, seen));
        }

        // Handle Plain Objects
        if (obj.constructor === Object) {
            const clean: any = {};
            for (const key in obj) {
                // Explicitly skip 'geometry' and internal OL keys
                if (key === 'geometry' || key.startsWith('ol_')) continue;

                clean[key] = this.deepSanitize(obj[key], seen);
            }
            return clean;
        }

        // If it's an object but not a Array or Plain Object (e.g. a Class Instance), 
        // discard it. This is where the circular 'values_' usually lives.
        return undefined;
    }
}