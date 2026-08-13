import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

let db: Database.Database | null = null;

/** 进程内单例打开 SQLite（WAL + 外键）。路径默认可被 DB_PATH 覆盖。 */
export function getDb(path = process.env.DB_PATH ?? './data/healthy-life.db'): Database.Database {
  if (db) return db;
  mkdirSync(dirname(path), { recursive: true });
  db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function closeDb(): void {
  db?.close();
  db = null;
}
