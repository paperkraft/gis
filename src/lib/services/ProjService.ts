export interface ProjectSavePayload {
    features: any[];
    settings: any;
    patterns: any[];
    curves: any[];
    controls: any[];
}

export const ProjectService = {

    saveProject: async (id: string, data: ProjectSavePayload): Promise<boolean> => {
        try {
            const response = await fetch(`/api/workbench/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error("Failed to save");
            return true;
        } catch (error) {
            console.error("Save Error:", error);
            return false;
        }
    }
};