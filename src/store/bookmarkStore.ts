import { create } from 'zustand';
import { toast } from 'sonner';

export interface Bookmark {
    id: string;
    name: string;
    center: number[];
    zoom: number;
    createdAt?: string;
}

interface BookmarkState {
    bookmarks: Bookmark[];
    isLoading: boolean;

    // Actions
    fetchBookmarks: (projectId: string) => Promise<void>;
    addBookmark: (projectId: string, bookmark: Omit<Bookmark, 'id'>) => Promise<void>;
    removeBookmark: (bookmarkId: string) => Promise<void>;
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
    bookmarks: [],
    isLoading: false,

    fetchBookmarks: async (projectId: string) => {
        set({ isLoading: true });
        try {
            const res = await fetch(`/api/workbench/${projectId}/bookmarks`);
            if (res.ok) {
                const data = await res.json();
                set({ bookmarks: data });
            }
        } catch (error) {
            console.error("Failed to load bookmarks");
        } finally {
            set({ isLoading: false });
        }
    },

    addBookmark: async (projectId, bookmark) => {
        // Optimistic Update
        const tempId = crypto.randomUUID();
        const newBookmark = { ...bookmark, id: tempId };

        set((state) => ({ bookmarks: [newBookmark, ...state.bookmarks] }));

        try {
            const res = await fetch(`/api/workbench/${projectId}/bookmarks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookmark),
            });

            if (res.ok) {
                const savedBookmark = await res.json();
                // Replace optimistic ID with real DB ID
                set((state) => ({
                    bookmarks: state.bookmarks.map(b => b.id === tempId ? savedBookmark : b)
                }));
                toast.success("Location saved");
            } else {
                throw new Error();
            }
        } catch (error) {
            // Revert on failure
            set((state) => ({ bookmarks: state.bookmarks.filter(b => b.id !== tempId) }));
            toast.error("Failed to save bookmark");
        }
    },

    removeBookmark: async (bookmarkId) => {
        console.log("Attempting to delete:", bookmarkId);

        // Optimistic Update
        const previous = get().bookmarks;
        set((state) => ({ bookmarks: state.bookmarks.filter(b => b.id !== bookmarkId) }));

        try {
            const res = await fetch(`/api/bookmarks/${bookmarkId}`, { method: 'DELETE' });

            if (!res.ok) {
                const err = await res.text();
                console.error("Delete API failed:", err);
                throw new Error(err);
            }

            toast.success("Bookmark removed");
        } catch (error) {
            console.error("Reverting UI changes...");
            set({ bookmarks: previous });
            toast.error("Failed to delete bookmark");
        }
    }
}));