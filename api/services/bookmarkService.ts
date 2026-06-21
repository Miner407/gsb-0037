import sqlite3 from 'sqlite3';
import { getDb, dbRun, dbGet, dbAll } from '../db/database.js';
import { extractDomain, normalizeUrl } from '../utils/url.js';
import { parseBookmarksHtml } from '../utils/bookmarkParser.js';
import type { Bookmark, BookmarkInput, StatsOverview, DuplicateEntry, DomainStat, ImportResult, ImportPreviewResult, DeduplicateResult, CleanupSuggestions } from '../../shared/types.js';

interface BookmarkRow {
  id: number;
  title: string;
  url: string;
  folder: string;
  tags: string;
  domain: string;
  archived: number | boolean;
  imported_at: string;
  created_at: string;
}

function rowToBookmark(row: BookmarkRow): Bookmark {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    folder: row.folder || '',
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : [],
    domain: row.domain,
    archived: Boolean(row.archived),
    importedAt: row.imported_at,
    createdAt: row.created_at,
  };
}

export async function getBookmarks(params: {
  search?: string;
  domain?: string;
  folder?: string;
  tags?: string;
  archived?: boolean;
  importedAfter?: string;
  importedBefore?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<Bookmark[]> {
  const db = getDb();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.search) {
    conditions.push('(title LIKE ? OR url LIKE ? OR folder LIKE ? OR tags LIKE ?)');
    const searchTerm = `%${params.search}%`;
    values.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }
  if (params.domain) {
    conditions.push('domain = ?');
    values.push(params.domain);
  }
  if (params.folder) {
    conditions.push('folder = ?');
    values.push(params.folder);
  }
  if (params.tags) {
    const tagList = params.tags.split(',').map(t => t.trim()).filter(Boolean);
    const tagConditions = tagList.map(() => 'tags LIKE ?');
    conditions.push(`(${tagConditions.join(' OR ')})`);
    tagList.forEach(tag => values.push(`%"${tag}"%`));
  }
  if (params.archived !== undefined) {
    conditions.push('archived = ?');
    values.push(params.archived ? 1 : 0);
  }
  if (params.importedAfter) {
    conditions.push('imported_at >= ?');
    values.push(params.importedAfter);
  }
  if (params.importedBefore) {
    conditions.push('imported_at <= ?');
    values.push(params.importedBefore);
  }

  let sql = 'SELECT * FROM bookmarks';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY imported_at DESC';

  if (params.limit) {
    sql += ' LIMIT ?';
    values.push(params.limit);
    if (params.offset) {
      sql += ' OFFSET ?';
      values.push(params.offset);
    }
  }

  const rows = await dbAll<BookmarkRow>(db, sql, values);
  return rows.map(rowToBookmark);
}

export async function getBookmarkById(id: number): Promise<Bookmark | null> {
  const db = getDb();
  const row = await dbGet<BookmarkRow>(db, 'SELECT * FROM bookmarks WHERE id = ?', [id]);
  return row ? rowToBookmark(row) : null;
}

export async function createBookmark(input: BookmarkInput): Promise<Bookmark> {
  const db = getDb();
  const domain = extractDomain(input.url);
  const normalizedUrl = normalizeUrl(input.url);
  const tags = JSON.stringify(input.tags || []);

  const result = await dbRun(
    db,
    'INSERT INTO bookmarks (title, url, folder, tags, domain) VALUES (?, ?, ?, ?, ?)',
    [input.title, normalizedUrl, input.folder || '', tags, domain]
  );

  const bookmark = await getBookmarkById(result.lastID!);
  return bookmark!;
}

export async function updateBookmark(id: number, updates: Partial<Pick<Bookmark, 'title' | 'url' | 'folder' | 'tags' | 'archived'>>): Promise<Bookmark | null> {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.url !== undefined) {
    fields.push('url = ?'); values.push(normalizeUrl(updates.url));
    fields.push('domain = ?'); values.push(extractDomain(updates.url));
  }
  if (updates.folder !== undefined) { fields.push('folder = ?'); values.push(updates.folder); }
  if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }
  if (updates.archived !== undefined) { fields.push('archived = ?'); values.push(updates.archived ? 1 : 0); }

  if (fields.length === 0) {
    return getBookmarkById(id);
  }

  values.push(id);
  await dbRun(db, `UPDATE bookmarks SET ${fields.join(', ')} WHERE id = ?`, values);
  return getBookmarkById(id);
}

export async function deleteBookmark(id: number): Promise<boolean> {
  const db = getDb();
  const result = await dbRun(db, 'DELETE FROM bookmarks WHERE id = ?', [id]);
  return (result.changes || 0) > 0;
}

