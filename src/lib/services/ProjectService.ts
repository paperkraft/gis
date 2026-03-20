import { transform } from 'ol/proj';

import { useNetworkStore } from '@/store/networkStore';
import { NetworkFeatureData, ProjectSettings } from '@/types/network';

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

            const features: NetworkFeatureData[] = [];

            data.features.forEach((f: any) => {
                const props = { ...f };
                delete props.geometry;
                delete props.source;
                delete props.target;

                // HANDLE PUMPS & VALVES (Special Case: Database=LineString -> App=Point+Visual)
                if (['pump', 'valve'].includes(f.type) && f.geometry.type === 'LineString') {
                    const coords = f.geometry.coordinates; // [[lon, lat], [lon, lat]] (4326)

                    // 1. Create Main Component (Point at Midpoint)
                    const midX = (coords[0][0] + coords[1][0]) / 2;
                    const midY = (coords[0][1] + coords[1][1]) / 2;

                    const pointGeom = transform([midX, midY], 'EPSG:4326', 'EPSG:3857');

                    features.push({
                        id: f.id,
                        type: f.type,
                        geometry: pointGeom,
                        properties: props
                    });

                    // 2. Create Visual Link (Dashed Line)
                    const lineGeom = coords.map((c: number[]) => transform(c, 'EPSG:4326', 'EPSG:3857'));
                    const visualId = `VIS-${f.id}`;

                    features.push({
                        id: visualId,
                        type: 'visual',
                        geometry: lineGeom,
                        properties: {
                            type: 'visual',
                            isVisualLink: true,
                            parentLinkId: f.id,
                            linkType: f.type,
                            id: visualId
                        }
                    });

                    return; // Skip standard processing
                }

                // STANDARD HANDLING (Pipes, Junctions, Tanks)
                let geom;
                const isGeographic = data.settings.isGeographic !== false;

                if (f.geometry.type === 'Point') {
                    geom = isGeographic ? transform(f.geometry.coordinates, 'EPSG:4326', 'EPSG:3857') : f.geometry.coordinates;
                } else {
                    geom = isGeographic
                        ? f.geometry.coordinates.map((c: number[]) => transform(c, 'EPSG:4326', 'EPSG:3857'))
                        : f.geometry.coordinates;
                }

                features.push({
                    id: f.id,
                    type: f.type,
                    geometry: geom,
                    properties: props
                });
            });

            useNetworkStore.getState().loadProject({
                features,
                settings: { ...data.settings, description: project?.description },
                patterns: data.settings.patterns,
                curves: data.settings.curves,
                controls: data.settings.controls
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
            settings: { ...settings, title: name, description: description },
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

        // 1. Get Tracking Sets
        const modifiedIds = networkStore.modifiedIds;
        const deletedIds = Array.from(networkStore.deletedIds);

        // If nothing changed, return early
        if (modifiedIds.size === 0 && deletedIds.length === 0 && !name && !networkStore.hasUnsavedChanges) {
            console.log("No changes to save.");
            return { success: true };
        }

        const rawFeatures = Array.from(networkStore.features.values());

        // Build a Lookup Map of *Current* Features (Critical for Pump/Valve Geometry Reconstruction)
        const currentFeaturesMap = new Map<string, NetworkFeatureData>();
        rawFeatures.forEach(f => {
            currentFeaturesMap.set(f.id.toString(), f);
        });

        // Filter only Modified Features
        const featuresToUpsert = rawFeatures.filter(f => modifiedIds.has(f.id.toString()));

        const features = featuresToUpsert
            .filter(f => {
                const type = f.type;
                // Filter out Visual Links, Markers, Previews
                return ['junction', 'tank', 'reservoir', 'pipe', 'pump', 'valve'].includes(type)
                    && !f.properties.isVisualLink
                    && !f.properties.isVertexMarker
                    && !f.properties.isPreview;
            })
            .map(f => {
                const props = f.properties;
                const type = f.type;
                const safeProps = this.deepSanitize(props);

                // Normalize IDs
                const sourceId = props.source || props.startNodeId || props.fromNode || props.properties?.startNodeId;
                const targetId = props.target || props.endNodeId || props.toNode || props.properties?.endNodeId;

                let geometryType = ['pipe', 'pump', 'valve'].includes(type) ? 'LineString' : 'Point';
                let coordinates = f.geometry;

                // LINK GEOMETRY: Always reconstruct endpoints from node positions to prevent drift.
                // Middle vertices (if any) are preserved.
                if (['pipe', 'pump', 'valve'].includes(type) && sourceId && targetId) {
                    const sNode = currentFeaturesMap.get(sourceId);
                    const tNode = currentFeaturesMap.get(targetId);

                    if (sNode && tNode) {
                        const sGeom = sNode.geometry as number[];
                        const tGeom = tNode.geometry as number[];

                        // Build from existing coords if available (to preserve middle vertices)
                        let coords = coordinates ? [...(coordinates as number[][])] : [];

                        if (!Array.isArray(coords[0])) {
                            // Geometry is a Point or empty — rebuild as simple 2-point line
                            coords = [sGeom, tGeom];
                        } else {
                            // Snap just the two endpoints, preserve any middle vertices
                            coords[0] = sGeom;
                            coords[coords.length - 1] = tGeom;
                        }

                        geometryType = 'LineString';
                        coordinates = coords;
                    }
                }

                // TRANSFORM: Map (3857) -> DB (4326)
                // Assuming coordinates are currently in Map Projection (3857)
                let finalCoords = coordinates as any;
                const isGeographic = networkStore.settings.isGeographic !== false && networkStore.settings.projection !== 'Simple';

                if (coordinates) {
                    if (geometryType === 'Point') {
                        finalCoords = isGeographic
                            ? transform(coordinates as number[], 'EPSG:3857', 'EPSG:4326')
                            : coordinates;
                    } else if (geometryType === 'LineString') {
                        finalCoords = isGeographic
                            ? (coordinates as number[][]).map((c: number[]) => transform(c, 'EPSG:3857', 'EPSG:4326'))
                            : coordinates;
                    }
                }

                return {
                    ...safeProps,
                    id: f.id,
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

    // --- CREATE FROM FILE (Server-Side) ---
    static async createProjectFromFile(name: string, description: string, inpContent: string, sourceProjection: string = 'EPSG:3857'): Promise<string> {
        try {
            const res = await fetch('/api/projects/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: name,
                    description,
                    inpContent,
                    sourceProjection
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to import project on server.");
            }

            const data = await res.json();
            return data.id;
        } catch (e: any) {
            console.error("Critical failure during INP import:", e);
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