import type { Bookmark, StatsOverview, DuplicateEntry, DomainStat, ImportResult, ImportPreviewResult, DeduplicateResult, CleanupSuggestions } from '@shared/types';

const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }
  return data.data;
}

export async function getBookmarks(params?: {
  search?: string;
  domain?: string;
  folder?: string;
  tags?: string;
  archived?: boolean;
  importedAfter?: string;
  importedBefore?: string;
  limit?: number;
  offset?: number;
}): Promise<Bookmark[]> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') {
        query.append(k, String(v));
      }
    });
  }
  const qs = query.toString();
  return request<Bookmark[]>(`/bookmarks${qs ? `?${qs}` : ''}`);
}

export async function getFolders(): Promise<string[]> {
  return request<string[]>('/bookmarks/folders');
}

export async function getTags(): Promise<string[]> {
  return request<string[]>('/bookmarks/tags');
}

export async function getBookmark(id: number): Promise<Bookmark> {
  return request<Bookmark>(`/bookmarks/${id}`);
}

export async function createBookmark(data: { title: string; url: string; folder?: string; tags?: string[] }): Promise<Bookmark> {
  return request<Bookmark>('/bookmarks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBookmark(id: number, data: Partial<Pick<Bookmark, 'title' | 'url' | 'folder' | 'tags' | 'archived'>>): Promise<Bookmark> {
  return request<Bookmark>(`/bookmarks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBookmark(id: number): Promise<void> {
  return request<void>(`/bookmarks/${id}`, { method: 'DELETE' });
}

export async function batchUpdate(ids: number[], updates: { archived?: boolean }): Promise<{ updated: number }> {
  return request<{ updated: number }>('/bookmarks/batch', {
    method: 'PUT',
    body: JSON.stringify({ ids, ...updates }),
  });
}

export async function batchDelete(ids: number[]): Promise<{ deleted: number }> {
  return request<{ deleted: number }>('/bookmarks/batch', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
}

export async function deduplicateKeepOne(keepId: number): Promise<DeduplicateResult> {
  return request<DeduplicateResult>('/bookmarks/deduplicate', {
    method: 'POST',
    body: JSON.stringify({ keepId }),
  });
}

export async function previewImport(file: File): Promise<ImportPreviewResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/import/preview`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Preview failed');
  }
  return data.data;
}

export async function importBookmarks(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/import`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Import failed');
  }
  return data.data;
}

export async function getStatsOverview(): Promise<StatsOverview> {
  return request<StatsOverview>('/stats/overview');
}

export async function getDuplicates(): Promise<DuplicateEntry[]> {
  return request<DuplicateEntry[]>('/stats/duplicates');
}

export async function getDomainStats(): Promise<DomainStat[]> {
  return request<DomainStat[]>('/stats/domains');
}

export async function getCleanupSuggestions(): Promise<CleanupSuggestions> {
  return request<CleanupSuggestions>('/stats/cleanup-suggestions');
}

export async function getRecentBookmarks(limit?: number): Promise<Bookmark[]> {
  const qs = limit ? `?limit=${limit}` : '';
  return request<Bookmark[]>(`/stats/recent${qs}`);
}
