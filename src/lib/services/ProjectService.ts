import { generateINP } from "../export/inpWriter";
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

const STORAGE_KEY = "water_gis_projects";

export class ProjectService {

    static getProjects(): ProjectMetadata[] {
        if (typeof window === 'undefined') return [];
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    }

    static saveCurrentProject(id: string, name: string) {
        const store = useNetworkStore.getState();
        const features = Array.from(store.features.values());

        // Ensure store settings has the correct title
        const settings = { ...store.settings, title: name };
        const nodeCount = features.filter(f => ['junction', 'tank', 'reservoir'].includes(f.get('type'))).length;
        const linkCount = features.filter(f => ['pipe', 'pump', 'valve'].includes(f.get('type'))).length;

        const inpContent = generateINP(features, settings); // Uses store settings automatically
        return this.saveToStorage(id, name, inpContent, nodeCount, linkCount);
    }

    // --- Create from Settings (Blank Project) ---
    static createProjectFromSettings(name: string, settings: ProjectSettings): string {
        const id = crypto.randomUUID();

        // Generate blank INP with these settings
        // Pass empty features array, but custom settings
        const inpContent = generateINP([], settings);
        this.saveToStorage(id, name, inpContent);
        return id;
    }

    // --- Create from File (Import) ---
    static createProjectFromFile(name: string, inpContent: string): string {
        const id = crypto.randomUUID();

        try {
            // 1. Parse the original file
            const data = parseINP(inpContent);
            // 2. Override the title in settings
            data.settings.title = name;
            // 3. Regenerate the INP string with the new title
            // We pass ALL parts: features, settings, patterns, curves
            const updatedContent = generateINP(
                data.features,
                data.settings,
                data.patterns,
                data.curves
            );

            // 4. Save the Updated content
            this.saveToStorage(id, name, updatedContent);
            return id;
        } catch (e) {
            console.error("Invalid INP content");
            throw e;
        }
    }

    // Helper to persist to localStorage
    private static saveToStorage(id: string, name: string, content: string, nodeCount: number = 0, linkCount: number = 0): ProjectMetadata {
        localStorage.setItem(`project_data_${id}`, content);

        const projects = this.getProjects();
        const existingIndex = projects.findIndex(p => p.id === id);

        const metadata: ProjectMetadata = {
            id,
            name,
            lastModified: Date.now(),
            nodeCount: nodeCount,
            linkCount: linkCount,
        };

        if (existingIndex >= 0) {
            projects[existingIndex] = {
                ...projects[existingIndex],
                ...metadata
            };
        } else {
            projects.push(metadata);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        return metadata;
    }

    static loadProject(id: string): boolean {
        const inpContent = localStorage.getItem(`project_data_${id}`);
        if (!inpContent) return false;
        try {
            const data = parseINP(inpContent);
            useNetworkStore.getState().loadProject(data);
            return true;
        } catch (e) {
            console.error("Failed to load project", e);
            return false;
        }
    }

    static deleteProject(id: string) {
        const projects = this.getProjects().filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        localStorage.removeItem(`project_data_${id}`);
    }
}