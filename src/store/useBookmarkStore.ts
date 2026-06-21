import { create } from 'zustand';
import type { Bookmark, StatsOverview, DuplicateEntry, DomainStat, ImportResult } from '@shared/types';
import * as api from '@/lib/api';

interface BookmarkState {
  bookmarks: Bookmark[];
  overview: StatsOverview;
  duplicates: DuplicateEntry[];
  domains: DomainStat[];
  recent: Bookmark[];
  folders: string[];
  loading: boolean;
  error: string | null;

  fetchAll: () => Promise<void>;
  fetchBookmarks: (params?: any) => Promise<void>;
  fetchOverview: () => Promise<void>;
  fetchDuplicates: () => Promise<void>;
  fetchDomains: () => Promise<void>;
  fetchRecent: () => Promise<void>;
  fetchFolders: () => Promise<void>;

  importBookmarks: (file: File) => Promise<ImportResult>;
  toggleArchive: (id: number) => Promise<void>;
  batchArchive: (ids: number[], archived: boolean) => Promise<void>;
  deleteBookmark: (id: number) => Promise<void>;
  batchDelete: (ids: number[]) => Promise<void>;
}

const initialOverview: StatsOverview = {
  totalCount: 0,
  duplicateCount: 0,
  domainCount: 0,
  archivedCount: 0,
};

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  overview: initialOverview,
  duplicates: [],
  domains: [],
  recent: [],
  folders: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      await Promise.all([
        get().fetchOverview(),
        get().fetchDuplicates(),
        get().fetchDomains(),
        get().fetchRecent(),
        get().fetchFolders(),
      ]);
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchBookmarks: async (params) => {
    try {
      const data = await api.getBookmarks(params);
      set({ bookmarks: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchOverview: async () => {
    const data = await api.getStatsOverview();
    set({ overview: data });
  },

  fetchDuplicates: async () => {
    const data = await api.getDuplicates();
    set({ duplicates: data });
  },

  fetchDomains: async () => {
    const data = await api.getDomainStats();
    set({ domains: data });
  },

  fetchRecent: async () => {
    const data = await api.getRecentBookmarks();
    set({ recent: data });
  },

  fetchFolders: async () => {
    const data = await api.getFolders();
    set({ folders: data });
  },

  importBookmarks: async (file) => {
    const result = await api.importBookmarks(file);
    await get().fetchAll();
    return result;
  },

  toggleArchive: async (id) => {
    const bookmark = get().bookmarks.find(b => b.id === id);
    if (bookmark) {
      await api.updateBookmark(id, { archived: !bookmark.archived });
      await get().fetchAll();
    }
  },

  batchArchive: async (ids, archived) => {
    await api.batchUpdate(ids, { archived });
    await get().fetchAll();
  },

  deleteBookmark: async (id) => {
    await api.deleteBookmark(id);
    await get().fetchAll();
  },

  batchDelete: async (ids) => {
    await api.batchDelete(ids);
    await get().fetchAll();
  },
}));
