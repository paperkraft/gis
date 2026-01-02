import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Bookmark {
    id: string;
    name: string;
    center: number[];
    zoom: number;
    timestamp: number;
}

interface BookmarkState {
    bookmarks: Bookmark[];
    isPanelOpen: boolean;
    togglePanel: () => void;
    setPanelOpen: (isOpen: boolean) => void;
    addBookmark: (bookmark: Bookmark) => void;
    removeBookmark: (id: string) => void;
}

export const useBookmarkStore = create<BookmarkState>()(
    persist(
        (set) => ({
            bookmarks: [],
            isPanelOpen: false,
            togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
            setPanelOpen: (isOpen) => set({ isPanelOpen: isOpen }),
            addBookmark: (bookmark) =>
                set((state) => ({ bookmarks: [bookmark, ...state.bookmarks] })),
            removeBookmark: (id) =>
                set((state) => ({
                    bookmarks: state.bookmarks.filter((b) => b.id !== id),
                })),
        }),
        {
            name: 'sigma-bookmarks',
            partialize: (state) => ({ bookmarks: state.bookmarks }),
        }
    )
);