import type { Database } from 'better-sqlite3';
import { SCHEMA_V1 } from './schema';

const migrations: { version: number; sql: string }[] = [{ version: 1, sql: SCHEMA_V1 }];

export function migrate(db: Database.Database): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`,
  );
  const applied = new Set(
    (db.prepare(`SELECT version FROM schema_migrations`).all() as { version: number }[]).map(
      (r) => r.version,
    ),
  );
  const apply = db.transaction(() => {
    for (const m of migrations) {
      if (applied.has(m.version)) continue;
      db.exec(m.sql);
      db.prepare(`INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`).run(
        m.version,
        new Date().toISOString(),
      );
    }
  });
  apply();
}
