import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'bookmarks.db');

let dbInstance: sqlite3.Database | null = null;

export function getDb(): sqlite3.Database {
  if (!dbInstance) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    dbInstance = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Failed to open database:', err.message);
      } else {
        console.log('Connected to SQLite database');
      }
    });

    initDb(dbInstance);
  }
  return dbInstance;
}

function initDb(db: sqlite3.Database): void {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      folder TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      domain TEXT NOT NULL,
      archived BOOLEAN DEFAULT 0,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const indexesSQL = [
    'CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);',
    'CREATE INDEX IF NOT EXISTS idx_bookmarks_domain ON bookmarks(domain);',
    'CREATE INDEX IF NOT EXISTS idx_bookmarks_archived ON bookmarks(archived);',
    'CREATE INDEX IF NOT EXISTS idx_bookmarks_imported_at ON bookmarks(imported_at);',
  ];

  db.serialize(() => {
    db.run(createTableSQL);
    indexesSQL.forEach((sql) => db.run(sql));
  });
}

export function dbRun(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<sqlite3.RunResult> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function dbGet<T>(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: T) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function dbAll<T>(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: T[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
