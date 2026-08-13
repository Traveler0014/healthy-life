import type { Database } from 'better-sqlite3';
import type { AppConfig } from '@healthy-life/shared';

export interface JobDeps {
  config: AppConfig;
  db: Database.Database;
}
