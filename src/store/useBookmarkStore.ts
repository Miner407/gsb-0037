import { create } from 'zustand';
import type { Bookmark, StatsOverview, DuplicateEntry, DomainStat, ImportResult } from '@shared/types';
import * as api from '@/lib/api';

type FetchBookmarksParams = Parameters<typeof api.getBookmarks>[0];

interface BookmarkState {
  bookmarks: Bookmark[];
  overview: StatsOverview;
  duplicates: DuplicateEntry[];
  domains: DomainStat[];
  recent: Bookmark[];
  folders: string[];
  tags: string[];
  loading: boolean;
  error: string | null;

  fetchAll: () => Promise<void>;
  fetchBookmarks: (params?: FetchBookmarksParams) => Promise<void>;
  fetchOverview: () => Promise<void>;
  fetchDuplicates: () => Promise<void>;
  fetchDomains: () => Promise<void>;
  fetchRecent: () => Promise<void>;
  fetchFolders: () => Promise<void>;
  fetchTags: () => Promise<void>;

  importBookmarks: (file: File) => Promise<ImportResult>;
  previewImport: (file: File) => Promise<ImportPreviewResult>;
  toggleArchive: (id: number) => Promise<void>;
  batchArchive: (ids: number[], archived: boolean) => Promise<void>;
  deleteBookmark: (id: number) => Promise<void>;
  batchDelete: (ids: number[]) => Promise<void>;
  deduplicateKeepOne: (keepId: number) => Promise<{ archived: number }>;
}

export interface ImportPreviewResult {
  totalParsed: number;
  existingCount: number;
  batchDuplicateCount: number;
  folderStats: Record<string, number>;
  domainStats: Record<string, number>;
}

export interface CleanupSuggestions {
  duplicateGroups: number;
  archiveableCount: number;
  topDomains7d: { domain: string; count: number }[];
  emptyTitleCount: number;
  invalidUrlCount: number;
}

const initialOverview: StatsOverview = {
  totalCount: 0,
  duplicateCount: 0,
  domainCount: 0,
  archivedCount: 0,
};

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  overview: initialOverview,
  duplicates: [],
  domains: [],
  recent: [],
  folders: [],
  tags: [],
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
        get().fetchTags(),
      ]);
    } catch (err: unknown) {
      set({ error: getErrorMessage(err) });
    } finally {
      set({ loading: false });
    }
  },

  fetchBookmarks: async (params) => {
    try {
      const data = await api.getBookmarks(params);
      set({ bookmarks: data });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err) });
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

  fetchTags: async () => {
    const data = await api.getTags();
    set({ tags: data });
  },

  importBookmarks: async (file) => {
    const result = await api.importBookmarks(file);
    await get().fetchAll();
    return result;
  },

  previewImport: async (file) => {
    const result = await api.previewImport(file);
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

  deduplicateKeepOne: async (keepId) => {
    const result = await api.deduplicateKeepOne(keepId);
    await get().fetchAll();
    return result;
  },
}));
