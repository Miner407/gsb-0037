export interface Bookmark {
  id: number;
  title: string;
  url: string;
  folder: string;
  tags: string[];
  domain: string;
  archived: boolean;
  importedAt: string;
  createdAt: string;
}

export interface BookmarkInput {
  title: string;
  url: string;
  folder?: string;
  tags?: string[];
}

export interface StatsOverview {
  totalCount: number;
  duplicateCount: number;
  domainCount: number;
  archivedCount: number;
}

export interface DuplicateEntry {
  url: string;
  count: number;
  bookmarks: Bookmark[];
}

export interface DomainStat {
  domain: string;
  count: number;
}

export interface ImportResult {
  success: number;
  skipped: number;
  duplicates: number;
  bookmarks: Bookmark[];
}

export interface ParsedBookmark {
  title: string;
  url: string;
  folder: string;
  tags: string[];
}