function stmtRun(stmt: sqlite3.Statement, params: unknown[]): Promise<void> {
  return new Promise((resolve, reject) => {
    stmt.run(params, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function stmtFinalize(stmt: sqlite3.Statement): Promise<void> {
  return new Promise((resolve, reject) => {
    stmt.finalize((err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function previewImportBookmarks(htmlContent: string): Promise<ImportPreviewResult> {
  const parsed = parseBookmarksHtml(htmlContent);
  const db = getDb();

  const existingUrls = new Set<string>();
  const existingRows = await dbAll<{ url: string }>(db, 'SELECT DISTINCT url FROM bookmarks');
  existingRows.forEach(r => existingUrls.add(r.url));

  let existingCount = 0;
  const batchUrlCount: Record<string, number> = {};
  const folderStats: Record<string, number> = {};
  const domainStats: Record<string, number> = {};

  for (const bm of parsed) {
    const normalizedUrl = normalizeUrl(bm.url);
    if (existingUrls.has(normalizedUrl)) {
      existingCount++;
    }
    batchUrlCount[normalizedUrl] = (batchUrlCount[normalizedUrl] || 0) + 1;
    const folder = bm.folder || '(无文件夹)';
    folderStats[folder] = (folderStats[folder] || 0) + 1;
    const domain = extractDomain(bm.url);
    domainStats[domain] = (domainStats[domain] || 0) + 1;
  }

  let batchDuplicateCount = 0;
  for (const count of Object.values(batchUrlCount)) {
    if (count > 1) batchDuplicateCount += count - 1;
  }

  return {
    totalParsed: parsed.length,
    existingCount,
    batchDuplicateCount,
    folderStats,
    domainStats,
  };
}

export async function importBookmarks(htmlContent: string): Promise<ImportResult> {
  const parsed = parseBookmarksHtml(htmlContent);
  const db = getDb();
  const result: ImportResult = {
    success: 0, skipped: 0, duplicates: 0, bookmarks: [],
  };

  const existingUrls = new Set<string>();
  const existingRows = await dbAll<{ url: string }>(db, 'SELECT DISTINCT url FROM bookmarks');
  existingRows.forEach(r => existingUrls.add(r.url));

  const stmt = db.prepare('INSERT INTO bookmarks (title, url, folder, tags, domain) VALUES (?, ?, ?, ?, ?)');

  for (const bm of parsed) {
    const normalizedUrl = normalizeUrl(bm.url);
    if (existingUrls.has(normalizedUrl)) {
      result.skipped++;
      continue;
    }
    const domain = extractDomain(bm.url);
    const tags = JSON.stringify(bm.tags || []);
    await stmtRun(stmt, [bm.title, normalizedUrl, bm.folder || '', tags, domain]);
    result.success++;
  }

  await stmtFinalize(stmt);

  if (result.success > 0) {
    const recent = await dbAll<BookmarkRow>(
      db, 'SELECT * FROM bookmarks ORDER BY imported_at DESC LIMIT ?', [result.success]
    );
    result.bookmarks = recent.map(rowToBookmark);
  }

  const duplicateCount = await countDuplicates(db);
  result.duplicates = duplicateCount;

  return result;
}

async function countDuplicates(db: sqlite3.Database): Promise<number> {
  const row = await dbGet<{ cnt: number }>(
    db,
    `SELECT COUNT(*) as cnt FROM bookmarks WHERE url IN (
      SELECT url FROM bookmarks GROUP BY url HAVING COUNT(*) > 1
    )`
  );
  return row?.cnt || 0;
}

export async function deduplicateKeepOne(keepId: number): Promise<DeduplicateResult> {
  const db = getDb();
  const keepBookmark = await getBookmarkById(keepId);
  if (!keepBookmark) {
    throw new Error('Bookmark not found');
  }

  const rows = await dbAll<BookmarkRow>(
    db,
    'SELECT * FROM bookmarks WHERE url = ? AND id != ? AND archived = 0',
    [keepBookmark.url, keepId]
  );

  if (rows.length === 0) {
    return {
      keepId,
      kept: keepBookmark,
      archived: 0,
      archivedBookmarks: [],
    };
  }

  const idsToArchive = rows.map(r => r.id);
  const placeholders = idsToArchive.map(() => '?').join(',');
  await dbRun(
    db,
    `UPDATE bookmarks SET archived = 1 WHERE id IN (${placeholders})`,
    idsToArchive
  );

  const archivedBookmarks = rows.map(rowToBookmark);
  for (const bm of archivedBookmarks) {
    bm.archived = true;
  }

  return {
    keepId,
    kept: keepBookmark,
    archived: idsToArchive.length,
    archivedBookmarks,
  };
}

export async function batchUpdate(ids: number[], updates: { archived?: boolean }): Promise<number> {
  const db = getDb();
  if (ids.length === 0) return 0;

  const placeholders = ids.map(() => '?').join(',');
  let sql = 'UPDATE bookmarks SET ';
  const values: unknown[] = [];

  if (updates.archived !== undefined) {
    sql += 'archived = ?';
    values.push(updates.archived ? 1 : 0);
  }

  sql += ` WHERE id IN (${placeholders})`;
  values.push(...ids);

  const result = await dbRun(db, sql, values);
  return result.changes || 0;
}

export async function batchDelete(ids: number[]): Promise<number> {
  const db = getDb();
  if (ids.length === 0) return 0;

  const placeholders = ids.map(() => '?').join(',');
  const result = await dbRun(db, `DELETE FROM bookmarks WHERE id IN (${placeholders})`, ids);
  return result.changes || 0;
}

export async function getStatsOverview(): Promise<StatsOverview> {
  const db = getDb();

  const totalRow = await dbGet<{ cnt: number }>(db, 'SELECT COUNT(*) as cnt FROM bookmarks');
  const archivedRow = await dbGet<{ cnt: number }>(db, 'SELECT COUNT(*) as cnt FROM bookmarks WHERE archived = 1');
  const domainRow = await dbGet<{ cnt: number }>(db, 'SELECT COUNT(DISTINCT domain) as cnt FROM bookmarks');

  const duplicateRow = await dbGet<{ cnt: number }>(
    db,
    `SELECT COUNT(*) as cnt FROM bookmarks WHERE url IN (
      SELECT url FROM bookmarks GROUP BY url HAVING COUNT(*) > 1
    )`
  );

  return {
    totalCount: totalRow?.cnt || 0,
    duplicateCount: duplicateRow?.cnt || 0,
    domainCount: domainRow?.cnt || 0,
    archivedCount: archivedRow?.cnt || 0,
  };
}

export async function getDuplicates(): Promise<DuplicateEntry[]> {
  const db = getDb();
  const urlRows = await dbAll<{ url: string; cnt: number }>(
    db,
    'SELECT url, COUNT(*) as cnt FROM bookmarks GROUP BY url HAVING COUNT(*) > 1 ORDER BY cnt DESC'
  );

  const entries: DuplicateEntry[] = [];
  for (const row of urlRows) {
    const bookmarks = await dbAll<BookmarkRow>(db, 'SELECT * FROM bookmarks WHERE url = ? ORDER BY imported_at', [row.url]);
    entries.push({
      url: row.url,
      count: row.cnt,
      bookmarks: bookmarks.map(rowToBookmark),
    });
  }
  return entries;
}

export async function getDomainStats(): Promise<DomainStat[]> {
  const db = getDb();
  const rows = await dbAll<{ domain: string; cnt: number }>(
    db,
    'SELECT domain, COUNT(*) as cnt FROM bookmarks GROUP BY domain ORDER BY cnt DESC'
  );
  return rows.map(r => ({ domain: r.domain, count: r.cnt }));
}

export async function getRecentBookmarks(limit: number = 10): Promise<Bookmark[]> {
  return getBookmarks({ limit });
}

export async function getAllFolders(): Promise<string[]> {
  const db = getDb();
  const rows = await dbAll<{ folder: string }>(
    db,
    'SELECT DISTINCT folder FROM bookmarks WHERE folder != \'\' ORDER BY folder'
  );
  return rows.map(r => r.folder).filter(Boolean);
}

export async function getAllTags(): Promise<string[]> {
  const db = getDb();
  const rows = await dbAll<{ tags: string }>(db, 'SELECT DISTINCT tags FROM bookmarks');
  const tagSet = new Set<string>();
  rows.forEach(r => {
    try {
      const parsed: string[] = JSON.parse(r.tags || '[]');
      parsed.forEach(tag => tagSet.add(tag));
    } catch { /* skip invalid */ }
  });
  return Array.from(tagSet).sort();
}

export async function getCleanupSuggestions(): Promise<CleanupSuggestions> {
  const db = getDb();

  const dupGroupsRow = await dbGet<{ cnt: number }>(
    db,
    'SELECT COUNT(*) as cnt FROM (SELECT url FROM bookmarks GROUP BY url HAVING COUNT(*) > 1)'
  );
  const duplicateGroups = dupGroupsRow?.cnt || 0;

  const archiveableRow = await dbGet<{ cnt: number }>(
    db,
    `SELECT COUNT(*) as cnt FROM bookmarks WHERE url IN (
      SELECT url FROM bookmarks GROUP BY url HAVING COUNT(*) > 1
    ) AND archived = 0`
  );
  const archiveableCount = archiveableRow?.cnt || 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const topDomains7dRows = await dbAll<{ domain: string; cnt: number }>(
    db,
    'SELECT domain, COUNT(*) as cnt FROM bookmarks WHERE imported_at >= ? GROUP BY domain ORDER BY cnt DESC LIMIT 5',
    [sevenDaysAgo]
  );
  const topDomains7d = topDomains7dRows.map(r => ({ domain: r.domain, count: r.cnt }));

  const emptyTitleRow = await dbGet<{ cnt: number }>(
    db,
    "SELECT COUNT(*) as cnt FROM bookmarks WHERE title = '' OR title = 'Untitled'"
  );
  const emptyTitleCount = emptyTitleRow?.cnt || 0;

  const allBookmarks = await dbAll<BookmarkRow>(db, 'SELECT url FROM bookmarks');
  let invalidUrlCount = 0;
  for (const row of allBookmarks) {
    if (isInvalidUrl(row.url)) {
      invalidUrlCount++;
    }
  }

  return {
    duplicateGroups,
    archiveableCount,
    topDomains7d,
    emptyTitleCount,
    invalidUrlCount,
  };
}

function isInvalidUrl(url: string): boolean {
  if (!url) return true;
  if (!url.includes('://')) return true;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname || parsed.hostname === '') return true;
    return false;
  } catch {
    return true;
  }
}
