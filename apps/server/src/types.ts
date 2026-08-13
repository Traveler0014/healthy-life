import type { Database } from 'better-sqlite3';
import type { AppConfig, Member } from '@healthy-life/shared';

export interface Env {
  Variables: { member: Member };
}

export interface AppDeps {
  config: AppConfig;
  db: Database.Database;
}
